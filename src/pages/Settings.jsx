import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'members', label: 'Members' },
  { id: 'api', label: 'API Keys' },
  { id: 'plans', label: 'Plans & Usage' },
];

function useCurrentTab() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return params.get('tab') || 'account';
}

function SettingsContent({ tab }) {
  if (tab === 'plans') {
    return (
      <div>
        <div className="page-header">
          <div>
            <h2 className="page-title">Plans &amp; Usage</h2>
            <p className="page-desc">Track your credit usage and plan limits.</p>
          </div>
        </div>
        <div className="settings-metrics-grid">
          <div className="settings-metric-card">
            <h3>Credit Usage</h3>
            <p className="settings-metric-value">0.0000 / 30.0000</p>
            <p className="settings-metric-sub">Used / Total Available</p>
            <div className="settings-metric-bar">
              <div className="settings-metric-bar-fill" style={{ width: '0%' }} />
            </div>
            <p className="settings-metric-foot">0.0% Used • 100.0% Available</p>
          </div>
          <div className="settings-metric-card">
            <h3>Total Used</h3>
            <p className="settings-metric-value">0.0000</p>
            <p className="settings-metric-sub">All-time usage</p>
          </div>
          <div className="settings-metric-card">
            <h3>Total Earned</h3>
            <p className="settings-metric-value">30.0000</p>
            <p className="settings-metric-sub">Lifetime credits</p>
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'members') {
    return (
      <div className="card">
        <h2 className="card-title">Members</h2>
        <p className="card-desc">Manage who has access to this workspace. (Coming soon)</p>
      </div>
    );
  }

  if (tab === 'api') {
    return (
      <div className="card">
        <h2 className="card-title">API Keys</h2>
        <p className="card-desc">Configure API keys for your HR agents. (Coming soon)</p>
      </div>
    );
  }

  // default: account
  return (
    <div className="card">
      <h2 className="card-title">Account</h2>
      <p className="card-desc">Update your profile details and email.</p>
      <div className="form-group">
        <label className="form-label">Name</label>
        <input className="form-input" placeholder="Your name" disabled />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" placeholder="you@example.com" disabled />
      </div>
      <button className="btn btn-secondary" disabled>
        Edit profile (coming soon)
      </button>
    </div>
  );
}

function Settings() {
  const navigate = useNavigate();
  const activeTab = useCurrentTab();

  const setTab = (id) => {
    navigate(`/settings?tab=${id}`);
  };

  return (
    <div className="content-area">
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your app settings here.</p>
          <nav className="settings-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tab.id === activeTab ? 'settings-nav-link active' : 'settings-nav-link'}
                onClick={() => setTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="settings-main">
          <SettingsContent tab={activeTab} />
        </main>
      </div>
    </div>
  );
}

export default Settings;

