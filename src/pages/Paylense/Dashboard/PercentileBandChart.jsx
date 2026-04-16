import React from 'react';
import { Spin } from 'antd';

function fmtK(n) {
  if (n == null || n === '') return '';
  const v = Number(n);
  if (isNaN(v)) return '';
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000)    return (v / 1000).toFixed(0) + 'K';
  return v.toLocaleString();
}

const CHART_H    = 44;   // height of each band row
const CHART_PAD  = 12;   // top/bottom padding
const LABEL_W    = 180;  // left label column
const RIGHT_PAD  = 48;   // right padding for axis labels
const ROW_GAP    = 8;

export default function PercentileBandChart({ data, loading }) {
  const chartContent = () => {
    if (loading) return <div className="pl-chart-loading"><Spin /></div>;
    if (!data?.length) return <div className="pl-chart-empty">No data available</div>;

    // Filter rows with valid p10 and p90
    const rows = data.filter(r => r.p10 != null && r.p90 != null);
    if (!rows.length) return <div className="pl-chart-empty">Insufficient percentile data</div>;

    const globalMin = Math.min(...rows.map(r => Number(r.p10)));
    const globalMax = Math.max(...rows.map(r => Number(r.p90)));
    const range     = globalMax - globalMin || 1;

    const svgW = 560;
    const plotW = svgW - LABEL_W - RIGHT_PAD;
    const svgH  = rows.length * (CHART_H + ROW_GAP) + CHART_PAD * 2;

    const xPos = (val) => LABEL_W + ((Number(val) - globalMin) / range) * plotW;

    // Axis tick values
    const ticks = 5;
    const tickVals = Array.from({ length: ticks }, (_, i) =>
      globalMin + (range / (ticks - 1)) * i
    );

    return (
      <div className="pl-chart-scroll">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="pl-svg" style={{ minWidth: svgW }}>
          {/* Axis tick lines */}
          {tickVals.map((tv, i) => {
            const x = xPos(tv);
            return (
              <g key={i}>
                <line x1={x} y1={CHART_PAD} x2={x} y2={svgH - CHART_PAD}
                  stroke="#e5e2dc" strokeWidth="1" strokeDasharray="3,3" />
                <text x={x} y={svgH - 2} textAnchor="middle"
                  fontSize="9" fill="#a09880">{fmtK(tv)}</text>
              </g>
            );
          })}

          {rows.map((row, i) => {
            const y    = CHART_PAD + i * (CHART_H + ROW_GAP);
            const cy   = y + CHART_H / 2;

            const xP10 = xPos(row.p10);
            const xP25 = xPos(row.p25 ?? row.p10);
            const xP50 = xPos(row.p50 ?? ((Number(row.p25) + Number(row.p75)) / 2));
            const xP75 = xPos(row.p75 ?? row.p90);
            const xP90 = xPos(row.p90);

            const barH = 16;

            return (
              <g key={i}>
                {/* Row background on hover via CSS */}
                <rect x={0} y={y} width={svgW} height={CHART_H}
                  fill={i % 2 === 0 ? '#faf8f5' : '#ffffff'} rx="4" />

                {/* Label */}
                <text x={LABEL_W - 8} y={cy + 4} textAnchor="end"
                  fontSize="11" fill="#2c3e50" fontWeight="500"
                  style={{ fontFamily: 'inherit' }}>
                  {row.compensation_element?.length > 22
                    ? row.compensation_element.slice(0, 20) + '…'
                    : row.compensation_element}
                </text>

                {/* Whisker line P10 → P90 */}
                <line x1={xP10} y1={cy} x2={xP90} y2={cy}
                  stroke="#d4c5b0" strokeWidth="1.5" />

                {/* P10 cap */}
                <line x1={xP10} y1={cy - 6} x2={xP10} y2={cy + 6}
                  stroke="#c9924e" strokeWidth="2" />
                {/* P90 cap */}
                <line x1={xP90} y1={cy - 6} x2={xP90} y2={cy + 6}
                  stroke="#c9924e" strokeWidth="2" />

                {/* IQR box P25 → P75 */}
                <rect x={xP25} y={cy - barH / 2} width={Math.max(xP75 - xP25, 2)} height={barH}
                  fill="url(#bandGrad)" rx="3" opacity="0.85" />

                {/* P50 median line */}
                <line x1={xP50} y1={cy - barH / 2 - 2} x2={xP50} y2={cy + barH / 2 + 2}
                  stroke="#d4714e" strokeWidth="2.5" />

                {/* P50 label */}
                <text x={xP50} y={cy - barH / 2 - 5} textAnchor="middle"
                  fontSize="9" fill="#d4714e" fontWeight="700">{fmtK(row.p50)}</text>

                {/* Currency tag */}
                {row.currency && (
                  <text x={svgW - 4} y={cy + 4} textAnchor="end"
                    fontSize="9" fill="#a09880">{row.currency}</text>
                )}
              </g>
            );
          })}

          {/* Gradient def */}
          <defs>
            <linearGradient id="bandGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#c9924e" stopOpacity="0.3" />
              <stop offset="50%"  stopColor="#d4714e" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#c9924e" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend */}
        <div className="pl-band-legend">
          <span><span className="pl-legend-line" style={{ background: '#c9924e' }} /> P10 / P90</span>
          <span><span className="pl-legend-box" /> P25 – P75 range</span>
          <span><span className="pl-legend-median" /> P50 median</span>
        </div>
      </div>
    );
  };

  return (
    <div className="pl-chart-panel">
      <div className="pl-chart-header">
        <span className="pl-chart-icon">📈</span>
        <span className="pl-chart-title">Percentile Bands by Pay Element</span>
        <span className="pl-chart-hint">P10 → P25 → P50 → P75 → P90</span>
      </div>
      <div className="pl-chart-body">{chartContent()}</div>
    </div>
  );
}
