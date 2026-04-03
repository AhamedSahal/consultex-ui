import React, { useEffect, useState, useCallback } from 'react';
import {
  getReportsSummary,
  getReportsTimeline,
  getReportsByModel,
  getReportsByAgent,
  getReportsByCompany,
  getRecentJDs,
  getTokenStats,
} from './service';

/* ─── helpers ─────────────────────────────────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
function pct(val, total) {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}
function fmtTokens(n) {
  const v = parseInt(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'K';
  return String(v);
}
function isOpenAIModel(m) {
  if (!m) return false;
  return m.startsWith('gpt-') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4');
}
function shortModel(m) {
  if (!m) return 'Unknown';
  // Claude
  if (m.includes('opus'))   return 'Claude Opus';
  if (m.includes('sonnet')) return 'Claude Sonnet';
  if (m.includes('haiku'))  return 'Claude Haiku';
  // OpenAI
  if (m === 'gpt-4o')            return 'GPT-4o';
  if (m === 'gpt-4o-mini')       return 'GPT-4o Mini';
  if (m.startsWith('gpt-4o'))    return 'GPT-4o';
  if (m === 'gpt-4-turbo' || m.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
  if (m === 'gpt-4' || m.startsWith('gpt-4'))           return 'GPT-4';
  if (m.includes('gpt-3.5'))     return 'GPT-3.5 Turbo';
  if (m.startsWith('o1'))        return 'o1';
  if (m.startsWith('o3'))        return 'o3';
  if (m.startsWith('o4'))        return 'o4';
  return m;
}
function modelProvider(m) {
  if (!m) return 'unknown';
  return isOpenAIModel(m) ? 'openai' : 'claude';
}
const MODEL_COLORS = {
  'claude opus':   'var(--orange)',
  'claude sonnet': '#a855f7',
  'claude haiku':  '#6366f1',
  'gpt-4o':        '#22c55e',
  'gpt-4o mini':   '#16a34a',
  'gpt-4 turbo':   '#10b981',
  'gpt-4':         '#059669',
  'gpt-3.5 turbo': '#34d399',
  'o1':            '#0ea5e9',
  'o3':            '#0284c7',
  'o4':            '#0369a1',
};
function modelColor(m) {
  if (!m) return '#7f8c8d';
  const k = shortModel(m).toLowerCase();
  return MODEL_COLORS[k] || (isOpenAIModel(m) ? '#22c55e' : '#ec4899');
}

/* ─── sub-components ──────────────────────────────────────────────────── */
function StatCard({ label, value, icon, gradClass, sub }) {
  return (
    <div className={`rpt-stat-card ${gradClass}`}>
      <div className="rpt-stat-icon">{icon}</div>
      <div className="rpt-stat-body">
        <div className="rpt-stat-value">{value ?? '—'}</div>
        <div className="rpt-stat-label">{label}</div>
        {sub && <div className="rpt-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function TimelineChart({ data }) {
  const max = Math.max(...data.map((d) => (d.jd_count || 0) + (d.session_count || 0)), 1);
  const W = 600;
  const H = 110;
  const barW = Math.max(4, Math.floor(W / data.length) - 2);

  return (
    <svg
      className="rpt-timeline-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-label="Activity timeline"
    >
      <defs>
        <linearGradient id="tlGradJD" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="tlGradSess" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const total  = (d.jd_count || 0) + (d.session_count || 0);
        const jdH    = ((d.jd_count || 0) / max) * (H - 12);
        const sessH  = ((d.session_count || 0) / max) * (H - 12);
        const totalH = jdH + sessH;
        const x = i * (W / data.length) + (W / data.length - barW) / 2;
        if (total === 0) return null;
        return (
          <g key={i}>
            <rect x={x} y={H - 12 - jdH} width={barW} height={jdH} fill="url(#tlGradJD)" rx="2" />
            <rect x={x} y={H - 12 - totalH} width={barW} height={sessH} fill="url(#tlGradSess)" rx="2" />
          </g>
        );
      })}
      <line x1="0" y1={H - 12} x2={W} y2={H - 12} stroke="var(--panel-border)" strokeWidth="1" />
    </svg>
  );
}

