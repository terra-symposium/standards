CREATE TABLE IF NOT EXISTS repositories (
  id BIGINT PRIMARY KEY,
  installation_id BIGINT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  private BOOLEAN NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS branches (
  repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  history_head TEXT,
  history_count INTEGER NOT NULL DEFAULT 0,
  history_status TEXT NOT NULL DEFAULT 'pending',
  history_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (repository_id, name)
);
CREATE TABLE IF NOT EXISTS runs (
  repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  run_id BIGINT NOT NULL,
  run_attempt INTEGER NOT NULL,
  head_sha TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  conclusion TEXT NOT NULL,
  tests_passed INTEGER,
  tests_failed INTEGER,
  tests_skipped INTEGER,
  checks_enabled INTEGER,
  checks_total INTEGER,
  checks_clean INTEGER,
  quality_findings INTEGER,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (repository_id, run_id, run_attempt)
);
CREATE INDEX IF NOT EXISTS runs_branch_time ON runs(repository_id, branch, completed_at);
CREATE TABLE IF NOT EXISTS commits (
  repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  position INTEGER NOT NULL,
  sha TEXT NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  additions INTEGER NOT NULL,
  deletions INTEGER NOT NULL,
  source_lines INTEGER NOT NULL,
  PRIMARY KEY (repository_id, branch, sha)
);
CREATE INDEX IF NOT EXISTS commits_branch_position ON commits(repository_id, branch, position);
CREATE TABLE IF NOT EXISTS commit_queue (
  repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  position INTEGER NOT NULL,
  sha TEXT NOT NULL,
  PRIMARY KEY (repository_id, branch, position)
);
CREATE TABLE IF NOT EXISTS blob_lines (
  repository_id BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,
  lines INTEGER NOT NULL,
  PRIMARY KEY (repository_id, sha)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  github_user_id BIGINT NOT NULL,
  github_login TEXT NOT NULL,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  token_expires_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
