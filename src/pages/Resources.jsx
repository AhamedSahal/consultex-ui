import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const ICON = {
  folder: '📁',
  doc:    '📄',
  pdf:    '📕',
  xls:    '📊',
  ppt:    '📊',
  img:    '🖼',
  other:  '📎',
};

function fileIcon(item) {
  if (item.folder) return ICON.folder;
  const ext = item.name.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return ICON.pdf;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return ICON.xls;
  if (['ppt', 'pptx'].includes(ext)) return ICON.ppt;
  if (['doc', 'docx', 'txt'].includes(ext)) return ICON.doc;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return ICON.img;
  return ICON.other;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function Resources() {
  const [tab, setTab] = useState('onedrive'); // 'onedrive' | 'ppt'

  // PPT templates
  const [pptFiles, setPptFiles]   = useState([]);
  const [pptLoading, setPptLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // OneDrive browser
  const [odFiles, setOdFiles]       = useState([]);
  const [odLoading, setOdLoading]   = useState(false);
  const [odError, setOdError]       = useState('');
  const [breadcrumb, setBreadcrumb] = useState([]); // [{id, name}]

  useEffect(() => {
    if (tab === 'ppt') loadPpt();
    if (tab === 'onedrive') loadOneDrive(null);
  }, [tab]);

  // ── PPT ──────────────────────────────────────────────────────────────────────
  const loadPpt = () => {
    setPptLoading(true);
    api.get('/files').then((r) => setPptFiles(r.data)).catch(() => setPptFiles([])).finally(() => setPptLoading(false));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post('/files/upload/ppt', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      loadPpt();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── OneDrive ──────────────────────────────────────────────────────────────────
  const loadOneDrive = (folderId, folderName) => {
    setOdLoading(true);
    setOdError('');
    const params = folderId ? { folderId } : {};
    api.get('/connect/onedrive/files', { params })
      .then((r) => {
        setOdFiles(r.data);
        if (folderId && folderName) {
          setBreadcrumb((prev) => [...prev, { id: folderId, name: folderName }]);
        }
      })
      .catch((err) => setOdError(err.response?.data?.error || 'Failed to load OneDrive files'))
      .finally(() => setOdLoading(false));
  };

  const goBack = () => {
    const prev = breadcrumb.slice(0, -1);
    setBreadcrumb(prev);
    const parentId = prev.length > 0 ? prev[prev.length - 1].id : null;
    loadOneDrive(parentId, null);
  };

  const openItem = (item) => {
    if (item.folder) {
      loadOneDrive(item.id, item.name);
    }
  };

  const openFile = (item) => {
    if (item.folder) return;
    if (item.webUrl) {
      window.open(item.webUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('No URL available for this file.');
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="content-area">
      <div className="page-header">
        <div>
          <h1 className="page-title">Resources</h1>
          <p className="page-desc">Browse OneDrive files and manage PPT templates.</p>
        </div>
        {tab === 'ppt' && (
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <input type="file" accept=".ppt,.pptx" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
            {uploading ? 'Uploading...' : 'Upload PPT Template'}
          </label>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ id: 'onedrive', label: '☁️ OneDrive Files' }, { id: 'ppt', label: '📊 PPT Templates' }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              border:     `2px solid ${tab === t.id ? 'var(--orange)' : '#e5e7eb'}`,
              background: tab === t.id ? 'var(--orange-light, #fff7ed)' : '#fff',
              color:      tab === t.id ? 'var(--orange)' : 'var(--text)',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── OneDrive browser ── */}
      {tab === 'onedrive' && (
        <div className="card">
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 14 }}>
            <span
              style={{ cursor: breadcrumb.length > 0 ? 'pointer' : 'default', color: breadcrumb.length > 0 ? 'var(--orange)' : 'var(--text-muted)', fontWeight: 600 }}
              onClick={() => { setBreadcrumb([]); loadOneDrive(null); }}
            >My Drive</span>
            {breadcrumb.map((b, i) => (
              <React.Fragment key={b.id}>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
                <span
                  style={{ cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default', color: i < breadcrumb.length - 1 ? 'var(--orange)' : 'var(--text)', fontWeight: 600 }}
                  onClick={() => {
                    if (i < breadcrumb.length - 1) {
                      const trimmed = breadcrumb.slice(0, i + 1);
                      setBreadcrumb(trimmed);
                      loadOneDrive(b.id, null);
                    }
                  }}
                >{b.name}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Back button */}
          {breadcrumb.length > 0 && (
            <button onClick={goBack} style={{ marginBottom: 12, background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
              ← Back
            </button>
          )}

          {odError && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
              {odError} — Make sure OneDrive is connected in the <a href="/connect" style={{ color: '#b91c1c' }}>Connect</a> page.
            </div>
          )}

          {odLoading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading files…</p>
          ) : odFiles.length === 0 && !odError ? (
            <p style={{ color: 'var(--text-muted)' }}>This folder is empty.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Size</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Modified</th>
                  <th style={{ padding: '8px 12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {odFiles.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: item.folder ? 'pointer' : 'default' }}
                    onDoubleClick={() => openItem(item)}
                  >
                    <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{fileIcon(item)}</span>
                      <span style={{ fontWeight: item.folder ? 600 : 400 }}>{item.name}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{item.folder ? '—' : formatSize(item.size)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {item.folder ? (
                        <button onClick={() => openItem(item)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Open →</button>
                      ) : (
                        <button
                          onClick={() => openFile(item)}
                          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--orange)' }}
                        >Open</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── PPT Templates ── */}
      {tab === 'ppt' && (
        <div className="card">
          <h3 className="card-title">PPT Templates</h3>
          {pptLoading ? (
            <p>Loading...</p>
          ) : pptFiles.length === 0 ? (
            <p className="card-desc">No PPT templates uploaded yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {pptFiles.map((f) => (
                <li key={f.id} style={{ marginBottom: 8 }}>
                  {f.original_name} — {new Date(f.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default Resources;
