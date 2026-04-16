import React from 'react';
import { Spin } from 'antd';

export default function InsightPanel({ summary, loading, onGenerate, hasData }) {
  return (
    <div className="pl-insight-panel">
      <div className="pl-insight-header">
        <span className="pl-insight-title">
          <span className="pl-insight-icon">✦</span> AI Compensation Insight
        </span>
        <button
          className="pl-insight-btn"
          onClick={onGenerate}
          disabled={loading || !hasData}
        >
          {loading ? <><Spin size="small" style={{ marginRight: 6 }} />Analyzing…</> : '⟳ Generate Insight'}
        </button>
      </div>

      <div className="pl-insight-body">
        {loading ? (
          <div className="pl-insight-loading">
            <Spin size="large" />
            <p>Claude is analyzing your compensation data…</p>
          </div>
        ) : summary ? (
          <div className="pl-insight-text">
            {summary.split('\n').map((line, i) =>
              line.trim() ? <p key={i}>{line}</p> : null
            )}
          </div>
        ) : (
          <div className="pl-insight-empty">
            <span className="pl-insight-empty-icon">📊</span>
            <p>Select a dataset and apply filters, then click <strong>Generate Insight</strong> to get an AI-powered analysis of your compensation data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
