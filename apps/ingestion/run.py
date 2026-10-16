"""Bootstrap, actualización y reanálisis. Publicación atómica en nuestro Postgres."""
from __future__ import annotations

import argparse
import hashlib
import json
import io
import os
import shutil
import signal
import subprocess
import tarfile
import tempfile
import uuid
from datetime import date, timedelta
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

from escano.config import DATOS, SITIO, TRABAJO, LEGISLATURA_ROMANA
import storage

SOURCE = "https://github.com/jorgegarcelan/escano-abierto.git"
REVISION = "ba240791820b423503f69bb88406b51a25487083"
ROOT = Path(__file__).resolve().parents[2]


def remove_game_data() -> None:
    # Los checkpoints y el bootstrap anteriores pueden conservar estos archivos del juego retirado.
    (DATOS / "retos.json").unlink(missing_ok=True)
    (SITIO / "datos" / "explora-retos.json").unlink(missing_ok=True)


def archive(destination: Path, *, public: bool) -> None:
    remove_game_data()
    with tarfile.open(destination, "w:gz") as tar:
        if public:
            notice = ("Datos adaptados de Escaño Abierto: https://www.escanoabierto.com\n"
                      "Datos elaborados: CC BY 4.0; encuestas de Wikipedia: CC BY-SA 4.0.\n"
                      "Cada fuente oficial conserva sus condiciones. Los análisis de IA pueden contener errores.\n").encode()
            info = tarfile.TarInfo("NOTICE.txt")
            info.size = len(notice)
            tar.addfile(info, io.BytesIO(notice))
        for directory, name in [(DATOS, "data"), (SITIO / "datos", "datasets")]:
            for file in sorted(directory.rglob("*.json")):
                relative = file.relative_to(directory)
                if relative.parts[0] == "raw" or (public and (relative.parts[0] == "analisis" or relative.name == "raw-index.json")):
                    continue
                tar.add(file, arcname=f"{name}/{relative.as_posix()}")


def restore(url: str) -> None:
    TRABAJO.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        file = Path(directory) / "state.tar.gz"
        storage.get(url, file)
        with tarfile.open(file) as tar:
            # Python 3.12+ impide que rutas o enlaces escapen del directorio de destino.
            tar.extractall(Path(directory) / "state", filter="data")
        for source, target in [("data", DATOS), ("datasets", SITIO / "datos")]:
            shutil.copytree(Path(directory) / "state" / source, target, dirs_exist_ok=True)


def bootstrap(source: Path | None) -> str:
    if source is not None:
        if subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip() != REVISION:
            raise ValueError("La copia histórica no corresponde a la revisión fijada")
        for source_dir, target in [(source / "data", DATOS), (source / "site/datos", SITIO / "datos")]:
            shutil.copytree(source_dir, target, dirs_exist_ok=True)
        return REVISION
    with tempfile.TemporaryDirectory() as directory:
        repo = Path(directory) / "source"
        subprocess.run(["git", "init", str(repo)], check=True)
        subprocess.run(["git", "-C", str(repo), "remote", "add", "origin", SOURCE], check=True)
        subprocess.run(["git", "-C", str(repo), "fetch", "--depth=1", "--filter=blob:none", "origin", REVISION], check=True)
        subprocess.run(["git", "-C", str(repo), "sparse-checkout", "set", "data", "site/datos"], check=True)
        subprocess.run(["git", "-C", str(repo), "checkout", REVISION], check=True)
        return bootstrap(repo)


def checkpoint(db, revision: str) -> str:
    file = TRABAJO / "state.tar.gz"
    archive(file, public=False)
    url = storage.put(f"congreso/state/{uuid.uuid4()}.tar.gz", file)
    previous = db.execute("SELECT state_url FROM congreso_checkpoint WHERE id").fetchone()
    with db.transaction():
        db.execute("INSERT INTO congreso_checkpoint(id,state_url,source_revision) VALUES(true,%s,%s) "
                   "ON CONFLICT(id) DO UPDATE SET state_url=excluded.state_url,source_revision=excluded.source_revision,updated_at=now()",
                   (url, revision))
    if previous and not db.execute("SELECT 1 FROM congreso_publications WHERE state_key=%s", (previous[0],)).fetchone():
        try:
            storage.delete([previous[0]])
        except Exception:
            print("No se pudo eliminar un checkpoint antiguo; los datos siguen conservados")
    return url


