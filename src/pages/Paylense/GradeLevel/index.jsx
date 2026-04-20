import { useState, useEffect, useCallback } from 'react';
import { Select, Button, Popconfirm, Spin, Modal, Form, Input, Upload } from 'antd';
import { toast } from 'react-toastify';
import {
  fetchGradeUploads,
  uploadGradeFile,
  deleteGradeUpload,
  fetchGradeData,
  fetchGradeFilters,
} from '../service';

const { Dragger } = Upload;

const SHEETS = [
  { key: 'Monthly Basic Salary',   label: 'Monthly Basic Salary' },
  { key: 'Monthly Fixed Cash',     label: 'Monthly Fixed Cash' },
  { key: 'Monthly Total Earnings', label: 'Monthly Total Earnings' },
  { key: 'Monthly Total Package',  label: 'Monthly Total Package' },
];

const COLUMNS = [
  { key: 'grade',          label: 'Grade',              numeric: false },
  { key: 'p90',            label: 'P90',                numeric: true },
  { key: 'p75',            label: 'P75',                numeric: true },
  { key: 'p50',            label: 'P50',                numeric: true },
  { key: 'p25',            label: 'P25',                numeric: true },
  { key: 'p10',            label: 'P10',                numeric: true },
  { key: 'average',        label: 'Average',            numeric: true },
  { key: 'num_incumbents', label: 'No. of Incumbents',  numeric: true },
  { key: 'num_companies',  label: 'No. of Companies',   numeric: true },
];

function fmtNum(val) {
  if (val === null || val === undefined || val === '') return '';
  const n = Number(val);
  if (isNaN(n)) return val;
  return n.toLocaleString();
}

