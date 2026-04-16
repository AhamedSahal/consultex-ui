import React, { useState } from 'react';
import { Input, Select, Spin } from 'antd';

const POSITION_COLORS = {
  'Below P25':    { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '⚠️' },
  'P25 – P50':    { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', icon: '📊' },
  'P50 – P75':    { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '✅' },
  'Above P75':    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: '⭐' },
};

function getPositionBand(salary, bands) {
  if (!bands?.length || !salary) return null;
  const baseSalaryRow = bands.find(b =>
    b.compensation_element?.toLowerCase().includes('base')
  ) || bands[0];
  if (!baseSalaryRow) return null;
  const s = Number(salary);
  if (s < Number(baseSalaryRow.p25))      return 'Below P25';
  if (s < Number(baseSalaryRow.p50))      return 'P25 – P50';
  if (s < Number(baseSalaryRow.p75))      return 'P50 – P75';
  return 'Above P75';
}

export default function CompensationPositioning({
  onAnalyze, loading, result,
  filterOptions, filters,
}) {
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('');

  const handleSubmit = () => {
    if (!salary || isNaN(Number(salary))) return;
    onAnalyze({ internalSalary: Number(salary), currency });
  };

  return (
    <div className="pl-chart-panel pl-positioning-panel">
      <div className="pl-chart-header" style={{ background: 'linear-gradient(135deg,#2c3e50 0%,#34495e 100%)' }}>
        <span className="pl-chart-icon">✦</span>
        <span className="pl-chart-title" style={{ color: '#fff' }}>AI Compensation Positioning</span>
        <span className="pl-chart-hint" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Where does your salary sit in the market?
        </span>
      </div>

      <div className="pl-positioning-body">
        <div className="pl-positioning-inputs">
          <div className="pl-positioning-field">
            <label className="pl-pos-label">Internal Salary</label>
            <Input
              type="number"
              placeholder="e.g. 180000"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              onPressEnter={handleSubmit}
              size="large"
              style={{ fontWeight: 600, fontSize: 16 }}
            />
          </div>
          <div className="pl-positioning-field" style={{ maxWidth: 160 }}>
            <label className="pl-pos-label">Currency</label>
            <Select
              placeholder="Currency"
              value={currency || undefined}
              onChange={setCurrency}
              size="large"
              style={{ width: '100%' }}
              options={(filterOptions?.currencies || []).map(c => ({ value: c, label: c }))}
            />
          </div>
          <button
            className="pl-pos-btn"
            onClick={handleSubmit}
            disabled={loading || !salary}
          >
            {loading
              ? <><Spin size="small" style={{ marginRight: 6 }} /> Analyzing…</>
              : '⟳ Analyze Position'
            }
          </button>
        </div>

        {loading && (
          <div className="pl-insight-loading" style={{ padding: '24px 0' }}>
            <Spin size="large" />
            <p>Claude is analyzing market position…</p>
          </div>
        )}

        {!loading && result && (
          <div className="pl-positioning-result">
            <div className="pl-pos-result-text">
              {result.split('\n').map((line, i) =>
                line.trim() ? <p key={i}>{line}</p> : null
              )}
            </div>
          </div>
        )}

        {!loading && !result && (
          <div className="pl-insight-empty" style={{ padding: '20px 0' }}>
            <span className="pl-insight-empty-icon">💰</span>
            <p>Enter an internal salary value above and click <strong>Analyze Position</strong> to see where it sits in the market data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
