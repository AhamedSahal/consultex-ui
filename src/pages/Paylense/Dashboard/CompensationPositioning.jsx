import React, { useState } from 'react';
import { Input, Select, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ── Markdown overrides (reuse insight panel style) ───────────────────────── */
const MD = {
  h2: ({ children }) => <div className="pl-pos-md-h2">{children}</div>,
  h3: ({ children }) => <div className="pl-pos-md-h3">{children}</div>,
  p:  ({ children }) => <p className="pl-pos-md-p">{children}</p>,
  strong: ({ children }) => <strong className="pl-pos-md-strong">{children}</strong>,
  hr: () => <div className="pl-pos-md-hr" />,
  table: ({ children }) => (
    <div className="pl-ins-table-wrap">
      <table className="pl-ins-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="pl-ins-thead">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr:   ({ children }) => <tr className="pl-ins-tr">{children}</tr>,
  th:   ({ children }) => <th className="pl-ins-th">{children}</th>,
  td:   ({ children }) => <td className="pl-ins-td">{children}</td>,
  ul:   ({ children }) => <ul className="pl-ins-ul">{children}</ul>,
  ol:   ({ children }) => <ol className="pl-ins-ol">{children}</ol>,
  li:   ({ children }) => <li className="pl-ins-li">{children}</li>,
  blockquote: ({ children }) => <blockquote className="pl-ins-blockquote">{children}</blockquote>,
  code: ({ children }) => <code className="pl-ins-code">{children}</code>,
};

/* ── Skeleton loader ──────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="pl-ins-skeleton" style={{ marginTop: 8 }}>
      {[100, 78, 92, 60, 85, 70, 95, 55].map((w, i) => (
        <div key={i} className="pl-ins-skeleton-line"
          style={{ width: `${w}%`, animationDelay: `${i * 0.09}s` }} />
      ))}
    </div>
  );
}

/* ── Salary gauge bar ─────────────────────────────────────────────────────── */
function SalaryGauge({ salary, bands }) {
  if (!bands?.length || !salary) return null;

  const baseSalaryRow = bands.find(b =>
    b.compensation_element?.toLowerCase().includes('base')
  ) || bands[0];
  if (!baseSalaryRow) return null;

  const p10 = Number(baseSalaryRow.p10 ?? 0);
  const p25 = Number(baseSalaryRow.p25 ?? 0);
  const p50 = Number(baseSalaryRow.p50 ?? 0);
  const p75 = Number(baseSalaryRow.p75 ?? 0);
  const p90 = Number(baseSalaryRow.p90 ?? 0);
  const s   = Number(salary);

  if (!p10 && !p90) return null;

  const min = Math.min(p10, s) * 0.97;
  const max = Math.max(p90, s) * 1.03;
  const span = max - min || 1;
  const pct  = (v) => Math.min(Math.max(((v - min) / span) * 100, 0), 100);

  const salaryPct = pct(s);
  let band, bandColor;
  if (s < p25)      { band = 'Below P25';  bandColor = '#ef4444'; }
  else if (s < p50) { band = 'P25 – P50';  bandColor = '#f97316'; }
  else if (s < p75) { band = 'P50 – P75';  bandColor = '#22c55e'; }
  else              { band = 'Above P75';   bandColor = '#3b82f6'; }

  const MARKERS = [
    { val: p25, label: 'P25' },
    { val: p50, label: 'P50' },
    { val: p75, label: 'P75' },
    { val: p90, label: 'P90' },
  ];

  function fmtK(n) {
    if (!n) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
    return n.toLocaleString();
  }

  return (
    <div className="pl-pos-gauge-wrap">
      <div className="pl-pos-gauge-header">
        <span className="pl-pos-gauge-title">Market Position</span>
        <span className="pl-pos-band-pill" style={{ background: bandColor + '18', color: bandColor, borderColor: bandColor + '40' }}>
          {band}
        </span>
      </div>

      {/* Track */}
      <div className="pl-pos-gauge-track">
        {/* Gradient fill */}
        <div className="pl-pos-gauge-fill" />

        {/* P25–P75 IQR highlight */}
        <div className="pl-pos-gauge-iqr"
          style={{ left: `${pct(p25)}%`, width: `${pct(p75) - pct(p25)}%` }} />

        {/* Marker ticks */}
        {MARKERS.map(m => (
          <div key={m.label} className="pl-pos-gauge-marker" style={{ left: `${pct(m.val)}%` }}>
            <div className="pl-pos-gauge-tick" />
            <div className="pl-pos-gauge-tick-label">{m.label}</div>
            <div className="pl-pos-gauge-tick-val">{fmtK(m.val)}</div>
          </div>
        ))}

        {/* Salary needle */}
        <div className="pl-pos-gauge-needle" style={{ left: `${salaryPct}%`, borderBottomColor: bandColor }}>
          <div className="pl-pos-gauge-needle-dot" style={{ background: bandColor }} />
          <div className="pl-pos-gauge-needle-label" style={{ color: bandColor }}>
            {fmtK(s)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function CompensationPositioning({
  onAnalyze, loading, result,
  filterOptions, filters, bands,
}) {
  const [salary, setSalary]     = useState('');
  const [currency, setCurrency] = useState('');
  const [copied, setCopied]     = useState(false);

  const handleSubmit = () => {
    if (!salary || isNaN(Number(salary))) return;
    onAnalyze({ internalSalary: Number(salary), currency });
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isValid = !!salary && !isNaN(Number(salary));

  return (
    <div className="pl-pos-panel">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="pl-pos-header">
        <div className="pl-pos-header-left">
          <div className="pl-pos-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="pl-pos-header-title">AI Compensation Positioning</div>
            <div className="pl-pos-header-sub">Compare an internal salary against market benchmarks</div>
          </div>
        </div>
        {result && (
          <button className="pl-ins-action-btn" onClick={handleCopy} title="Copy analysis">
            {copied
              ? <><span className="pl-ins-btn-icon">✓</span> Copied</>
              : <><span className="pl-ins-btn-icon">⎘</span> Copy</>}
          </button>
        )}
      </div>

      {/* ── Input row ───────────────────────────────────────────────────── */}
      <div className="pl-pos-input-row">
        <div className="pl-pos-input-group" style={{ flex: 3 }}>
          <label className="pl-pos-input-label">Internal Salary</label>
          <div className="pl-pos-input-wrap">
            <span className="pl-pos-input-prefix">
              {currency || '$'}
            </span>
            <input
              className="pl-pos-salary-input"
              type="number"
              placeholder="e.g. 180,000"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isValid && handleSubmit()}
            />
          </div>
        </div>

        <div className="pl-pos-input-group" style={{ flex: 1, minWidth: 130, maxWidth: 180 }}>
          <label className="pl-pos-input-label">Currency</label>
          <Select
            placeholder="Select"
            value={currency || undefined}
            onChange={setCurrency}
            style={{ width: '100%', height: 48 }}
            options={(filterOptions?.currencies || []).map(c => ({ value: c, label: c }))}
          />
        </div>

        <div className="pl-pos-input-group pl-pos-btn-group">
          <label className="pl-pos-input-label" style={{ visibility: 'hidden' }}>Run</label>
          <button
            className="pl-pos-analyze-btn"
            onClick={handleSubmit}
            disabled={loading || !isValid}
          >
            {loading
              ? <><Spin size="small" style={{ marginRight: 8 }} />Analyzing…</>
              : result
                ? <><span>↺</span> Re-analyze</>
                : <><span>⟳</span> Analyze Position</>}
          </button>
        </div>
      </div>

      {/* ── Gauge (only when we have bands data) ────────────────────────── */}
      {!loading && result && (
        <SalaryGauge salary={salary} bands={bands} />
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="pl-pos-body">

        {/* Loading */}
        {loading && (
          <div className="pl-pos-loading-wrap">
            <div className="pl-ins-loading-badge">
              <Spin size="small" />
              <span>Claude is analyzing market position…</span>
            </div>
            <Skeleton />
          </div>
        )}

        {/* Empty */}
        {!loading && !result && (
          <div className="pl-ins-empty" style={{ padding: '32px 24px' }}>
            <div className="pl-ins-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#d4c5b0" strokeWidth="1.5" />
                <path d="M8 12h8M12 8v8" stroke="#d4c5b0" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="pl-ins-empty-title">No analysis yet</p>
            <p className="pl-ins-empty-hint">
              Enter a salary value, select a currency, and click <strong>Analyze Position</strong> to see
              where it sits against market benchmarks.
            </p>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="pl-pos-result-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
              {result}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {!loading && result && (
        <div className="pl-ins-footer">
          <span className="pl-ins-footer-note">
            ⚠ AI-generated analysis. Validate figures against source data before using in reports.
          </span>
          <button
            className="pl-pos-rerun-link"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Run again
          </button>
        </div>
      )}
    </div>
  );
}
