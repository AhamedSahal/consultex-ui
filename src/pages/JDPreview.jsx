import React, { useState } from 'react';
import api from '../api/axios';

function JDPreview({ draft, ragContext = [], onSaveVersion, onSubmitReview }) {
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const j = draft?.generated_jd_json || {};

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    try {
      const { data } = await api.get(`/jd/drafts/${draft.id}/export/pdf`, { responseType: 'blob' });
      const fn = `${(j.job_title || 'JobDescription').replace(/[^a-zA-Z0-9]/g, '_')}_JD.pdf`;
      downloadBlob(data, fn);
    } catch (err) {
      alert(err.response?.data?.message || 'Export failed');
    }
  };

  const exportExcel = async () => {
    try {
      const { data } = await api.get(`/jd/drafts/${draft.id}/export/excel`, { responseType: 'blob' });
      const fn = `${(j.job_title || 'JobDescription').replace(/[^a-zA-Z0-9]/g, '_')}_JD.xlsx`;
      downloadBlob(data, fn);
    } catch (err) {
      alert(err.response?.data?.message || 'Export failed');
    }
  };

  const exportToOneDrive = async (format) => {
    try {
      await api.post(`/jd/drafts/${draft.id}/export/onedrive`, { format });
      alert(`Exported to OneDrive as ${format}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Export failed');
    }
  };

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      await onSaveVersion();
      alert('Version saved');
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      await onSubmitReview();
      alert('Submitted for review');
    } catch (err) {
      alert(err.response?.data?.error || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title">Job Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <strong style={{ color: 'var(--text-muted)', fontSize: 12 }}>Job Title</strong>
            <p style={{ margin: 4 }}>{j.job_title || '-'}</p>
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)', fontSize: 12 }}>Reports To</strong>
            <p style={{ margin: 4 }}>{j.reports_to || '-'}</p>
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)', fontSize: 12 }}>Level</strong>
            <p style={{ margin: 4 }}>{j.level || '-'}</p>
          </div>
          <div>
            <strong style={{ color: 'var(--text-muted)', fontSize: 12 }}>Job Family</strong>
            <p style={{ margin: 4 }}>{j.job_family || j.department || '-'}</p>
          </div>
        </div>
      </div>

      {j.role_summary && (
        <div className="card">
          <h3 className="card-title">Role Summary</h3>
          <p style={{ margin: 0 }}>{j.role_summary}</p>
        </div>
      )}

      {j.responsibilities && Object.keys(j.responsibilities).length > 0 && (
        <div className="card">
          <h3 className="card-title">Responsibilities</h3>
          {Object.entries(j.responsibilities).map(([bucket, items]) => (
            <div key={bucket} style={{ marginBottom: 20 }}>
              <strong>{bucket}</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {(items || []).map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {j.kpis && j.kpis.length > 0 && (
        <div className="card">
          <h3 className="card-title">Key Performance Indicators</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {j.kpis.map((k, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{k}</li>
            ))}
          </ul>
        </div>
      )}

      {j.competencies && (j.competencies.technical?.length || j.competencies.behavioral?.length) && (
        <div className="card">
          <h3 className="card-title">Competencies</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {j.competencies.technical?.length > 0 && (
              <div>
                <strong>Technical</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {j.competencies.technical.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {j.competencies.behavioral?.length > 0 && (
              <div>
                <strong>Behavioral</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {j.competencies.behavioral.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {Array.isArray(ragContext) && ragContext.length > 0 && (
        <div className="card">
          <h3 className="card-title">RAG Context (Playbook Chunks Used)</h3>
          <p style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            The following snippets were retrieved from the agent playbook and used to guide JD generation.
          </p>
          <div style={{ maxHeight: 200, overflow: 'auto', borderRadius: 8, border: '1px solid var(--border-subtle)', padding: 12 }}>
            {ragContext.map((chunk, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 6,
                  background: 'var(--panel-bg)',
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>Chunk {idx + 1}</strong>
                {chunk}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSaveVersion} disabled={saving}>
          {saving ? 'Saving...' : 'Save Version'}
        </button>
        <button className="btn btn-primary" onClick={handleSubmitReview} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit for Review'}
        </button>
        <button className="btn btn-secondary" onClick={exportPdf}>
          Export PDF
        </button>
        <button className="btn btn-secondary" onClick={exportExcel}>
          Export Excel
        </button>
        <button className="btn btn-secondary" onClick={() => exportToOneDrive('pdf')}>
          Export to OneDrive (PDF)
        </button>
        <button className="btn btn-secondary" onClick={() => exportToOneDrive('excel')}>
          Export to OneDrive (Excel)
        </button>
      </div>
    </div>
  );
}

export default JDPreview;
