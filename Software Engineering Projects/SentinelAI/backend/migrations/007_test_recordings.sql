ALTER TABLE cases ADD COLUMN test_recording INTEGER NOT NULL DEFAULT 0 CHECK(test_recording IN (0,1));
