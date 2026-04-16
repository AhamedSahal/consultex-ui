import React from 'react';
import { Spin } from 'antd';

function fmtK(n) {
  if (n == null) return '—';
  const v = Number(n);
  if (isNaN(v)) return '—';
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
  return v.toLocaleString();
}

const COLORS = [
  '#d4714e','#c9924e','#e67e22','#a0522d','#b87d45',
  '#cf9561','#e8a87c','#8b6347','#d4a96a','#c98b50',
  '#b5651d','#cd853f','#deb887','#a0522d','#8b4513',
];

export default function CountryDistributionChart({ data, loading }) {
  const chartContent = () => {
    if (loading) return <div className="pl-chart-loading"><Spin /></div>;
    if (!data?.length) return <div className="pl-chart-empty">No country data available</div>;

    const rows = data.filter(r => r.avg_p50 != null).slice(0, 12);
    if (!rows.length) return <div className="pl-chart-empty">No P50 data by country</div>;

    const maxVal  = Math.max(...rows.map(r => Number(r.avg_p50)));
    const BAR_H   = 26;
    const GAP     = 6;
    const LABEL_W = 110;
    const BAR_MAX = 300;
    const VAL_W   = 60;
    const W       = LABEL_W + BAR_MAX + VAL_W + 16;
    const H       = rows.length * (BAR_H + GAP) + 16;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="pl-svg">
        {rows.map((r, i) => {
          const y      = 8 + i * (BAR_H + GAP);
          const barW   = Math.max((Number(r.avg_p50) / maxVal) * BAR_MAX, 4);
          const color  = COLORS[i % COLORS.length];

          return (
            <g key={i}>
              {/* Country label */}
              <text x={LABEL_W - 8} y={y + BAR_H / 2 + 4} textAnchor="end"
                fontSize="11" fill="#2c3e50" fontWeight="500">
                {r.country?.length > 14 ? r.country.slice(0, 13) + '…' : r.country}
              </text>

              {/* Bar background */}
              <rect x={LABEL_W} y={y} width={BAR_MAX} height={BAR_H}
                fill="#f0ece6" rx="4" />

              {/* Colored bar */}
              <rect x={LABEL_W} y={y} width={barW} height={BAR_H}
                fill={color} rx="4" opacity="0.85" />

              {/* Subtle shine */}
              <rect x={LABEL_W} y={y} width={barW} height={BAR_H / 2}
                fill="rgba(255,255,255,0.12)" rx="4" />

              {/* Value label */}
              <text x={LABEL_W + BAR_MAX + 8} y={y + BAR_H / 2 + 4}
                fontSize="11" fill="#2c3e50" fontWeight="600">
                {fmtK(r.avg_p50)}
              </text>

              {/* Row count badge */}
              <text x={LABEL_W + barW - 6} y={y + BAR_H / 2 + 4}
                textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.85)">
                {r.row_count} rows
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="pl-chart-panel">
      <div className="pl-chart-header">
        <span className="pl-chart-icon">🌍</span>
        <span className="pl-chart-title">Market P50 by Country</span>
        <span className="pl-chart-hint">Average median salary per country</span>
      </div>
      <div className="pl-chart-body">{chartContent()}</div>
    </div>
  );
}
