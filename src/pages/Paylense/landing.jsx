import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Select, Input, Button, Upload, Form, Spin } from 'antd';
import { toast } from 'react-toastify';

import JobLevelTable from './JobLevel';
import GradeLevelPage from './GradeLevel/index';
import StatsCards from './Dashboard/StatsCards';
import PercentileBandChart from './Dashboard/PercentileBandChart';
import GradeProgressionChart from './Dashboard/GradeProgressionChart';
import CountryDistributionChart from './Dashboard/CountryDistributionChart';
import TopJobsChart from './Dashboard/TopJobsChart';
import InsightPanel from './Dashboard/InsightPanel';
import CompensationPositioning from './Dashboard/CompensationPositioning';

import {
  uploadFile,
  fetchUploads,
  deleteUpload,
  fetchFilters,
  generateInsight,
  fetchStats,
  fetchPercentileBands,
  fetchGradeProgression,
  fetchCountryDistribution,
  fetchTopJobs,
  analyzePositioning,
} from './service';

const { Dragger } = Upload;

export default function PaylenseLanding() {
  // ── tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('job-level'); // 'job-level' | 'grade-level' | 'dashboard'

  // ── upload modal ───────────────────────────────────────────────────────────
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [selectedFile, setSelectedFile] = useState(null);

  // ── shared dataset state ───────────────────────────────────────────────────
  const [uploads, setUploads] = useState([]);
  const [activeUploadId, setActiveUploadId] = useState(null);

  // ── dashboard state ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [insightSummary, setInsightSummary] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [bands, setBands] = useState([]);
  const [bandsLoading, setBandsLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [topJobs, setTopJobs] = useState([]);
  const [topJobsLoading, setTopJobsLoading] = useState(false);
  const [positioningResult, setPositioningResult] = useState('');
  const [positioningLoading, setPositioningLoading] = useState(false);

  // ── init: load uploads on mount ────────────────────────────────────────────
  useEffect(() => {
    fetchUploads()
      .then((data) => { setUploads(data); if (data.length > 0) setActiveUploadId(data[0].id); })
      .catch(() => { });
  }, []);

  // ── sync filter options when dataset changes ───────────────────────────────
  useEffect(() => {
    if (!activeUploadId) return;
    setFilters({});
    setInsightSummary('');
    fetchFilters(activeUploadId).then(setFilterOptions).catch(() => { });
  }, [activeUploadId]);

  // ── dashboard data loader ─────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    if (!activeUploadId) return;
    const args = { uploadId: activeUploadId, filters };

    setStatsLoading(true);
    fetchStats(args).then(setStats).catch(() => { }).finally(() => setStatsLoading(false));

    setBandsLoading(true);
    fetchPercentileBands(args).then(setBands).catch(() => { }).finally(() => setBandsLoading(false));

    setGradesLoading(true);
    fetchGradeProgression(args).then(setGrades).catch(() => { }).finally(() => setGradesLoading(false));

    setCountriesLoading(true);
    fetchCountryDistribution(args).then(setCountries).catch(() => { }).finally(() => setCountriesLoading(false));

    setTopJobsLoading(true);
    fetchTopJobs(args).then(setTopJobs).catch(() => { }).finally(() => setTopJobsLoading(false));
  }, [activeUploadId, filters]);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
  }, [activeTab, loadDashboard]);

  // ── upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    try { await form.validateFields(); } catch { return; }
    if (!selectedFile) { toast.error('Please select an Excel file'); return; }
    setUploading(true);
    try {
      const vals = form.getFieldsValue();
      const res = await uploadFile({ documentNumber: vals.document_number, name: vals.name, file: selectedFile });
      toast.success(`Uploaded — ${res.row_count.toLocaleString()} rows imported`);
      const updated = await fetchUploads();
      setUploads(updated); setActiveUploadId(res.id);
      setUploadModalOpen(false); form.resetFields(); setSelectedFile(null);
    } catch (err) { toast.error(err?.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    if (!activeUploadId) return;
    try {
      await deleteUpload(activeUploadId);
      toast.success('Dataset deleted');
      const updated = await fetchUploads();
      setUploads(updated);
      setActiveUploadId(updated.length > 0 ? updated[0].id : null);
    } catch { toast.error('Delete failed'); }
  };

  // ── AI insight ─────────────────────────────────────────────────────────────
  const handleGenerateInsight = async () => {
    if (!activeUploadId) return;
    setInsightLoading(true);
    try {
      const result = await generateInsight({ uploadId: activeUploadId, filters });
      setInsightSummary(result.summary);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to generate insight');
    } finally { setInsightLoading(false); }
  };

  // ── AI positioning ─────────────────────────────────────────────────────────
  const handleAnalyzePositioning = async ({ internalSalary, currency }) => {
    if (!activeUploadId) return;
    setPositioningLoading(true);
    try {
      const result = await analyzePositioning({ uploadId: activeUploadId, filters, internalSalary, currency });
      setPositioningResult(result.analysis);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Positioning analysis failed');
    } finally { setPositioningLoading(false); }
  };

  return (
    <div className={`pl-page${activeTab === 'dashboard' ? ' pl-page--scroll' : ''}`}>

      {/* ── Header / Tab Nav ──────────────────────────────────────────────── */}
      <div className="pl-header">
        <nav className="pl-tab-nav">
          <button
            className={`pl-tab${activeTab === 'job-level' ? ' pl-tab-active' : ''}`}
            onClick={() => setActiveTab('job-level')}
          >
            Job Level
          </button>
          <button
            className={`pl-tab${activeTab === 'grade-level' ? ' pl-tab-active' : ''}`}
          onClick={() => setActiveTab('grade-level')}
            title="Coming soon"
          >
            Grade Level
          </button>
          <button
            className={`pl-tab${activeTab === 'dashboard' ? ' pl-tab-active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
        </nav>
      </div>

      {/* ══ JOB LEVEL ════════════════════════════════════════════════════════ */}
      {activeTab === 'job-level' && (
        <JobLevelTable
          uploads={uploads}
          activeUploadId={activeUploadId}
          setActiveUploadId={setActiveUploadId}
          onDelete={handleDelete}
          onOpenUpload={() => setUploadModalOpen(true)}
        />
      )}

      {/* ══ GRADE LEVEL ══════════════════════════════════════════════════════ */}
      {activeTab === 'grade-level' && <GradeLevelPage />}

      {/* ══ DASHBOARD ════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <div className="pl-dashboard">
          <StatsCards data={stats} loading={statsLoading} />
          <div className="pl-chart-grid">
            <PercentileBandChart data={bands} loading={bandsLoading} />
            <GradeProgressionChart data={grades} loading={gradesLoading} />
            <CountryDistributionChart data={countries} loading={countriesLoading} />
            <TopJobsChart data={topJobs} loading={topJobsLoading} />
          </div>
          <InsightPanel
            summary={insightSummary}
            loading={insightLoading}
            hasData={!!activeUploadId}
            onGenerate={handleGenerateInsight}
          />
          <CompensationPositioning
            onAnalyze={handleAnalyzePositioning}
            loading={positioningLoading}
            result={positioningResult}
            filterOptions={filterOptions}
            filters={filters}
          />
        </div>
      )}

      {/* ── Upload Modal ──────────────────────────────────────────────────── */}
      <Modal title="Upload Excel File" open={uploadModalOpen}
        onCancel={() => { setUploadModalOpen(false); form.resetFields(); setSelectedFile(null); }}
        footer={null} width={460}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Document Number" name="document_number"
            rules={[{ required: true, message: 'Please enter a document number' }]}>
            <Input placeholder="e.g. PAY-2024-001" />
          </Form.Item>
          <Form.Item label="Name" name="name"
            rules={[{ required: true, message: 'Please enter a name' }]}>
            <Input placeholder="e.g. MENA Compensation Survey 2024" />
          </Form.Item>
          <Form.Item label="Excel File" required>
            <Dragger accept=".xlsx,.xls" maxCount={1}
              beforeUpload={(file) => { setSelectedFile(file); return false; }}
              onRemove={() => setSelectedFile(null)}
              fileList={selectedFile ? [{ uid: '1', name: selectedFile.name, status: 'done' }] : []}>
              <p className="ant-upload-drag-icon">📊</p>
              <p className="ant-upload-text">Click or drag Excel file here</p>
              <p className="ant-upload-hint">.xlsx or .xls — all sheets will be imported</p>
            </Dragger>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button onClick={() => { setUploadModalOpen(false); form.resetFields(); setSelectedFile(null); }}>Cancel</Button>
            <Button type="primary" loading={uploading} onClick={handleUpload} disabled={!selectedFile}
              style={{ background: 'var(--orange)', borderColor: 'var(--orange)' }}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
