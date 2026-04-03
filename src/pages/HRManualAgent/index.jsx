import { useEffect, useRef, useState } from 'react';
import { message, Upload } from 'antd';

import {
  BankOutlined,
  BookOutlined,
  FileTextOutlined,
  CloudOutlined,
  UploadOutlined,
  PlayCircleOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  InboxOutlined,
} from '@ant-design/icons';

const MODEL_GROUPS = [
  {
    label: 'Claude',
    color: '#7c3aed',
    models: [
      { id: 'claude-opus-4-6',   name: 'Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6' },
      { id: 'claude-haiku-4-5',  name: 'Haiku 4.5' },
    ],
  },
  {
    label: 'OpenAI',
    color: '#059669',
    models: [
      { id: 'gpt-4o',      name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-4.1',     name: 'GPT-4.1' },
    ],
  },
];

// Reuse JD Agent components — no duplication
import CompanySelectForm   from '../JDAgent/companySelectForm';
import PlaybookListModal   from '../JDAgent/PlaybookListModal';
import PlaybookForm        from '../JDAgent/playbookForm';
import OneDrivePickerModal from './OneDrivePickerModal';
import ProgressModal       from './ProgressModal';
import RunHistory          from './RunHistory';

import {
  fetchCompanies,
  fetchPlaybooks,
  startRun,
  uploadPlaybook,
  deletePlaybook,
} from './service';

import api from '../../api/axios';

function resolveLogoUrl(company) {
  const raw = company?.logo_url || company?.logoUrl;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const p    = raw.startsWith('/') ? raw : `/${raw}`;
  const base = api.defaults.baseURL || '';
  if (!base) return p;
  try {
    const url = new URL(base, window.location.origin);
    return `${url.origin}${p}`;
  } catch {
    const m = base.match(/^https?:\/\/[^/]+/i);
    return `${m ? m[0] : base.replace(/\/+$/, '')}${p}`;
  }
}

// ─── Step tracker ─────────────────────────────────────────────────────────────
function StepTracker({ steps }) {
  return (
    <div className="hrm-track">
      {steps.map((s, i) => (
        <div key={s.label} className={`hrm-track__node${s.done ? ' hrm-track__node--done' : ''}`}>
          <div className="hrm-track__row">
            <div className="hrm-track__circle">
              {s.done ? <CheckCircleFilled /> : <span>{i + 1}</span>}
            </div>
            {i < steps.length - 1 && (
              <div className={`hrm-track__line${s.done ? ' hrm-track__line--done' : ''}`} />
            )}
          </div>
          <span className="hrm-track__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Selection card ───────────────────────────────────────────────────────────
function SelectionCard({ step, icon, title, value, subtitle, onClear, onClick, active }) {
  return (
    <div
      className={`hrm-card${active ? ' hrm-card--active' : ''}`}
      onClick={onClick}
    >
      <div className="hrm-card__step">{step}</div>
      <div className="hrm-card__icon-wrap">{icon}</div>
      <div className="hrm-card__body">
        <div className="hrm-card__label">{title}</div>
        {value
          ? <div className="hrm-card__value">{value}</div>
          : <div className="hrm-card__placeholder">{subtitle}</div>
        }
      </div>
      {active && <CheckCircleFilled className="hrm-card__check" />}
      {value && (
        <button
          type="button"
          className="hrm-card__clear"
          title="Clear"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
        >
          <DeleteOutlined />
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function HRManualAgentPage() {
  // ── Selection state ──────────────────────────────────────────────────────────
  const [selectedPlaybook,  setSelectedPlaybook]  = useState(null);
  const [selectedCompany,   setSelectedCompany]   = useState(null);
  const [manualSource,      setManualSource]      = useState(null);
  const [manualFile,        setManualFile]        = useState(null);
  const [manualOneDrive,    setManualOneDrive]    = useState(null);
  const [userPrompt,        setUserPrompt]        = useState('');
  const [selectedModel,     setSelectedModel]     = useState('gpt-4.1');
  const [jurisdiction,      setJurisdiction]      = useState('');
  const [effectiveDate,     setEffectiveDate]     = useState('');

  // ── Modal visibility ─────────────────────────────────────────────────────────
  const [showPlaybooks, setShowPlaybooks] = useState(false);
  const [showCompany,   setShowCompany]   = useState(false);
  const [showOneDrive,  setShowOneDrive]  = useState(false);
  const [showProgress,  setShowProgress]  = useState(false);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [companies,        setCompanies]        = useState([]);
  const [playbooks,        setPlaybooks]        = useState([]);
  const [companySearch,    setCompanySearch]    = useState('');
  const [loadingCompanies,   setLoadingCompanies]   = useState(false);
  const [loadingPlaybooks,   setLoadingPlaybooks]   = useState(false);
  const [deletingPlaybookId, setDeletingPlaybookId] = useState(null);

  // ── Playbook upload state ─────────────────────────────────────────────────────
  const [showUploadPlaybook, setShowUploadPlaybook] = useState(false);
  const [playbookTitle,      setPlaybookTitle]      = useState('');
  const [playbookFile,       setPlaybookFile]       = useState(null);
  const [uploadingPlaybook,  setUploadingPlaybook]  = useState(false);

  // ── Tab ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('agent');

  // ── Run state ────────────────────────────────────────────────────────────────
  const [runId,    setRunId]    = useState(null);
  const [starting, setStarting] = useState(false);

  // ── Embedding status polling ──────────────────────────────────────────────────
  const embedPollRef = useRef(null);

  function stopEmbedPolling() {
    if (embedPollRef.current) {
      clearInterval(embedPollRef.current);
      embedPollRef.current = null;
    }
  }

  function startEmbedPolling() {
    stopEmbedPolling();
    embedPollRef.current = setInterval(async () => {
      try {
        const updated = await fetchPlaybooks();
        setPlaybooks(updated);
        const allDone = updated.every(
          (p) => p.embedding_status === 'DONE' || p.embedding_status === 'FAILED',
        );
        if (allDone) stopEmbedPolling();
      } catch { /* silent */ }
    }, 3000);
  }

  useEffect(() => () => stopEmbedPolling(), []);

  const filteredCompanies = companies.filter((c) =>
    !companySearch || (c.name || '').toLowerCase().includes(companySearch.toLowerCase()),
  );

  useEffect(() => {
    setLoadingCompanies(true);
    fetchCompanies()
      .then(setCompanies)
      .catch(() => {})
      .finally(() => setLoadingCompanies(false));
  }, []);

  useEffect(() => {
    if (!selectedCompany) { setPlaybooks([]); return; }
    setLoadingPlaybooks(true);
    fetchPlaybooks()
      .then((data) => {
        setPlaybooks(data);
        const hasPending = data.some(
          (p) => p.embedding_status === 'PENDING' || p.embedding_status === 'PROCESSING',
        );
        if (hasPending) startEmbedPolling();
      })
      .catch(() => {})
      .finally(() => setLoadingPlaybooks(false));
  }, [selectedCompany]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const manualLabel = manualOneDrive?.name ?? manualFile?.name ?? null;
  const canStart    = !!(selectedCompany && manualLabel);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleSelectCompany(company) {
    setSelectedCompany(company);
    setSelectedPlaybook(null);
    setShowCompany(false);
  }

  function handleSelectPlaybook(pb) {
    setSelectedPlaybook(pb);
    setShowPlaybooks(false);
  }

  async function handleUploadPlaybook() {
    if (!playbookFile) return;
    setUploadingPlaybook(true);
    try {
      await uploadPlaybook(playbookTitle, playbookFile);
      const updated = await fetchPlaybooks();
      setPlaybooks(updated);
      setShowUploadPlaybook(false);
      setPlaybookTitle('');
      setPlaybookFile(null);
      startEmbedPolling();
    } catch {
      message.error('Failed to upload playbook');
    } finally {
      setUploadingPlaybook(false);
    }
  }

  async function handleDeletePlaybook(id) {
    setDeletingPlaybookId(id);
    try {
      await deletePlaybook(id);
      setPlaybooks((prev) => prev.filter((p) => p.id !== id));
      if (selectedPlaybook?.id === id) setSelectedPlaybook(null);
    } catch {
      message.error('Failed to delete playbook');
    } finally {
      setDeletingPlaybookId(null);
    }
  }

  function handleOneDriveSelect(item) {
    setManualOneDrive(item);
    setManualFile(null);
    setManualSource('ONEDRIVE');
    setShowOneDrive(false);
  }

  function handleUploadFile(file) {
    setManualFile(file);
    setManualOneDrive(null);
    setManualSource('UPLOAD');
    return false;
  }

  function clearManual() {
    setManualFile(null);
    setManualOneDrive(null);
    setManualSource(null);
  }

  async function handleStart() {
    if (!canStart) return;
    setStarting(true);
    try {
      const fd = new FormData();
      fd.append('manual_source', manualSource);
      if (selectedCompany)  fd.append('company_id',  selectedCompany.id);
      if (selectedPlaybook) fd.append('playbook_id', selectedPlaybook.id);
      if (userPrompt.trim()) fd.append('user_prompt', userPrompt.trim());
      fd.append('selected_model', selectedModel);
      if (jurisdiction)  fd.append('jurisdiction',   jurisdiction);
      if (effectiveDate) fd.append('effective_date', effectiveDate);

      if (manualSource === 'ONEDRIVE') {
        fd.append('manual_file_id',   manualOneDrive.id);
        fd.append('manual_file_name', manualOneDrive.name);
      } else {
        fd.append('hr_manual_file', manualFile);
      }

      const data = await startRun(fd);
      setRunId(data.runId);
      setShowProgress(true);
      clearManual();
    } catch (err) {
      message.error(err?.response?.data?.error || err.message || 'Failed to start run');
    } finally {
      setStarting(false);
    }
  }

  const trackSteps = [
    { label: 'Company',  done: !!selectedCompany },
    { label: 'Playbook', done: !!selectedPlaybook },
    { label: 'Manual',   done: !!manualLabel },
    { label: 'Launch',   done: false },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="hrm-page">

      {/* ── Tab buttons ── */}
      <div className="hrm-tabs">
        <button
          className={`hrm-tab-btn${activeTab === 'agent' ? ' hrm-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          Agent
        </button>
        <button
          className={`hrm-tab-btn${activeTab === 'history' ? ' hrm-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* ── History tab ── */}
      {activeTab === 'history' && <RunHistory />}

      {/* ── Agent tab ── */}
      {activeTab === 'agent' && (
        <div className="hrm-content">

          {/* Hero header */}
          <div className="hrm-hero">
            <div className="hrm-hero__accent" />
            <div className="hrm-hero__content">
              <div className="hrm-hero__icon-wrap">
                <RobotOutlined />
              </div>
              <div className="hrm-hero__text">
                <div className="hrm-hero__badge">
                  <ThunderboltOutlined style={{ fontSize: 10, marginRight: 4 }} />
                  AI Agent
                </div>
                <h2 className="hrm-hero__title">HR Manual Update Agent</h2>
                <p className="hrm-hero__subtitle">
                  Select a playbook, company, and your HR Manual. The agent will analyse each
                  section, apply improvements based on your playbook guidelines and company
                  documents, and export the updated manual with a full change log.
                </p>
              </div>
            </div>
            <StepTracker steps={trackSteps} />
          </div>

          {/* Configuration cards */}
          <div className="hrm-section">
            <div className="hrm-section__title">Configuration</div>
            <div className="hrm-grid">
              <SelectionCard
                step="1"
                icon={<BankOutlined />}
                title="Company"
                value={selectedCompany?.name ?? null}
                subtitle="Click to select a company"
                active={!!selectedCompany}
                onClear={() => { setSelectedCompany(null); setSelectedPlaybook(null); }}
                onClick={() => setShowCompany(true)}
              />
              <SelectionCard
                step="2"
                icon={<BookOutlined />}
                title="Playbook"
                value={selectedPlaybook
                  ? (selectedPlaybook.title || selectedPlaybook.filename || `Playbook #${selectedPlaybook.id}`)
                  : null}
                subtitle={selectedCompany ? 'Click to select a playbook' : 'Select a company first'}
                active={!!selectedPlaybook}
                onClear={() => setSelectedPlaybook(null)}
                onClick={() => selectedCompany && setShowPlaybooks(true)}
              />
            </div>
          </div>

          {/* HR Manual document */}
          <div className="hrm-section">
            <div className="hrm-section__title-row">
              <span className="hrm-section__title">HR Manual Document</span>
              <span className="hrm-badge hrm-badge--required">Required for each run</span>
            </div>

            <div className="hrm-upload-zone">
              <span className="hrm-upload-zone__step">Step 3</span>
              <InboxOutlined className="hrm-upload-zone__icon" />
              <p className="hrm-upload-zone__text">Drop your HR Manual here or choose a source</p>
              <div className="hrm-upload-zone__actions">
                <button
                  type="button"
                  className="hrm-action-btn hrm-action-btn--primary"
                  onClick={() => setShowOneDrive(true)}
                >
                  <CloudOutlined /> Browse OneDrive
                </button>
                <Upload accept=".pdf,.docx,.txt" showUploadList={false} beforeUpload={handleUploadFile}>
                  <button type="button" className="hrm-action-btn hrm-action-btn--secondary">
                    <UploadOutlined /> Upload File
                  </button>
                </Upload>
              </div>
              <p className="hrm-upload-zone__formats">PDF · DOCX · TXT</p>
            </div>

            {manualLabel && (
              <div className="hrm-file-chip">
                <FileTextOutlined className="hrm-file-chip__icon" />
                <span className="hrm-file-chip__name">{manualLabel}</span>
                <button type="button" className="hrm-file-chip__remove" onClick={clearManual}>
                  <DeleteOutlined />
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="hrm-section">
            <label className="hrm-section__title" htmlFor="hrm-prompt">
              Instructions for the AI
              <span className="hrm-optional-tag">optional</span>
            </label>
            <textarea
              id="hrm-prompt"
              className="hrm-textarea"
              rows={2}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. Focus on updating leave and remote-work policies. Ensure all language complies with UAE Labor Law. Flag any sections that reference outdated HR practices."
            />
            <p className="hrm-hint-text">
              These instructions are injected into every section analysis — use them to set focus areas,
              legal context, tone, or compliance requirements.
            </p>
          </div>

          {/* Jurisdiction + Effective Date */}
          <div className="hrm-section hrm-section--row">
            <div className="hrm-field">
              <label className="hrm-section__title" htmlFor="hrm-jurisdiction">
                Jurisdiction
                <span className="hrm-optional-tag">optional</span>
              </label>
              <select
                id="hrm-jurisdiction"
                className="hrm-select"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
              >
                <option value="">— Select jurisdiction —</option>
                <option value="UAE (Mainland)">UAE (Mainland)</option>
                <option value="UAE (Free Zone)">UAE (Free Zone)</option>
                <option value="KSA">KSA</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="hrm-field">
              <label className="hrm-section__title" htmlFor="hrm-effective-date">
                Effective Date
                <span className="hrm-optional-tag">optional</span>
              </label>
              <input
                id="hrm-effective-date"
                type="date"
                className="hrm-input"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          {/* Model selector */}
          <div className="hrm-section">
            <div className="hrm-section__title">AI Model</div>
            <div className="hrm-models">
              {MODEL_GROUPS.map((group) => (
                <div key={group.label} className="hrm-model-group">
                  <span className="hrm-model-group__label" style={{ color: group.color }}>
                    {group.label}
                  </span>
                  <div className="hrm-model-pills">
                    {group.models.map((m) => {
                      const active = selectedModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`hrm-model-pill${active ? ' hrm-model-pill--active' : ''}`}
                          style={active ? { '--pill-color': group.color } : {}}
                          onClick={() => setSelectedModel(m.id)}
                        >
                          {active && <CheckCircleFilled className="hrm-model-pill__check" />}
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Launch */}
          <div className="hrm-launch">
            <div className="hrm-launch__status">
              {[
                { label: 'Company', done: !!selectedCompany },
                { label: 'Manual',  done: !!manualLabel },
              ].map((s) => (
                <span key={s.label} className={`hrm-status-chip${s.done ? ' hrm-status-chip--done' : ''}`}>
                  {s.done
                    ? <CheckCircleFilled />
                    : <span className="hrm-status-chip__dot" />
                  }
                  {s.label}
                </span>
              ))}
            </div>

            <button
              type="button"
              className="hrm-launch-btn"
              disabled={!canStart || starting}
              onClick={handleStart}
            >
              <span className="hrm-launch-btn__inner">
                {starting
                  ? <><span className="hrm-spinner" /> Processing…</>
                  : <><PlayCircleOutlined /> Start HR Manual Update</>
                }
              </span>
            </button>

            {!selectedCompany && (
              <p className="hrm-hint-text hrm-hint-text--center">Select a company and HR manual to begin.</p>
            )}
            {selectedCompany && !manualLabel && (
              <p className="hrm-hint-text hrm-hint-text--center">Select the HR Manual document to update.</p>
            )}
          </div>

        </div>
      )}

      {/* ── Modals ── */}
      <CompanySelectForm
        open={showCompany}
        onCancel={() => setShowCompany(false)}
        onSelect={() => setShowCompany(false)}
        confirmLoading={loadingCompanies}
        companySearch={companySearch}
        onCompanySearchChange={(e) => setCompanySearch(e.target.value)}
        companies={filteredCompanies}
        selectedCompany={selectedCompany}
        onSelectCompany={handleSelectCompany}
      />
      <PlaybookListModal
        open={showPlaybooks}
        onCancel={() => setShowPlaybooks(false)}
        playbooks={playbooks}
        loading={loadingPlaybooks}
        activePlaybookId={selectedPlaybook?.id}
        deletingId={deletingPlaybookId}
        onDelete={handleDeletePlaybook}
        onSelect={handleSelectPlaybook}
        onUpload={() => setShowUploadPlaybook(true)}
      />
      <PlaybookForm
        open={showUploadPlaybook}
        title="Upload HR Manual Playbook"
        onCancel={() => { setShowUploadPlaybook(false); setPlaybookTitle(''); setPlaybookFile(null); }}
        onSave={handleUploadPlaybook}
        confirmLoading={uploadingPlaybook}
        playbookTitle={playbookTitle}
        onTitleChange={(e) => setPlaybookTitle(e.target.value)}
        playbookFile={playbookFile}
        onFileChange={(e) => setPlaybookFile(e.currentTarget.files?.[0] || null)}
      />
      <OneDrivePickerModal
        open={showOneDrive}
        onCancel={() => setShowOneDrive(false)}
        onSelect={handleOneDriveSelect}
      />
      <ProgressModal
        open={showProgress}
        runId={runId}
        companyId={selectedCompany?.id}
        onClose={() => setShowProgress(false)}
      />
    </div>
  );
}

export default HRManualAgentPage;
