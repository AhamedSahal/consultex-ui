import React from 'react';
import { Spin } from 'antd';

function fmtK(n) {
  if (n == null) return '';
  const v = Number(n);
  if (isNaN(v)) return '';
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
  return v.toString();
}

export default function GradeProgressionChart({ data, loading }) {
  const chartContent = () => {
    if (loading) return <div className="pl-chart-loading"><Spin /></div>;
    if (!data?.length) return <div className="pl-chart-empty">No grade data available</div>;

    const rows = data.filter(r => r.p50 != null);
    if (rows.length < 2) return <div className="pl-chart-empty">Need at least 2 grades</div>;

    const W = 520, H = 220;
    const PAD = { top: 20, right: 20, bottom: 32, left: 52 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const allVals = rows.flatMap(r => [r.p25, r.p50, r.p75].filter(Boolean).map(Number));
    const minV = Math.min(...allVals) * 0.92;
    const maxV = Math.max(...allVals) * 1.05;
    const rangeV = maxV - minV || 1;

    const xStep = plotW / (rows.length - 1);
    const xOf = (i) => PAD.left + i * xStep;
    const yOf = (v) => PAD.top + plotH - ((Number(v) - minV) / rangeV) * plotH;

    // Build path strings
    const pathFor = (key) =>
      rows.map((r, i) => r[key] != null
        ? `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(r[key])}`
        : null
      ).filter(Boolean).join(' ');

    const p50pts = rows.map((r, i) => ({ x: xOf(i), y: yOf(r.p50), val: r.p50 }));

    // Area fill below P50
    const areaPath = [
      `M${xOf(0)},${PAD.top + plotH}`,
      ...rows.map((r, i) => `L${xOf(i)},${yOf(r.p50)}`),
      `L${xOf(rows.length - 1)},${PAD.top + plotH}`,
      'Z',
    ].join(' ');

    // Y-axis ticks
    const yTicks = 4;
    const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
      minV + (rangeV / yTicks) * i
    );

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="pl-svg">
        <defs>
          <linearGradient id="gradeAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#d4714e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#d4714e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis grid & labels */}
        {yTickVals.map((tv, i) => {
          const y = yOf(tv);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="#e5e2dc" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end"
                fontSize="9" fill="#a09880">{fmtK(tv)}</text>
            </g>
          );
        })}

        {/* X-axis grade labels */}
        {rows.map((r, i) => (
          <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle"
            fontSize="9" fill="#7f8c8d">{r.grade}</text>
        ))}

        {/* X-axis baseline */}
        <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH}
          stroke="#d4c5b0" strokeWidth="1.5" />

        {/* P75 band area (soft) */}
        {rows.every(r => r.p75) && (
          <path d={[
            `M${xOf(0)},${yOf(rows[0].p25 ?? rows[0].p50)}`,
            ...rows.map((r, i) => `L${xOf(i)},${yOf(r.p75)}`),
            ...rows.slice().reverse().map((r, i) => `L${xOf(rows.length - 1 - i)},${yOf(r.p25 ?? r.p50)}`),
            'Z',
          ].join(' ')}
            fill="#c9924e" opacity="0.08" />
        )}

        {/* P50 area fill */}
        <path d={areaPath} fill="url(#gradeAreaGrad)" />

        {/* P75 line */}
        {rows.every(r => r.p75) && (
          <path d={pathFor('p75')} fill="none"
            stroke="#c9924e" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
        )}

        {/* P25 line */}
        {rows.every(r => r.p25) && (
          <path d={pathFor('p25')} fill="none"
            stroke="#c9924e" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
        )}

        {/* P50 line */}
        <path d={pathFor('p50')} fill="none"
          stroke="#d4714e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* P50 dots + value labels */}
        {p50pts.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="4" fill="#d4714e" stroke="#fff" strokeWidth="2" />
            <text x={pt.x} y={pt.y - 9} textAnchor="middle"
              fontSize="9" fill="#d4714e" fontWeight="700">{fmtK(pt.val)}</text>
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${PAD.left + 4}, ${PAD.top + 4})`}>
          <line x1="0" y1="5" x2="14" y2="5" stroke="#d4714e" strokeWidth="2.5" />
          <text x="18" y="9" fontSize="9" fill="#7f8c8d">P50 Median</text>
          <line x1="60" y1="5" x2="74" y2="5" stroke="#c9924e" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x="78" y="9" fontSize="9" fill="#7f8c8d">P25 / P75</text>
        </g>
      </svg>
    );
  };

  return (
    <div className="pl-chart-panel">
      <div className="pl-chart-header">
        <span className="pl-chart-icon">📉</span>
        <span className="pl-chart-title">Grade Salary Progression</span>
        <span className="pl-chart-hint">P50 median across grades</span>
      </div>
      <div className="pl-chart-body">{chartContent()}</div>
    </div>
  );
}
