import { useEffect, useState } from 'react';

type Repo = { id: number; owner: string; name: string; private: boolean };
type Branch = { name: string; enabled: boolean; history_head: string | null; history_count: number; history_status: string; history_updated_at: string | null };
type Run = { run_id: number; head_sha: string; completed_at: string; conclusion: string; source: 'github-actions' | 'local'; quality_policy_branch: string | null; metrics: { tests: { passed: number; failed: number; skipped: number } | null; quality: { total: number; enabled: number; clean: number; findings: number } | null; testRate: number | null; qualityRate: number | null; score: number | null } };
type Commit = { position: number; sha: string; committed_at: string; additions: number; deletions: number; source_lines: number };
type HistoryPoint = Pick<Commit, 'position' | 'committed_at' | 'source_lines'>;
type Detail = { repository: Repo; branches: Branch[]; branch: string; runs: Run[]; commits: Commit[]; commitPage: number; commitPageSize: number; commitTotal: number; lineHistory: HistoryPoint[]; latestCommit: Commit | null };

function percent(value: number | null): string { return value === null ? '—' : `${Math.round(value * 100)}%`; }
function date(value: string): string { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
function year(value: string): string { return new Date(value).getUTCFullYear().toString(); }

function LineChart({ values, color, label }: { values: number[]; color: string; label: string }) {
  if (!values.length) return <div className="empty">No data yet</div>;
  const width = 700; const height = 180; const max = Math.max(...values); const min = Math.min(...values);
  const points = values.map((value, i) => `${(i / Math.max(1, values.length - 1)) * width},${height - ((value - min) / Math.max(1, max - min)) * (height - 24) - 12}`).join(' ');
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} preserveAspectRatio="none"><line x1="0" y1="168" x2="700" y2="168" stroke="#27423c" /><polyline points={points} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

export default function Dashboard() {
  const [user, setUser] = useState<string | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [branch, setBranch] = useState('main');
  const [commitPage, setCommitPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyMessage, setHistoryMessage] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/repos').then(async (response) => {
    if (response.status === 401) { setLoading(false); return; }
    if (!response.ok) throw new Error('Could not load repositories');
    const data = await response.json() as { user: string; repositories: Repo[] };
    setUser(data.user); setRepos(data.repositories); setSelected(data.repositories[0]?.id ?? null); setLoading(false);
  }).catch((cause: unknown) => { setError(String(cause)); setLoading(false); }); }, []);
  useEffect(() => {
    if (selected === null) return;
    const controller = new AbortController();
    void (async () => {
      const response = await fetch(`/api/repo?id=${selected}&branch=${encodeURIComponent(branch)}&commitPage=${commitPage}`, { signal: controller.signal });
    if (!response.ok) throw new Error('Could not load repository metrics');
    const data = await response.json() as Detail;
    setDetail(data); setCommitPage(data.commitPage); setError('');
    })().catch((cause: unknown) => { if (!controller.signal.aborted) setError(String(cause)); });
    return () => controller.abort();
  }, [selected, branch, commitPage, refreshKey]);
  const latest = detail?.runs[0];
  const latestCommit = detail?.latestCommit;
  const currentBranch = detail?.branches.find((item) => item.name === branch);
  const pageCount = Math.max(1, Math.ceil((detail?.commitTotal ?? 0) / (detail?.commitPageSize ?? 25)));
  const firstVisibleCommit = detail?.commitTotal ? (commitPage - 1) * (detail.commitPageSize ?? 25) + 1 : 0;
  const lastVisibleCommit = Math.min(commitPage * (detail?.commitPageSize ?? 25), detail?.commitTotal ?? 0);
  async function addBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const input = event.currentTarget.elements.namedItem('branch') as HTMLInputElement;
    const name = input.value.trim();
    const response = await fetch(`/api/repo?id=${selected}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch: name, enabled: true }) });
    if (!response.ok) { setError('Could not add branch'); return; }
    setHistoryMessage(`Branch ${name} added. Run a local report import to populate its history and metrics.`);
    setBranch(name); setCommitPage(1); input.value = '';
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">T</span><span>TERRA <small>SHARED</small></span></div>
      <div className="side-label">WORKSPACE</div>
      <div className="side-item active">◉ <span>Overview</span></div>
      <div className="side-label repos-label">CONNECTED REPOSITORIES</div>
      {repos.map((repo) => <button className={`repo-button ${selected === repo.id ? 'selected' : ''}`} key={repo.id} onClick={() => { setDetail(null); setSelected(repo.id); setBranch('main'); setCommitPage(1); setSetupOpen(false); }}><span className="repo-dot" />{repo.name}</button>)}
      <div className="side-bottom"><span className="status-dot" /> Read-only GitHub App</div>
    </aside>
    <main>
      <header className="topbar"><span>Engineering intelligence <span className="slash">/</span> Overview</span><div>{user ? <><span className="avatar">{user[0]?.toUpperCase()}</span><span>{user}</span><button className="subtle" onClick={() => { void fetch('/api/logout', { method: 'POST' }).then(() => location.reload()); }}>Sign out</button></> : <span>Terra Shared</span>}</div></header>
      <div className="content">
        {loading ? <div className="empty-state">Loading repository hygiene…</div> : !user ? <div className="intro"><div className="eyebrow">REPOSITORY HYGIENE</div><h1>Understand the health of every connected repository.</h1><p>Track test outcomes, quality findings, and source history across your branches. Access follows GitHub repository admin permissions.</p><a className="primary" href="/api/login">Sign in with GitHub <span>↗</span></a></div> : repos.length === 0 ? <div className="intro"><div className="eyebrow">NO CONNECTED REPOSITORIES</div><h1>Your dashboard is ready.</h1><p>Install the Terra Hygiene GitHub App on a selected repository to start collecting trends.</p><a className="primary" href="https://github.com/apps/terra-hygiene/installations/new">Install GitHub App <span>↗</span></a></div> : <>
          <div className="heading"><div><div className="eyebrow">REPOSITORY HEALTH <span className="eyebrow-sep">/</span> LIVE OVERVIEW</div><h1>{detail ? detail.repository.name : 'Repository overview'}</h1><p>{detail ? `${detail.repository.owner}/${detail.repository.name}` : 'Loading metrics…'}</p></div><div className="heading-actions"><span className="privacy">● {detail?.repository.private ? 'Private' : 'Public'} repository</span><button className="github-link refresh-button" onClick={() => setRefreshKey((value) => value + 1)}>Refresh data</button><button className="github-link refresh-button" onClick={() => setSetupOpen((open) => !open)}>Local report setup</button><a className="github-link add-repository" href="https://github.com/apps/terra-hygiene/installations/new" target="_blank" rel="noreferrer">Add repositories ↗</a><a className="github-link" href={detail ? `https://github.com/${detail.repository.owner}/${detail.repository.name}` : '#'} target="_blank" rel="noreferrer">View on GitHub ↗</a></div></div>
          {setupOpen && <section className="panel collector-setup"><div className="panel-head"><div><div className="eyebrow">LOCAL REPORTS</div><h2>Collect reports from a local checkout</h2></div></div><p>For <code>Terra-Symposium/terra-symposium-website</code>, this command runs its JUnit suite and Terra Quality report from a clean snapshot of the selected branch, then saves only normalized counts in Neon. It does not deploy or use GitHub Actions.</p><pre><code>{`pnpm --dir apps/hygiene run reports:import -- --repository ${detail ? `${detail.repository.owner}/${detail.repository.name}` : 'OWNER/REPOSITORY'} --checkout /path/to/checkout --branch ${branch}`}</code></pre><p className="history-note">The current local importer is configured for the Terra Symposium website test suite. Reports are labeled Local analysis in the dashboard. Other repositories need their JUnit test command added to the importer before importing their test metrics.</p></section>}
          <div className="branches"><span>BRANCH</span>{detail?.branches.filter((item) => item.enabled).map((item) => <button key={item.name} className={branch === item.name ? 'active' : ''} onClick={() => { setDetail(null); setBranch(item.name); setCommitPage(1); }}>{item.name}</button>)}<form onSubmit={(event) => { void addBranch(event); }}><input name="branch" aria-label="Additional branch" placeholder="Add branch" pattern="[A-Za-z0-9._/-]+" /><button title="Track branch">+</button></form></div>
          {error && <div className="error">{error}</div>}
          <section className="kpis"><div className="kpi feature"><div className="kpi-label">HYGIENE SCORE <span>ⓘ</span></div><div className="kpi-value">{latest?.metrics.score ?? '—'}<small>{latest?.metrics.score === null || !latest ? '' : '/ 100'}</small></div><p>{latest?.metrics.score === null || !latest ? 'Awaiting both test and quality reports' : `${latest.source === 'local' ? `Local analysis${latest.quality_policy_branch ? ` · ${latest.quality_policy_branch} quality policy` : ''}` : 'GitHub Actions'} · equal blend of test and quality pass rates`}</p></div><div className="kpi"><div className="kpi-label">TEST PASS RATE</div><div className="kpi-value">{percent(latest?.metrics.testRate ?? null)}</div><p>{latest?.metrics.tests ? `${latest.metrics.tests.passed} passed · ${latest.metrics.tests.failed} failed · ${latest.metrics.tests.skipped} skipped` : 'JUnit report missing'}</p></div><div className="kpi"><div className="kpi-label">QUALITY CHECK RATE</div><div className="kpi-value">{percent(latest?.metrics.qualityRate ?? null)}</div><p>{latest?.metrics.quality ? `${latest.metrics.quality.clean} / ${latest.metrics.quality.enabled} checks clean · ${latest.metrics.quality.findings} findings · ${latest.metrics.quality.enabled}/${latest.metrics.quality.total} coverage` : 'Terra Quality report missing'}</p></div><div className="kpi"><div className="kpi-label">SOURCE LINES</div><div className="kpi-value">{latestCommit?.source_lines.toLocaleString() ?? '—'}</div><p>{latestCommit ? `As of ${date(latestCommit.committed_at)}` : 'Waiting for a full history report'}</p></div></section>
          <div className="grid"><section className="panel"><div className="panel-head"><div><div className="eyebrow">EVOLUTION</div><h2>Source lines over time</h2></div><span>{currentBranch?.history_status === 'complete' ? `${currentBranch.history_count.toLocaleString()} commits indexed` : 'Awaiting full history report'}</span></div><LineChart values={detail?.lineHistory.map((item) => item.source_lines) ?? []} color="#87dcac" label="Source lines per commit" /><div className="chart-foot"><span>{detail?.lineHistory[0] ? year(detail.lineHistory[0].committed_at) : 'First commit'}</span><span>{latestCommit ? year(latestCommit.committed_at) : 'Latest commit'}</span></div></section><section className="panel"><div className="panel-head"><div><div className="eyebrow">REPORTS</div><h2>Score trend</h2></div><span>Latest {detail?.runs.length ?? 0} reports{latest ? ` · ${latest.source === 'local' ? `Local analysis${latest.quality_policy_branch ? ` · ${latest.quality_policy_branch} policy` : ''}` : 'GitHub Actions'}` : ''}</span></div><LineChart values={detail?.runs.slice().reverse().map((item) => item.metrics.score).filter((item): item is number => item !== null) ?? []} color="#e4b773" label="Hygiene score by report" /><div className="chart-foot"><span>Older reports</span><span>Most recent</span></div></section></div>
          <section className="panel history"><div className="panel-head"><div><div className="eyebrow">COMMIT HISTORY</div><h2>Code changes</h2></div><span>{currentBranch?.history_status === 'complete' ? `${currentBranch.history_count.toLocaleString()} commits` : 'No history report yet'}</span></div>{currentBranch && <p className="history-note" role="status">{currentBranch.history_status === 'complete' ? `${currentBranch.history_count.toLocaleString()} reachable branch commits are indexed.` : <>History for {branch} has not been imported. Run <code>history:import</code> from a local checkout to import the branch history.</>} {historyMessage}</p>}<div className="table-wrap"><table><thead><tr><th>COMMIT</th><th>DATE</th><th>ADDED</th><th>REMOVED</th><th>SOURCE LINES</th></tr></thead><tbody>{detail?.commits.map((commit) => <tr key={commit.sha}><td><a href={`https://github.com/${detail.repository.owner}/${detail.repository.name}/commit/${commit.sha}`} target="_blank" rel="noreferrer">{commit.sha.slice(0, 9)} ↗</a></td><td>{date(commit.committed_at)}</td><td className="added">+{commit.additions}</td><td className="removed">−{commit.deletions}</td><td>{commit.source_lines.toLocaleString()}</td></tr>)}</tbody></table>{detail && !detail.commitTotal && currentBranch?.history_status === 'complete' && <div className="empty">This branch has no reachable commits.</div>}</div><div className="pagination"><span>Showing {firstVisibleCommit.toLocaleString()}–{lastVisibleCommit.toLocaleString()} of {(detail?.commitTotal ?? 0).toLocaleString()} indexed commits</span><div><button onClick={() => setCommitPage((page) => Math.max(1, page - 1))} disabled={commitPage <= 1}>Previous</button><span>Page {commitPage.toLocaleString()} of {pageCount.toLocaleString()}</span><button onClick={() => setCommitPage((page) => Math.min(pageCount, page + 1))} disabled={commitPage >= pageCount}>Next</button></div></div></section>
        </>}
      </div>
    </main>
  </div>;
}
