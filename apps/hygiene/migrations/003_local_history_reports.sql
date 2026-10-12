ALTER TABLE branches ADD COLUMN IF NOT EXISTS history_head TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS history_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS history_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS history_updated_at TIMESTAMPTZ;
ALTER TABLE branches DROP COLUMN IF EXISTS backfill_cursor;
ALTER TABLE branches DROP COLUMN IF EXISTS backfill_total;
ALTER TABLE branches DROP COLUMN IF EXISTS backfill_head;
ALTER TABLE branches DROP COLUMN IF EXISTS backfill_status;
ALTER TABLE branches DROP COLUMN IF EXISTS date_refresh_cursor;
ALTER TABLE branches DROP COLUMN IF EXISTS date_refresh_status;
DROP TABLE IF EXISTS commit_queue;
DROP TABLE IF EXISTS blob_lines;
CREATE TABLE IF NOT EXISTS history_reports (
  repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  run_id BIGINT NOT NULL,
  run_attempt INTEGER NOT NULL,
  branch TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('snapshot', 'delta')),
  head_sha TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (repository_id, run_id, run_attempt, branch)
);
