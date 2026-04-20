import React from 'react';
import './intelligence-core.css';

const WORKFLOW_STEPS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'Validation',
    desc: 'Review missing fields, duplicates, and benchmark quality.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'Publishing',
    desc: 'Approve only the client-safe cuts and report views.',
  },
];

const SIGNAL_STATS = [
  { label: 'Records Uploaded', value: '25,524' },
  { label: 'Pending Validation', value: '184' },
  { label: 'Ready to Publish', value: '8 Demo Views' },
];

const ENGINE_FEATURES = [
  {
    title: 'AI Estimation Layer',
    desc: 'Estimate missing benchmark or report columns using approved rules, peer logic, and market patterns before manual approval.',
  },
  {
    title: 'Year Movement Engine',
    desc: 'Regress or extrapolate market values from one year to another using controlled assumptions defined case by case.',
  },
  {
    title: 'Benchmark Matrix Output',
    desc: 'Generate the structured company-wide matrix used internally before publishing only the approved view for meetings or reports.',
  },
  {
    title: 'View Calibration',
    desc: 'Refine selected market views with custom benchmark inputs, tailored peer architecture settings, and approved value adjustments for specific review contexts.',
  },
];

export default function IntelligenceCore() {
  return (
    <div className="plic-page">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="plic-page-header">
        <div>
          <h1 className="plic-page-title">Paylense Intelligence Core</h1>
          <p className="plic-page-subtitle">
            Tuscan-only intelligence operations for data curation, rule logic, quality review, and release control.
          </p>
        </div>
        <button className="plic-btn-primary">Publish Approved View</button>
      </div>

      {/* ── Workflow steps ─────────────────────────────────────────────────── */}
      <div className="plic-steps-grid">
        {WORKFLOW_STEPS.map((step) => (
          <div key={step.title} className="plic-step-card">
            <span className="plic-step-icon">{step.icon}</span>
            <span className="plic-step-title">{step.title}</span>
            <span className="plic-step-desc">{step.desc}</span>
          </div>
        ))}
      </div>

      {/* ── Market Signal Management card ─────────────────────────────────── */}
      <div className="plic-signal-card">
        <div className="plic-signal-header">
          <div>
            <h2 className="plic-signal-title">Market Signal Management</h2>
            <p className="plic-signal-desc">
              Upload and structure market signals by industry, location, company, percentile logic, and linked peer architectures.
            </p>
          </div>
          <div className="plic-signal-actions">
            <button className="plic-btn-ghost">Download Template</button>
            <button className="plic-btn-primary">Upload File</button>
          </div>
        </div>

        {/* Stats row */}
        <div className="plic-stats-row">
          {SIGNAL_STATS.map((s) => (
            <div key={s.label} className="plic-stat-cell">
              <span className="plic-stat-label">{s.label}</span>
              <span className="plic-stat-value">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Engine features grid */}
        <div className="plic-engine-grid">
          {ENGINE_FEATURES.map((f) => (
            <div key={f.title} className="plic-engine-cell">
              <span className="plic-engine-title">{f.title}</span>
              <span className="plic-engine-desc">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
