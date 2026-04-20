import React, { useState, useCallback } from 'react';
import { Select, Button, Spin } from 'antd';

function fmtK(n) {
  if (n == null || n === '') return '—';
  const v = Number(n);
  if (isNaN(v)) return '—';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)    return (v / 1_000).toFixed(0) + 'K';
  return v.toLocaleString();
}

const PERCENTILES = [
  { key: 'p10', label: 'P10' },
  { key: 'p25', label: 'P25' },
  { key: 'p50', label: 'P50 (Median)' },
  { key: 'p75', label: 'P75' },
  { key: 'p90', label: 'P90' },
];

function selectOpts(arr = []) {
  return arr.map(v => ({ value: v, label: v }));
}

// Inline bar showing the IQR and P50 position
function MiniBar({ row }) {
  const p10 = Number(row.p10 ?? 0);
  const p25 = Number(row.p25 ?? p10);
  const p50 = Number(row.p50 ?? p25);
  const p75 = Number(row.p75 ?? p50);
  const p90 = Number(row.p90 ?? p75);

  if (!p10 && !p90) return null;

  const range = p90 - p10 || 1;
  const toW = (v) => Math.max(((v - p10) / range) * 100, 0);

  const p25W = toW(p25);
  const p50W = toW(p50);
  const p75W = toW(p75);
  const iqrW = Math.max(p75W - p25W, 1);

  return (
    <div className="pl-bench-minibar">
      {/* full whisker */}
      <div className="pl-bench-whisker" />
      {/* IQR box */}
      <div className="pl-bench-iqr" style={{ left: `${p25W}%`, width: `${iqrW}%` }} />
      {/* P50 tick */}
      <div className="pl-bench-p50tick" style={{ left: `${p50W}%` }} />
    </div>
  );
}

