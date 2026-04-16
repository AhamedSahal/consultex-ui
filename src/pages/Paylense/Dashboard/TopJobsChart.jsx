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

export default function TopJobsChart({ data, loading }) {
  const chartContent = () => {
    if (loading) return <div className="pl-chart-loading"><Spin /></div>;
    if (!data?.length) return <div className="pl-chart-empty">No job data available</div>;

    const rows = data.filter(r => r.avg_p50 != null).slice(0, 10);
    if (!rows.length) return <div className="pl-chart-empty">No P50 data available</div>;

    const maxP75 = Math.max(...rows.map(r => Number(r.avg_p75 ?? r.avg_p50)));
    const BAR_H  = 28;
    const GAP    = 6;
    const LABEL_W = 170;
    const BAR_MAX = 280;
    const H       = rows.length * (BAR_H + GAP) + 20;
    const W       = LABEL_W + BAR_MAX + 64;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="pl-svg">
        {rows.map((r, i) => {
          const y     = 10 + i * (BAR_H + GAP);
          const cy    = y + BAR_H / 2;
          const wP75  = Math.max(Number(r.avg_p75 ?? r.avg_p50) / maxP75 * BAR_MAX, 4);
          const wP50  = Math.max(Number(r.avg_p50) / maxP75 * BAR_MAX, 4);
          const wP25  = r.avg_p25 ? Math.max(Number(r.avg_p25) / maxP75 * BAR_MAX, 2) : 0;

          const rank = i + 1;
          const rankColor = rank === 1 ? '#d4714e' : rank === 2 ? '#c9924e' : rank === 3 ? '#b87d45' : '#cf9561';

          return (
            <g key={i}>
              {/* Rank badge */}
              <rect x={0} y={y + 6} width={18} height={16} rx="3" fill={rankColor} opacity="0.15" />
              <text x={9} y={y + 18} textAnchor="middle" fontSize="9" fill={rankColor} fontWeight="700">
                #{rank}
              </text>

              {/* Job label */}
              <text x={22} y={cy + 4} fontSize="11" fill="#2c3e50" fontWeight="500">
                {r.job_name?.length > 22 ? r.job_name.slice(0, 20) + '…' : r.job_name}
              </text>

              {/* Grade badge if present */}
              {r.grade && (
                <text x={LABEL_W - 4} y={cy + 4} textAnchor="end"
                  fontSize="9" fill="#a09880">G{r.grade}</text>
              )}

              {/* P75 bar (background range) */}
              <rect x={LABEL_W} y={y + 6} width={wP75} height={BAR_H - 12}
                fill="#f0ece6" rx="3" />

              {/* P25 to P75 range fill */}
              {wP25 > 0 && (
                <rect x={LABEL_W + wP25} y={y + 6}
                  width={Math.max(wP75 - wP25, 2)} height={BAR_H - 12}
                  fill="#c9924e" opacity="0.18" rx="3" />
              )}

              {/* P50 bar */}
              <rect x={LABEL_W} y={y + 6} width={wP50} height={BAR_H - 12}
                fill="url(#topJobGrad)" rx="3" opacity="0.9" />

              {/* P50 value */}
              <text x={LABEL_W + wP50 + 6} y={cy + 4}
                fontSize="11" fill="#d4714e" fontWeight="700">
                {fmtK(r.avg_p50)}
              </text>

              {/* Incumbent count */}
              {r.incumbents > 0 && (
                <text x={W - 4} y={cy + 4} textAnchor="end"
                  fontSize="9" fill="#a09880">
                  {r.incumbents.toLocaleString()} inc.
                </text>
              )}
            </g>
          );
        })}

        <defs>
          <linearGradient id="topJobGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#d4714e" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#c9924e" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  return (
    <div className="pl-chart-panel">
      <div className="pl-chart-header">
        <span className="pl-chart-icon">🏆</span>
        <span className="pl-chart-title">Top Jobs by Market Value</span>
        <span className="pl-chart-hint">Ranked by P50 median salary</span>
      </div>
      <div className="pl-chart-body">{chartContent()}</div>
    </div>
  );
}
