CREATE TABLE IF NOT EXISTS repositories (
	id bigint PRIMARY KEY,
	installation_id bigint NOT NULL,
	owner TEXT NOT NULL,
	name text NOT NULL,
	private boolean NOT NULL,
	active boolean NOT NULL DEFAULT TRUE,
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
	repository_id bigint NOT NULL REFERENCES repositories (id) ON DELETE CASCADE,
	name text NOT NULL,
	enabled boolean NOT NULL DEFAULT TRUE,
	history_head text,
	history_count integer NOT NULL DEFAULT 0,
	history_status text NOT NULL DEFAULT 'pending',
	history_updated_at timestamptz,
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (repository_id, name)
);

CREATE TABLE IF NOT EXISTS runs (
	repository_id bigint NOT NULL REFERENCES repositories (id) ON DELETE CASCADE,
	branch text NOT NULL,
	run_id bigint NOT NULL,
	run_attempt integer NOT NULL,
	head_sha text NOT NULL,
	completed_at timestamptz NOT NULL,
	conclusion text NOT NULL,
	tests_passed integer,
	tests_failed integer,
	tests_skipped integer,
	checks_enabled integer,
	checks_total integer,
	checks_clean integer,
	quality_findings integer,
	processed_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (repository_id, run_id, run_attempt)
);

CREATE INDEX IF NOT EXISTS runs_branch_time ON runs (repository_id, branch, completed_at);

CREATE TABLE IF NOT EXISTS commits (
	repository_id bigint NOT NULL REFERENCES repositories (id) ON DELETE CASCADE,
	branch text NOT NULL,
	position integer NOT NULL,
	sha text NOT NULL,
	committed_at timestamptz NOT NULL,
	additions integer NOT NULL,
	deletions integer NOT NULL,
	source_lines integer NOT NULL,
	PRIMARY KEY (repository_id, branch, sha)
);

CREATE INDEX IF NOT EXISTS commits_branch_position ON commits (repository_id, branch, position);

CREATE TABLE IF NOT EXISTS commit_queue (
	repository_id bigint NOT NULL REFERENCES repositories (id) ON DELETE CASCADE,
	branch text NOT NULL,
	position integer NOT NULL,
	sha text NOT NULL,
	PRIMARY KEY (repository_id, branch, position)
);

CREATE TABLE IF NOT EXISTS blob_lines (
	repository_id bigint NOT NULL REFERENCES repositories (id) ON DELETE CASCADE,
	sha text NOT NULL,
	lines integer NOT NULL,
	PRIMARY KEY (repository_id, sha)
);

CREATE TABLE IF NOT EXISTS sessions (
	token_hash text PRIMARY KEY,
	github_user_id bigint NOT NULL,
	github_login text NOT NULL,
	access_token_ciphertext text NOT NULL,
	refresh_token_ciphertext text,
	token_expires_at timestamptz,
	expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
	id text PRIMARY KEY,
	received_at timestamptz NOT NULL DEFAULT now()
);
