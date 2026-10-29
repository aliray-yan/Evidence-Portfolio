CREATE TABLE IF NOT EXISTS case_links (
 parent_id TEXT NOT NULL REFERENCES cases(id), child_id TEXT NOT NULL REFERENCES cases(id),
 actor_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL,
 PRIMARY KEY(parent_id,child_id), CHECK(parent_id!=child_id)
);
CREATE INDEX IF NOT EXISTS idx_case_links_child ON case_links(child_id);
