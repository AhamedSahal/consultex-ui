import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Select, Input, Button, Popconfirm, Spin, Tooltip, Checkbox, Popover } from 'antd';
import { toast } from 'react-toastify';
import {
  fetchData,
  fetchFilters,
  fetchPreferences,
  savePreferences,
} from '../service';

const ALL_COLUMNS = [
  { key: 'company',                  label: 'Company',                    width: 160, frozen: true },
  { key: 'country',                  label: 'Country',                    width: 100 },
  { key: 'region',                   label: 'Region',                     width: 120 },
  { key: 'industry',                 label: 'Industry',                   width: 140 },
  { key: 'currency',                 label: 'Currency',                   width: 90  },
  { key: 'year',                     label: 'Year',                       width: 70  },
  { key: 'compensation_element',     label: 'Compensation Element',       width: 200 },
  { key: 'job_name',                 label: 'Job Name',                   width: 200 },
  { key: 'grade',                    label: 'Grade',                      width: 80  },
  { key: 'job_function',             label: 'Job Function',               width: 150 },
  { key: 'job_level_function',       label: 'Job Level Function',         width: 160 },
  { key: 'job_sub_function',         label: 'Job Sub Function',           width: 160 },
  { key: 'job_level_sub_function',   label: 'Job Level SubFunction',      width: 170 },
  { key: 'job_code',                 label: 'Job Code',                   width: 100 },
  { key: 'market_identifier',        label: 'Market Identifier',          width: 150 },
  { key: 'percentile',               label: 'Percentile',                 width: 100 },
  { key: 'p10',                      label: '10th Percentile',            width: 130, numeric: true },
  { key: 'p25',                      label: '25th Percentile',            width: 130, numeric: true },
  { key: 'p40',                      label: '40th Percentile',            width: 130, numeric: true },
  { key: 'p50',                      label: '50th Percentile',            width: 130, numeric: true },
  { key: 'p65',                      label: '65th Percentile',            width: 130, numeric: true },
  { key: 'p75',                      label: '75th Percentile',            width: 130, numeric: true },
  { key: 'p90',                      label: '90th Percentile',            width: 130, numeric: true },
  { key: 'average',                  label: 'Average',                    width: 120, numeric: true },
  { key: 'target_market_compensation', label: 'Target Market Compensation', width: 200, numeric: true },
  { key: 'num_incumbents',           label: 'Number of Incumbents',       width: 170, numeric: true },
  { key: 'num_organizations',        label: 'Number of Organizations',    width: 190, numeric: true },
];

const ALL_KEYS = ALL_COLUMNS.map(c => c.key);
const BATCH = 200;

function fmtNum(val) {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  if (isNaN(n)) return val;
  return n.toLocaleString();
}

function ColumnControl({ visibleKeys, onChange, onSave, saving }) {
  const toggle = (key) => {
    const next = new Set(visibleKeys);
    if (next.has(key)) { if (next.size === 1) return; next.delete(key); }
    else next.add(key);
    onChange(next);
  };
  return (
    <div className="pl-col-ctrl">
      <div className="pl-col-ctrl-header">
        <span className="pl-col-ctrl-title">Show / Hide Columns</span>
        <div className="pl-col-ctrl-actions">
          <button className="pl-col-link" onClick={() => onChange(new Set(ALL_KEYS))}>All</button>
          <span className="pl-col-divider">|</span>
          <button className="pl-col-link" onClick={() => onChange(new Set(['company']))}>None</button>
        </div>
      </div>
      <div className="pl-col-ctrl-list">
        {ALL_COLUMNS.map(col => (
          <label key={col.key} className="pl-col-item">
            <Checkbox checked={visibleKeys.has(col.key)} onChange={() => toggle(col.key)} />
            <span className="pl-col-item-label">{col.label}</span>
          </label>
        ))}
      </div>
      <div className="pl-col-ctrl-footer">
        <Button type="primary" size="small" loading={saving} onClick={onSave}
          style={{ background: 'var(--orange)', borderColor: 'var(--orange)', width: '100%' }}>
          {saving ? 'Saving…' : '💾 Save Column Layout'}
        </Button>
      </div>
    </div>
  );
}

