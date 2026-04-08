import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── SVG icon set ─────────────────────────────────────────────── */
const IconDoc = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconAgent = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    <circle cx="18" cy="6" r="2" fill="currentColor" stroke="none" opacity=".5"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconBolt = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const STAT_CARDS = [
  { key: 'total_jds',       label: 'Total JDs',      gradClass: 'rpt-grad-orange', Icon: IconDoc      },
  { key: 'active_agents',   label: 'Available Agents', gradClass: 'rpt-grad-indigo', Icon: IconAgent    },
  { key: 'total_companies', label: 'Companies',      gradClass: 'rpt-grad-green',  Icon: IconBuilding },
  { key: 'sessions_today',  label: 'Sessions Today',  gradClass: 'rpt-grad-pink',   Icon: IconBolt     },
];

/* ── Stat Card ────────────────────────────────────────────────── */
function StatCard({ Icon, value, label, gradClass, loading }) {
  return (
    <div className={`hm-stat-card ${gradClass}`}>
      <div className="hm-stat-top">
        <div className="hm-stat-icon-wrap"><Icon /></div>
      </div>
      <div className="hm-stat-body">
        {loading ? (
          <div className="home-skeleton" style={{ width: 70, height: 40, marginBottom: 6, borderRadius: 10, opacity: 0.3 }} />
        ) : (
          <div className="hm-stat-value">{value ?? 0}</div>
        )}
        <div className="hm-stat-label">{label}</div>
      </div>
    </div>
  );
}