function TokenTrendChart({ data }) {
  const max = Math.max(...data.map((d) => parseInt(d.total_tokens) || 0), 1);
  const W = 600; const H = 110;
  const barW = Math.max(4, Math.floor(W / data.length) - 2);
  return (
    <svg className="rpt-timeline-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="tokGradPrompt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#f97316" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="tokGradCompl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const pH = ((parseInt(d.prompt_tokens) || 0) / max) * (H - 12);
        const cH = ((parseInt(d.completion_tokens) || 0) / max) * (H - 12);
        const totalH = pH + cH;
        const x = i * (W / data.length) + (W / data.length - barW) / 2;
        if (totalH === 0) return null;
        return (
          <g key={i}>
            <rect x={x} y={H - 12 - pH} width={barW} height={pH} fill="url(#tokGradPrompt)" rx="2" />
            <rect x={x} y={H - 12 - totalH} width={barW} height={cH} fill="url(#tokGradCompl)" rx="2" />
          </g>
        );
      })}
      <line x1="0" y1={H - 12} x2={W} y2={H - 12} stroke="var(--panel-border)" strokeWidth="1" />
    </svg>
  );
}

function BarRow({ label, value, max, color, badge }) {
  const w = pct(value, max || 1);
  return (
    <div className="rpt-bar-row">
      <div className="rpt-bar-label">
        <span>{label}</span>
        {badge && <span className="rpt-badge" style={{ background: color + '22', color }}>{badge}</span>}
      </div>
      <div className="rpt-bar-track">
        <div className="rpt-bar-fill" style={{ width: `${w}%`, background: color }} />
      </div>
      <div className="rpt-bar-val">{value}</div>
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────────────── */
function Reports() {
  const [period, setPeriod]       = useState(30);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [summary, setSummary]     = useState(null);
  const [timeline, setTimeline]   = useState([]);
  const [byModel, setByModel]         = useState({ ai_sessions: [], jd_generations: [] });
  const [byAgent, setByAgent]         = useState([]);
  const [byCompany, setByCompany]     = useState([]);
  const [recentJDs, setRecentJDs]     = useState([]);
  const [tokenStats, setTokenStats]   = useState(null);
  const [activeTab, setActiveTab]     = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, tl, mdl, agt, cmp, jds, tok] = await Promise.all([
        getReportsSummary(),
        getReportsTimeline(period),
        getReportsByModel(),
        getReportsByAgent(),
        getReportsByCompany(10),
        getRecentJDs(10),
        getTokenStats(period),
      ]);
      setSummary(sum);
      setTimeline(tl);
      setByModel(mdl);
      setByAgent(agt);
      setByCompany(cmp);
      setRecentJDs(jds);
      setTokenStats(tok);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  /* derived */
  const maxJD = Math.max(...byCompany.map((c) => parseInt(c.jd_count) || 0), 1);
  const allModels = [
    ...(byModel.jd_generations || []),
    ...(byModel.ai_sessions    || []),
  ].reduce((acc, r) => {
    const key = r.model || 'claude-opus-4-6';
    acc[key] = (acc[key] || 0) + parseInt(r.count || 0);
    return acc;
  }, {});
  const modelEntries = Object.entries(allModels).sort((a, b) => b[1] - a[1]);
  const maxModel = Math.max(...modelEntries.map((e) => e[1]), 1);
  const maxAgent = Math.max(...byAgent.map((a) => parseInt(a.jd_count) || 0), 1);
  const timelineHasData = timeline.some((d) => (d.jd_count || 0) + (d.session_count || 0) > 0);

  return (
    <div className="content-area rpt-page">

      {/* Header */}
      <div className="rpt-header">
        <div>
          <h1 className="page-title rpt-title">
            AI Usage <span className="text-logo-gradient">Reports</span>
          </h1>
          <p className="page-desc">Analytics across agents, models and companies.</p>
        </div>
        <div className="rpt-header-actions">
          <div className="rpt-period-tabs">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                className={`rpt-period-btn${period === d ? ' active' : ''}`}
                onClick={() => setPeriod(d)}
              >
                {d}d
              </button>
            ))}
          </div>
          <button className="rpt-refresh-btn" onClick={load} title="Refresh">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="rpt-tabs">
        {['overview', 'models', 'agents', 'companies', 'activity', 'tokens'].map((tab) => (
          <button
            key={tab}
            className={`rpt-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="rpt-loading">
          <div className="rpt-spinner" />
          <span>Loading analytics…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rpt-error">
          <span>⚠ {error}</span>
          <button onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="rpt-section-stack">
              <div className="rpt-stats-grid">
                <StatCard label="Total JDs Generated"  value={summary?.total_jds ?? 0}       icon="📄" gradClass="rpt-grad-orange" />
                <StatCard label="AI Sessions Today"     value={summary?.sessions_today ?? 0}  icon="⚡" gradClass="rpt-grad-purple" sub="Live count" />
                <StatCard label="Companies"             value={summary?.total_companies ?? 0} icon="🏢" gradClass="rpt-grad-indigo" />
                <StatCard label="Active Agents"         value={summary?.active_agents ?? 0}   icon="🤖" gradClass="rpt-grad-pink"   sub={`${summary?.active_playbooks ?? 0} playbooks ready`} />
              </div>

              <div className="rpt-card rpt-card-full">
                <div className="rpt-card-head">
                  <h3 className="rpt-card-title">Activity Timeline — last {period} days</h3>
                  <div className="rpt-legend">
                    <span className="rpt-legend-dot" style={{ background: '#f97316' }} />JD Generation
                    <span className="rpt-legend-dot" style={{ background: '#a855f7', marginLeft: 12 }} />AI Sessions
                  </div>
                </div>
                {timelineHasData ? (
                  <>
                    <TimelineChart data={timeline} />
                    <div className="rpt-timeline-labels">
                      {timeline
                        .filter((_, i) => i % Math.ceil(timeline.length / 8) === 0)
                        .map((d, i) => <span key={i}>{formatDay(d.day)}</span>)}
                    </div>
                  </>
                ) : (
                  <div className="rpt-empty-inline">No activity in the last {period} days.</div>
                )}
              </div>

              <div className="rpt-two-col">
                <div className="rpt-card">
                  <div className="rpt-card-head">
                    <h3 className="rpt-card-title">Recent JD Generations</h3>
                  </div>
                  {recentJDs.length === 0 ? (
                    <div className="rpt-empty-inline">No JDs yet.</div>
                  ) : (
                    <table className="rpt-table">
                      <thead><tr><th>Title</th><th>Company</th><th>Date</th></tr></thead>
                      <tbody>
                        {recentJDs.slice(0, 6).map((jd) => (
                          <tr key={jd.id}>
                            <td className="rpt-td-primary">{jd.title}</td>
                            <td>{jd.company_name || '—'}</td>
                            <td className="rpt-td-muted">{formatDate(jd.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="rpt-card">
                  <div className="rpt-card-head">
                    <h3 className="rpt-card-title">Top Companies by JDs</h3>
                  </div>
                  {byCompany.length === 0 ? (
                    <div className="rpt-empty-inline">No data yet.</div>
                  ) : (
                    <div className="rpt-bar-list">
                      {byCompany.slice(0, 6).map((c, i) => (
                        <BarRow
                          key={c.id}
                          label={c.name}
                          value={parseInt(c.jd_count) || 0}
                          max={maxJD}
                          color={['var(--orange)', '#a855f7', '#6366f1', '#ec4899', '#f97316', '#22c55e'][i % 6]}
                          badge={`${c.agent_count} agent${c.agent_count !== '1' ? 's' : ''}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MODELS ── */}
          {activeTab === 'models' && (
            <div className="rpt-section-stack">
              <div className="rpt-two-col">
                <div className="rpt-card">
                  <div className="rpt-card-head">
                    <h3 className="rpt-card-title">Model Usage</h3>
                    <span className="rpt-card-badge">{modelEntries.length} active</span>
                  </div>
                  {modelEntries.length === 0 ? (
                    <div className="rpt-empty-inline">No model data yet — tracked as sessions occur.</div>
                  ) : (
                    <div className="rpt-bar-list">
                      {modelEntries.map(([model, count]) => (
                        <BarRow key={model} label={model} value={count} max={maxModel} color={modelColor(model)} badge={shortModel(model)} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="rpt-card">
                  <div className="rpt-card-head">
                    <h3 className="rpt-card-title">Available Models</h3>
                  </div>
                  {[
                    { heading: 'Anthropic Claude', models: [
                      { m: 'claude-opus-4-6',   label: 'Claude Opus',   desc: 'Most capable — default for JD generation & complex analysis.' },
                      { m: 'claude-sonnet-4-6', label: 'Claude Sonnet', desc: 'Balanced speed & quality — ideal for interactive chats.' },
                      { m: 'claude-haiku-4-5',  label: 'Claude Haiku',  desc: 'Fastest & lightest — best for quick lookups.' },
                    ]},
                    { heading: 'OpenAI', models: [
                      { m: 'gpt-4o',       label: 'GPT-4o',        desc: 'OpenAI flagship multimodal model — fast & highly capable.' },
                      { m: 'gpt-4o-mini',  label: 'GPT-4o Mini',   desc: 'Lightweight GPT-4o — great for cost-effective tasks.' },
                      { m: 'gpt-4-turbo',  label: 'GPT-4 Turbo',   desc: 'High-capability GPT-4 with large context window.' },
                      { m: 'gpt-4',        label: 'GPT-4',         desc: 'Original GPT-4 — reliable & well-tested.' },
                      { m: 'gpt-3.5-turbo',label: 'GPT-3.5 Turbo', desc: 'Fast and economical — suitable for lighter tasks.' },
                    ]},
                  ].map(({ heading, models }) => {
                    const total = modelEntries.reduce((s, e) => s + e[1], 0);
                    return (
                      <div key={heading} className="rpt-model-provider-group">
                        <div className="rpt-model-provider-heading">
                          <span className={`rpt-provider-badge rpt-provider-${modelProvider(models[0].m)}`}>
                            {heading}
                          </span>
                        </div>
                        <div className="rpt-model-info-list">
                          {models.map((info) => {
                            const usage = allModels[info.m] || 0;
                            return (
                              <div key={info.m} className="rpt-model-info-row">
                                <div className="rpt-model-dot" style={{ background: modelColor(info.m) }} />
                                <div style={{ flex: 1 }}>
                                  <div className="rpt-model-name">{info.label}</div>
                                  <div className="rpt-model-desc">{info.desc}</div>
                                  {usage > 0 && (
                                    <div className="rpt-bar-track" style={{ marginTop: 6 }}>
                                      <div className="rpt-bar-fill" style={{ width: `${pct(usage, total)}%`, background: modelColor(info.m) }} />
                                    </div>
                                  )}
                                </div>
                                <div className="rpt-model-use-count">{usage > 0 ? usage : '—'}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rpt-card rpt-card-full">
                <div className="rpt-card-head">
                  <h3 className="rpt-card-title">JD Generations by Model</h3>
                </div>
                {byModel.jd_generations.length === 0 ? (
                  <div className="rpt-empty-inline">No JD model data yet.</div>
                ) : (
                  <div className="rpt-grid-models">
                    {byModel.jd_generations.map((r) => {
                      const total = byModel.jd_generations.reduce((s, x) => s + parseInt(x.count), 0);
                      return (
                        <div key={r.model} className="rpt-model-card">
                          <div className="rpt-model-card-icon" style={{ background: modelColor(r.model) + '22' }}>
                            <span style={{ fontSize: 22 }}>🤖</span>
                          </div>
                          <div className="rpt-model-card-name">{shortModel(r.model)}</div>
                          <div className="rpt-model-card-val">{r.count}</div>
                          <div className="rpt-model-card-pct">{pct(parseInt(r.count), total)}% of JDs</div>
                          <div className="rpt-bar-track" style={{ marginTop: 8 }}>
                            <div className="rpt-bar-fill" style={{ width: `${pct(parseInt(r.count), total)}%`, background: modelColor(r.model) }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── AGENTS ── */}
          {activeTab === 'agents' && (
            <div className="rpt-section-stack">
              {byAgent.length === 0 ? (
                <div className="rpt-empty-state">
                  <div className="rpt-empty-icon">🤖</div>
                  <h3>No agent data yet</h3>
                  <p>Configure agents and start using them to see analytics here.</p>
                </div>
              ) : (
                <>
                  <div className="rpt-agent-cards-grid">
                    {byAgent.map((a) => (
                      <div key={a.agent_key || a.agent_name} className="rpt-agent-card">
                        <div className="rpt-agent-card-top">
                          <div className="rpt-agent-badge-icon">{a.badge || '🤖'}</div>
                          <div>
                            <div className="rpt-agent-name">{a.agent_name}</div>
                            <div className="rpt-agent-key">{a.agent_key}</div>
                          </div>
                        </div>
                        <div className="rpt-agent-stats">
                          <div className="rpt-agent-stat">
                            <div className="rpt-agent-stat-val">{parseInt(a.jd_count) || 0}</div>
                            <div className="rpt-agent-stat-lbl">JDs</div>
                          </div>
                          <div className="rpt-agent-stat">
                            <div className="rpt-agent-stat-val">{parseInt(a.session_count) || 0}</div>
                            <div className="rpt-agent-stat-lbl">Sessions</div>
                          </div>
                          <div className="rpt-agent-stat">
                            <div className="rpt-agent-stat-val">{parseInt(a.agent_count) || 0}</div>
                            <div className="rpt-agent-stat-lbl">Active</div>
                          </div>
                        </div>
                        <div className="rpt-bar-track" style={{ marginTop: 10 }}>
                          <div className="rpt-bar-fill" style={{ width: `${pct(parseInt(a.jd_count) || 0, maxAgent)}%`, background: 'var(--orange)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rpt-card rpt-card-full">
                    <div className="rpt-card-head"><h3 className="rpt-card-title">Agent JD Output</h3></div>
                    <div className="rpt-bar-list">
                      {byAgent.map((a) => (
                        <BarRow key={a.agent_key || a.agent_name} label={a.agent_name} value={parseInt(a.jd_count) || 0} max={maxAgent} color="var(--orange)" badge={a.badge} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── COMPANIES ── */}
          {activeTab === 'companies' && (
            <div className="rpt-section-stack">
              {byCompany.length === 0 ? (
                <div className="rpt-empty-state">
                  <div className="rpt-empty-icon">🏢</div>
                  <h3>No company data yet</h3>
                  <p>Companies will appear here once they have JD activity.</p>
                </div>
              ) : (
                <div className="rpt-company-cards">
                  {byCompany.map((c, i) => (
                    <div key={c.id} className="rpt-company-card">
                      <div className="rpt-company-rank" style={{ background: i === 0 ? 'var(--orange)' : i === 1 ? '#a855f7' : '#6366f1' }}>#{i + 1}</div>
                      <div className="rpt-company-info">
                        <div className="rpt-company-name">{c.name}</div>
                        <div className="rpt-company-meta">Last activity: {c.last_jd_at ? formatDate(c.last_jd_at) : 'N/A'}</div>
                      </div>
                      <div className="rpt-company-metrics">
                        <div className="rpt-company-metric">
                          <span className="rpt-company-metric-val">{parseInt(c.jd_count) || 0}</span>
                          <span className="rpt-company-metric-lbl">JDs</span>
                        </div>
                        <div className="rpt-company-metric">
                          <span className="rpt-company-metric-val">{parseInt(c.agent_count) || 0}</span>
                          <span className="rpt-company-metric-lbl">Agents</span>
                        </div>
                        <div className="rpt-company-metric">
                          <span className="rpt-company-metric-val">{parseInt(c.playbook_count) || 0}</span>
                          <span className="rpt-company-metric-lbl">Playbooks</span>
                        </div>
                      </div>
                      <div className="rpt-company-bar">
                        <div
                          className="rpt-company-bar-fill"
                          style={{
                            width: `${pct(parseInt(c.jd_count) || 0, maxJD)}%`,
                            background: i === 0 ? 'var(--orange)' : i === 1 ? '#a855f7' : '#6366f1',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === 'activity' && (
            <div className="rpt-section-stack">
              <div className="rpt-card rpt-card-full">
                <div className="rpt-card-head">
                  <h3 className="rpt-card-title">All Generated JDs</h3>
                  <span className="rpt-card-badge">{recentJDs.length} records</span>
                </div>
                {recentJDs.length === 0 ? (
                  <div className="rpt-empty-inline">No JDs generated yet.</div>
                ) : (
                  <table className="rpt-table rpt-table-full">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Job Title</th>
                        <th>Company</th>
                        <th>Playbook</th>
                        <th>Model</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJDs.map((jd, i) => (
                        <tr key={jd.id}>
                          <td className="rpt-td-muted">{i + 1}</td>
                          <td className="rpt-td-primary">{jd.title}</td>
                          <td>{jd.company_name || '—'}</td>
                          <td className="rpt-td-muted">{jd.playbook_name || '—'}</td>
                          <td>
                            {jd.model
                              ? <span className="rpt-model-pill" style={{ background: modelColor(jd.model) + '22', color: modelColor(jd.model) }}>{shortModel(jd.model)}</span>
                              : '—'}
                          </td>
                          <td className="rpt-td-muted">{formatDate(jd.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {/* ── TOKENS ── */}
          {activeTab === 'tokens' && (
            <div className="rpt-section-stack">

              {/* Token summary cards */}
              <div className="rpt-stats-grid">
                <StatCard
                  label="Total Tokens Used"
                  value={fmtTokens(tokenStats?.totals?.total_tokens)}
                  icon="🔢"
                  gradClass="rpt-grad-orange"
                  sub={`${fmtTokens(tokenStats?.totals?.prompt_tokens)} prompt · ${fmtTokens(tokenStats?.totals?.completion_tokens)} completion`}
                />
                <StatCard
                  label="Total Sessions Logged"
                  value={parseInt(tokenStats?.totals?.total_sessions) || 0}
                  icon="📡"
                  gradClass="rpt-grad-purple"
                />
                <StatCard
                  label="Avg Tokens / Session"
                  value={fmtTokens(
                    tokenStats?.totals?.total_sessions > 0
                      ? Math.round(tokenStats.totals.total_tokens / tokenStats.totals.total_sessions)
                      : 0
                  )}
                  icon="📊"
                  gradClass="rpt-grad-indigo"
                />
                <StatCard
                  label="Models Tracked"
                  value={(tokenStats?.by_model || []).length}
                  icon="🤖"
                  gradClass="rpt-grad-pink"
                  sub="with token data"
                />
              </div>

              {/* Token usage by model — main table */}
              <div className="rpt-card rpt-card-full">
                <div className="rpt-card-head">
                  <h3 className="rpt-card-title">Token Usage by Model</h3>
                  <span className="rpt-card-badge">prompt + completion</span>
                </div>
                {!tokenStats?.by_model?.length ? (
                  <div className="rpt-empty-inline">No token data yet — starts recording on next AI session.</div>
                ) : (
                  <table className="rpt-table rpt-table-full">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Provider</th>
                        <th>Sessions</th>
                        <th>Prompt Tokens</th>
                        <th>Completion Tokens</th>
                        <th>Total Tokens</th>
                        <th>Avg / Session</th>
                        <th style={{ width: 120 }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenStats.by_model.map((r) => {
                        const grandTotal = parseInt(tokenStats.totals?.total_tokens) || 1;
                        const share = pct(parseInt(r.total_tokens), grandTotal);
                        return (
                          <tr key={r.model}>
                            <td>
                              <span className="rpt-model-pill" style={{ background: modelColor(r.model) + '22', color: modelColor(r.model) }}>
                                {shortModel(r.model)}
                              </span>
                            </td>
                            <td>
                              <span className={`rpt-provider-badge rpt-provider-${modelProvider(r.model)}`}>
                                {modelProvider(r.model) === 'openai' ? 'OpenAI' : 'Anthropic'}
                              </span>
                            </td>
                            <td className="rpt-td-primary">{parseInt(r.sessions) || 0}</td>
                            <td>{fmtTokens(r.prompt_tokens)}</td>
                            <td>{fmtTokens(r.completion_tokens)}</td>
                            <td className="rpt-td-primary">{fmtTokens(r.total_tokens)}</td>
                            <td className="rpt-td-muted">{fmtTokens(r.avg_tokens_per_session)}</td>
                            <td>
                              <div className="rpt-token-share-wrap">
                                <div className="rpt-bar-track">
                                  <div className="rpt-bar-fill" style={{ width: `${share}%`, background: modelColor(r.model) }} />
                                </div>
                                <span className="rpt-token-share-pct">{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Bottom row: by session type + token trend */}
              <div className="rpt-two-col">
                <div className="rpt-card">
                  <div className="rpt-card-head">
                    <h3 className="rpt-card-title">Tokens by Session Type</h3>
                  </div>
                  {!tokenStats?.by_type?.length ? (
                    <div className="rpt-empty-inline">No data yet.</div>
                  ) : (
                    <div className="rpt-bar-list">
                      {tokenStats.by_type.map((r, i) => {
                        const maxT = Math.max(...tokenStats.by_type.map((x) => parseInt(x.total_tokens) || 0), 1);
                        const colors = ['var(--orange)', '#a855f7', '#6366f1'];
                        const typeLabel = { chat: 'AI Chat', jd_strict: 'JD (Strict)', jd_template: 'JD (Template)' };
                        return (
                          <BarRow
                            key={r.session_type}
                            label={typeLabel[r.session_type] || r.session_type}
                            value={parseInt(r.total_tokens) || 0}
                            max={maxT}
                            color={colors[i % colors.length]}
                            badge={`${r.sessions} sessions`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rpt-card">
                  <div className="rpt-card-head">
                    <h3 className="rpt-card-title">Provider Split</h3>
                  </div>
                  {!tokenStats?.by_model?.length ? (
                    <div className="rpt-empty-inline">No data yet.</div>
                  ) : (() => {
                    const groups = tokenStats.by_model.reduce((acc, r) => {
                      const p = modelProvider(r.model);
                      acc[p] = (acc[p] || 0) + parseInt(r.total_tokens || 0);
                      return acc;
                    }, {});
                    const grandTotal = Object.values(groups).reduce((s, v) => s + v, 0) || 1;
                    return (
                      <div className="rpt-provider-split">
                        {Object.entries(groups).map(([provider, tokens]) => (
                          <div key={provider} className="rpt-provider-split-row">
                            <div className="rpt-provider-split-label">
                              <span className={`rpt-provider-badge rpt-provider-${provider}`}>
                                {provider === 'openai' ? 'OpenAI' : 'Anthropic'}
                              </span>
                              <span className="rpt-provider-split-tokens">{fmtTokens(tokens)} tokens</span>
                            </div>
                            <div className="rpt-bar-track" style={{ marginTop: 8 }}>
                              <div
                                className="rpt-bar-fill"
                                style={{
                                  width: `${pct(tokens, grandTotal)}%`,
                                  background: provider === 'openai' ? '#22c55e' : 'var(--orange)',
                                }}
                              />
                            </div>
                            <div className="rpt-provider-split-pct">{pct(tokens, grandTotal)}%</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Agent-wise token usage */}
              <div className="rpt-card rpt-card-full">
                <div className="rpt-card-head">
                  <h3 className="rpt-card-title">Token Usage by Agent</h3>
                  <span className="rpt-card-badge">{(tokenStats?.by_agent || []).length} agents</span>
                </div>
                {!(tokenStats?.by_agent?.length) ? (
                  <div className="rpt-empty-inline">No agent token data yet — sessions must be linked to an agent.</div>
                ) : (
                  <table className="rpt-table rpt-table-full">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Sessions</th>
                        <th>Prompt Tokens</th>
                        <th>Completion Tokens</th>
                        <th>Total Tokens</th>
                        <th>Avg / Session</th>
                        <th style={{ width: 130 }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenStats.by_agent.map((r) => {
                        const grandTotal = parseInt(tokenStats.totals?.total_tokens) || 1;
                        const share = pct(parseInt(r.total_tokens), grandTotal);
                        return (
                          <tr key={r.agent_key || r.agent_name}>
                            <td>
                              <div className="rpt-agent-cell">
                                {r.badge && <span className="rpt-agent-badge-icon">{r.badge}</span>}
                                <div>
                                  <div className="rpt-agent-name">{r.agent_name}</div>
                                  {r.agent_key && <div className="rpt-agent-key">{r.agent_key}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="rpt-td-primary">{parseInt(r.sessions) || 0}</td>
                            <td>{fmtTokens(r.prompt_tokens)}</td>
                            <td>{fmtTokens(r.completion_tokens)}</td>
                            <td className="rpt-td-primary">{fmtTokens(r.total_tokens)}</td>
                            <td className="rpt-td-muted">{fmtTokens(r.avg_tokens_per_session)}</td>
                            <td>
                              <div className="rpt-token-share-wrap">
                                <div className="rpt-bar-track">
                                  <div className="rpt-bar-fill" style={{ width: `${share}%`, background: 'var(--orange)' }} />
                                </div>
                                <span className="rpt-token-share-pct">{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Token trend over time */}
              <div className="rpt-card rpt-card-full">
                <div className="rpt-card-head">
                  <h3 className="rpt-card-title">Token Trend — last {period} days</h3>
                  <div className="rpt-legend">
                    <span className="rpt-legend-dot" style={{ background: 'var(--orange)' }} />Prompt
                    <span className="rpt-legend-dot" style={{ background: '#a855f7', marginLeft: 12 }} />Completion
                  </div>
                </div>
                {!tokenStats?.trend?.some((d) => parseInt(d.total_tokens) > 0) ? (
                  <div className="rpt-empty-inline">No token trend data yet.</div>
                ) : (
                  <>
                    <TokenTrendChart data={tokenStats.trend} />
                    <div className="rpt-timeline-labels">
                      {(tokenStats.trend || [])
                        .filter((_, i) => i % Math.ceil((tokenStats.trend.length) / 8) === 0)
                        .map((d, i) => <span key={i}>{formatDay(d.day)}</span>)}
                    </div>
                  </>
                )}
              </div>

            </div>
          )}

        </>
      )}
    </div>
  );
}

export default Reports;
