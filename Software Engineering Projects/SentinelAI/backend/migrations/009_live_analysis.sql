ALTER TABLE live_segments ADD COLUMN lane TEXT NOT NULL DEFAULT 'context' CHECK(lane IN ('vision','context'));
CREATE INDEX idx_live_lane ON live_segments(session_id,lane,sequence);