def copy_rows(db, table: str, columns: str, rows) -> None:
    # Los nombres de tabla/columnas son constantes internas; psycopg serializa los valores de COPY.
    with db.cursor().copy(f"COPY {table} ({columns}) FROM STDIN") as copy:
        for row in rows:
            copy.write_row(row)


def publish(db, revision: str, state_url: str | None, local: bool) -> dict:
    remove_game_data()
    directory = SITIO / "datos"
    subprocess.run(["pnpm", "exec", "tsx", "apps/web/scripts/validate-congreso.ts", str(directory), str(DATOS)], cwd=ROOT, check=True)
    datasets = [(file.relative_to(directory).as_posix(), json.loads(file.read_text()), hashlib.sha256(file.read_bytes()).hexdigest())
                for file in sorted(directory.rglob("*.json"))]
    index = next(content for path, content, _ in datasets if path == "indice.json")
    legislature = index["meta"]["legislatura"]
    if legislature != LEGISLATURA_ROMANA:
        raise ValueError("Legislatura incompatible con el recolector")
    months = [content for path, content, _ in datasets if len(path) == 12 and path[:4].isdigit()]
    votes = [vote for month in months for vote in month["votaciones"]]
    deputies = index["diputados"]
    if any(v["v"] and len(v["v"]) != len(deputies) for v in votes):
        raise ValueError("Votación sin correspondencia con el índice de diputados")
    questions = json.loads((DATOS / "preguntas.json").read_text())["preguntas"]
    session_files = sorted((DATOS / "sesiones").glob("*.json"))
    sessions = [json.loads(file.read_text()) for file in session_files]
    sources = [("preguntas.json", hashlib.sha256((DATOS / "preguntas.json").read_bytes()).hexdigest())]
    sources.extend((f"sesiones/{f.name}", hashlib.sha256(f.read_bytes()).hexdigest()) for f in session_files)
    counts = {"datasets": len(datasets), "votes": len(votes), "deputies": len(deputies), "questions": len(questions), "sessions": len(sessions)}
    identifier = str(uuid.uuid4())
    download = None
    if not local:
        file = TRABAJO / "download.tar.gz"
        archive(file, public=True)
        download = storage.put(f"congreso/downloads/{identifier}.tar.gz", file)
    with db.transaction():
        db.execute("INSERT INTO congreso_publications(id,source_revision,state_key,download_key,counts) VALUES(%s,%s,%s,%s,%s)",
                   (identifier, revision, state_url, download, Jsonb(counts)))
        previous = dict(db.execute("SELECT path,sha256 FROM congreso_datasets").fetchall())
        original = db.execute("SELECT path,content FROM congreso_datasets WHERE path='indice.json' OR path ~ '^[0-9]{4}-[0-9]{2}\\.json$'").fetchall()
        original_content = dict(original)
        changed = [(p, c, sha) for p, c, sha in datasets if previous.get(p) != sha]
        db.execute("CREATE TEMP TABLE incoming_datasets (LIKE congreso_datasets INCLUDING DEFAULTS) ON COMMIT DROP")
        copy_rows(db, "incoming_datasets", "path,content,sha256,publication_id", ((p, Jsonb(c), sha, identifier) for p, c, sha in changed))
        db.execute("INSERT INTO congreso_datasets SELECT * FROM incoming_datasets ON CONFLICT(path) DO UPDATE SET "
                   "content=excluded.content,sha256=excluded.sha256,publication_id=excluded.publication_id,updated_at=excluded.updated_at")
        paths = [p for p, _, _ in datasets]
        db.execute("DELETE FROM congreso_datasets WHERE NOT (path=ANY(%s))", (paths,))
        db.execute("UPDATE congreso_datasets SET publication_id=%s WHERE publication_id<>%s", (identifier, identifier))
        votes_changed = original_content.get("indice.json", {}).get("diputados") != deputies or any(
            original_content.get(p, {}).get("votaciones") != c["votaciones"]
            for p, c, _ in datasets if len(p) == 12 and p[:4].isdigit())
        if votes_changed:
            # Los índices individuales dependen del snapshot completo de diputados.
            db.execute("DELETE FROM congreso_ballots WHERE legislature=%s", (legislature,))
            db.execute("DELETE FROM congreso_votes WHERE legislature=%s", (legislature,))
            db.execute("DELETE FROM congreso_deputies WHERE legislature=%s", (legislature,))
            copy_rows(db, "congreso_deputies", "legislature,id,name,parliamentary_group,province,active",
                      ((legislature, str(i), d[0], d[1], d[2], not bool(d[8])) for i, d in enumerate(deputies)))
            copy_rows(db, "congreso_votes", "legislature,id,date,title,kind,initiative,yes_count,no_count,abstention_count,absent_count,topics",
                      ((legislature, v["id"], v["fecha"], v["titulo"], v["tipo"], v["exp"] or None,
                        v["si"], v["no"], v["abst"], v["novota"], Jsonb(v.get("tm", []))) for v in votes))
            copy_rows(db, "congreso_ballots", "legislature,vote_id,deputy_id,parliamentary_group,ballot",
                      ((legislature, v["id"], str(i), v.get("cg", {}).get(str(i), d[1]), ballot)
                       for v in votes if v["v"] for i, d in enumerate(deputies) if (ballot := v["v"][i]) != "-"))
        source_hashes = dict(db.execute("SELECT path,sha256 FROM congreso_source_hashes").fetchall())
        if source_hashes.get("preguntas.json") != sources[0][1]:
            db.execute("DELETE FROM congreso_questions WHERE legislature=%s", (legislature,))
            copy_rows(db, "congreso_questions", "legislature,id,date,title,status,content",
                      ((legislature, q["exp"], q["presentada"], q["titulo"], q["estado"], Jsonb(q)) for q in questions))
        changed_sessions = [s for s, (_, sha) in zip(sessions, sources[1:])
                            if source_hashes.get(f"sesiones/{s['id']}.json") != sha]
        db.execute("CREATE TEMP TABLE incoming_sessions (LIKE congreso_sessions) ON COMMIT DROP")
        copy_rows(db, "incoming_sessions", "legislature,id,date,content",
                  ((legislature, s["id"], s["fecha"], Jsonb(s)) for s in changed_sessions))
        db.execute("INSERT INTO congreso_sessions SELECT * FROM incoming_sessions ON CONFLICT(legislature,id) DO UPDATE SET "
                   "date=excluded.date,content=excluded.content")
        db.execute("DELETE FROM congreso_sessions WHERE legislature=%s AND NOT (id=ANY(%s))", (legislature, [s["id"] for s in sessions]))
        db.execute("DELETE FROM congreso_source_hashes")
        copy_rows(db, "congreso_source_hashes", "path,sha256", sources)
    if not local:
        with db.transaction():
            old = db.execute("DELETE FROM congreso_publications WHERE id NOT IN "
                             "(SELECT id FROM congreso_publications ORDER BY created_at DESC LIMIT 7) "
                             "RETURNING state_key,download_key").fetchall()
        try:
            storage.delete([url for row in old for url in row if url])
        except Exception:
            print("No se pudo completar la retención de Blob; la publicación está guardada")
    return counts


