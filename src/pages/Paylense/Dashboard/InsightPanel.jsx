import React, { useState } from 'react';
import { Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ── Markdown component overrides ─────────────────────────────────────────── */
const MD_COMPONENTS = {
  h2: ({ children }) => (
    <div className="pl-ins-section">
      <div className="pl-ins-section-title">{children}</div>
    </div>
  ),
  h3: ({ children }) => (
    <div className="pl-ins-subsection-title">{children}</div>
  ),
  p: ({ children }) => (
    <p className="pl-ins-para">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="pl-ins-strong">{children}</strong>
  ),
  hr: () => <div className="pl-ins-divider" />,
  table: ({ children }) => (
    <div className="pl-ins-table-wrap">
      <table className="pl-ins-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="pl-ins-thead">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="pl-ins-tr">{children}</tr>,
  th: ({ children }) => <th className="pl-ins-th">{children}</th>,
  td: ({ children }) => <td className="pl-ins-td">{children}</td>,
  ul: ({ children }) => <ul className="pl-ins-ul">{children}</ul>,
  ol: ({ children }) => <ol className="pl-ins-ol">{children}</ol>,
  li: ({ children }) => <li className="pl-ins-li">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="pl-ins-blockquote">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="pl-ins-code">{children}</code>
  ),
};

/* ── Loading pulse skeleton ───────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="pl-ins-skeleton">
      {[100, 72, 88, 55, 90, 65].map((w, i) => (
        <div
          key={i}
          className="pl-ins-skeleton-line"
          style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
      <div className="pl-ins-skeleton-gap" />
      {[95, 60, 80].map((w, i) => (
        <div
          key={i + 10}
          className="pl-ins-skeleton-line"
          style={{ width: `${w}%`, animationDelay: `${(i + 6) * 0.1}s` }}
        />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function InsightPanel({ summary, loading, onGenerate, hasData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="pl-ins-panel">

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className="pl-ins-header">
        <div className="pl-ins-header-left">
          <div className="pl-ins-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21L12 17.77L18.18 21L17 14.14L22 9.27L14.91 8.26L12 2Z"
                fill="currentColor" opacity="0.9" />
            </svg>
          </div>
          <div>
            <div className="pl-ins-header-title">AI Compensation Insight</div>
            <div className="pl-ins-header-sub">Powered by Claude · Compensation data analysis</div>
          </div>
        </div>

        <div className="pl-ins-header-actions">
          {summary && (
            <button
              className="pl-ins-action-btn pl-ins-copy-btn"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? (
                <><span className="pl-ins-btn-icon">✓</span> Copied</>
              ) : (
                <><span className="pl-ins-btn-icon">⎘</span> Copy</>
              )}
            </button>
          )}
          <button
            className="pl-ins-generate-btn"
            onClick={onGenerate}
            disabled={loading || !hasData}
          >
            {loading ? (
              <><Spin size="small" style={{ marginRight: 7 }} />Analyzing…</>
            ) : summary ? (
              <><span className="pl-ins-btn-icon">↺</span> Regenerate</>
            ) : (
              <><span className="pl-ins-btn-icon">✦</span> Generate Insight</>
            )}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="pl-ins-body">

        {/* Loading state */}
        {loading && (
          <div className="pl-ins-loading-wrap">
            <div className="pl-ins-loading-badge">
              <Spin size="small" />
              <span>Claude is analyzing your compensation data…</span>
            </div>
            <Skeleton />
          </div>
        )}

        {/* Empty state */}
        {!loading && !summary && (
          <div className="pl-ins-empty">
            <div className="pl-ins-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#d4c5b0" strokeWidth="1.5" />
                <path d="M12 7v5l3 3" stroke="#d4c5b0" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="pl-ins-empty-title">No insight generated yet</p>
            <p className="pl-ins-empty-hint">
              Apply filters and click <strong>Generate Insight</strong> to get an AI-powered
              analysis of your compensation benchmarks.
            </p>
          </div>
        )}

        {/* Content */}
        {!loading && summary && (
          <div className="pl-ins-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MD_COMPONENTS}
            >
              {summary}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {!loading && summary && (
        <div className="pl-ins-footer">
          <span className="pl-ins-footer-note">
            ⚠ AI-generated analysis. Validate figures against source data before using in reports.
          </span>
          <span className="pl-ins-footer-ts">Generated just now</span>
        </div>
      )}
    </div>
  );
}
