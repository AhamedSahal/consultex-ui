import React from 'react';
import { Spin } from 'antd';

function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

const CARDS = [
  { key: 'total_jobs',       label: 'Unique Jobs',  icon: '💼', grad: 'pl-card-grad-orange' },
  { key: 'total_companies',  label: 'Companies',    icon: '🏢', grad: 'pl-card-grad-brown'  },
  { key: 'total_countries',  label: 'Countries',    icon: '🌍', grad: 'pl-card-grad-teal'   },
  { key: 'total_elements',   label: 'Pay Elements', icon: '📊', grad: 'pl-card-grad-purple' },
  { key: 'total_incumbents', label: 'Incumbents',   icon: '👥', grad: 'pl-card-grad-blue'   },
];

export default function StatsCards({ data, loading }) {
  if (loading) {
    return (
      <div className="pl-stats-row">
        {CARDS.map(c => (
          <div key={c.key} className={`pl-stat-card ${c.grad}`}>
            <div className="pl-stat-icon">{c.icon}</div>
            <div className="pl-stat-label">{c.label}</div>
            <div className="pl-stat-value"><Spin size="small" /></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pl-stats-row">
      {CARDS.map(c => (
        <div key={c.key} className={`pl-stat-card ${c.grad}`}>
          <div className="pl-stat-icon">{c.icon}</div>
          <div className="pl-stat-label">{c.label}</div>
          <div className="pl-stat-value">{fmtNum(data?.[c.key])}</div>
          {c.key === 'total_incumbents' && data?.total_organizations > 0 && (
            <div className="pl-stat-sub">from {fmtNum(data.total_organizations)} orgs</div>
          )}
        </div>
      ))}
    </div>
  );
}
