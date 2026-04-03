import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import api from '../api/axios';
import Stepper from '../components/Stepper';
import JDPreview from './JDPreview';

const JOB_FAMILIES = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Operations', 'HR', 'Support', 'Other'];
const LEVELS = ['Specialist', 'Analyst', 'Executive', 'Team Lead', 'Assistant Manager', 'Manager', 'Senior Manager', 'Director'];
const TEMPLATE_TYPES = ['STANDARD', 'BSC'];

function JDWizard() {
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const draftId = id || searchParams.get('id');
  const isNew = !draftId || draftId === 'new';

  const [step, setStep] = useState('inputs');
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ragContext, setRagContext] = useState([]);
  const [form, setForm] = useState({
    job_title: '',
    reports_to: '',
    job_family: '',
    level: '',
    role_summary: '',
    template_type: 'STANDARD',
    include_percentages: false,
    raw_responsibilities: ''
  });

  useEffect(() => {
    if (draftId && draftId !== 'new') {
      api.get(`/jd/drafts/${draftId}`).then((r) => {
        const d = r.data;
        setDraft(d);
        setForm({
          job_title: d.job_title || '',
          reports_to: d.reports_to || '',
          job_family: d.job_family || '',
          level: d.level || '',
          role_summary: d.role_summary || '',
          template_type: d.template_type || 'STANDARD',
          include_percentages: d.include_percentages || false,
          raw_responsibilities: d.raw_responsibilities || ''
        });
      }).catch(() => setError('Failed to load draft'));
    } else if (isNew) {
      const agentId = searchParams.get('agentId');
      api.post('/jd/drafts', {
        agent_id: agentId || null,
        job_title: '',
        reports_to: '',
        template_type: 'STANDARD',
        include_percentages: false
      }).then((r) => {
        setDraft(r.data);
      }).catch(() => setError('Failed to create draft'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, isNew]);

  const updateForm = (updates) => setForm((f) => ({ ...f, ...updates }));

  const saveInputs = async () => {
    if (!draft?.id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.patch(`/jd/drafts/${draft.id}`, form);
      setDraft(data);
      setStep('standardize');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async () => {
    if (!draft?.id) return;
    setLoading(true);
    setError('');
    setRagContext([]);
    try {
      const { data } = await api.post(`/jd/drafts/${draft.id}/generate`);
      setDraft(data);
      if (Array.isArray(data.rag_context)) {
        setRagContext(data.rag_context);
      }
      setStep('ready');
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!draft && !isNew) {
    return <div className="content-area">Loading...</div>;
  }
  if (isNew && !draft) {
    return <div className="content-area">Creating draft...</div>;
  }

  return (
    <div className="content-area">
      <Stepper currentStep={step} />

      {step === 'inputs' && (
        <div className="card">
          <h2 className="card-title">Job Description Inputs</h2>
          <p className="card-desc" style={{ marginBottom: 24 }}>Enter the job details to generate a structured JD.</p>

          {error && <p style={{ color: '#e74c3c', marginBottom: 16 }}>{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); saveInputs(); }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Job Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.job_title}
                  onChange={(e) => updateForm({ job_title: e.target.value })}
                  placeholder="e.g. Senior Product Manager"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reports To</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.reports_to}
                  onChange={(e) => updateForm({ reports_to: e.target.value })}
                  placeholder="e.g. Director of Product"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Job Family</label>
                <select
                  className="form-select"
                  value={form.job_family}
                  onChange={(e) => updateForm({ job_family: e.target.value })}
                >
                  <option value="">Select</option>
                  {JOB_FAMILIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Level</label>
                <select
                  className="form-select"
                  value={form.level}
                  onChange={(e) => updateForm({ level: e.target.value })}
                >
                  <option value="">Select</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Role Summary</label>
              <textarea
                className="form-textarea"
                value={form.role_summary}
                onChange={(e) => updateForm({ role_summary: e.target.value })}
                placeholder="Brief overview of the role..."
                rows={4}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Template Type</label>
                <select
                  className="form-select"
                  value={form.template_type}
                  onChange={(e) => updateForm({ template_type: e.target.value })}
                >
                  {TEMPLATE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Include % Contribution</label>
                <select
                  className="form-select"
                  value={form.include_percentages ? 'yes' : 'no'}
                  onChange={(e) => updateForm({ include_percentages: e.target.value === 'yes' })}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Upload Existing JD (optional - paste text or upload later)</label>
              <textarea
                className="form-textarea"
                value={form.raw_responsibilities}
                onChange={(e) => updateForm({ raw_responsibilities: e.target.value })}
                placeholder="Paste existing JD text here (file upload coming soon)"
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Next'}
            </button>
          </form>
        </div>
      )}

      {step === 'standardize' && (
        <div className="card">
          <h2 className="card-title">Standardize</h2>
          <p className="card-desc" style={{ marginBottom: 24 }}>AI will validate inputs, apply verb rules, and generate the JD.</p>

          {error && <p style={{ color: '#e74c3c', marginBottom: 16 }}>{error}</p>}
          <div style={{ marginBottom: 24 }}>
            <div style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, marginBottom: 12 }}>
              <strong>Validating inputs…</strong>
            </div>
            <div style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, marginBottom: 12 }}>
              <strong>Applying verb rules…</strong>
            </div>
            <div style={{ padding: 16, background: 'var(--panel-bg)', borderRadius: 8, marginBottom: 12 }}>
              <strong>Generating JD…</strong>
            </div>
          </div>
          <button className="btn btn-primary" onClick={runGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Continue'}
          </button>
        </div>
      )}

      {step === 'ready' && draft && (
        <JDPreview draft={draft} ragContext={ragContext} onSaveVersion={async () => {
          const { data } = await api.post(`/jd/drafts/${draft.id}/save-version`);
          setDraft(data);
        }} onSubmitReview={async () => {
          const { data } = await api.post(`/jd/drafts/${draft.id}/submit-review`);
          setDraft(data);
        }} />
      )}
    </div>
  );
}

export default JDWizard;
