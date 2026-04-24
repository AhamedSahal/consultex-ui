import React, { useState } from 'react';
import './GradeReport.css';

const TABS = [
  { key: 'basic_salary',    label: 'Monthly Basic Salary'    },
  { key: 'fixed_cash',      label: 'Monthly Fixed Cash'      },
  { key: 'total_earnings',  label: 'Monthly Total Earnings'  },
  { key: 'total_package',   label: 'Monthly Total Package'   },
];

// ── Donut chart for Compensation Mix ────────────────────────────────────────
function CompMixDonut({ mix = {}, avgPackage }) {
  const {
    basic_salary_pct   = 61,
    fixed_cash_pct     = 19,
    total_earnings_pct = 16,
    other_benefits_pct = 4,
  } = mix;

  const segments = [
    { pct: basic_salary_pct,   color: '#3b82f6', label: 'Basic Salary'   },
    { pct: fixed_cash_pct,     color: '#10b981', label: 'Fixed Cash'     },
    { pct: total_earnings_pct, color: '#8b5cf6', label: 'Total Earnings' },
    { pct: other_benefits_pct, color: '#f59e0b', label: 'Other Benefits' },
  ];

  const R = 52; const cx = 70; const cy = 70; const stroke = 22;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="gr-mix-wrap">
      <div className="gr-mix-chart">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {segments.map((seg, i) => {
            const dash = (seg.pct / 100) * circ;
            const el = (
              <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                stroke={seg.color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
              />
            );
            offset += dash;
            return el;
          })}
          <text x={cx} y={cy - 10} textAnchor="middle" className="gr-donut-pkg-label">Total Package</text>
          <text x={cx} y={cy + 6}  textAnchor="middle" className="gr-donut-pkg-value">
            AED {avgPackage ? Number(avgPackage).toLocaleString() : '—'}
          </text>
          <text x={cx} y={cy + 20} textAnchor="middle" className="gr-donut-pkg-sub">(Average)</text>
        </svg>
      </div>
      <div className="gr-mix-legend">
        {segments.map((s, i) => (
          <div key={i} className="gr-mix-leg-item">
            <span className="gr-mix-leg-dot" style={{ background: s.color }} />
            <span className="gr-mix-leg-label">{s.label}</span>
            <span className="gr-mix-leg-pct">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Grade Report component ──────────────────────────────────────────────
export default function GradeReport({ report = {}, onRegenerate, onBack }) {
  const [activeTab, setActiveTab] = useState('total_earnings');

  const {
    _datasetName        = '',
    summary             = {},
    tabs                = {},
    compensation_mix    = {},
    components_overview = {},
    key_insights        = [],
    participating_companies = [],
  } = report;

  // Derive subtitle from dataset name
  // e.g. "GRD 001 — Asset Management" → "Asset Management in UAE"
  const datasetTitle = _datasetName
    ? _datasetName.replace(/^GRD\s*\d+\s*[—-]\s*/i, '').trim()
    : 'Market Data';

  const currentTab = tabs[activeTab] || {};
  const tableRows  = currentTab.rows || [];
  const glance     = currentTab.compensation_at_a_glance || {};

  const fmt = (v) => v != null ? Number(v).toLocaleString() : '—';
  const fmtM = (v) => {
    if (v == null) return '—';
    const n = Number(v);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="gr-root">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="gr-header">
        <div className="gr-header-left">
          <h1 className="gr-title">Overall Compensation Report</h1>
          <p className="gr-subtitle">{datasetTitle} in UAE &nbsp;|&nbsp; Monthly Reports</p>
        </div>
        <div className="gr-header-right">
          <button className="gr-btn-secondary" onClick={onRegenerate}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Regenerate
          </button>
          <button className="gr-btn-export">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Report
          </button>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="gr-stat-row">

        <div className="gr-stat-card">
          <div className="gr-stat-icon gr-stat-icon--blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="gr-stat-body">
            <div className="gr-stat-label">TOTAL COMPANIES</div>
            <div className="gr-stat-value">{fmt(summary.total_companies)}</div>
            <div className="gr-stat-sub">Participants</div>
          </div>
        </div>

        <div className="gr-stat-card">
          <div className="gr-stat-icon gr-stat-icon--teal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="gr-stat-body">
            <div className="gr-stat-label">TOTAL INCUMBENTS</div>
            <div className="gr-stat-value">{fmt(summary.total_incumbents)}</div>
            <div className="gr-stat-sub">Employees</div>
          </div>
        </div>

        <div className="gr-stat-card">
          <div className="gr-stat-icon gr-stat-icon--orange">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <div className="gr-stat-body">
            <div className="gr-stat-label">TOTAL PAYROLL (AED)</div>
            <div className="gr-stat-value gr-stat-value--lg">{fmtM(summary.total_payroll)}</div>
            <div className="gr-stat-sub">Monthly Payroll</div>
          </div>
        </div>

        <div className="gr-stat-card">
          <div className="gr-stat-icon gr-stat-icon--purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div className="gr-stat-body">
            <div className="gr-stat-label">AVERAGE TOTAL EARNINGS</div>
            <div className="gr-stat-value--aed">AED <strong>{fmt(summary.avg_total_earnings)}</strong></div>
            <div className="gr-stat-sub">Per Month</div>
          </div>
        </div>

        <div className="gr-stat-card">
          <div className="gr-stat-icon gr-stat-icon--pink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div className="gr-stat-body">
            <div className="gr-stat-label">AVERAGE TOTAL PACKAGE</div>
            <div className="gr-stat-value--aed">AED <strong>{fmt(summary.avg_total_package)}</strong></div>
            <div className="gr-stat-sub">Per Month</div>
          </div>
        </div>

        <div className="gr-stat-card gr-stat-card--highlight">
          <div className="gr-stat-icon gr-stat-icon--green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div className="gr-stat-body">
            <div className="gr-stat-label">AVERAGE MARKET POSITION</div>
            <div className="gr-stat-value gr-stat-value--pct">{summary.avg_market_position != null ? `${summary.avg_market_position}%` : '—'}</div>
            <div className="gr-stat-sub">vs Market P50</div>
          </div>
        </div>

      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="gr-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`gr-tab${activeTab === t.key ? ' gr-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Main content grid ──────────────────────────────────────────────── */}
      <div className="gr-content-grid">

        {/* Left: Earnings Summary table */}
        <div className="gr-table-section">
          <div className="gr-section-title">
            {TABS.find(t => t.key === activeTab)?.label.toUpperCase()} SUMMARY
            <span className="gr-section-sub"> (Monthly in AED)</span>
          </div>
          <div className="gr-table-wrap">
            <table className="gr-table">
              <thead>
                <tr>
                  <th className="gr-th-grade">Grade</th>
                  <th>P90</th>
                  <th>P75</th>
                  <th>P50 (Median)</th>
                  <th>P25</th>
                  <th>P10</th>
                  <th>Average</th>
                  <th>No. of Incumbents</th>
                  <th>No. of Companies</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length > 0 ? tableRows.map((row, i) => (
                  <tr key={i}>
                    <td className="gr-td-grade">{row.grade}</td>
                    <td>{fmt(row.p90)}</td>
                    <td>{fmt(row.p75)}</td>
                    <td>{fmt(row.p50)}</td>
                    <td>{fmt(row.p25)}</td>
                    <td>{fmt(row.p10)}</td>
                    <td>{fmt(row.average)}</td>
                    <td>{fmt(row.no_of_incumbents)}</td>
                    <td>{fmt(row.no_of_companies)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={9} className="gr-empty-row">No data available for this tab.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Compensation at a Glance + Mix */}
        <div className="gr-right-col">

          {/* Compensation at a Glance */}
          <div className="gr-glance-card">
            <div className="gr-glance-title">COMPENSATION AT A GLANCE</div>
            <table className="gr-glance-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Total Earnings (AED)</th>
                  <th>Total Package (AED)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Average (All Grades)', earn: glance.avg_earnings,      pkg: glance.avg_package      },
                  { label: 'Median (P50)',          earn: glance.median_earnings,   pkg: glance.median_package   },
                  { label: 'P75',                   earn: glance.p75_earnings,      pkg: glance.p75_package      },
                  { label: 'P90',                   earn: glance.p90_earnings,      pkg: glance.p90_package      },
                  { label: 'Overall Range Spread (P10 – P90)', earn: glance.range_spread_earnings != null ? `${glance.range_spread_earnings}%` : '—', pkg: glance.range_spread_package != null ? `${glance.range_spread_package}%` : '—' },
                  { label: 'Incumbents',            earn: glance.incumbents,        pkg: glance.incumbents       },
                  { label: 'Companies',             earn: glance.companies,         pkg: glance.companies        },
                ].map((row, i) => (
                  <tr key={i}>
                    <td>{row.label}</td>
                    <td>{typeof row.earn === 'string' ? row.earn : fmt(row.earn)}</td>
                    <td>{typeof row.pkg  === 'string' ? row.pkg  : fmt(row.pkg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compensation Mix */}
          <div className="gr-mix-card">
            <div className="gr-mix-title">
              COMPENSATION MIX
              <span className="gr-mix-sub"> (Average % of Total Package)</span>
            </div>
            <CompMixDonut mix={compensation_mix} avgPackage={summary.avg_total_package} />
          </div>

        </div>
      </div>

      {/* ── Compensation Components Overview ──────────────────────────────── */}
      <div className="gr-components-section">
        <div className="gr-components-header">
          <span className="gr-components-title">COMPENSATION COMPONENTS OVERVIEW</span>
          <span className="gr-components-sub"> (Average per Month - AED)</span>
        </div>
        <div className="gr-components-grid">

          <div className="gr-comp-card gr-comp-card--blue">
            <div className="gr-comp-label">BASIC SALARY</div>
            <div className="gr-comp-value">AED {fmt(components_overview.basic_salary)}</div>
            <div className="gr-comp-sub">{components_overview.basic_salary_pct ?? 61}% of Total Package</div>
          </div>

          <div className="gr-comp-card gr-comp-card--green">
            <div className="gr-comp-label">FIXED CASH</div>
            <div className="gr-comp-value">AED {fmt(components_overview.fixed_cash)}</div>
            <div className="gr-comp-sub">{components_overview.fixed_cash_pct ?? 19}% of Total Package</div>
          </div>

          <div className="gr-comp-card gr-comp-card--purple">
            <div className="gr-comp-label">TOTAL EARNINGS</div>
            <div className="gr-comp-value">AED {fmt(components_overview.total_earnings)}</div>
            <div className="gr-comp-sub">{components_overview.total_earnings_pct ?? 16}% of Total Package</div>
          </div>

          <div className="gr-comp-card gr-comp-card--orange">
            <div className="gr-comp-label">TOTAL PACKAGE</div>
            <div className="gr-comp-value">AED {fmt(components_overview.total_package)}</div>
            <div className="gr-comp-sub">100% of Total Package</div>
          </div>

          {/* Key Insights */}
          <div className="gr-insights-card">
            <div className="gr-insights-title">KEY INSIGHTS</div>
            <ul className="gr-insights-list">
              {key_insights.length > 0
                ? key_insights.map((ins, i) => (
                    <li key={i} className="gr-insights-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      {ins}
                    </li>
                  ))
                : [
                    `The average Total Package across all grades is AED ${fmt(components_overview.total_package)} per month.`,
                    'Higher grades show the highest contribution from variable earnings.',
                    `Overall compensation structure is competitive vs market (${summary.avg_market_position ?? 92}% of Market P50).`,
                  ].map((ins, i) => (
                    <li key={i} className="gr-insights-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      {ins}
                    </li>
                  ))
              }
            </ul>
            {components_overview.fixed_cash_note && (
              <p className="gr-insights-note">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {components_overview.fixed_cash_note}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* ── Participating Companies ────────────────────────────────────────── */}
      {participating_companies.length > 0 && (
        <div className="gr-companies-section">
          <div className="gr-companies-title">
            PARTICIPATING COMPANIES ({participating_companies.length})
          </div>
          <div className="gr-companies-grid">
            {participating_companies.map((company, i) => (
              <div key={i} className="gr-company-item">
                <span className="gr-company-num">{i + 1}</span>
                <span className="gr-company-name">{company}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
