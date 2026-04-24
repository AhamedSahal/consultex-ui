import React, { useState } from 'react';

const STATIC_ENGAGEMENTS = [
  {
    id: 1,
    initials: 'PF',
    color: '#e67e22',
    company: 'Property FM UAE',
    location: 'Dubai, UAE',
    ftes: '340 FTEs',
    industry: 'Facilities Mgmt',
    entityType: 'Single entity',
    topGrade: 'TG 24',
    progressDone: 28,
    progressTotal: 34,
    status: 'Active',
  },
  {
    id: 2,
    initials: 'EN',
    color: '#2980b9',
    company: 'ENEC',
    location: 'Abu Dhabi, UAE',
    ftes: '2,400 FTEs',
    industry: 'Energy & Utilities',
    entityType: 'Single entity',
    topGrade: 'TG 26',
    progressDone: 44,
    progressTotal: 80,
    status: 'In progress',
  },
  {
    id: 3,
    initials: 'DE',
    color: '#27ae60',
    company: 'Dolphin Energy',
    location: 'Doha, Qatar',
    ftes: '1,200 FTEs',
    industry: 'Oil & Gas',
    entityType: 'Single entity',
    topGrade: 'TG 25',
    progressDone: 9,
    progressTotal: 46,
    status: 'Setup',
  },
];

const STATS = [
  { value: 3, label: 'Active engagements', sub: '+1 this month', subColor: 'var(--orange)' },
  { value: 42, label: 'Roles evaluated', sub: '+8 this week', subColor: 'var(--orange)' },
  { value: 6, label: 'Reports generated', sub: null },
  { value: 14, label: 'Pending evaluation', sub: null },
];

function StatusBadge({ status }) {
  const styles = {
    Active: { background: '#e8f8f0', color: '#27ae60', border: '1px solid #27ae60' },
    'In progress': { background: '#eaf4fb', color: '#2980b9', border: '1px solid #2980b9' },
    Setup: { background: '#f5f5f5', color: '#7f8c8d', border: '1px solid #bdc3c7' },
  };
  return (
    <span style={{ ...styles[status], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
      {status}
    </span>
  );
}

function GradeBadge({ grade }) {
  return (
    <span style={{
      border: '1px solid var(--orange)',
      color: 'var(--orange)',
      borderRadius: 6,
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 600,
      background: 'var(--orange-light)',
    }}>
      {grade}
    </span>
  );
}

function ProgressBar({ done, total }) {
  const pct = Math.round((done / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
      <div style={{ flex: 1, height: 6, background: '#e0ddd8', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--orange)', borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{done}/{total}</span>
    </div>
  );
}

function Avatar({ initials, color }) {
  return (
    <div style={{
      width: 34,
      height: 34,
      borderRadius: 8,
      background: color + '22',
      border: `1.5px solid ${color}44`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 12,
      color,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function JobEvaluationPage() {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text)' }}>Job Evaluation</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Create a company engagement, anchor the top Tuscan Grade, then evaluate each role against the 5-factor framework.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--panel-border)',
            background: '#fff', color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Developer Notes
          </button>
          <button style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--panel-border)',
            background: '#fff', color: 'var(--text)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Export
          </button>
          <button style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--orange)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</span> New Engagement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            background: '#fff',
            border: '1px solid var(--panel-border)',
            borderRadius: 12,
            padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--orange)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 12, color: s.subColor, marginTop: 4, fontWeight: 500 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Active Engagements Table */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--panel-border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 20,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>Active engagements</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Click any row to open the engagement dashboard</div>
          </div>
          <button style={{
            background: 'none', border: 'none', color: 'var(--orange)', fontSize: 13,
            fontWeight: 500, cursor: 'pointer', padding: 0,
          }}>
            View all
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderTop: '1px solid var(--panel-border)' }}>
              {['COMPANY', 'INDUSTRY', 'ENTITY TYPE', 'TOP GRADE', 'PROGRESS', 'STATUS'].map((col) => (
                <th key={col} style={{
                  padding: '10px 16px', textAlign: 'left', fontSize: 11,
                  fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em',
                  background: 'var(--panel-bg)', borderBottom: '1px solid var(--panel-border)',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATIC_ENGAGEMENTS.map((eng) => (
              <tr
                key={eng.id}
                onMouseEnter={() => setHovered(eng.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  cursor: 'pointer',
                  background: hovered === eng.id ? 'var(--orange-light)' : '#fff',
                  borderBottom: '1px solid var(--panel-border)',
                  transition: 'background 0.15s',
                }}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={eng.initials} color={eng.color} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{eng.company}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                        {eng.location} · {eng.ftes}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text)' }}>{eng.industry}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text)' }}>{eng.entityType}</td>
                <td style={{ padding: '14px 16px' }}><GradeBadge grade={eng.topGrade} /></td>
                <td style={{ padding: '14px 16px' }}>
                  <ProgressBar done={eng.progressDone} total={eng.progressTotal} />
                </td>
                <td style={{ padding: '14px 16px' }}><StatusBadge status={eng.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Engagement CTA */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--panel-border)',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Start a new evaluation engagement</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Create the company, anchor the top grade, then evaluate each role using the 5-factor framework.
          </div>
        </div>
        <button style={{
          padding: '10px 22px', borderRadius: 8, border: 'none',
          background: 'var(--orange)', color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        }}>
          New engagement →
        </button>
      </div>
    </div>
  );
}
