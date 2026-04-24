import api from '../../api/axios';

export async function uploadFile({ documentNumber, name, file }) {
  const fd = new FormData();
  fd.append('document_number', documentNumber);
  fd.append('name', name);
  fd.append('file', file);
  const res = await api.post('/paylense/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data; // { id, row_count }
}

export async function fetchUploads() {
  const res = await api.get('/paylense/uploads');
  return res.data;
}

export async function fetchData({ uploadId, filters = {}, limit = 200, offset = 0 }) {
  const params = { upload_id: uploadId, limit, offset, ...filters };
  const res = await api.get('/paylense/data', { params });
  return res.data; // { rows, total }
}

export async function fetchFilters(uploadId) {
  const res = await api.get('/paylense/filters', { params: { upload_id: uploadId } });
  return res.data; // { companies, countries, grades, job_functions, industries, currencies }
}

export async function deleteUpload(id) {
  const res = await api.delete(`/paylense/uploads/${id}`);
  return res.data;
}

export async function fetchPreferences() {
  const res = await api.get('/paylense/preferences');
  return res.data; // { visibleColumns: [...] | null }
}

export async function savePreferences(visibleColumns) {
  const res = await api.put('/paylense/preferences', { visibleColumns });
  return res.data;
}

export async function generateInsight({ uploadId, filters = {}, search }) {
  const res = await api.post('/paylense/ai-summary', {
    upload_id: uploadId,
    filters,
    search: search || undefined,
  });
  return res.data; // { summary: "..." }
}

export async function fetchStats({ uploadId, filters = {} }) {
  const params = { upload_id: uploadId, ...filters };
  const res = await api.get('/paylense/stats', { params });
  return res.data;
}

export async function fetchPercentileBands({ uploadId, filters = {} }) {
  const params = { upload_id: uploadId, ...filters };
  const res = await api.get('/paylense/percentile-bands', { params });
  return res.data;
}

export async function fetchGradeProgression({ uploadId, filters = {} }) {
  const params = { upload_id: uploadId, ...filters };
  const res = await api.get('/paylense/grade-progression', { params });
  return res.data;
}

export async function fetchCountryDistribution({ uploadId, filters = {} }) {
  const params = { upload_id: uploadId, ...filters };
  const res = await api.get('/paylense/country-distribution', { params });
  return res.data;
}

export async function fetchTopJobs({ uploadId, filters = {}, limit = 10 }) {
  const params = { upload_id: uploadId, ...filters, limit };
  const res = await api.get('/paylense/top-jobs', { params });
  return res.data;
}

export async function analyzePositioning({ uploadId, filters = {}, internalSalary, currency }) {
  const res = await api.post('/paylense/ai-positioning', {
    upload_id: uploadId,
    filters,
    internal_salary: internalSalary,
    currency,
  });
  return res.data; // { analysis: "..." }
}

export async function fetchBenchmarkSlice({ uploadId, slices = {} }) {
  const params = { upload_id: uploadId };
  if (slices.country)              params.country              = slices.country;
  if (slices.grade)                params.grade                = slices.grade;
  if (slices.job_function)         params.job_function         = slices.job_function;
  if (slices.compensation_element) params.compensation_element = slices.compensation_element;
  if (slices.currency)             params.currency             = slices.currency;
  const res = await api.get('/paylense/benchmark-slice', { params });
  return res.data; // array of { compensation_element, country?, grade?, job_function?, currency?, p10, p25, p50, p75, p90, incumbents }
}

// ── Benchmark Report Gen ───────────────────────────────────────────────────────

export async function generateBenchmarkReport(payload) {
  const res = await api.post('/paylense/benchmark-report/generate', payload);
  return res.data;
}

export async function saveBenchmarkReport({ uploadId, name, filters, reportData, aiSummary }) {
  const res = await api.post('/paylense/benchmark-report/save', {
    upload_id:   uploadId,
    name,
    filters,
    report_data: reportData,
    ai_summary:  aiSummary,
  });
  return res.data;
}

export async function fetchBenchmarkReports() {
  const res = await api.get('/paylense/benchmark-reports');
  return res.data;
}

export async function fetchBenchmarkReportById(id) {
  const res = await api.get(`/paylense/benchmark-reports/${id}`);
  return res.data;
}

export async function deleteBenchmarkReport(id) {
  const res = await api.delete(`/paylense/benchmark-reports/${id}`);
  return res.data;
}

export async function generateGradeReport(payload) {
  const res = await api.post('/paylense/grade-report/generate', payload);
  return res.data;
}

// ── Grade Level ────────────────────────────────────────────────────────────────

export async function fetchGradeUploads() {
  const res = await api.get('/paylense/grade-uploads');
  return res.data;
}

export async function uploadGradeFile({ documentNumber, name, file }) {
  const fd = new FormData();
  fd.append('document_number', documentNumber);
  fd.append('name', name);
  fd.append('file', file);
  const res = await api.post('/paylense/grade-upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data; // { id, row_count }
}

export async function deleteGradeUpload(id) {
  const res = await api.delete(`/paylense/grade-uploads/${id}`);
  return res.data;
}

export async function fetchGradeData({ uploadId, sheet, grade }) {
  const params = { upload_id: uploadId, sheet };
  if (grade) params.grade = grade;
  const res = await api.get('/paylense/grade-data', { params });
  return res.data; // { rows: [...], total }
}

export async function fetchGradeFilters(uploadId) {
  const res = await api.get('/paylense/grade-filters', { params: { upload_id: uploadId } });
  return res.data; // { grades: [...] }
}