export default function BenchmarkSummary({ filterOptions = {}, uploadId, onFetch }) {
  const [slices, setSlices] = useState({
    country: undefined,
    grade: undefined,
    job_function: undefined,
    compensation_element: undefined,
    currency: undefined,
  });
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);

  const set = (key, val) => setSlices(prev => ({ ...prev, [key]: val || undefined }));

  const handleRun = useCallback(async () => {
    if (!uploadId) return;
    setLoading(true);
    setQueried(true);
    try {
      const result = await onFetch({ uploadId, slices });
      setData(Array.isArray(result) ? result : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [uploadId, slices, onFetch]);

  const hasAnySlice = Object.values(slices).some(Boolean);

  // Determine if we should show currency column
  const hasCurrency = data.some(r => r.currency);

  return (
    <div className="pl-bench-panel">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="pl-chart-header pl-bench-header">
        <span className="pl-chart-icon">🎯</span>
        <span className="pl-chart-title">Benchmark Slice View</span>
        <span className="pl-chart-hint">Filter by dimension to compare percentile bands</span>
      </div>

      {/* ── Slice Filters ─────────────────────────────────────────────── */}
      <div className="pl-bench-filters">
        <div className="pl-bench-filter-item">
          <span className="pl-bench-filter-label">Country</span>
          <Select
            className="pl-bench-select"
            placeholder="All countries"
            allowClear
            showSearch
            value={slices.country}
            onChange={val => set('country', val)}
            options={selectOpts(filterOptions.countries)}
          />
        </div>

        <div className="pl-bench-filter-item">
          <span className="pl-bench-filter-label">Grade</span>
          <Select
            className="pl-bench-select"
            placeholder="All grades"
            allowClear
            showSearch
            value={slices.grade}
            onChange={val => set('grade', val)}
            options={selectOpts(filterOptions.grades)}
          />
        </div>

        <div className="pl-bench-filter-item">
          <span className="pl-bench-filter-label">Job Function</span>
          <Select
            className="pl-bench-select"
            placeholder="All functions"
            allowClear
            showSearch
            value={slices.job_function}
            onChange={val => set('job_function', val)}
            options={selectOpts(filterOptions.job_functions)}
          />
        </div>

        <div className="pl-bench-filter-item">
          <span className="pl-bench-filter-label">Pay Element</span>
          <Select
            className="pl-bench-select"
            placeholder="All elements"
            allowClear
            showSearch
            value={slices.compensation_element}
            onChange={val => set('compensation_element', val)}
            options={selectOpts(filterOptions.compensation_elements)}
          />
        </div>

        <div className="pl-bench-filter-item">
          <span className="pl-bench-filter-label">Currency</span>
          <Select
            className="pl-bench-select"
            placeholder="All currencies"
            allowClear
            showSearch
            value={slices.currency}
            onChange={val => set('currency', val)}
            options={selectOpts(filterOptions.currencies)}
          />
        </div>

        <button
          className="pl-bench-run-btn"
          onClick={handleRun}
          disabled={loading || !uploadId}
        >
          {loading ? <Spin size="small" /> : '⚡ Run'}
        </button>
      </div>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <div className="pl-bench-body">
        {!queried && (
          <div className="pl-bench-empty">
            <span className="pl-bench-empty-icon">🔍</span>
            <span>Select filters above and click <strong>Run</strong> to view benchmark slices</span>
          </div>
        )}

        {queried && loading && (
          <div className="pl-bench-loading"><Spin /> <span>Loading benchmark data…</span></div>
        )}

        {queried && !loading && data.length === 0 && (
          <div className="pl-bench-empty">
            <span className="pl-bench-empty-icon">📭</span>
            <span>No data matches the selected filters</span>
          </div>
        )}

        {queried && !loading && data.length > 0 && (
          <div className="pl-bench-table-wrap">
            <table className="pl-bench-table">
              <thead>
                <tr>
                  <th className="pl-bench-th pl-bench-th-label">Compensation Element</th>
                  {!slices.country       && <th className="pl-bench-th">Country</th>}
                  {!slices.grade         && <th className="pl-bench-th">Grade</th>}
                  {!slices.job_function  && <th className="pl-bench-th">Job Function</th>}
                  {hasCurrency           && <th className="pl-bench-th">Currency</th>}
                  <th className="pl-bench-th pl-bench-th-num">P10</th>
                  <th className="pl-bench-th pl-bench-th-num">P25</th>
                  <th className="pl-bench-th pl-bench-th-num pl-bench-th-p50">P50</th>
                  <th className="pl-bench-th pl-bench-th-num">P75</th>
                  <th className="pl-bench-th pl-bench-th-num">P90</th>
                  <th className="pl-bench-th pl-bench-th-bar">Distribution</th>
                  <th className="pl-bench-th pl-bench-th-num">Incumbents</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'pl-bench-tr-even' : 'pl-bench-tr-odd'}>
                    <td className="pl-bench-td pl-bench-td-label">
                      {row.compensation_element || '—'}
                    </td>
                    {!slices.country      && <td className="pl-bench-td pl-bench-td-dim">{row.country || '—'}</td>}
                    {!slices.grade        && <td className="pl-bench-td pl-bench-td-dim">{row.grade || '—'}</td>}
                    {!slices.job_function && <td className="pl-bench-td pl-bench-td-dim">{row.job_function || '—'}</td>}
                    {hasCurrency          && <td className="pl-bench-td pl-bench-td-dim pl-bench-td-currency">{row.currency || '—'}</td>}
                    <td className="pl-bench-td pl-bench-td-num">{fmtK(row.p10)}</td>
                    <td className="pl-bench-td pl-bench-td-num">{fmtK(row.p25)}</td>
                    <td className="pl-bench-td pl-bench-td-num pl-bench-td-p50">{fmtK(row.p50)}</td>
                    <td className="pl-bench-td pl-bench-td-num">{fmtK(row.p75)}</td>
                    <td className="pl-bench-td pl-bench-td-num">{fmtK(row.p90)}</td>
                    <td className="pl-bench-td pl-bench-td-bar">
                      <MiniBar row={row} />
                    </td>
                    <td className="pl-bench-td pl-bench-td-num pl-bench-td-inc">
                      {row.incumbents != null ? Number(row.incumbents).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary strip */}
            <div className="pl-bench-summary-strip">
              <span>{data.length.toLocaleString()} slice{data.length !== 1 ? 's' : ''}</span>
              {hasAnySlice && (
                <span className="pl-bench-active-filters">
                  Filtered by: {[
                    slices.country && `Country: ${slices.country}`,
                    slices.grade && `Grade: ${slices.grade}`,
                    slices.job_function && `Function: ${slices.job_function}`,
                    slices.compensation_element && `Element: ${slices.compensation_element}`,
                    slices.currency && `Currency: ${slices.currency}`,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
