ALTER TABLE runs ADD COLUMN IF NOT EXISTS run_source TEXT NOT NULL DEFAULT 'github-actions'
  CHECK (run_source IN ('github-actions', 'local'));
