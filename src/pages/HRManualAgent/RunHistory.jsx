import React, { useCallback, useEffect, useState } from 'react';
import { Spin } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { listRuns } from './service';
import ProgressModal from './ProgressModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_MAP = {
  DONE:      { label: 'Done',      icon: <CheckCircleOutlined />,       color: '#27ae60', bg: '#f0fff4', border: '#b7ebc8' },
  FAILED:    { label: 'Failed',    icon: <CloseCircleOutlined />,       color: '#e05555', bg: '#fff5f5', border: '#ffc0c0' },
  RUNNING:   { label: 'Running',   icon: <SyncOutlined spin />,         color: '#5b6dff', bg: '#eef0ff', border: '#c5caff' },
  PENDING:   { label: 'Pending',   icon: <FieldTimeOutlined />,         color: '#94a3b8', bg: '#f5f6fa', border: '#e2e8f0' },
  CANCELLED: { label: 'Cancelled', icon: <ExclamationCircleOutlined />, color: '#d97706', bg: '#fffbf0', border: '#fde8b1' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.PENDING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, padding: '3px 10px',
      borderRadius: 20, border: `1px solid ${s.border}`,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── RunHistory ───────────────────────────────────────────────────────────────

export default function RunHistory() {
  const [runs, setRuns]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [viewRunId, setViewRunId] = useState(null);
  const [viewOpen, setViewOpen]   = useState(false);
  const [viewLive, setViewLive]   = useState(false); // true when run is still RUNNING

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRuns();
      setRuns(Array.isArray(data) ? data : []);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const [viewCompanyId, setViewCompanyId] = useState(null);

  function openRun(run) {
    setViewRunId(run.id);
    setViewCompanyId(run.company_id ?? null);
    setViewLive(run.status === 'RUNNING' || run.status === 'PENDING');
    setViewOpen(true);
  }

  function closeView() {
    setViewOpen(false);
    // Refresh list after closing so status updates appear
    loadRuns();
  }

  return (
    <div className="hrm-history">

      {/* ── Header row ── */}
      <div className="hrm-history__header">
        <div>
          <div className="hrm-history__title">Run History</div>
          <div className="hrm-history__subtitle">
            View past updates, change logs, and download exported manuals.
          </div>
        </div>
        <button
          className="hrm-action-btn hrm-action-btn--secondary"
          onClick={loadRuns}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
        >
          <ReloadOutlined spin={loading} /> Refresh
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && runs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin size="large" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && runs.length === 0 && (
        <div className="hrm-history__empty">
          <FileTextOutlined style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: 14 }}>No runs yet</div>
          <div style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>
            Go to the Agent tab to start your first HR Manual update.
          </div>
        </div>
      )}

      {/* ── Run list ── */}
      {runs.length > 0 && (
        <div className="hrm-run-list">

          {/* Table header */}
          <div className="hrm-run-list__head">
            <span style={{ flex: 1 }}>Manual</span>
            <span style={{ width: 90 }}>Status</span>
            <span style={{ width: 160 }}>Date</span>
            <span style={{ width: 80, textAlign: 'center' }}>Updated</span>
            <span style={{ width: 70, textAlign: 'center' }}>Flags</span>
            <span style={{ width: 64 }} />
          </div>

          {/* Rows */}
          {runs.map((run) => (
            <div key={run.id} className="hrm-run-card">

              {/* File name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hrm-run-card__name">
                  <FileTextOutlined style={{ color: '#5b6dff', marginRight: 6, flexShrink: 0 }} />
                  <span title={run.manual_file_name}>
                    {run.manual_file_name || `Run #${run.id}`}
                  </span>
                </div>
                {run.current_step && run.status === 'RUNNING' && (
                  <div className="hrm-run-card__step">{run.current_step}</div>
                )}
              </div>

              {/* Status */}
              <div style={{ width: 90 }}>
                <StatusBadge status={run.status} />
              </div>

              {/* Date */}
              <div style={{ width: 160, fontSize: 12, color: '#94a3b8' }}>
                {fmtDate(run.created_at)}
              </div>

              {/* Updated sections */}
              <div style={{ width: 80, textAlign: 'center' }}>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: run.updated_sections_count > 0 ? '#27ae60' : '#bbb',
                }}>
                  {run.updated_sections_count ?? '—'}
                </span>
              </div>

              {/* Red flags */}
              <div style={{ width: 70, textAlign: 'center' }}>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: run.red_flags_count > 0 ? '#e05555' : '#bbb',
                }}>
                  {run.red_flags_count ?? '—'}
                </span>
              </div>

              {/* View button */}
              <div style={{ width: 64, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="hrm-run-card__view-btn"
                  onClick={() => openRun(run)}
                >
                  View
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Detail modal ── */}
      <ProgressModal
        open={viewOpen}
        runId={viewRunId}
        companyId={viewCompanyId}
        readOnly={!viewLive}
        onClose={closeView}
      />
    </div>
  );
}
