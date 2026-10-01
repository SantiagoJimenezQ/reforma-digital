ALTER TABLE documents ADD COLUMN applicability_year integer;
CREATE INDEX documents_jurisdiction_idx ON documents(jurisdiction,applicability_year);
CREATE INDEX searches_created_idx ON searches(created_at);
CREATE INDEX feedback_search_idx ON feedback(search_id);
