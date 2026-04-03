import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

// ── DB type definitions ───────────────────────────────────────────────────────
const DB_TYPES = [
  { id: 'MYSQL',      label: 'MySQL',      desc: 'Relational database',   icon: '🐬', defaultPort: 3306 },
  { id: 'POSTGRESQL', label: 'PostgreSQL', desc: 'Advanced SQL',          icon: '🐘', defaultPort: 5432 },
  { id: 'MONGODB',    label: 'MongoDB',    desc: 'NoSQL database',        icon: '🍃', defaultPort: 27017 },
  { id: 'SQLSERVER',  label: 'SQL Server', desc: 'Microsoft SQL',         icon: '🔷', defaultPort: 1433 },
  { id: 'SUPABASE',   label: 'Supabase',   desc: 'Firebase alternative',  icon: '⚡', defaultPort: 5432 },
];

const PROVIDER_COLOR = {
  MYSQL:      { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  POSTGRESQL: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  MONGODB:    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  SQLSERVER:  { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  SUPABASE:   { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  ONEDRIVE:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
};

const INIT_FORM = {
  name: '', description: '', host: '', port: '',
  db_name: '', username: '', password: '', ssl_enabled: false,
};

// ── Main component ────────────────────────────────────────────────────────────
function Connect() {
  const [searchParams] = useSearchParams();
  const [connections, setConnections]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [message, setMessage]           = useState('');

  // drawer
  const [showDrawer, setShowDrawer]     = useState(false);
  const [connMode, setConnMode]         = useState('DB');   // 'DB' | 'ONEDRIVE'
  const [dbType, setDbType]             = useState('MYSQL');
  const [form, setForm]                 = useState(INIT_FORM);
  const [saving, setSaving]             = useState(false);
  const [testing, setTesting]           = useState(false);
  const [testResult, setTestResult]     = useState(null);
  const [odConnecting, setOdConnecting] = useState(false);

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // ── effects ──────────────────────────────────────────────────────────────
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const err     = searchParams.get('error');
    if (success === '1') setMessage('success:OneDrive connected successfully.');
    if (err)             setMessage('error:Connection failed: ' + decodeURIComponent(err));
  }, [searchParams]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const load = () => {
    api.get('/connect/list')
      .then((r) => setConnections(r.data))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  };

  const openDrawer = () => {
    setConnMode('DB');
    setDbType('MYSQL');
    setForm({ ...INIT_FORM, port: '3306' });
    setTestResult(null);
    setShowDrawer(true);
  };

  const closeDrawer = () => { setShowDrawer(false); setTestResult(null); };

  const pickDbType = (id) => {
    const t = DB_TYPES.find((d) => d.id === id);
    setDbType(id);
    setForm((f) => ({ ...f, port: String(t.defaultPort) }));
    setTestResult(null);
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setTestResult(null);
  };

  // ── actions ───────────────────────────────────────────────────────────────
  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/connect/database/test', {
        provider: dbType, host: form.host, port: form.port,
        db_name: form.db_name, username: form.username,
        password: form.password, ssl_enabled: form.ssl_enabled,
      });
      setTestResult(data);
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.error || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const saveConnection = async () => {
    if (!form.name.trim()) { alert('Please enter a datasource name.'); return; }
    if (!form.host.trim()) { alert('Please enter the host.'); return; }
    setSaving(true);
    try {
      await api.post('/connect/database', { ...form, provider: dbType });
      closeDrawer();
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save datasource');
    } finally {
      setSaving(false);
    }
  };

  const connectOneDrive = async () => {
    setOdConnecting(true);
    try {
      const { data } = await api.get('/connect/onedrive/auth-url');
      window.location.href = data.authUrl;
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to get auth URL');
      setOdConnecting(false);
    }
  };

  const disconnect = async (id) => {
    try {
      await api.post(`/connect/disconnect/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to disconnect');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/connect/database/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // ── misc ──────────────────────────────────────────────────────────────────
  const msgType = message.startsWith('error:') ? 'error' : 'success';
  const msgText = message.replace(/^(error|success):/, '');

  const providerStyle = (p) =>
    PROVIDER_COLOR[p] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };

  const currentDbType = DB_TYPES.find((d) => d.id === dbType);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="content-area">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Datasources</h1>
          <p className="page-desc">
            Connect and manage data sources for your workspace. Create, explore, and configure
            connections to databases, APIs, and other data providers.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openDrawer} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>⊕</span> Add Datasource
        </button>
      </div>

      {/* ── Alert banner ── */}
      {message && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 8, fontSize: 14,
          background: msgType === 'error' ? '#fef2f2' : '#f0fdf4',
          border:     `1px solid ${msgType === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color:      msgType === 'error' ? '#b91c1c' : '#166534',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{msgType === 'success' ? '✓ ' : '✗ '}{msgText}</span>
          <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: 'inherit' }}>×</button>
        </div>
      )}

      {/* ── Table / empty state ── */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : connections.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗄</div>
          <h3>No connections found</h3>
          <p>Add a connection to integrate with external services like OneDrive or a database.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openDrawer}>
            + Add Datasource
          </button>
        </div>
      ) : (
        <table className="connections-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Last updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((c) => {
              const ps = providerStyle(c.provider);
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: ps.bg, border: `1px solid ${ps.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                        {DB_TYPES.find((d) => d.id === c.provider)?.icon || '☁️'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                        {c.description
                          ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.description}</div>
                          : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>System datasource</div>
                        }
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                      {c.provider?.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: c.status === 'CONNECTED' ? '#16a34a' : 'var(--text-muted)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.status === 'CONNECTED' ? '#22c55e' : '#d1d5db', display: 'inline-block', flexShrink: 0 }} />
                      {c.status === 'CONNECTED' ? 'Connected' : 'Disconnected'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {c.last_updated
                      ? new Date(c.last_updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Run / reconnect */}
                      {c.status === 'CONNECTED' ? (
                        <button
                          title="Disconnect"
                          onClick={() => disconnect(c.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'var(--text-muted)', fontSize: 18, borderRadius: 6, lineHeight: 1 }}
                        >▶</button>
                      ) : (
                        <button
                          title="Reconnect"
                          onClick={() => c.provider === 'ONEDRIVE' ? connectOneDrive() : null}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'var(--orange)', fontSize: 13, fontWeight: 600, borderRadius: 6 }}
                        >Reconnect</button>
                      )}
                      {/* Delete (non-OneDrive) */}
                      {c.provider !== 'ONEDRIVE' && (
                        <button
                          title="Delete datasource"
                          onClick={() => setDeleteTarget(c)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#dc2626', fontSize: 16, borderRadius: 6, lineHeight: 1 }}
                        >🗑</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Add Datasource drawer ── */}
      {showDrawer && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}
        >
          <div style={{ width: '100%', maxWidth: 760, height: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(15,23,42,0.15)', animation: 'slideInRight 0.22s ease-out' }}>

            {/* Drawer header */}
            <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Add new datasource</h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Fill the form and save the datasource.</p>
                </div>
                <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
            </div>

            {/* Drawer body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* ── Left: main form ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  {[
                    { id: 'DB',       icon: '🗄', label: 'Database' },
                    { id: 'ONEDRIVE', icon: '☁️', label: 'OneDrive' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setConnMode(tab.id)}
                      style={{
                        padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        border:     `2px solid ${connMode === tab.id ? 'var(--orange)' : '#e5e7eb'}`,
                        background: connMode === tab.id ? 'var(--orange-light)' : '#fff',
                        color:      connMode === tab.id ? 'var(--orange)' : 'var(--text)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span>{tab.icon}</span>{tab.label}
                    </button>
                  ))}
                </div>

                {/* ── OneDrive panel ── */}
                {connMode === 'ONEDRIVE' ? (
                  <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>☁️</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>Connect Microsoft OneDrive</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
                      Authorize access to your OneDrive files.<br />You'll be redirected to the Microsoft login page.
                    </p>
                    <button className="btn btn-primary" onClick={connectOneDrive} disabled={odConnecting} style={{ padding: '12px 32px', fontSize: 15 }}>
                      {odConnecting ? 'Redirecting…' : '🔗 Connect OneDrive'}
                    </button>
                  </div>
                ) : (

                  /* ── Database form ── */
                  <>
                    {/* 1. Select type */}
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Select Datasource Type</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Choose the type of datasource you want to connect</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {DB_TYPES.map((db) => {
                          const active = dbType === db.id;
                          return (
                            <button
                              key={db.id}
                              onClick={() => pickDbType(db.id)}
                              style={{
                                width: 108, padding: '14px 8px 12px', borderRadius: 10, cursor: 'pointer',
                                border:     `2px solid ${active ? '#1e1b18' : '#e5e7eb'}`,
                                background: '#fff', textAlign: 'center', position: 'relative',
                                boxShadow:  active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                                transition: 'border-color 0.15s, box-shadow 0.15s',
                              }}
                            >
                              {active && (
                                <span style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#1e1b18', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                              )}
                              <div style={{ fontSize: 28, marginBottom: 6 }}>{db.icon}</div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{db.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{db.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Datasource information */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Datasource Information</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Provide details about your datasource</div>
                      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                            Name <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <input className="form-input" name="name" value={form.name} onChange={onChange} placeholder="e.g., Production Database" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Type</label>
                          <input className="form-input" value={currentDbType?.label || ''} readOnly style={{ background: '#f9fafb', color: 'var(--text-muted)', cursor: 'default' }} />
                        </div>
                      </div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Description</label>
                      <textarea
                        className="form-textarea"
                        name="description"
                        value={form.description}
                        onChange={onChange}
                        placeholder="Optional: Describe what this datasource is used for"
                        style={{ minHeight: 72 }}
                      />
                    </div>

                    {/* 3. Connection details */}
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 22 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Connection Details</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Configure your {currentDbType?.label?.toLowerCase()} connection
                      </div>

                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Credentials</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                        Add the username, password, url and other credentials to connect to the datasource.
                      </div>

                      {/* Host + Port */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Host &amp; port:</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input className="form-input" name="host" value={form.host} onChange={onChange} placeholder="Hostname / IP address" style={{ flex: 1 }} />
                          <input className="form-input" name="port" value={form.port} onChange={onChange} placeholder="Port" style={{ width: 88 }} type="number" />
                        </div>
                      </div>

                      {/* Database name */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Database name:</label>
                        <input className="form-input" name="db_name" value={form.db_name} onChange={onChange} placeholder="Database name" />
                      </div>

                      {/* Username */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Username:</label>
                        <input className="form-input" name="username" value={form.username} onChange={onChange} placeholder="Username" autoComplete="off" />
                      </div>

                      {/* Password */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Password:</label>
                        <input className="form-input" name="password" value={form.password} onChange={onChange} placeholder="Password" type="password" autoComplete="new-password" />
                      </div>

                      {/* SSL */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" name="ssl_enabled" checked={form.ssl_enabled} onChange={onChange} style={{ width: 15, height: 15 }} />
                        Enable SSL / TLS
                      </label>

                      {/* Test result */}
                      {testResult && (
                        <div style={{
                          marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                          background: testResult.success ? '#f0fdf4' : '#fef2f2',
                          border:     `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                          color:      testResult.success ? '#166534' : '#b91c1c',
                        }}>
                          {testResult.success ? '✓ ' : '✗ '}{testResult.message}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* ── Right: help sidebar ── */}
              <div style={{ width: 196, flexShrink: 0, borderLeft: '1px solid #e5e7eb', padding: '24px 18px', overflowY: 'auto', background: '#fafafa' }}>
                {/* Need help card */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>⚙ Need Help?</div>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--orange)', textDecoration: 'none', marginBottom: 8 }}>
                    <span>📄</span> Documentation
                  </a>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--orange)', textDecoration: 'none', marginBottom: 8 }}>
                    <span>✉</span> Email support
                  </a>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--orange)', textDecoration: 'none' }}>
                    <span>💬</span> Discord
                  </a>
                </div>

                {/* Server IP card (DB only) */}
                {connMode === 'DB' && (
                  <div style={{ background: '#1e1b18', borderRadius: 10, padding: 14, color: '#fff' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Server IP Address</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 12, lineHeight: 1.5 }}>
                      Add our server IP to your database whitelist
                    </div>
                    <button style={{ width: '100%', padding: '8px', borderRadius: 8, background: '#3d3a36', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      👁 Show IP Address
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer footer */}
            <div style={{ padding: '14px 32px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={closeDrawer} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✕</span> Cancel
              </button>
              {connMode === 'DB' && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={testConnection}
                    disabled={testing || !form.host}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {testing ? 'Testing…' : <><span>✓</span> Test Connection</>}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={saveConnection}
                    disabled={saving}
                    style={{ background: '#1e1b18', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {saving ? 'Saving…' : <><span>🗄</span> Save Datasource</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <div className="confirm-modal-icon" data-variant="danger" style={{ fontSize: 22 }}>🗑</div>
            <h3 className="confirm-modal-title">Delete Datasource</h3>
            <p className="confirm-modal-message">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="btn confirm-modal-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default Connect;