/* ── Activity Chart ───────────────────────────────────────────── */
function ActivityChart({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 120, padding: '8px 8px 0' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <div className="home-skeleton" style={{ width: '100%', height: `${32 + Math.random() * 56}px`, borderRadius: 6 }} />
            <div className="home-skeleton" style={{ width: 22, height: 10, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  const maxJD   = Math.max(...data.map((d) => d.jd_count      || 0), 1);
  const maxSess = Math.max(...data.map((d) => d.session_count || 0), 1);
  const overallMax = Math.max(maxJD, maxSess, 1);

  return (
    <div className="hm-activity-bars">
      {data.map((d, i) => {
        const label = DAY_LABELS[new Date(d.day).getDay()];
        const jdH   = Math.max(Math.round(((d.jd_count      || 0) / overallMax) * 88), d.jd_count      ? 6 : 3);
        const sessH = Math.max(Math.round(((d.session_count || 0) / overallMax) * 88), d.session_count ? 6 : 3);
        const total = (d.jd_count || 0) + (d.session_count || 0);
        return (
          <div key={i} className="hm-bar-col">
            <div className="hm-bar-count">{total > 0 ? total : ''}</div>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', width: '100%', flex: 1, justifyContent: 'center' }}>
              <div className="hm-bar hm-bar-jd"   style={{ height: jdH,   width: '44%' }} title={`${d.jd_count || 0} JDs`} />
              <div className="hm-bar hm-bar-sess" style={{ height: sessH, width: '44%' }} title={`${d.session_count || 0} sessions`} />
            </div>
            <div className="hm-bar-label">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Section Header ───────────────────────────────────────────── */
function SectionHeader({ title, action }) {
  return (
    <div className="hm-section-header">
      <span className="hm-section-title">{title}</span>
      {action}
    </div>
  );
}

/* ── Home Page ────────────────────────────────────────────────── */
function Home({ user }) {
  const [summary,      setSummary]      = useState(null);
  const [timeline,     setTimeline]     = useState([]);
  const [recentJDs,    setRecentJDs]    = useState([]);
  const [topCompanies, setTopCompanies] = useState([]);
  const [loading,      setLoading]      = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    Promise.allSettled([
      api.get('/reports/summary'),
      api.get('/reports/timeline?days=7'),
      api.get('/reports/recent-jds?limit=5'),
      api.get('/reports/by-company?limit=4'),
    ]).then(([s, t, j, c]) => {
      if (s.status === 'fulfilled') setSummary(s.value.data);
      if (t.status === 'fulfilled') setTimeline(t.value.data);
      if (j.status === 'fulfilled') setRecentJDs(j.value.data);
      if (c.status === 'fulfilled') setTopCompanies(c.value.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="hm-root">

      
        <div className="hm-page-header">
          <div className="hm-header-left">
            <div className="hm-greeting">Welcome back,</div>
            <h1 className="hm-username">{user?.name || 'User'} 👋</h1>
            <p className="hm-subtitle">Here's what's happening across your Consultex workspace today.</p>
          </div>
          <Link to="/agents/jd-agent" className="hm-cta-btn">
            <IconPlus /> New JD
          </Link>
        </div>

        
      <div className="hm-stats-grid">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.key}
            Icon={card.Icon}
            value={summary?.[card.key]}
            label={card.label}
            gradClass={card.gradClass}
            loading={loading}
          />
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="hm-main-grid">

        {/* LEFT col */}
        <div className="hm-left-col">

          {/* Activity Chart */}
          <div className="hm-card">
            <SectionHeader
              title="Activity — Last 7 Days"
              action={
                <div className="hm-legend">
                  <span className="hm-legend-dot" style={{ background: '#f97316' }} />JDs
                  <span className="hm-legend-dot" style={{ background: '#818cf8' }} />Sessions
                </div>
              }
            />
            <ActivityChart data={timeline} loading={loading} />
          </div>

          {/* Recent JDs */}
          <div className="hm-card">
            <SectionHeader
              title="Recent JDs"
              action={
                <Link to="/agents/jd-agent" className="hm-link-action">
                  New JD <IconArrow />
                </Link>
              }
            />
            <div className="hm-list">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="hm-list-row hm-list-row--skeleton">
                    <div className="home-skeleton" style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="home-skeleton" style={{ width: '55%', height: 14, marginBottom: 6 }} />
                      <div className="home-skeleton" style={{ width: '30%', height: 11 }} />
                    </div>
                    <div className="home-skeleton" style={{ width: 52, height: 20, borderRadius: 20 }} />
                  </div>
                ))
              ) : recentJDs.length === 0 ? (
                <div className="hm-empty">
                  <span>No JDs yet.</span>
                  <Link to="/agents/jd-agent" className="hm-empty-link">Start with the JD Agent →</Link>
                </div>
              ) : (
                recentJDs.map((jd, idx) => (
                  <Link key={jd.id} to={`/jd/${jd.id}`} className="hm-list-row">
                    <div className="hm-jd-index">{idx + 1}</div>
                    <div className="hm-jd-info">
                      <span className="hm-jd-title">{jd.title || 'Untitled JD'}</span>
                      {jd.company_name && <span className="hm-jd-company">{jd.company_name}</span>}
                    </div>
                    <span className="hm-jd-time">{jd.created_at && timeAgo(jd.created_at)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT col */}
        <div className="hm-right-col">

          {/* Quick Start */}
          <div className="hm-card">
            <SectionHeader title="Quick Start" />
            <div className="hm-agent-list">
              <Link to="/agents/jd-agent" className="hm-agent-card">
                <div className="hm-agent-icon hm-agent-icon--orange">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div className="hm-agent-info">
                  <strong>JD Agent</strong>
                  <span>Generate job descriptions via chat</span>
                </div>
                <div className="hm-agent-arrow"><IconArrow /></div>
              </Link>

              <Link to="/agents/hr-manual-agent" className="hm-agent-card">
                <div className="hm-agent-icon hm-agent-icon--indigo">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div className="hm-agent-info">
                  <strong>HR Manual Agent</strong>
                  <span>Update HR manuals from playbooks</span>
                </div>
                <div className="hm-agent-arrow"><IconArrow /></div>
              </Link>
            </div>
            <Link to="/agents" className="hm-browse-agents">
              Browse all agents <IconArrow />
            </Link>
          </div>

          {/* Top Companies */}
          <div className="hm-card">
            <SectionHeader
              title="Top Companies"
              action={
                <Link to="/companies" className="hm-link-action">
                  View all <IconArrow />
                </Link>
              }
            />
            <div className="hm-list">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="hm-list-row hm-list-row--skeleton">
                    <div className="home-skeleton" style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0 }} />
                    <div className="home-skeleton" style={{ flex: 1, height: 14 }} />
                    <div className="home-skeleton" style={{ width: 52, height: 22, borderRadius: 20 }} />
                  </div>
                ))
              ) : topCompanies.length === 0 ? (
                <div className="hm-empty">
                  <span>No companies yet.</span>
                  <Link to="/companies" className="hm-empty-link">Add one →</Link>
                </div>
              ) : (
                topCompanies.map((c, idx) => (
                  <div key={c.id} className="hm-list-row">
                    <div className="hm-company-rank">{idx + 1}</div>
                    <span className="hm-company-name">{c.name}</span>
                    <span className="hm-company-badge">{c.jd_count} JDs</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Home;
