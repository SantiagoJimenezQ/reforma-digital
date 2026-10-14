-- Las páginas consultan filas en lugar de descargar ficheros mensuales enteros. Los ficheros
-- siguen siendo la fuente publicada y el contrato de la API: un trigger rellena estas tablas en la
-- misma transacción que los publica, sin cambios en el recolector.
CREATE TABLE congreso_month_sessions (
  month text NOT NULL,
  position integer NOT NULL,
  id text NOT NULL,
  date date NOT NULL,
  search text NOT NULL,
  content jsonb NOT NULL,
  PRIMARY KEY (month, position)
);
CREATE INDEX congreso_month_sessions_id ON congreso_month_sessions (lower(id));

CREATE TABLE congreso_month_votes (
  month text NOT NULL,
  position integer NOT NULL,
  id text NOT NULL,
  date date NOT NULL,
  initiative text NOT NULL,
  topics text[] NOT NULL,
  search text NOT NULL,
  content jsonb NOT NULL,
  PRIMARY KEY (month, position)
);
CREATE INDEX congreso_month_votes_id ON congreso_month_votes (id);
CREATE INDEX congreso_month_votes_initiative ON congreso_month_votes (initiative);

-- `content` guarda el asunto ya resuelto: el fichero lo referencia por posición en `items`.
CREATE TABLE congreso_interventions (
  month text NOT NULL,
  position integer NOT NULL,
  session_id text NOT NULL,
  speaker text NOT NULL,
  parliamentary_group text NOT NULL,
  search text NOT NULL,
  content jsonb NOT NULL CHECK (jsonb_typeof(content->'item') = 'string'),
  PRIMARY KEY (month, position)
);
CREATE INDEX congreso_interventions_session ON congreso_interventions (session_id);
CREATE INDEX congreso_interventions_speaker ON congreso_interventions (speaker);

-- Igual que `slug()` en apps/web/lib/congreso/data.ts.
CREATE FUNCTION congreso_slug(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(
    lower(regexp_replace(normalize(value, NFD), '[̀-ͯ]', '', 'g')),
    '[^a-z0-9]+', '-', 'g'))
$$;

CREATE FUNCTION congreso_expand_month(source text, content jsonb) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  m text := left(source, 7);
BEGIN
  IF source !~ '^\d{4}-\d{2}\.json$' THEN
    RETURN;
  END IF;
  DELETE FROM congreso_month_sessions WHERE month = m;
  DELETE FROM congreso_month_votes WHERE month = m;
  DELETE FROM congreso_interventions WHERE month = m;
  IF content IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO congreso_month_sessions (month, position, id, date, search, content)
  SELECT m, n, s->>'id', (s->>'fecha')::date,
    concat_ws(' ', s->>'organo', s->>'titular', s->>'resumen'), s
  FROM jsonb_array_elements(content->'sesiones') WITH ORDINALITY AS t(s, n);
  INSERT INTO congreso_month_votes (month, position, id, date, initiative, topics, search, content)
  SELECT m, n, v->>'id', (v->>'fecha')::date, v->>'exp',
    ARRAY(SELECT jsonb_array_elements_text(coalesce(v->'tm', '[]'))),
    concat_ws(' ', v->>'titulo', v->>'texto'), v
  FROM jsonb_array_elements(content->'votaciones') WITH ORDINALITY AS t(v, n);
  INSERT INTO congreso_interventions
    (month, position, session_id, speaker, parliamentary_group, search, content)
  SELECT m, n, i->>'s', congreso_slug(i->>'orador'), i->>'g',
    concat_ws(' ', i->>'orador', item->>0,
      (SELECT string_agg(topic, ' ') FROM jsonb_array_elements_text(i->'temas') AS topic)),
    i || jsonb_build_object('item', item->0)
  FROM jsonb_array_elements(content->'intervenciones') WITH ORDINALITY AS t(i, n),
    LATERAL (SELECT jsonb_build_array(CASE jsonb_typeof(i->'item')
      WHEN 'number' THEN content->'items'->((i->>'item')::integer)
      ELSE i->'item' END) AS item) AS resolved;
END $$;

CREATE FUNCTION congreso_month_rows() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- En DELETE, NEW es NULL y la función solo borra las filas del mes.
  PERFORM congreso_expand_month(coalesce(NEW.path, OLD.path), NEW.content);
  RETURN NULL;
END $$;

CREATE TRIGGER congreso_month_rows
AFTER INSERT OR DELETE OR UPDATE OF content ON congreso_datasets
FOR EACH ROW EXECUTE FUNCTION congreso_month_rows();

SELECT congreso_expand_month(path, content) FROM congreso_datasets;

-- Una consulta de varias tablas solo responde si la publicación sigue siendo la del render.
CREATE FUNCTION congreso_publication(expected uuid) RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM congreso_datasets WHERE path = 'indice.json' AND publication_id = expected
  ) THEN
    RAISE EXCEPTION 'La publicación del Congreso ha cambiado';
  END IF;
  RETURN true;
END $$;
