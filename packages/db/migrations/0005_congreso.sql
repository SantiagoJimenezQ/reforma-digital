CREATE TABLE congreso_publications (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  source_revision text NOT NULL,
  state_key text,
  download_key text,
  counts jsonb NOT NULL
);

CREATE TABLE congreso_datasets (
  path text PRIMARY KEY CHECK (path !~ '(^/|\.\.|\\)' AND path ~ '\.json$'),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) IN ('object', 'array')),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  publication_id uuid NOT NULL REFERENCES congreso_publications(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE congreso_deputies (
  legislature text NOT NULL,
  id text NOT NULL,
  name text NOT NULL,
  parliamentary_group text NOT NULL,
  province text NOT NULL,
  active boolean NOT NULL,
  PRIMARY KEY (legislature, id)
);
CREATE INDEX congreso_deputies_province ON congreso_deputies (legislature, province);

CREATE TABLE congreso_votes (
  legislature text NOT NULL,
  id text NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  kind text NOT NULL,
  initiative text,
  yes_count integer NOT NULL CHECK (yes_count >= 0),
  no_count integer NOT NULL CHECK (no_count >= 0),
  abstention_count integer NOT NULL CHECK (abstention_count >= 0),
  absent_count integer NOT NULL CHECK (absent_count >= 0),
  topics jsonb NOT NULL,
  PRIMARY KEY (legislature, id)
);
CREATE INDEX congreso_votes_date ON congreso_votes (legislature, date DESC);
CREATE INDEX congreso_votes_initiative ON congreso_votes (legislature, initiative);

CREATE TABLE congreso_ballots (
  legislature text NOT NULL,
  vote_id text NOT NULL,
  deputy_id text NOT NULL,
  parliamentary_group text NOT NULL,
  ballot text NOT NULL CHECK (ballot IN ('S', 'N', 'A', 'X')),
  PRIMARY KEY (legislature, vote_id, deputy_id),
  FOREIGN KEY (legislature, vote_id) REFERENCES congreso_votes(legislature, id) ON DELETE CASCADE,
  FOREIGN KEY (legislature, deputy_id) REFERENCES congreso_deputies(legislature, id)
);
CREATE INDEX congreso_ballots_deputy ON congreso_ballots (legislature, deputy_id);

CREATE TABLE congreso_questions (
  legislature text NOT NULL,
  id text NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  content jsonb NOT NULL,
  PRIMARY KEY (legislature, id)
);
CREATE INDEX congreso_questions_date ON congreso_questions (legislature, date DESC, id);
CREATE INDEX congreso_questions_status ON congreso_questions (legislature, status, date DESC);

CREATE TABLE congreso_sessions (
  legislature text NOT NULL,
  id text NOT NULL,
  date date,
  content jsonb NOT NULL,
  PRIMARY KEY (legislature, id)
);
CREATE INDEX congreso_sessions_date ON congreso_sessions (legislature, date DESC);

CREATE TABLE congreso_checkpoint (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  state_url text NOT NULL,
  source_revision text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE congreso_source_hashes (
  path text PRIMARY KEY,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$')
);
