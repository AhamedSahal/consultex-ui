import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, Modal, Spin } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { cancelRun, getChanges, getExport, getRun, getRedFlags, getOpenItems, getTraceLog, exportRedFlagsDoc, exportOpenItemsDoc } from './service';

const raw = import.meta.env.VITE_API_URL || '';
const API_BASE = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;

function levelIcon(level) {
  if (level === 'ERROR') return <ExclamationCircleOutlined style={{ color: '#ff6b6b' }} />;
  if (level === 'WARN')  return <WarningOutlined style={{ color: '#ffd43b' }} />;
  return <InfoCircleOutlined style={{ color: '#74c0fc' }} />;
}

function fmtDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function diffWords(a, b) {
  const tokA = a.split(/(\s+)/);
  const tokB = b.split(/(\s+)/);
  if (tokA.length > 400 || tokB.length > 400) return null;
  const m = tokA.length, n = tokB.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = tokA[i - 1] === tokB[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokA[i - 1] === tokB[j - 1]) {
      result.unshift({ text: tokA[i - 1], type: 'same' });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: tokB[j - 1], type: 'add' });
      j--;
    } else {
      result.unshift({ text: tokA[i - 1], type: 'del' });
      i--;
    }
  }
  return result;
}

function ProgressModal({ open, runId, companyId, onClose, readOnly = false }) {
  const [logs, setLogs]                       = useState([]);
  const [step, setStep]                       = useState('');
  const [totalBatches, setTotalBatches]       = useState(0);
  const [completedBatches, setCompleted]      = useState(0);
  const [updatedSections, setUpdatedSections] = useState(0);
  const [redFlags, setRedFlags]               = useState(0);
  const [openItems, setOpenItems]             = useState(0);
  const [done, setDone]                       = useState(false);
  const [failed, setFailed]                   = useState(false);
  const [cancelled, setCancelled]             = useState(false);
  const [stopping, setStopping]               = useState(false);
  const [changes, setChanges]                 = useState([]);
  const [exportUrl, setExportUrl]             = useState('');
  const [exportFileName, setExportFileName]   = useState('');
  const [etaText, setEtaText]                 = useState('');
  const [sectionMap, setSectionMap]           = useState(new Map());
  const [expandedIds, setExpandedIds]         = useState(new Set());
  const [notifyEnabled, setNotifyEnabled]     = useState(true);

  // ── Companion data panels ────────────────────────────────────────────────────
  const [redFlagsList,  setRedFlagsList]  = useState([]);
  const [openItemsList, setOpenItemsList] = useState([]);
  const [traceLogList,  setTraceLogList]  = useState([]);
  const [panelTab,      setPanelTab]      = useState('redflags'); // 'redflags' | 'openitems' | 'tracelog'

  // ── Separate report download state ───────────────────────────────────────────
  const [rfExportUrl,      setRfExportUrl]      = useState('');
  const [rfExportFileName, setRfExportFileName] = useState('');
  const [oiExportUrl,      setOiExportUrl]      = useState('');
  const [oiExportFileName, setOiExportFileName] = useState('');
  const [fetchingRfExport, setFetchingRfExport] = useState(false);
  const [fetchingOiExport, setFetchingOiExport] = useState(false);

  const logsEndRef       = useRef(null);
  const changesEndRef    = useRef(null);
  const esRef            = useRef(null);
  const isTerminalRef    = useRef(false);
  const reconnectTimer   = useRef(null);
  const reconnectCount   = useRef(0);
  const startTimeRef     = useRef(null);
  const notifyEnabledRef = useRef(true);
  const MAX_RECONNECTS   = 10;

  useEffect(() => { notifyEnabledRef.current = notifyEnabled; }, [notifyEnabled]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
  useEffect(() => { changesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [changes]);

  useEffect(() => {
    if (!startTimeRef.current || failed) { setEtaText(''); return; }
    if (done) {
      setEtaText(`Done in ${fmtDuration(Date.now() - startTimeRef.current)}`);
      return;
    }
    if (completedBatches === 0 || totalBatches === 0) { setEtaText(''); return; }
    const elapsed    = Date.now() - startTimeRef.current;
    const msPerBatch = elapsed / completedBatches;
    const remaining  = msPerBatch * (totalBatches - completedBatches);
    setEtaText(`~${fmtDuration(remaining)} left`);
  }, [completedBatches, totalBatches, done, failed]);

  const changeCounts = useMemo(() => {
    const c = { UPDATE: 0, ADD: 0, REMOVE: 0 };
    changes.forEach((ch) => {
      const t = (ch.change_type || 'UPDATE').toUpperCase();
      if (t in c) c[t]++;
    });
    return c;
  }, [changes]);
  const totalChanges = changeCounts.UPDATE + changeCounts.ADD + changeCounts.REMOVE;

  useEffect(() => {
    if (!open || !runId) return;

    setLogs([]);
    setStep('');
    setTotalBatches(0);
    setCompleted(0);
    setUpdatedSections(0);
    setRedFlags(0);
    setOpenItems(0);
    setDone(false);
    setFailed(false);
    setCancelled(false);
    setStopping(false);
    setChanges([]);
    setExportUrl('');
    setExportFileName('');
    setEtaText('');
    setSectionMap(new Map());
    setExpandedIds(new Set());
    setRedFlagsList([]);
    setOpenItemsList([]);
    setTraceLogList([]);
    isTerminalRef.current  = false;
    reconnectCount.current = 0;
    startTimeRef.current   = Date.now();

    if (readOnly) {
      (async () => {
        try {
          const run = await getRun(runId);
          setStep(run.current_step || '');
          setTotalBatches(run.total_batches || 0);
          setCompleted(run.completed_batches || 0);
          setUpdatedSections(run.updated_sections_count || 0);
          setRedFlags(run.red_flags_count || 0);
          setOpenItems(run.open_items_count || 0);
          setDone(run.status === 'DONE');
          setFailed(run.status === 'FAILED');
          setCancelled(run.status === 'CANCELLED');
          const chg = await getChanges(runId, companyId).catch(() => []);
          setChanges(chg);
          const map = new Map();
          chg.forEach((c) => { if (c.section_title) map.set(c.section_title, 'done'); });
          setSectionMap(map);
          if (run.status === 'DONE' || run.status === 'CANCELLED') {
            const exp = await getExport(runId, companyId).catch(() => ({}));
            if (exp.url)      setExportUrl((API_BASE || '') + exp.url);
            if (exp.fileName) setExportFileName(exp.fileName);
            getRedFlags(runId, companyId).then((rows) => {
              setRedFlagsList(rows);
              if (rows.length > 0) {
                setFetchingRfExport(true);
                exportRedFlagsDoc(runId, companyId).then((d) => { if (d.url) { setRfExportUrl((API_BASE || '') + d.url); setRfExportFileName(d.fileName || 'red_flag_register.docx'); } }).catch(() => {}).finally(() => setFetchingRfExport(false));
              }
            }).catch(() => {});
            getOpenItems(runId, companyId).then((rows) => {
              setOpenItemsList(rows);
              if (rows.length > 0) {
                setFetchingOiExport(true);
                exportOpenItemsDoc(runId, companyId).then((d) => { if (d.url) { setOiExportUrl((API_BASE || '') + d.url); setOiExportFileName(d.fileName || 'open_items.docx'); } }).catch(() => {}).finally(() => setFetchingOiExport(false));
              }
            }).catch(() => {});
            getTraceLog(runId, companyId).then(setTraceLogList).catch(() => {});
          }
        } catch { setFailed(true); }
      })();
      return;
    }

    const token = localStorage.getItem('accessToken') || '';

    function connect() {
      if (isTerminalRef.current) return;
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      const url = `${API_BASE}/modules/hr-manual/run/${runId}/stream${token ? `?token=${token}` : ''}`;
      const es  = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        let event;
        try { event = JSON.parse(e.data); } catch { return; }

        switch (event.type) {
          case 'state': {
            const r = event.run || {};
            if (r.current_step)                   setStep(r.current_step);
            if (r.total_batches)                  setTotalBatches(r.total_batches);
            if (r.completed_batches != null)      setCompleted(r.completed_batches);
            if (r.updated_sections_count != null) setUpdatedSections(r.updated_sections_count);
            if (r.red_flags_count != null)        setRedFlags(r.red_flags_count);
            if (r.open_items_count != null)       setOpenItems(r.open_items_count);
            if (r.status === 'DONE')      { isTerminalRef.current = true; setDone(true); }
            if (r.status === 'FAILED')    { isTerminalRef.current = true; setFailed(true); }
            if (r.status === 'CANCELLED') { isTerminalRef.current = true; setCancelled(true); }
            break;
          }
          case 'log':
            setLogs((prev) => [...prev, { level: event.level || 'INFO', message: event.message, ts: Date.now() }]);
            break;
          case 'progress':
            if (event.step)                     setStep(event.step);
            if (event.totalBatches)             setTotalBatches(event.totalBatches);
            if (event.completedBatches != null) setCompleted(event.completedBatches);
            break;
          case 'job_started':
            if (event.totalSections) setTotalBatches(event.totalSections);
            break;
          case 'section_started':
            setStep(`Processing: ${event.sectionKey} (${event.sectionIndex + 1}/${event.totalSections})`);
            if (event.totalSections) setTotalBatches(event.totalSections);
            break;
          case 'change_applied': {
            const cid = event.changeId || `live-${Date.now()}-${Math.random()}`;
            setChanges((prev) => {
              if (event.changeId && prev.some((c) => c.id === event.changeId)) return prev;
              return [...prev, {
                id:            cid,
                section_title: event.sectionKey    || '',
                change_type:   'UPDATE',
                original_text: event.before        || '',
                updated_text:  event.after         || '',
                reason:        '',
                _live:         true,
              }];
            });
            if (event.sectionKey) setSectionMap((prev) => new Map(prev).set(event.sectionKey, 'done'));
            if (event.updatedSections != null) setUpdatedSections(event.updatedSections);
            break;
          }
          case 'section_completed':
            if (event.completedSections != null) setCompleted(event.completedSections);
            else setCompleted((prev) => Math.max(prev, (event.sectionIndex ?? 0) + 1));
            if (event.totalSections)             setTotalBatches(event.totalSections);
            if (event.updatedSections != null)   setUpdatedSections(event.updatedSections);
            if (event.redFlagsCount  != null)    setRedFlags(event.redFlagsCount);
            if (event.openItemsCount != null)    setOpenItems(event.openItemsCount);
            break;
          case 'red_flag':
            if (event.rfId) {
              setRedFlagsList((prev) => [
                ...prev,
                {
                  rf_id:         event.rfId,
                  section_title: event.sectionTitle || '',
                  severity:      event.severity || 'Medium',
                  issue_summary: event.issue || '',
                },
              ]);
              setRedFlags((prev) => prev + 1);
            }
            break;
          case 'open_item':
            if (event.oiId) {
              setOpenItemsList((prev) => [
                ...prev,
                {
                  oi_id:         event.oiId,
                  section_title: event.sectionTitle || '',
                  missing_info:  event.missing || '',
                },
              ]);
              setOpenItems((prev) => prev + 1);
            }
            break;
          case 'export_ready':
            if (event.downloadUrl) setExportUrl((API_BASE || '') + event.downloadUrl);
            if (event.fileName)    setExportFileName(event.fileName);
            break;
          case 'job_completed': {
            isTerminalRef.current = true;
            setDone(true);
            if (event.updatedSections != null) setUpdatedSections(event.updatedSections);
            if (event.redFlagsCount != null)   setRedFlags(event.redFlagsCount);
            if (event.openItemsCount != null)  setOpenItems(event.openItemsCount);
            es.close();
            if (notifyEnabledRef.current && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
              new Notification('HR Manual Updated', { body: `${event.updatedSections ?? 0} sections updated` });
            }
            getChanges(runId, companyId).then(mergeDbChanges).catch(() => {});
            getExport(runId, companyId).then((data) => {
              if (data.url)      setExportUrl((prev) => prev || (API_BASE || '') + data.url);
              if (data.fileName) setExportFileName((prev) => prev || data.fileName);
            }).catch(() => {});
            getRedFlags(runId, companyId).then(setRedFlagsList).catch(() => {});
            getOpenItems(runId, companyId).then(setOpenItemsList).catch(() => {});
            getTraceLog(runId, companyId).then(setTraceLogList).catch(() => {});
            if ((event.redFlagsCount ?? 0) > 0) {
              setFetchingRfExport(true);
              exportRedFlagsDoc(runId, companyId).then((d) => { if (d.url) { setRfExportUrl((API_BASE || '') + d.url); setRfExportFileName(d.fileName || 'red_flag_register.docx'); } }).catch(() => {}).finally(() => setFetchingRfExport(false));
            }
            if ((event.openItemsCount ?? 0) > 0) {
              setFetchingOiExport(true);
              exportOpenItemsDoc(runId, companyId).then((d) => { if (d.url) { setOiExportUrl((API_BASE || '') + d.url); setOiExportFileName(d.fileName || 'open_items.docx'); } }).catch(() => {}).finally(() => setFetchingOiExport(false));
            }
            break;
          }
          case 'change_live':
            setChanges((prev) => [...prev, {
              id:            `live-${Date.now()}-${Math.random()}`,
              section_title: event.sectionTitle || '',
              change_type:   event.changeType   || 'UPDATE',
              original_text: event.originalText || '',
              updated_text:  event.updatedText  || '',
              reason:        event.reason        || '',
              _live:         true,
            }]);
            if (event.sectionTitle) setSectionMap((prev) => new Map(prev).set(event.sectionTitle, 'done'));
            break;
          case 'section_done':
            if (event.updatedSectionsCount != null) setUpdatedSections(event.updatedSectionsCount);
            if (event.redFlagsCount != null)        setRedFlags(event.redFlagsCount);
            if (event.openItemsCount != null)       setOpenItems(event.openItemsCount);
            break;
          case 'sync': {
            const sr = event.run || {};
            if (sr.current_step)                   setStep(sr.current_step);
            if (sr.total_batches)                  setTotalBatches(sr.total_batches);
            if (sr.completed_batches != null)      setCompleted(sr.completed_batches);
            if (sr.updated_sections_count != null) setUpdatedSections(sr.updated_sections_count);
            if (sr.red_flags_count != null)        setRedFlags(sr.red_flags_count);
            if (sr.open_items_count != null)       setOpenItems(sr.open_items_count);
            break;
          }
          case 'done': {
            isTerminalRef.current = true;
            setDone(true);
            const dr  = event.run || {};
            const usc = event.updatedSectionsCount ?? dr.updated_sections_count;
            const rfc = event.redFlagsCount        ?? dr.red_flags_count;
            const oic = event.openItemsCount       ?? dr.open_items_count;
            if (usc != null)              setUpdatedSections(usc);
            if (rfc != null)              setRedFlags(rfc);
            if (oic != null)              setOpenItems(oic);
            if (dr.total_batches)         setTotalBatches(dr.total_batches);
            if (dr.completed_batches != null) setCompleted(dr.completed_batches);
            if (dr.current_step)          setStep(dr.current_step);
            es.close();
            if (notifyEnabledRef.current && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
              new Notification('HR Manual Updated', { body: `${usc ?? 0} sections updated · ${rfc ?? 0} red flags` });
            }
            getChanges(runId, companyId).then(mergeDbChanges).catch(() => {});
            getExport(runId, companyId).then((data) => {
              if (data.url)      setExportUrl((API_BASE || '') + data.url);
              if (data.fileName) setExportFileName(data.fileName);
            }).catch(() => {});
            getRedFlags(runId, companyId).then(setRedFlagsList).catch(() => {});
            getOpenItems(runId, companyId).then(setOpenItemsList).catch(() => {});
            getTraceLog(runId, companyId).then(setTraceLogList).catch(() => {});
            if ((rfc ?? 0) > 0) {
              setFetchingRfExport(true);
              exportRedFlagsDoc(runId, companyId).then((d) => { if (d.url) { setRfExportUrl((API_BASE || '') + d.url); setRfExportFileName(d.fileName || 'red_flag_register.docx'); } }).catch(() => {}).finally(() => setFetchingRfExport(false));
            }
            if ((oic ?? 0) > 0) {
              setFetchingOiExport(true);
              exportOpenItemsDoc(runId, companyId).then((d) => { if (d.url) { setOiExportUrl((API_BASE || '') + d.url); setOiExportFileName(d.fileName || 'open_items.docx'); } }).catch(() => {}).finally(() => setFetchingOiExport(false));
            }
            break;
          }
          case 'cancelled': {
            isTerminalRef.current = true;
            setCancelled(true);
            setStopping(false);
            const cr  = event.run || {};
            const usc = event.updatedSectionsCount ?? cr.updated_sections_count;
            if (usc != null) setUpdatedSections(usc);
            if (cr.total_batches)             setTotalBatches(cr.total_batches);
            if (cr.completed_batches != null) setCompleted(cr.completed_batches);
            es.close();
            getChanges(runId, companyId).then(mergeDbChanges).catch(() => {});
            getExport(runId, companyId).then((data) => {
              if (data.url)      setExportUrl((API_BASE || '') + data.url);
              if (data.fileName) setExportFileName(data.fileName);
            }).catch(() => {});
            break;
          }
          case 'error':
            isTerminalRef.current = true;
            setFailed(true);
            setStopping(false);
            setLogs((prev) => [...prev, { level: 'ERROR', message: event.message || 'Run failed', ts: Date.now() }]);
            es.close();
            break;
          default: break;
        }
      };

      es.onerror = (err) => {
        es.close();
        if (isTerminalRef.current) return;
        if (reconnectCount.current < MAX_RECONNECTS) {
          reconnectCount.current += 1;
          const delay = Math.min(reconnectCount.current * 2000, 10000);
          setLogs((prev) => [...prev, {
            level: 'WARN',
            message: `Stream interrupted — reconnecting in ${delay / 1000}s… (${reconnectCount.current}/${MAX_RECONNECTS})`,
            ts: Date.now(),
          }]);
          reconnectTimer.current = setTimeout(connect, delay);
        } else {
          setLogs((prev) => [...prev, {
            level: 'WARN',
            message: 'Connection lost. The job is still running — close and re-open to check status.',
            ts: Date.now(),
          }]);
        }
      };
    }

    connect();

    return () => {
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
      if (esRef.current)          { esRef.current.close(); esRef.current = null; }
    };
  }, [open, runId, readOnly]);

  const isTerminal = done || failed || cancelled;
  const percent    = done ? 100 : totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0;
  const isWaiting  = !isTerminal && totalBatches === 0;

  async function handleStop() {
    if (stopping || isTerminal) return;
    setStopping(true);
    try {
      await cancelRun(runId, companyId);
    } catch (err) {
      setStopping(false);
      setLogs((prev) => [...prev, { level: 'ERROR', message: `Stop failed: ${err.message}`, ts: Date.now() }]);
    }
  }

  function mergeDbChanges(dbChanges) {
    setChanges((prev) => {
      const seenIds = new Set(prev.map((c) => c.id));
      const merged  = [...prev];
      dbChanges.forEach((c) => {
        const sid = String(c.id);
        if (!seenIds.has(sid)) {
          merged.push({
            id:            sid,
            section_title: c.section_title || '',
            change_type:   c.change_type   || 'UPDATE',
            original_text: c.original_text || '',
            updated_text:  c.updated_text  || '',
            reason:        c.reason        || '',
          });
        }
      });
      return merged;
    });
  }

  function toggleExpand(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Status state for class modifiers
  const statusMod = done ? 'done' : cancelled ? 'cancelled' : failed ? 'failed' : 'active';

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1140}
      closable={false}
      maskClosable={false}
      className="hrm-pm-modal"
      styles={{ body: { padding: 0 } }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`hrm-pm-header hrm-pm-header--${statusMod}`}>
        <div className="hrm-pm-header__left">
          <div className={`hrm-pm-header__icon-wrap hrm-pm-header__icon-wrap--${statusMod}`}>
            {done      ? <CheckCircleOutlined />
            : cancelled ? <CloseCircleOutlined />
            : failed    ? <ExclamationCircleOutlined />
            : <LoadingOutlined spin />}
          </div>
          <div>
            <div className="hrm-pm-header__title">
              {readOnly
                ? (done ? 'Run Complete' : cancelled ? 'Run Cancelled' : failed ? 'Run Failed' : 'Run Details')
                : (done ? 'Update Complete' : cancelled ? 'Stopped — Partial Export Ready' : failed ? 'Update Failed' : 'Updating HR Manual…')}
            </div>
            <div className="hrm-pm-header__meta">
              {step && (
                <span className="hrm-pm-header__step">
                  {!isTerminal && <span className={`hrm-pm-pulse-dot hrm-pm-pulse-dot--${stopping ? 'warn' : 'active'}`} />}
                  {stopping ? 'Stopping…' : step}
                </span>
              )}
              {!isTerminal && totalBatches > 0 && (
                <span className="hrm-pm-header__batches">{completedBatches} / {totalBatches} sections</span>
              )}
              {etaText && (
                <span className={`hrm-pm-header__eta hrm-pm-header__eta--${statusMod}`}>{etaText}</span>
              )}
              {!step && !isTerminal && (
                <span className="hrm-pm-header__connecting">Connecting…</span>
              )}
            </div>
          </div>
        </div>
        <div className="hrm-pm-header__right">
          {!isTerminal && !readOnly && (
            <Checkbox
              checked={notifyEnabled}
              onChange={(e) => setNotifyEnabled(e.target.checked)}
              className="hrm-pm-notify-check"
            >
              Notify when done
            </Checkbox>
          )}
          {(isTerminal || readOnly) && (
            <button className="hrm-pm-close-btn" onClick={onClose} title="Close">
              <CloseOutlined />
            </button>
          )}
        </div>
      </div>

      {/* ── Single progress bar ────────────────────────────────────────────── */}
      <div className="hrm-pm-progress-track">
        <div
          className={`hrm-pm-progress-fill hrm-pm-progress-fill--${statusMod}${isWaiting ? ' hrm-pm-progress-fill--waiting' : ''}`}
          style={{ width: isWaiting ? '100%' : `${percent}%` }}
        />
        {!isWaiting && !isTerminal && (
          <span className="hrm-pm-progress-pct">{percent}%</span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="hrm-pm-body">

        {/* ── Section chips ── */}
        {(sectionMap.size > 0 || (!done && !failed && totalBatches > 0)) && (
          <div className="hrm-pm-sections-row">
            <span className="hrm-pm-sections-label">Sections</span>
            <div className="hrm-pm-sections-scroll">
              {[...sectionMap.keys()].map((title) => (
                <span key={title} className="hrm-pm-section-chip" title={title}>
                  ✓ {title.length > 22 ? title.slice(0, 22) + '…' : title}
                </span>
              ))}
              {!done && !failed && Array.from({ length: Math.max(0, totalBatches - sectionMap.size) }).map((_, i) => (
                <span key={`p-${i}`} className={`hrm-pm-section-pending${i === 0 ? ' hrm-pm-section-pending--current' : ''}`}>
                  <span className={`hrm-pm-section-dot${i === 0 ? ' hrm-pm-section-dot--active' : ''}`} />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats cards ── */}
        <div className="hrm-pm-stats">
          <div className="hrm-pm-stat">
            <div className="hrm-pm-stat__value hrm-pm-stat__value--blue">{updatedSections}</div>
            <div className="hrm-pm-stat__label">Updated Sections</div>
          </div>
          <div className="hrm-pm-stat">
            <div className="hrm-pm-stat__value hrm-pm-stat__value--indigo">{totalChanges}</div>
            <div className="hrm-pm-stat__label">Total Changes</div>
          </div>
          {changeCounts.UPDATE > 0 && (
            <div className="hrm-pm-stat">
              <div className="hrm-pm-stat__value hrm-pm-stat__value--violet">{changeCounts.UPDATE}</div>
              <div className="hrm-pm-stat__label">Updated</div>
            </div>
          )}
          {changeCounts.ADD > 0 && (
            <div className="hrm-pm-stat">
              <div className="hrm-pm-stat__value hrm-pm-stat__value--green">{changeCounts.ADD}</div>
              <div className="hrm-pm-stat__label">Added</div>
            </div>
          )}
          {changeCounts.REMOVE > 0 && (
            <div className="hrm-pm-stat">
              <div className="hrm-pm-stat__value hrm-pm-stat__value--red">{changeCounts.REMOVE}</div>
              <div className="hrm-pm-stat__label">Removed</div>
            </div>
          )}
          <div className="hrm-pm-stat">
            <div className={`hrm-pm-stat__value${redFlags > 0 ? ' hrm-pm-stat__value--danger' : ' hrm-pm-stat__value--muted'}`}>{redFlags}</div>
            <div className="hrm-pm-stat__label">Red Flags</div>
          </div>
          <div className="hrm-pm-stat">
            <div className={`hrm-pm-stat__value${openItems > 0 ? ' hrm-pm-stat__value--orange' : ' hrm-pm-stat__value--muted'}`}>{openItems}</div>
            <div className="hrm-pm-stat__label">Open Items</div>
          </div>
        </div>

        {/* ── Two-pane: Log + Changes ── */}
        <div className="hrm-pm-panes">

          {/* Left — Live Log */}
          <div className="hrm-pm-log-pane">
            <div className="hrm-pm-pane-title">
              <span className="hrm-pm-pane-dot hrm-pm-pane-dot--log" />
              Live Log
            </div>
            <div className="hrm-pm-log-scroll">
              {logs.length === 0 && !done && !failed && (
                <span className="hrm-pm-log-empty">Waiting for updates…</span>
              )}
              {logs.map((l, i) => (
                <div key={i} className={`hrm-pm-log-entry hrm-pm-log-entry--${l.level.toLowerCase()}`}>
                  <span className="hrm-pm-log-icon">{levelIcon(l.level)}</span>
                  <span className="hrm-pm-log-msg">{l.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Right — Change Log */}
          <div className="hrm-pm-change-pane">
            <div className="hrm-pm-pane-title">
              <span className="hrm-pm-pane-dot hrm-pm-pane-dot--changes" />
              Change Log
              {changes.length > 0 && (
                <span className="hrm-pm-changes-badge">{changes.length}</span>
              )}
              {!isTerminal && <span className="hrm-pm-live-dot" />}
            </div>
            <div className="hrm-pm-changes-scroll">
              {changes.length === 0 && (
                <div className="hrm-pm-changes-empty">
                  {done ? 'No changes recorded' : 'Changes will appear here…'}
                </div>
              )}
              {changes.map((c, idx) => {
                const cardKey  = c.id || idx;
                const expanded = expandedIds.has(cardKey);
                const diff     = expanded ? diffWords(c.original_text || '', c.updated_text || '') : null;
                const hasText  = c.original_text || c.updated_text;
                const ctype    = (c.change_type || 'UPDATE').toUpperCase();
                return (
                  <div
                    key={cardKey}
                    className={`hrm-pm-change-card hrm-pm-change-card--${ctype.toLowerCase()}${c._live ? ' hrm-pm-change-card--live' : ''}`}
                  >
                    <div className="hrm-pm-change-card__header">
                      {c.section_title && (
                        <span className="hrm-pm-section-tag" title={c.section_title}>
                          {c.section_title.length > 28 ? c.section_title.slice(0, 28) + '…' : c.section_title}
                        </span>
                      )}
                      <span className={`hrm-pm-type-badge hrm-pm-type-badge--${ctype.toLowerCase()}`}>{ctype}</span>
                    </div>

                    {expanded ? (
                      diff ? (
                        <div className="hrm-pm-diff">
                          {diff.map((tok, ti) => (
                            <span key={ti} className={`hrm-pm-diff-tok hrm-pm-diff-tok--${tok.type}`}>{tok.text}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="hrm-pm-before-after">
                          <div className="hrm-pm-ba-col">
                            <div className="hrm-pm-ba-label hrm-pm-ba-label--before">BEFORE</div>
                            <div className="hrm-pm-ba-text hrm-pm-ba-text--before">{c.original_text}</div>
                          </div>
                          <div className="hrm-pm-ba-col">
                            <div className="hrm-pm-ba-label hrm-pm-ba-label--after">AFTER</div>
                            <div className="hrm-pm-ba-text hrm-pm-ba-text--after">{c.updated_text}</div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="hrm-pm-preview">
                        {c.original_text && (
                          <div className="hrm-pm-preview-row">
                            <span className="hrm-pm-preview-lbl hrm-pm-preview-lbl--before">BEFORE</span>
                            <span className="hrm-pm-preview-txt hrm-pm-preview-txt--before">
                              {c.original_text.length > 200 ? c.original_text.slice(0, 200) + '…' : c.original_text}
                            </span>
                          </div>
                        )}
                        {c.updated_text && (
                          <div className="hrm-pm-preview-row">
                            <span className="hrm-pm-preview-lbl hrm-pm-preview-lbl--after">AFTER</span>
                            <span className="hrm-pm-preview-txt hrm-pm-preview-txt--after">
                              {c.updated_text.length > 200 ? c.updated_text.slice(0, 200) + '…' : c.updated_text}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {hasText && (
                      <button className="hrm-pm-expand-btn" onClick={() => toggleExpand(cardKey)}>
                        {expanded ? '▲ Collapse' : '▼ Show full diff'}
                      </button>
                    )}
                  </div>
                );
              })}
              <div ref={changesEndRef} />
            </div>
          </div>
        </div>

        {/* ── Companion panels: Red Flags / Open Items / Trace Log ── */}
        {(redFlagsList.length > 0 || openItemsList.length > 0 || traceLogList.length > 0 || redFlags > 0 || openItems > 0) && (
          <div className="hrm-pm-companion">
            <div className="hrm-pm-companion-tabs">
              <button
                className={`hrm-pm-ctab${panelTab === 'redflags' ? ' hrm-pm-ctab--active' : ''}`}
                onClick={() => setPanelTab('redflags')}
              >
                Red Flags
                {redFlags > 0 && <span className="hrm-pm-ctab-badge hrm-pm-ctab-badge--danger">{redFlags}</span>}
              </button>
              <button
                className={`hrm-pm-ctab${panelTab === 'openitems' ? ' hrm-pm-ctab--active' : ''}`}
                onClick={() => setPanelTab('openitems')}
              >
                Open Items
                {openItems > 0 && <span className="hrm-pm-ctab-badge hrm-pm-ctab-badge--orange">{openItems}</span>}
              </button>
              <button
                className={`hrm-pm-ctab${panelTab === 'tracelog' ? ' hrm-pm-ctab--active' : ''}`}
                onClick={() => setPanelTab('tracelog')}
              >
                Trace Log
                {traceLogList.length > 0 && <span className="hrm-pm-ctab-badge">{traceLogList.length}</span>}
              </button>
            </div>

            {panelTab === 'redflags' && (
              <div className="hrm-pm-ctab-content">
                {redFlagsList.length === 0 ? (
                  <p className="hrm-pm-companion-empty">
                    {redFlags > 0 ? 'Loading red flags…' : 'No red flags detected yet.'}
                  </p>
                ) : (
                  <table className="hrm-pm-companion-table">
                    <thead>
                      <tr>
                        <th>ID</th><th>Section</th><th>Risk Level</th><th>Issue</th><th>What to Confirm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redFlagsList.map((rf, i) => (
                        <tr key={rf.rf_id || i}>
                          <td className="hrm-pm-ct-id">{rf.rf_id}</td>
                          <td>{rf.section_title}</td>
                          <td>
                            <span className={`hrm-pm-severity hrm-pm-severity--${(rf.severity || 'medium').toLowerCase()}`}>
                              {rf.severity}
                            </span>
                          </td>
                          <td>{rf.issue_summary}</td>
                          <td>{rf.what_to_confirm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {panelTab === 'openitems' && (
              <div className="hrm-pm-ctab-content">
                {openItemsList.length === 0 ? (
                  <p className="hrm-pm-companion-empty">
                    {openItems > 0 ? 'Loading open items…' : 'No open items detected yet.'}
                  </p>
                ) : (
                  <table className="hrm-pm-companion-table">
                    <thead>
                      <tr>
                        <th>ID</th><th>Section</th><th>Missing Info</th><th>Question to Client</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openItemsList.map((oi, i) => (
                        <tr key={oi.oi_id || i}>
                          <td className="hrm-pm-ct-id">{oi.oi_id}</td>
                          <td>{oi.section_title}</td>
                          <td>{oi.missing_info}</td>
                          <td>{oi.question_to_client}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {panelTab === 'tracelog' && (
              <div className="hrm-pm-ctab-content">
                {traceLogList.length === 0 ? (
                  <p className="hrm-pm-companion-empty">Trace log will appear after run completes.</p>
                ) : (
                  <table className="hrm-pm-companion-table">
                    <thead>
                      <tr>
                        <th>Client Input</th><th>Mapped Section</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {traceLogList.map((t, i) => (
                        <tr key={i}>
                          <td>{t.input_ref}</td>
                          <td>{t.mapped_section}</td>
                          <td>
                            <span className={`hrm-pm-trace-status hrm-pm-trace-status--${(t.status || 'inserted').toLowerCase().replace(/\s/g, '-')}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Stop button ── */}
        {!isTerminal && (
          <div className="hrm-pm-actions">
            <button
              type="button"
              onClick={handleStop}
              disabled={stopping}
              className={`hrm-pm-stop-btn${stopping ? ' hrm-pm-stop-btn--stopping' : ''}`}
            >
              {stopping
                ? <><Spin size="small" style={{ marginRight: 6 }} /> Stopping…</>
                : '⏹ Stop & Download'
              }
            </button>
          </div>
        )}

        {/* ── Download panel ── */}
        {(done || cancelled) && (
          <div className={`hrm-pm-download${cancelled ? ' hrm-pm-download--cancelled' : ''}`}>
            <div className="hrm-pm-download__icon">
              {cancelled ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
            </div>
            <div className="hrm-pm-download__info">
              <div className="hrm-pm-download__title">
                {cancelled ? 'Partial Export Ready' : 'Updated Manual Ready'}
              </div>
              <div className="hrm-pm-download__sub">
                {cancelled && updatedSections > 0 ? `${updatedSections} section(s) updated · ` : ''}
                {exportFileName || 'updated_hr_manual.docx'}
              </div>
            </div>
            <div className="hrm-pm-dl-group">
              {exportUrl ? (
                <a
                  href={exportUrl}
                  download={exportFileName || 'updated_hr_manual.docx'}
                  className="hrm-pm-dl-btn"
                >
                  <DownloadOutlined style={{ marginRight: 8 }} />
                  Updated Manual
                </a>
              ) : (
                <span className="hrm-pm-dl-waiting">
                  <Spin size="small" style={{ marginRight: 8 }} />
                  Preparing file…
                </span>
              )}
              {redFlags > 0 && (
                rfExportUrl ? (
                  <a
                    href={rfExportUrl}
                    download={rfExportFileName || 'red_flag_register.docx'}
                    className="hrm-pm-dl-btn hrm-pm-dl-btn--danger"
                  >
                    <DownloadOutlined style={{ marginRight: 8 }} />
                    Red Flag Register
                  </a>
                ) : (
                  <span className="hrm-pm-dl-waiting">
                    {fetchingRfExport && <Spin size="small" style={{ marginRight: 8 }} />}
                    Red Flag Register…
                  </span>
                )
              )}
              {openItems > 0 && (
                oiExportUrl ? (
                  <a
                    href={oiExportUrl}
                    download={oiExportFileName || 'open_items.docx'}
                    className="hrm-pm-dl-btn hrm-pm-dl-btn--warning"
                  >
                    <DownloadOutlined style={{ marginRight: 8 }} />
                    Open Items
                  </a>
                ) : (
                  <span className="hrm-pm-dl-waiting">
                    {fetchingOiExport && <Spin size="small" style={{ marginRight: 8 }} />}
                    Open Items…
                  </span>
                )
              )}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}

export default ProgressModal;
