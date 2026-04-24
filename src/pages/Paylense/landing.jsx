import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Select, Input, Button, Upload, Form, Spin } from 'antd';
import { toast } from 'react-toastify';

import PaylenseOverview from './Overview/index';
import IntelligenceCore from './IntelligenceCore/index';
import JobLevelTable from './JobLevel';
import GradeLevelPage from './GradeLevel/index';
import BenchmarkReportGen from './MarketBenchmarking/index';
import StatsCards from './Dashboard/StatsCards';
import PercentileBandChart from './Dashboard/PercentileBandChart';
import GradeProgressionChart from './Dashboard/GradeProgressionChart';
import CountryDistributionChart from './Dashboard/CountryDistributionChart';
import TopJobsChart from './Dashboard/TopJobsChart';
import InsightPanel from './Dashboard/InsightPanel';
import CompensationPositioning from './Dashboard/CompensationPositioning';
import BenchmarkSummary from './Dashboard/BenchmarkSummary';

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
  fetchBenchmarkSlice,
} from './service';

const { Dragger } = Upload;

// ── Coming Soon placeholder ────────────────────────────────────────────────────
function ComingSoon({ title, subtitle }) {
  return (
    <div className="pl-coming-soon">
      <span className="pl-coming-soon-icon">🚀</span>
      <p className="pl-coming-soon-title">{title}</p>
      <p className="pl-coming-soon-sub" style={{ color: 'var(--text-muted)' }}>
        {subtitle || 'This feature is coming soon. Stay tuned!'}
      </p>
    </div>
  );
}

export default function PaylenseLanding() {
  // ── top-level tab ──────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState('overview'); // 'overview' | 'intelligence-core' | 'market-benchmarking'

  // ── market benchmarking sub-tab ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('benchmark-report'); // 'job-level' | 'grade-level' | 'dashboard'

  const switchMainTab = (tab) => {
    if (tab === 'market-benchmarking') setActiveTab('benchmark-report');
    setMainTab(tab);
  };

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

  const isScrollPage = mainTab === 'market-benchmarking' && activeTab === 'dashboard';

  return (
    <div className={`pl-page${isScrollPage ? ' pl-page--scroll' : ''}`}>

      {/* ── Top-level Tab Nav ─────────────────────────────────────────────── */}
      <div className="pl-header">
        <nav className="pl-tab-nav">
          <button
            className={`pl-tab${mainTab === 'overview' ? ' pl-tab-active' : ''}`}
            onClick={() => switchMainTab('overview')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            Overview
          </button>
          <button
            className={`pl-tab${mainTab === 'intelligence-core' ? ' pl-tab-active' : ''}`}
            onClick={() => switchMainTab('intelligence-core')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a5 5 0 0 1 5 5c0 2.4-1.7 4.4-4 4.9V13h2v2h-2v2h2v2h-2v1a1 1 0 0 1-2 0v-1H9v-2h2v-2H9v-2h2v-1.1C8.7 11.4 7 9.4 7 7a5 5 0 0 1 5-5z"/>
            </svg>
            Intelligence Core
          </button>
          <button
            className={`pl-tab${mainTab === 'market-benchmarking' ? ' pl-tab-active' : ''}`}
            onClick={() => switchMainTab('market-benchmarking')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Market Benchmarking
          </button>
        </nav>
      </div>

      {/* ══ OVERVIEW ═════════════════════════════════════════════════════════ */}
      {mainTab === 'overview' && (
        <PaylenseOverview
          onOpenIntelligence={() => switchMainTab('intelligence-core')}
          onOpenBenchmarking={() => switchMainTab('market-benchmarking')}
        />
      )}

      {/* ══ INTELLIGENCE CORE ════════════════════════════════════════════════ */}
      {mainTab === 'intelligence-core' && <IntelligenceCore />}

      {/* ══ MARKET BENCHMARKING ══════════════════════════════════════════════ */}
      {mainTab === 'market-benchmarking' && (
        <>
          {/* Sub-tab nav */}
          <div className="pl-sub-tab-nav">
            <button
              className={`pl-sub-tab${activeTab === 'benchmark-report' ? ' pl-sub-tab-active' : ''}`}
              onClick={() => setActiveTab('benchmark-report')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
              </svg>
              Benchmark Report Gen
            </button>
            <button
              className={`pl-sub-tab${activeTab === 'job-level' ? ' pl-sub-tab-active' : ''}`}
              onClick={() => setActiveTab('job-level')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              Job Level
            </button>
            <button
              className={`pl-sub-tab${activeTab === 'grade-level' ? ' pl-sub-tab-active' : ''}`}
              onClick={() => setActiveTab('grade-level')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Grade Level
            </button>
            <button
              className={`pl-sub-tab${activeTab === 'dashboard' ? ' pl-sub-tab-active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Analysis
            </button>
          </div>

          {/* ── BENCHMARK REPORT GEN ───────────────────────────────────────── */}
          {activeTab === 'benchmark-report' && (
            <BenchmarkReportGen
              uploads={uploads}
              activeUploadId={activeUploadId}
              filterOptions={filterOptions}
            />
          )}

          {/* ── JOB LEVEL ──────────────────────────────────────────────────── */}
          {activeTab === 'job-level' && (
            <JobLevelTable
              uploads={uploads}
              activeUploadId={activeUploadId}
              setActiveUploadId={setActiveUploadId}
              onDelete={handleDelete}
              onOpenUpload={() => setUploadModalOpen(true)}
            />
          )}

          {/* ── GRADE LEVEL ────────────────────────────────────────────────── */}
          {activeTab === 'grade-level' && <GradeLevelPage />}

          {/* ── DASHBOARD ──────────────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="pl-dashboard">
              <StatsCards data={stats} loading={statsLoading} />
              <div className="pl-chart-grid">
                <PercentileBandChart data={bands} loading={bandsLoading} />
                <GradeProgressionChart data={grades} loading={gradesLoading} />
                <CountryDistributionChart data={countries} loading={countriesLoading} />
                <TopJobsChart data={topJobs} loading={topJobsLoading} />
              </div>
              <BenchmarkSummary
                uploadId={activeUploadId}
                filterOptions={filterOptions}
                onFetch={fetchBenchmarkSlice}
              />
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
                bands={bands}
              />
            </div>
          )}
        </>
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
