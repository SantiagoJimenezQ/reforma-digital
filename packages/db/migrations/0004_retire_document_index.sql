-- Existing installations only. Fresh databases no longer create these tables.
DROP TABLE IF EXISTS chunks;
DROP TABLE IF EXISTS document_versions;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS sources;
DROP EXTENSION IF EXISTS vector;
