"""Regresiones de los límites introducidos por la migración, con datos sintéticos."""
import hashlib
import json
import sys
import tarfile
import pytest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from escano import analisis, explora
import run


@pytest.mark.parametrize("writer_url", ["postgresql://synthetic-writer/database", ""])
def test_runner_uses_writer_connection(monkeypatch, writer_url):
    reader_url = "postgresql://synthetic-reader/database"
    monkeypatch.setenv("DATABASE_URL", reader_url)
    monkeypatch.setenv("CONGRESS_DATABASE_URL", writer_url)
    monkeypatch.setattr(sys, "argv", ["run.py", "rebuild"])

    def connect(url, **kwargs):
        assert url == (writer_url or reader_url)
        raise RuntimeError("synthetic-connection-selected")

    monkeypatch.setattr(run.psycopg, "connect", connect)
    with pytest.raises(RuntimeError, match="synthetic-connection-selected"):
        run.main()


def test_helmcode_retries_and_validates(monkeypatch):
    monkeypatch.setenv("HELMCODE_API_KEY", "synthetic-test-token")
    monkeypatch.setattr(analisis.time, "sleep", lambda _: None)
    client = analisis.ClienteHelmcode()
    bodies = []

    class Reply:
        status_code = 200
        def json(self):
            return {"model": "synthetic-model-revision", "choices": [{"finish_reason": "stop", "message": {"content": '{"value": 2}'}}]}

    class Busy:
        status_code = 429

    replies = iter([Busy(), Reply()])
    def post(url, **kwargs):
        assert url == "https://api.helmcode.com/v1/chat/completions"
        bodies.append(kwargs["json"])
        return next(replies)
    monkeypatch.setattr(client.sesion, "post", post)
    schema = {"type": "object", "properties": {"value": {"type": "integer"}}, "required": ["value"]}
    result = client.generar("Neutral", "Texto sintético", schema, 800)
    assert result["value"] == 2
    assert result["_provenance"]["served_model"] == "synthetic-model-revision"
    assert len(bodies) == 2
    assert bodies[0]["response_format"]["json_schema"]["schema"] == schema
    assert bodies[0]["reasoning_effort"] == "low"
    assert "synthetic-test-token" not in json.dumps(bodies)


def test_imported_cache_survives_model_migration(monkeypatch, tmp_path):
    monkeypatch.setattr(analisis, "ANALISIS", tmp_path)
    text = "Una intervención de prueba suficientemente larga. " * 10
    legacy_key = hashlib.sha1("\x1f".join((analisis.MODELO_IMPORTADO, analisis.VERSION_PROMPT, text, "")).encode()).hexdigest()
    (tmp_path / f"{legacy_key}.json").write_text('{"resumen":"Análisis importado"}')
    iv = {"grupo": "PP", "texto": text, "orador": "Orador sintético", "item": "Tema sintético"}
    with analisis.solo_cache():
        assert analisis.analizar(iv)["resumen"] == "Análisis importado"
    monkeypatch.setattr(analisis, "USAR_IMPORTADOS", False)
    with analisis.solo_cache():
        assert analisis.analizar(iv) is None
        assert len(analisis.RECOGER) == 1


def test_public_archive_excludes_internal_state(monkeypatch, tmp_path):
    data = tmp_path / "data"
    datasets = tmp_path / "site/datos"
    for name in ["sesiones/demo.json", "raw/original.json", "analisis/internal.json", "raw-index.json", "retos.json"]:
        file = data / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text('{"synthetic":true}')
    datasets.mkdir(parents=True)
    (datasets / "indice.json").write_text('{}')
    (datasets / "explora-retos.json").write_text('{}')
    (datasets / "explora-citas.json").write_text('[]')
    monkeypatch.setattr(run, "DATOS", data)
    monkeypatch.setattr(run, "SITIO", tmp_path / "site")
    file = tmp_path / "download.tar.gz"
    run.archive(file, public=True)
    with tarfile.open(file) as archive:
        assert archive.getnames() == ["NOTICE.txt", "data/sesiones/demo.json", "datasets/explora-citas.json", "datasets/indice.json"]
    # El checkpoint privado tampoco debe conservar el juego.
    run.archive(file, public=False)
    with tarfile.open(file) as archive:
        assert "data/retos.json" not in archive.getnames()
        assert "datasets/explora-retos.json" not in archive.getnames()
        assert "datasets/explora-citas.json" in archive.getnames()


def test_nonliteral_quotes_are_rejected():
    assert analisis.cita_verificada("Una afirmación inventada", "Este es el texto del Diario") is None
    assert analisis.cita_verificada("texto del Diario", "Este es el texto del Diario") == "texto del Diario"


def test_inference_budget_is_a_hard_limit(monkeypatch):
    monkeypatch.setenv("HELMCODE_API_KEY", "synthetic-test-token")
    monkeypatch.setattr(analisis, "LIMITE_LLAMADAS", 1)
    monkeypatch.setattr(analisis, "INTENTOS", 1)
    client = analisis.ClienteHelmcode()
    monkeypatch.setattr(client.sesion,"post",lambda *args,**kwargs: pytest.fail("No debe llamar a la API"))
    with pytest.raises(analisis.PresupuestoAgotado):
        client.generar("Neutral","Texto sintético",{"type":"object"},800)


def test_explore_keeps_quotes_without_game_restrictions():
    quote = "Nuestro grupo parlamentario defiende esta propuesta para mejorar los servicios públicos."
    sessions = [{"id": "demo", "fecha": "2026-10-13"}]
    interventions = [{"cita": quote, "g": "MIXTO", "orador": "Orador sintético", "s": "demo"}]
    assert explora.citas(sessions, interventions) == [[quote, "Orador sintético", "MIXTO", "demo", "2026-10-13"]]
