import React from 'react';
import './overview.css';

const DATA_COVERAGE = [
  { label: 'BENCHMARK ROWS', value: '25,524' },
  { label: 'ORGANIZATIONS', value: '2,545' },
  { label: 'COUNTRIES', value: '12' },
  { label: 'INDUSTRIES', value: '42' },
  { label: 'YEARS COVERED', value: '2015–2026' },
  { label: 'PEER ARCHITECTURES', value: '140' },
];

const CAPABILITIES = [
  'Job-Level Benchmarking',
  'Grade-Level Benchmarking',
  'AI-Assisted Estimation',
  'Year Movement Logic',
];

const INTELLIGENCE_STEPS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    title: 'Data Intake',
    desc: 'Upload market files, client structures, and survey extracts.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'Validation',
    desc: 'Review missing fields, duplicates, and benchmark quality.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'Publishing',
    desc: 'Approve only the client-safe cuts and report views.',
  },
];

const BENCHMARK_META = [
  { label: 'TARGET MARKET POSITION', value: 'P50' },
  { label: 'BENCHMARK SCOPE', value: 'Company-wide' },
  { label: 'SELECTED BENCHMARK SCOPE', value: 'Construction | Abu Dhabi | UAE' },
  { label: 'BENCHMARK STATUS', value: 'Tuscan Curated' },
];

export default function PaylenseOverview({ onOpenIntelligence, onOpenBenchmarking }) {
  return (
    <div className="plov-page">

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div className="plov-hero-card">
        <div className="plov-hero-left">
          <h1 className="plov-hero-title">Paylense</h1>
          <span className="plov-badge">COMPENSATION INTELLIGENCE PLATFORM</span>
          <p className="plov-hero-desc">
            A premium compensation intelligence platform for building trust through visible data depth,
            structured market logic, peer architecture design, and company-wide benchmark storytelling.
          </p>
        </div>
        <div className="plov-hero-actions">
          <button className="plov-btn-primary" onClick={onOpenIntelligence}>
            Open Intelligence Core
          </button>
          <button className="plov-btn-ghost" onClick={onOpenBenchmarking}>
            Open Market Benchmarking
          </button>
        </div>
      </div>

      {/* ── Data Coverage ─────────────────────────────────────────────────── */}
      <div className="plov-section-card">
        <p className="plov-section-label">DATA COVERAGE</p>
        <div className="plov-coverage-grid">
          {DATA_COVERAGE.map((item) => (
            <div key={item.label} className="plov-coverage-cell">
              <span className="plov-coverage-label">{item.label}</span>
              <span className="plov-coverage-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Platform Capabilities ─────────────────────────────────────────── */}
      <div className="plov-section-card">
        <p className="plov-section-label">PLATFORM CAPABILITIES</p>
        <div className="plov-caps-grid">
          {CAPABILITIES.map((cap) => (
            <div key={cap} className="plov-cap-pill">{cap}</div>
          ))}
        </div>
      </div>

      {/* ── Bottom two cards ──────────────────────────────────────────────── */}
      <div className="plov-bottom-grid">

        {/* Tuscan Intelligence Core */}
        <div className="plov-card">
          <div className="plov-card-header">
            <div>
              <h3 className="plov-card-title">Tuscan Intelligence Core</h3>
              <p className="plov-card-desc">
                Internal-only intelligence operations for market signal ingestion, peer architecture tagging,
                AI estimation, year movement logic, and controlled benchmark release.
              </p>
            </div>
            <span className="plov-tag plov-tag--internal">Internal</span>
          </div>

          <div className="plov-steps-grid">
            {INTELLIGENCE_STEPS.map((step) => (
              <div key={step.title} className="plov-step-cell">
                <span className="plov-step-icon">{step.icon}</span>
                <span className="plov-step-title">{step.title}</span>
                <span className="plov-step-desc">{step.desc}</span>
              </div>
            ))}
          </div>

          <div className="plov-card-footer">
            <button className="plov-btn-primary" onClick={onOpenIntelligence}>Enter Core</button>
            <button className="plov-btn-ghost">Review Workflow</button>
          </div>
        </div>

        {/* Market Benchmarking View */}
        <div className="plov-card">
          <div className="plov-card-header">
            <div>
              <h3 className="plov-card-title">Market Benchmarking View</h3>
              <p className="plov-card-desc">
                Company-wide benchmark intelligence with job-level and grade-level views, target market
                position analysis, peer architecture storytelling, and consulting-ready outputs.
              </p>
            </div>
            <span className="plov-tag plov-tag--restricted">Restricted Output</span>
          </div>

          <div className="plov-meta-grid">
            {BENCHMARK_META.map((m) => (
              <div key={m.label} className="plov-meta-cell">
                <span className="plov-meta-label">{m.label}</span>
                <span className="plov-meta-value">{m.value}</span>
              </div>
            ))}
          </div>

          <div className="plov-what-box">
            <div className="plov-what-header">
              <span className="plov-what-title">What this benchmarking view demonstrates</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
              </svg>
            </div>
            <p className="plov-what-sub">
              A trust-building output designed for premium compensation benchmarking discussions.
            </p>
            <p className="plov-what-body">
              Present company-wide benchmark positioning, switch between job-level and grade-level report
              styles, and show structured benchmark matrices using approved market data views only.
            </p>
          </div>

          <div className="plov-card-footer">
            <button className="plov-btn-primary" onClick={onOpenBenchmarking}>Open Benchmarking View</button>
            <button className="plov-btn-ghost">Preview Benchmark Outputs</button>
          </div>
        </div>

      </div>
    </div>
  );
}