def reanalyze(limit: int, since: date | None) -> int:
    from escano import analisis, construir, votaciones
    done = 0
    votes_by_day = {}
    for vote in votaciones.leer_todas():
        votes_by_day.setdefault(vote["fecha"], []).append(vote)
    analisis.USAR_IMPORTADOS = False
    try:
        sessions = [json.loads(file.read_text()) for file in (DATOS / "sesiones").glob("*.json")]
        for session in sorted(sessions, key=lambda s: (s["fecha"] or "", s["id"]), reverse=True):
            if not session["fecha"] or (since and session["fecha"] < since.isoformat()):
                continue
            analisis.RECOGER = []
            construir.analisis_de_sesion(session, votes_by_day.get(session["fecha"], []), con_ia=True)
            requests = analisis.RECOGER
            analisis.RECOGER = None
            for request in requests:
                if done >= limit:
                    return done
                analisis._pedir(request, None)
                done += 1
    finally:
        analisis.RECOGER = None
        analisis.USAR_IMPORTADOS = True
    return done


def analyze_and_normalize(limit: int, since: date | None) -> None:
    from escano import analisis, normalizar
    try:
        reanalyze(max(1, limit - max(1, limit // 5)), since)
        normalizar.ejecutar()
    except analisis.PresupuestoAgotado:
        print("Límite de inferencia alcanzado; se publica con la caché disponible y se retoma en otra ejecución")


def _timeout(signum, frame) -> None:
    raise RuntimeError("Se agotó el tiempo de procesamiento; se conserva el checkpoint")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["bootstrap", "update", "polls", "reanalyze", "rebuild", "geography", "elections", "promises", "reparse"])
    parser.add_argument("--source", type=Path, help="copia local del commit fijado, solo bootstrap")
    parser.add_argument("--local", action="store_true", help="importación de desarrollo sin Blob; requiere --source")
    parser.add_argument("--limit", type=int, default=100, help="máximo de llamadas a NaN")
    parser.add_argument("--since", type=date.fromisoformat)
    args = parser.parse_args()
    if args.limit < 1 or args.limit > 5000:
        parser.error("--limit debe estar entre 1 y 5000")
    if args.local and (args.command != "bootstrap" or not args.source):
        parser.error("--local solo permite bootstrap --source")
    from escano import analisis
    analisis.LIMITE_LLAMADAS = args.limit
    database_url = os.environ.get("CONGRESS_DATABASE_URL") or os.environ["DATABASE_URL"]
    with psycopg.connect(database_url, autocommit=True) as db:
        # Un único escritor, también entre ejecución local y GitHub Actions.
        db.execute("SELECT pg_advisory_lock(492773)")
        previous = db.execute("SELECT state_url,source_revision FROM congreso_checkpoint WHERE id").fetchone()
        revision = REVISION
        if args.command == "bootstrap":
            if db.execute("SELECT 1 FROM congreso_publications LIMIT 1").fetchone():
                raise ValueError("Ya hay datos publicados: bootstrap no sobrescribe una instalación")
            revision = bootstrap(args.source)
        else:
            if not previous:
                raise ValueError("Ejecuta bootstrap antes de los trabajos programados")
            revision = previous[1]
            restore(previous[0])
        signal.signal(signal.SIGALRM, _timeout)
        signal.alarm(4 * 60 * 60)  # termina con margen para persistir antes del timeout de Actions
        try:
            from escano import cli, construir
            if args.command == "update":
                cli.actualizar(date.today() - timedelta(days=10), date.today(), con_ia=False)
                if os.environ.get("NAN_API_KEY"):
                    analyze_and_normalize(args.limit, date.today() - timedelta(days=10))
                construir.construir(con_ia=False)
            elif args.command == "polls":
                from escano import encuestas
                if encuestas.congeladas():
                    print("Encuestas congeladas; no se publica una actualización")
                    return
                encuestas.escribir_datos()
                encuestas.escribir(SITIO / "datos/encuestas")
            elif args.command == "reanalyze":
                analyze_and_normalize(args.limit, args.since)
                construir.construir(con_ia=False)
            elif args.command == "reparse":
                from escano.config import CRUDOS
                manifest = json.loads((DATOS / "raw-index.json").read_text())
                for name in manifest:
                    storage.raw_file(CRUDOS / name, save=False)
                cli.reprocesar(con_ia=False)
            elif args.command == "geography":
                from escano import geografia
                geografia.escribir_datos()
                construir.construir(con_ia=False)
            elif args.command == "elections":
                construir.construir(con_ia=False)
            elif args.command == "promises":
                from escano import promesas
                promesas.ejecutar(None, args.limit)
                construir.construir(con_ia=False)
            elif args.command == "rebuild":
                construir.construir(con_ia=False)
        except BaseException:
            signal.alarm(0)
            if not args.local:
                checkpoint(db, revision)  # conserva trabajo para reanudar, sin modificar los datos publicados
            raise
        signal.alarm(0)
        state_url = None if args.local else checkpoint(db, revision)
        print(json.dumps(publish(db, revision, state_url, args.local)))


if __name__ == "__main__":
    main()
