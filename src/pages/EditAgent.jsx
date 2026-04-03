import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

function EditAgent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ name: '', template_id: '', status: 'ACTIVE' });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/agents/templates').then((r) => setTemplates(r.data)).catch(() => {});
    api
      .get(`/agents/${id}`)
      .then((r) => {
        const a = r.data;
        setForm({
          name: a.name || '',
          template_id: a.template_id ? String(a.template_id) : '',
          status: a.status || 'ACTIVE'
        });
      })
      .catch(() => setLoadError('Failed to load agent'));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put(`/agents/${id}`, {
        name: form.name,
        template_id: form.template_id || null,
        status: form.status
      });
      navigate('/agents');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update agent');
    } finally {
      setLoading(false);
    }
  };

  if (loadError) {
    return (
      <div className="content-area">
        <p style={{ color: '#e74c3c' }}>{loadError}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/agents')}>
          Back to Agents
        </button>
      </div>
    );
  }

  return (
    <div className="content-area">
      <h1 className="page-title" style={{ marginBottom: 24 }}>
        Edit HR Agent
      </h1>

      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: '#e74c3c', marginBottom: 16 }}>{error}</p>}
        <div className="form-group">
          <label className="form-label">Agent Name</label>
          <input
            type="text"
            className="form-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Job Description Agent"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Template (optional)</label>
          <select
            className="form-select"
            value={form.template_id}
            onChange={(e) => setForm({ ...form, template_id: e.target.value })}
          >
            <option value="">None</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/agents')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditAgent;
