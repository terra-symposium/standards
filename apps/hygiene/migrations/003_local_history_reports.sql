ALTER TABLE branches
	ADD COLUMN IF NOT EXISTS history_head text;

ALTER TABLE branches
	ADD COLUMN IF NOT EXISTS history_count integer NOT NULL DEFAULT 0;

ALTER TABLE branches
	ADD COLUMN IF NOT EXISTS history_status text NOT NULL DEFAULT 'pending';

ALTER TABLE branches
	ADD COLUMN IF NOT EXISTS history_updated_at timestamptz;

ALTER TABLE branches
	DROP COLUMN IF EXISTS backfill_cursor;

ALTER TABLE branches
	DROP COLUMN IF EXISTS backfill_total;

ALTER TABLE branches
	DROP COLUMN IF EXISTS backfill_head;

ALTER TABLE branches
	DROP COLUMN IF EXISTS backfill_status;

ALTER TABLE branches
	DROP COLUMN IF EXISTS date_refresh_cursor;

ALTER TABLE branches
	DROP COLUMN IF EXISTS date_refresh_status;

DROP TABLE IF EXISTS commit_queue;

DROP TABLE IF EXISTS blob_lines;

CREATE TABLE IF NOT EXISTS history_reports (
	repository_id bigint NOT NULL REFERENCES repositories (id) ON DELETE CASCADE,
	run_id bigint NOT NULL,
	run_attempt integer NOT NULL,
	branch text NOT NULL,
	mode text NOT NULL CHECK (mode IN ('snapshot', 'delta')),
	head_sha text NOT NULL,
	imported_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (repository_id, run_id, run_attempt, branch)
);