export default function GradeLevelPage() {
  const [uploads, setUploads] = useState([]);
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form] = Form.useForm();

  const [activeSheet, setActiveSheet] = useState(SHEETS[0].key);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── filter state ───────────────────────────────────────────────────────────
  const [filterOptions, setFilterOptions] = useState({ grades: [] });
  const [gradeFilter, setGradeFilter] = useState(undefined);

  // ── load uploads on mount ──────────────────────────────────────────────────
  useEffect(() => {
    fetchGradeUploads()
      .then((data) => {
        setUploads(data);
        if (data.length > 0) setActiveUploadId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // ── load filter options when dataset changes ───────────────────────────────
  useEffect(() => {
    if (!activeUploadId) return;
    setGradeFilter(undefined);
    fetchGradeFilters(activeUploadId).then(setFilterOptions).catch(() => {});
  }, [activeUploadId]);

  // ── load table data when upload, sheet or filter changes ──────────────────
  const loadData = useCallback(async () => {
    if (!activeUploadId) return;
    setLoading(true);
    try {
      const res = await fetchGradeData({ uploadId: activeUploadId, sheet: activeSheet, grade: gradeFilter });
      setRows(res.rows || []);
    } catch {
      toast.error('Failed to load grade data');
    } finally {
      setLoading(false);
    }
  }, [activeUploadId, activeSheet, gradeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    try { await form.validateFields(); } catch { return; }
    if (!selectedFile) { toast.error('Please select an Excel file'); return; }
    setUploading(true);
    try {
      const vals = form.getFieldsValue();
      const res = await uploadGradeFile({ documentNumber: vals.document_number, name: vals.name, file: selectedFile });
      toast.success(`Uploaded — ${res.row_count?.toLocaleString() ?? 0} rows imported`);
      const updated = await fetchGradeUploads();
      setUploads(updated);
      setActiveUploadId(res.id);
      setUploadModalOpen(false);
      form.resetFields();
      setSelectedFile(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!activeUploadId) return;
    try {
      await deleteGradeUpload(activeUploadId);
      toast.success('Dataset deleted');
      const updated = await fetchGradeUploads();
      setUploads(updated);
      setActiveUploadId(updated.length > 0 ? updated[0].id : null);
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="gl-page">

      {/* ── Control bar ───────────────────────────────────────────────────── */}
      <div className="pl-control-bar">
        <div className="pl-dataset-row">
          <span className="pl-label">Dataset</span>
          <Select
            style={{ minWidth: 280 }}
            placeholder="Select an uploaded dataset"
            value={activeUploadId || undefined}
            onChange={setActiveUploadId}
            options={uploads.map(u => ({
              value: u.id,
              label: `${u.document_number} — ${u.name}`,
            }))}
          />
          {activeUploadId && (
            <Popconfirm
              title="Delete this dataset?"
              description="All rows will be permanently removed."
              onConfirm={handleDelete}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <button className="pl-delete-btn" title="Delete dataset">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </Popconfirm>
          )}
          {uploads.length > 0 && (
            <span className="pl-uploads-summary">
              {uploads.length} upload{uploads.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button className="pl-upload-btn" onClick={() => setUploadModalOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Excel
        </button>
      </div>

      {/* ── Filters bar ───────────────────────────────────────────────────── */}
      {activeUploadId && (
        <div className="pl-filters-bar">
          <div className="pl-filters-inner">
            <Select
              allowClear
              showSearch
              placeholder="Grade"
              style={{ minWidth: 160 }}
              value={gradeFilter}
              onChange={(val) => setGradeFilter(val || undefined)}
              filterOption={(input, opt) => opt.label?.toLowerCase().includes(input.toLowerCase())}
              options={(filterOptions.grades || []).map(v => ({ value: v, label: v }))}
              className="pl-filter-select"
            />
            <button className="pl-clear-btn" onClick={() => setGradeFilter(undefined)}>Clear</button>
          </div>
          {!loading && (
            <span className="pl-count-inline">
              <strong>{rows.length.toLocaleString()}</strong> row{rows.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Sheet sub-tabs ────────────────────────────────────────────────── */}
      <div className="pl-sheet-tabs">
        {SHEETS.map(s => (
          <button
            key={s.key}
            className={`pl-sheet-tab${activeSheet === s.key ? ' pl-sheet-tab-active' : ''}`}
            onClick={() => setActiveSheet(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="gl-table-wrap">
        {loading ? (
          <div className="pl-spinner"><Spin size="large" /></div>
        ) : !activeUploadId ? (
          <div className="pl-empty">Upload an Excel file to get started</div>
        ) : rows.length === 0 ? (
          <div className="pl-empty">No data found for this sheet</div>
        ) : (
          <table className="pl-table gl-table">
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} className={`pl-th${col.numeric ? ' pl-th-num' : ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'pl-tr-even' : 'pl-tr-odd'}>
                  {COLUMNS.map(col => {
                    const val = row[col.key];
                    const display = col.numeric ? fmtNum(val) : (val ?? '');
                    return (
                      <td
                        key={col.key}
                        className={`pl-td${col.numeric ? ' pl-td-num' : ''}`}
                        title={String(display)}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Upload Modal ──────────────────────────────────────────────────── */}
      <Modal
        title="Upload Grade Level Excel"
        open={uploadModalOpen}
        onCancel={() => { setUploadModalOpen(false); form.resetFields(); setSelectedFile(null); }}
        footer={null}
        width={460}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Document Number" name="document_number"
            rules={[{ required: true, message: 'Please enter a document number' }]}>
            <Input placeholder="e.g. GRD-2024-001" />
          </Form.Item>
          <Form.Item label="Name" name="name"
            rules={[{ required: true, message: 'Please enter a name' }]}>
            <Input placeholder="e.g. Asset Management UAE Grade Report 2024" />
          </Form.Item>
          <Form.Item label="Excel File" required>
            <Dragger
              accept=".xlsx,.xls"
              maxCount={1}
              beforeUpload={(file) => { setSelectedFile(file); return false; }}
              onRemove={() => setSelectedFile(null)}
              fileList={selectedFile ? [{ uid: '1', name: selectedFile.name, status: 'done' }] : []}
            >
              <p className="ant-upload-drag-icon">📊</p>
              <p className="ant-upload-text">Click or drag Excel file here</p>
              <p className="ant-upload-hint">.xlsx or .xls — sheets will be imported by name</p>
            </Dragger>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button onClick={() => { setUploadModalOpen(false); form.resetFields(); setSelectedFile(null); }}>
              Cancel
            </Button>
            <Button
              type="primary"
              loading={uploading}
              onClick={handleUpload}
              disabled={!selectedFile}
              style={{ background: 'var(--orange)', borderColor: 'var(--orange)' }}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