export default function JobLevelTable({
  uploads = [],
  activeUploadId,
  setActiveUploadId,
  onDelete,
  onOpenUpload,
}) {
  // ── columns ────────────────────────────────────────────────────────────────
  const [visibleKeys, setVisibleKeys] = useState(new Set(ALL_KEYS));
  const [colPanelOpen, setColPanelOpen] = useState(false);
  const [savingCols, setSavingCols] = useState(false);

  // ── filters ────────────────────────────────────────────────────────────────
  const [filterOptions, setFilterOptions] = useState({});
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  // ── table data ─────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasMore = useRef(true);

  // ── table layout ───────────────────────────────────────────────────────────
  const placeholderRef = useRef(null);
  const [tableRect, setTableRect] = useState(null);

  // Measure placeholder on mount and resize
  useEffect(() => {
    const measure = () => {
      if (!placeholderRef.current) return;
      const r = placeholderRef.current.getBoundingClientRect();
      setTableRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (placeholderRef.current) ro.observe(placeholderRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // Re-measure when content above table changes
  useEffect(() => {
    if (!placeholderRef.current) return;
    const r = placeholderRef.current.getBoundingClientRect();
    setTableRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [rows.length, loading, activeUploadId, filters, search]);

  // Re-measure on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!placeholderRef.current) return;
      const r = placeholderRef.current.getBoundingClientRect();
      setTableRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  // ── load saved column prefs on mount ───────────────────────────────────────
  useEffect(() => {
    fetchPreferences()
      .then(({ visibleColumns }) => {
        if (Array.isArray(visibleColumns) && visibleColumns.length > 0) {
          const valid = visibleColumns.filter(k => ALL_KEYS.includes(k));
          if (valid.length > 0) setVisibleKeys(new Set(valid));
        }
      }).catch(() => { });
  }, []);

  // ── reset filters when dataset changes ────────────────────────────────────
  useEffect(() => {
    if (!activeUploadId) return;
    setFilters({}); setSearch('');
    fetchFilters(activeUploadId).then(setFilterOptions).catch(() => { });
  }, [activeUploadId]);

  // ── load first page ────────────────────────────────────────────────────────
  const loadFirst = useCallback(async () => {
    if (!activeUploadId) return;
    setLoading(true); hasMore.current = true;
    try {
      const params = { ...filters };
      if (search) params.search = search;
      const res = await fetchData({ uploadId: activeUploadId, filters: params, limit: BATCH, offset: 0 });
      setRows(res.rows); setTotal(res.total); setOffset(res.rows.length);
      hasMore.current = res.rows.length < res.total;
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [activeUploadId, filters, search]);

  useEffect(() => { loadFirst(); }, [loadFirst]);

  // ── infinite scroll ────────────────────────────────────────────────────────
  const handleTableScroll = useCallback((e) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (nearBottom && hasMore.current && !loadingMore) {
      setLoadingMore(true);
      const params = { ...filters };
      if (search) params.search = search;
      fetchData({ uploadId: activeUploadId, filters: params, limit: BATCH, offset })
        .then((res) => {
          setRows(prev => [...prev, ...res.rows]);
          setOffset(prev => prev + res.rows.length);
          hasMore.current = (offset + res.rows.length) < res.total;
        })
        .catch(() => { })
        .finally(() => setLoadingMore(false));
    }
  }, [loadingMore, filters, search, activeUploadId, offset]);

  // ── save column layout ────────────────────────────────────────────────────
  const handleSaveColumns = async () => {
    setSavingCols(true);
    try {
      await savePreferences([...visibleKeys]);
      toast.success('Column layout saved');
      setColPanelOpen(false);
    } catch { toast.error('Failed to save column layout'); }
    finally { setSavingCols(false); }
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const visibleCols = ALL_COLUMNS.filter(c => visibleKeys.has(c.key));
  const totalWidth = visibleCols.reduce((s, c) => s + c.width, 0);

  const filterSelect = (key, placeholder, options) => (
    <Select allowClear showSearch placeholder={placeholder} style={{ minWidth: 130 }}
      value={filters[key] || undefined}
      onChange={(val) => setFilters(prev => ({ ...prev, [key]: val || undefined }))}
      filterOption={(input, opt) => opt.label?.toLowerCase().includes(input.toLowerCase())}
      options={(options || []).map(v => ({ value: v, label: v }))}
      className="pl-filter-select"
    />
  );

  return (
    <>
      {/* ── Control bar ─────────────────────────────────────────────────── */}
      <div className="pl-control-bar">

        {/* Left: dataset selector */}
        <div className="pl-control-left">
          <div className="pl-dataset-row">
            <span className="pl-label">Dataset</span>
            <Select style={{ minWidth: 280 }} placeholder="Select an uploaded dataset"
              value={activeUploadId || undefined} onChange={setActiveUploadId}
              options={uploads.map(u => ({ value: u.id, label: `${u.document_number} — ${u.name} (${Number(u.row_count).toLocaleString()} rows)` }))}
            />
            {activeUploadId && (
              <Popconfirm title="Delete this dataset?" description="All rows will be permanently removed."
                onConfirm={onDelete} okText="Delete" okButtonProps={{ danger: true }}>
                <button className="pl-delete-btn" title="Delete dataset">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </Popconfirm>
            )}
            {uploads.length > 0 && (
              <span className="pl-uploads-summary">
                {uploads.length} upload{uploads.length > 1 ? 's' : ''} · {uploads.reduce((s, u) => s + (u.row_count || 0), 0).toLocaleString()} rows
              </span>
            )}
          </div>
        </div>

        {/* Right: upload button */}
        <button className="pl-upload-btn" onClick={onOpenUpload}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Excel
        </button>
      </div>

      {/* ── Filters bar ─────────────────────────────────────────────────── */}
      {activeUploadId && (
        <div className="pl-filters-bar">
          <div className="pl-filters-inner">
            {filterSelect('company', 'Company', filterOptions.companies)}
            {filterSelect('country', 'Country', filterOptions.countries)}
            {filterSelect('grade', 'Grade', filterOptions.grades)}
            {filterSelect('job_function', 'Job Function', filterOptions.job_functions)}
            {filterSelect('industry', 'Industry', filterOptions.industries)}
            {filterSelect('currency', 'Currency', filterOptions.currencies)}
            <Input.Search placeholder="Search..." allowClear style={{ width: 160 }}
              onSearch={(val) => setSearch(val)}
              onChange={(e) => { if (!e.target.value) setSearch(''); }}
            />
            <button className="pl-clear-btn" onClick={() => { setFilters({}); setSearch(''); }}>Clear</button>
          </div>
          <div className="pl-filters-right-group">
            {!loading && (
              <span className="pl-count-inline">
                <strong>{rows.length.toLocaleString()}</strong> / {total.toLocaleString()} rows
                {loadingMore && <span className="pl-loading-more"> · loading…</span>}
              </span>
            )}
            <Popover open={colPanelOpen} onOpenChange={setColPanelOpen} trigger="click" placement="bottomRight"
              content={<ColumnControl visibleKeys={visibleKeys} onChange={setVisibleKeys} onSave={handleSaveColumns} saving={savingCols} />}>
              <button className="pl-col-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                Columns <span className="pl-col-badge">{visibleKeys.size}/{ALL_COLUMNS.length}</span>
              </button>
            </Popover>
          </div>
        </div>
      )}

      {/* ── Table placeholder ───────────────────────────────────────────── */}
      <div className="pl-table-placeholder" ref={placeholderRef} />

      {tableRect && (
        <div
          className="pl-scroll-container"
          style={{
            position: 'fixed',
            top: tableRect.top,
            left: tableRect.left,
            width: tableRect.width,
            height: tableRect.height,
          }}
          onScroll={handleTableScroll}
        >
          {loading ? (
            <div className="pl-spinner"><Spin size="large" /></div>
          ) : !activeUploadId ? (
            <div className="pl-empty">Upload an Excel file to get started</div>
          ) : rows.length === 0 ? (
            <div className="pl-empty">No data matches the current filters</div>
          ) : (
            <table className="pl-table" style={{ width: totalWidth, minWidth: totalWidth }}>
              <thead>
                <tr>
                  {visibleCols.map(col => (
                    <th key={col.key}
                      className={`pl-th${col.frozen ? ' pl-th-frozen' : ''}${col.numeric ? ' pl-th-num' : ''}`}
                      style={{ width: col.width, minWidth: col.width }}>
                      <Tooltip title={col.label}>{col.label}</Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'pl-tr-even' : 'pl-tr-odd'}>
                    {visibleCols.map(col => {
                      const val = row[col.key];
                      const display = col.numeric ? fmtNum(val) : (val ?? '');
                      return (
                        <td key={col.key}
                          className={`pl-td${col.frozen ? ' pl-td-frozen' : ''}${col.numeric ? ' pl-td-num' : ''}`}
                          style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                          title={String(display)}>
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {loadingMore && (
                  <tr><td colSpan={visibleCols.length} className="pl-load-more-row">
                    <Spin size="small" /> Loading more rows…
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
