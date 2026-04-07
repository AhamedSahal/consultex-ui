import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, Button, Steps, Radio, Spin, Table, Input, Select,
  Space, Tag, Progress, message as antMessage,
} from 'antd';
import {
  ApartmentOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { parseOrgChart, startBatchRun, cancelBatchRun, getBatchRun } from './service';

const raw = import.meta.env.VITE_API_URL || '';
const API_BASE = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;

const LEVEL_OPTIONS = [
  'C-Level', 'VP', 'Director', 'Head',
  'Senior Manager', 'Manager', 'Assistant Manager',
  'Supervisor', 'Team Lead',
  'Senior Officer', 'Officer', 'Analyst', 'Specialist',
  'Executive', 'Assistant Officer',
];

// ─── Step 0: Source Selection ────────────────────────────────────────────────

function StepSource({ source, setSource, onNext, onClose }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Choose how to provide the roles for batch generation.
      </p>

      <Radio.Group
        value={source}
        onChange={(e) => setSource(e.target.value)}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Radio value="org_chart" style={{ color: 'var(--text)' }}>
          <Space>
            <ApartmentOutlined style={{ color: 'var(--orange)' }} />
            <span>
              <strong>Parse from uploaded org chart</strong>
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Automatically extract roles from the company&rsquo;s org chart documents already in the system.
              </span>
            </span>
          </Space>
        </Radio>

        <Radio value="manual" style={{ color: 'var(--text)' }}>
          <Space>
            <EditOutlined style={{ color: 'var(--orange)' }} />
            <span>
              <strong>Enter roles manually</strong>
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Type or paste one role per line, then fill in details in the review table.
              </span>
            </span>
          </Space>
        </Radio>
      </Radio.Group>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 32 }}>
        <Button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--panel-border)' }}>
          Cancel
        </Button>
        <Button
          type="primary"
          onClick={onNext}
          disabled={!source}
          style={{ background: 'var(--orange)', borderColor: 'var(--orange)' }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ─── Manual Input Sub-step ───────────────────────────────────────────────────

function ManualInput({ onParsed }) {
  const [text, setText] = useState('');

  const handleParse = () => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { antMessage.warning('Enter at least one role'); return; }
    const roles = lines.map((job_title) => ({ job_title, level: '', department: '', reports_to: '' }));
    onParsed(roles);
  };

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
        Enter one job title per line:
      </p>
      <Input.TextArea
        rows={10}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Chief Financial Officer\nFinancial Controller\nSenior Financial Analyst\nIT Manager`}
        style={{ background: 'var(--off-white)', border: '1px solid var(--panel-border)', color: 'var(--text)', fontFamily: 'monospace', fontSize: 13 }}
      />
      <Button
        type="primary"
        onClick={handleParse}
        style={{ marginTop: 12, background: 'var(--orange)', borderColor: 'var(--orange)' }}
      >
        Continue to Review
      </Button>
    </div>
  );
}

// ─── Step 1: Roles Review Table ──────────────────────────────────────────────

function StepReview({ roles, setRoles, onBack, onStart, starting }) {
  const addRow = () => {
    setRoles((prev) => [...prev, { job_title: '', level: '', department: '', reports_to: '', _key: Date.now() }]);
  };

  const removeRow = (idx) => {
    setRoles((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    setRoles((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const columns = [
    {
      title: '#',
      width: 40,
      render: (_, __, idx) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</span>,
    },
    {
      title: 'Job Title',
      dataIndex: 'job_title',
      render: (val, _, idx) => (
        <Input
          value={val}
          onChange={(e) => updateRow(idx, 'job_title', e.target.value)}
          style={{ background: 'var(--off-white)', border: '1px solid var(--panel-border)', color: 'var(--text)', fontSize: 13 }}
          placeholder="e.g. Financial Controller"
        />
      ),
    },
    {
      title: 'Level',
      dataIndex: 'level',
      width: 170,
      render: (val, _, idx) => (
        <Select
          value={val || undefined}
          onChange={(v) => updateRow(idx, 'level', v)}
          placeholder="Select level"
          style={{ width: '100%' }}
          options={LEVEL_OPTIONS.map((l) => ({ value: l, label: l }))}
          allowClear
        />
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      width: 150,
      render: (val, _, idx) => (
        <Input
          value={val}
          onChange={(e) => updateRow(idx, 'department', e.target.value)}
          style={{ background: 'var(--off-white)', border: '1px solid var(--panel-border)', color: 'var(--text)', fontSize: 13 }}
          placeholder="e.g. Finance"
        />
      ),
    },
    {
      title: 'Reports To',
      dataIndex: 'reports_to',
      width: 150,
      render: (val, _, idx) => (
        <Input
          value={val}
          onChange={(e) => updateRow(idx, 'reports_to', e.target.value)}
          style={{ background: 'var(--off-white)', border: '1px solid var(--panel-border)', color: 'var(--text)', fontSize: 13 }}
          placeholder="e.g. CFO"
        />
      ),
    },
    {
      title: '',
      width: 36,
      render: (_, __, idx) => (
        <Button
          type="text"
          danger
          size="small"
          onClick={() => removeRow(idx)}
          icon={<CloseCircleOutlined />}
        />
      ),
    },
  ];

  const valid = roles.filter((r) => (r.job_title || '').trim()).length;

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
        Review and edit the extracted roles. Unneeded roles can be deleted.
        Only rows with a job title will be generated.
      </p>

      <Table
        dataSource={roles.map((r, i) => ({ ...r, key: r._key || i }))}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ y: 320 }}
        style={{ marginBottom: 12 }}
        className="batch-roles-table"
      />

      <Button
        size="small"
        onClick={addRow}
        style={{ background: 'transparent', color: 'var(--orange)', border: '1px dashed var(--orange)', marginBottom: 16 }}
      >
        + Add row
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {valid} role{valid !== 1 ? 's' : ''} will be generated
        </span>
        <Space>
          <Button onClick={onBack} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--panel-border)' }}>
            Back
          </Button>
          <Button
            type="primary"
            onClick={onStart}
            disabled={valid === 0 || starting}
            loading={starting}
            style={{ background: 'var(--orange)', borderColor: 'var(--orange)' }}
          >
            Generate {valid} JD{valid !== 1 ? 's' : ''}
          </Button>
        </Space>
      </div>
    </div>
  );
}

// ─── Step 2: Progress View ───────────────────────────────────────────────────

function roleStatusIcon(status) {
  if (status === 'DONE')    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  if (status === 'FAILED')  return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  if (status === 'RUNNING') return <LoadingOutlined style={{ color: 'var(--orange)' }} />;
  return <ClockCircleOutlined style={{ color: 'var(--text-muted)' }} />;
}

function StepProgress({ runId, roles, onClose }) {
  const [itemStatuses, setItemStatuses] = useState(
    () => roles.map(() => ({ status: 'PENDING', error: null, jdDraftId: null }))
  );
  const [completedRoles, setCompleted] = useState(0);
  const [failedRoles,    setFailed]    = useState(0);
  const [done,           setDone]      = useState(false);
  const [runFailed,      setRunFailed] = useState(false);
  const [cancelled,      setCancelled] = useState(false);
  const [stopping,       setStopping]  = useState(false);
  const doneRef = useRef(false);
  const total = roles.length;

  useEffect(() => {
    if (!runId) return;

    const applySnapshot = (run, items) => {
      if (Array.isArray(items) && items.length > 0) {
        setItemStatuses(items.map((item) => ({
          status:    item?.status     || 'PENDING',
          error:     item?.error_text || null,
          jdDraftId: item?.jd_draft_id || null,
        })));
      }
      setCompleted(run.completed_roles || 0);
      setFailed(run.failed_roles || 0);

      if (run.status === 'DONE' || run.status === 'FAILED' || run.status === 'CANCELLED') {
        if (run.status === 'CANCELLED') setCancelled(true);
        if (run.status === 'FAILED')    setRunFailed(true);
        doneRef.current = true;
        setDone(true);
      }
    };

    // Poll every 3 s — primary update mechanism (works even if SSE is blocked by proxy)
    const poll = async () => {
      if (doneRef.current) return;
      try {
        const data = await getBatchRun(runId);
        applySnapshot(data, data.items);
      } catch { /* ignore */ }
    };

    poll(); // immediate first fetch
    const pollInterval = setInterval(poll, 3000);

    // SSE — enhances real-time feel; if it works, updates arrive faster than 3 s
    const token = localStorage.getItem('accessToken');
    const url = `${API_BASE}/modules/jd-agent/batch/run/${runId}/stream${token ? `?token=${token}` : ''}`;
    let es;
    try {
      es = new EventSource(url);
      es.onmessage = (e) => {
        let ev;
        try { ev = JSON.parse(e.data); } catch { return; }

        if (ev.type === 'role_start') {
          setItemStatuses((prev) => prev.map((s, i) => i === ev.position ? { ...s, status: 'RUNNING' } : s));
        } else if (ev.type === 'role_done') {
          setItemStatuses((prev) => prev.map((s, i) => i === ev.position ? { ...s, status: 'DONE', jdDraftId: ev.jdDraftId } : s));
          setCompleted((c) => Math.max(c, (ev.completed ?? c + 1)));
        } else if (ev.type === 'role_failed') {
          setItemStatuses((prev) => prev.map((s, i) => i === ev.position ? { ...s, status: 'FAILED', error: ev.error } : s));
          setFailed((f) => f + 1);
        } else if (ev.type === 'done') {
          setItemStatuses((prev) => prev.map((s) =>
            (s.status === 'DONE' || s.status === 'FAILED') ? s : { ...s, status: 'DONE' }
          ));
          setCompleted(ev.completedRoles ?? 0);
          setFailed(ev.failedRoles ?? 0);
          doneRef.current = true;
          setDone(true);
          es.close();
        } else if (ev.type === 'cancelled') {
          setItemStatuses((prev) => prev.map((s) =>
            s.status === 'RUNNING' ? { ...s, status: 'PENDING' } : s
          ));
          setCancelled(true);
          doneRef.current = true;
          setDone(true);
          es.close();
        } else if (ev.type === 'error') {
          setRunFailed(true);
          doneRef.current = true;
          setDone(true);
          es.close();
        }
      };
      es.onerror = () => es.close();
    } catch { /* SSE not supported — polling handles everything */ }

    return () => {
      clearInterval(pollInterval);
      if (es) es.close();
    };
  }, [runId]);

  const handleCancel = async () => {
    setStopping(true);
    try {
      await cancelBatchRun(runId);
    } catch {
      antMessage.error('Failed to cancel batch run');
    } finally {
      setStopping(false);
    }
  };

  const percent = total > 0 ? Math.round(((completedRoles + failedRoles) / total) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Progress
          percent={percent}
          status={runFailed ? 'exception' : done ? 'success' : 'active'}
          strokeColor="var(--orange)"
          style={{ marginBottom: 6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{completedRoles} done &nbsp;·&nbsp; {failedRoles} failed &nbsp;·&nbsp; {total} total</span>
          {done && !cancelled && (
            <span style={{ color: '#52c41a' }}>All roles processed</span>
          )}
          {cancelled && <span style={{ color: '#faad14' }}>Cancelled</span>}
        </div>
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {roles.map((role, i) => {
          const s = itemStatuses[i] || {};
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 6,
                background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
              }}
            >
              <span style={{ fontSize: 16 }}>{roleStatusIcon(s.status)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {role.job_title}
                </div>
                {role.department && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{role.department}</div>
                )}
              </div>
              {s.status === 'PENDING' && <Tag color="default" style={{ margin: 0, fontSize: 11 }}>Waiting</Tag>}
              {s.status === 'RUNNING' && <Tag color="purple"  style={{ margin: 0, fontSize: 11 }}>Generating</Tag>}
              {s.status === 'DONE'    && <Tag color="success" style={{ margin: 0, fontSize: 11 }}>Done</Tag>}
              {s.status === 'FAILED'  && (
                <Tag color="error" style={{ margin: 0, fontSize: 11 }} title={s.error}>Failed</Tag>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        {!done && (
          <Button
            danger
            icon={<StopOutlined />}
            onClick={handleCancel}
            loading={stopping}
            style={{ borderColor: '#ff4d4f' }}
          >
            Stop
          </Button>
        )}
        <Button
          type={done ? 'primary' : 'default'}
          onClick={onClose}
          style={done ? { background: 'var(--orange)', borderColor: 'var(--orange)' } : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--panel-border)' }}
        >
          {done ? 'Close' : 'Close (runs in background)'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export default function BatchJDModal({ open, onClose, selectedCompany, playbookId, selectedModel }) {
  const [step,      setStep]    = useState(0); // 0=source, 1=review, 2=progress
  const [source,    setSource]  = useState('org_chart');
  const [roles,     setRoles]   = useState([]);
  const [parsing,   setParsing] = useState(false);
  const [starting,  setStarting] = useState(false);
  const [runId,     setRunId]   = useState(null);
  const [showManual, setShowManual] = useState(false);

  const companyId = selectedCompany?.id;

  const resetState = () => {
    setStep(0);
    setSource('org_chart');
    setRoles([]);
    setParsing(false);
    setStarting(false);
    setRunId(null);
    setShowManual(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Step 0 → 1: fetch or prompt for roles
  const handleSourceNext = async () => {
    if (source === 'manual') {
      setShowManual(true);
      return;
    }

    // org_chart: parse from uploaded docs
    if (!companyId) {
      antMessage.warning('Please select a company first');
      return;
    }

    setParsing(true);
    try {
      const data = await parseOrgChart(companyId, selectedModel);
      const extracted = (data.roles || []).map((r, i) => ({ ...r, _key: i }));
      if (!extracted.length) {
        antMessage.warning('No roles found in org chart. Try entering roles manually.');
        setSource('manual');
        setShowManual(true);
        return;
      }
      setRoles(extracted);
      setStep(1);
    } catch (err) {
      antMessage.error(err?.response?.data?.error || err.message || 'Failed to parse org chart');
    } finally {
      setParsing(false);
    }
  };

  const handleManualParsed = (parsedRoles) => {
    setRoles(parsedRoles.map((r, i) => ({ ...r, _key: i })));
    setShowManual(false);
    setStep(1);
  };

  // Step 1 → 2: start batch run
  const handleStart = async () => {
    const validRoles = roles.filter((r) => (r.job_title || '').trim());
    if (!validRoles.length) { antMessage.warning('Add at least one role'); return; }
    if (!companyId)         { antMessage.warning('No company selected'); return; }

    setStarting(true);
    try {
      const data = await startBatchRun({
        companyId,
        playbookId: playbookId || undefined,
        roles: validRoles,
        selectedModel,
      });
      setRunId(data.runId);
      setRoles(validRoles); // keep only valid ones for progress display
      setStep(2);
    } catch (err) {
      antMessage.error(err?.response?.data?.error || err.message || 'Failed to start batch run');
    } finally {
      setStarting(false);
    }
  };

  const STEP_TITLES = ['Select Source', 'Review Roles', 'Generating'];

  return (
    <Modal
      open={open}
      onCancel={step < 2 ? handleClose : undefined}
      closable={step < 2}
      maskClosable={false}
      footer={null}
      width={step === 1 ? 860 : 580}
      title={
        <span style={{ color: 'var(--text)' }}>
          Batch JD Generation
          {selectedCompany && (
            <span style={{ color: 'var(--orange)', fontWeight: 400, fontSize: 13, marginLeft: 10 }}>
              — {selectedCompany.name}
            </span>
          )}
        </span>
      }
      styles={{
        content:  { background: 'var(--off-white)', border: '1px solid var(--panel-border)' },
        header:   { background: 'var(--off-white)', borderBottom: '1px solid var(--panel-border)' },
        body:     { padding: '20px 24px' },
      }}
    >
      <Steps
        current={step}
        size="small"
        items={STEP_TITLES.map((t) => ({ title: <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t}</span> }))}
        style={{ marginBottom: 24 }}
      />

      {/* Step 0: Source Selection */}
      {step === 0 && !showManual && !parsing && (
        <StepSource source={source} setSource={setSource} onNext={handleSourceNext} onClose={handleClose} />
      )}

      {step === 0 && parsing && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ color: 'var(--text-muted)', marginTop: 16 }}>Parsing org chart from company documents&hellip;</div>
        </div>
      )}

      {step === 0 && showManual && (
        <ManualInput onParsed={handleManualParsed} />
      )}

      {/* Step 1: Review Table */}
      {step === 1 && (
        <StepReview
          roles={roles}
          setRoles={setRoles}
          onBack={() => { setStep(0); setShowManual(false); }}
          onStart={handleStart}
          starting={starting}
        />
      )}

      {/* Step 2: Progress */}
      {step === 2 && runId && (
        <StepProgress
          runId={runId}
          roles={roles}
          companyId={companyId}
          onClose={handleClose}
        />
      )}
    </Modal>
  );
}
