import api from '../../api/axios';

export async function fetchPlaybookStatus() {
  const res = await api.get('/modules/jd-agent/playbook');
  return res.data;
}

export async function uploadPlaybook(file) {
  const fd = new FormData();
  fd.append('playbook_file', file);
  const res = await api.post('/modules/jd-agent/playbook', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function fetchCompanies() {
  const res = await api.get('/companies');
  return res.data;
}

export async function generateJd(body) {
  const res = await api.post('/modules/jd-agent/jds/generate', body);
  return res.data;
}

export async function fetchGeneratedJds() {
  const res = await api.get('/modules/jd-agent/jds');
  return res.data;
}

export async function fetchJdHistory({ search, company_id, department, type } = {}) {
  const params = {};
  if (search) params.search = search;
  if (company_id) params.company_id = company_id;
  if (department) params.department = department;
  if (type && type !== 'all') params.type = type;
  const res = await api.get('/modules/jd-agent/jds', { params });
  return res.data;
}

export async function fetchJdById(id) {
  const res = await api.get(`/modules/jd-agent/jds/${id}`);
  return res.data;
}

export async function deleteJd(id) {
  const res = await api.delete(`/modules/jd-agent/jds/${id}`);
  return res.data;
}

export async function fetchPlaybooks() {
  const res = await api.get('/modules/jd-agent/playbooks');
  return res.data;
}

export async function deletePlaybook(id) {
  const res = await api.delete(`/modules/jd-agent/playbook/${id}`);
  return res.data;
}

// ── JD Template API ────────────────────────────────────────────────────────────

export async function uploadJdTemplate(file, name) {
  const fd = new FormData();
  fd.append('template_file', file);
  if (name) fd.append('name', name);
  const res = await api.post('/modules/jd-agent/templates', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function fetchJdTemplates() {
  const res = await api.get('/modules/jd-agent/templates');
  return res.data;
}

export async function fetchJdTemplate(id) {
  const res = await api.get(`/modules/jd-agent/templates/${id}`);
  return res.data;
}

export async function deleteJdTemplate(id) {
  const res = await api.delete(`/modules/jd-agent/templates/${id}`);
  return res.data;
}

export async function reparseJdTemplate(id) {
  const res = await api.post(`/modules/jd-agent/templates/${id}/reparse`);
  return res.data;
}

export async function createManualTemplate(payload) {
  const res = await api.post('/modules/jd-agent/templates/manual', payload);
  return res.data;
}

export async function parseTemplatePreview(file) {
  const fd = new FormData();
  fd.append('template_file', file);
  const res = await api.post('/modules/jd-agent/templates/preview', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateManualTemplate(id, payload) {
  const res = await api.put(`/modules/jd-agent/templates/${id}/manual`, payload);
  return res.data;
}

// ── Chat session API ───────────────────────────────────────────────────────────

export async function fetchChatSessions() {
  const res = await api.get('/modules/jd-agent/chat-sessions');
  return res.data;
}

export async function createChatSession(title) {
  const res = await api.post('/modules/jd-agent/chat-sessions', { title });
  return res.data;
}

export async function fetchSessionMessages(id) {
  const res = await api.get(`/modules/jd-agent/chat-sessions/${id}/messages`);
  return res.data;
}

export async function saveSessionMessages(id, messages) {
  await api.put(`/modules/jd-agent/chat-sessions/${id}/messages`, { messages });
}

export async function updateChatSession(id, data) {
  const res = await api.patch(`/modules/jd-agent/chat-sessions/${id}`, data);
  return res.data;
}

export async function deleteChatSession(id) {
  await api.delete(`/modules/jd-agent/chat-sessions/${id}`);
}

// ── Batch JD Generation API ───────────────────────────────────────────────────

export async function parseOrgChart(companyId, selectedModel) {
  const res = await api.post('/modules/jd-agent/batch/parse-org-chart', {
    company_id: companyId,
    selected_model: selectedModel || undefined,
  });
  return res.data; // { roles: [...] }
}

export async function startBatchRun({ companyId, playbookId, roles, selectedModel }) {
  const res = await api.post('/modules/jd-agent/batch/run', {
    company_id:     companyId,
    playbook_id:    playbookId || undefined,
    roles,
    selected_model: selectedModel || undefined,
  });
  return res.data; // { runId }
}

export async function cancelBatchRun(runId) {
  const res = await api.post(`/modules/jd-agent/batch/run/${runId}/cancel`);
  return res.data;
}

export async function listBatchRuns(companyId) {
  const res = await api.get('/modules/jd-agent/batch/runs', {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data;
}

export async function getBatchRun(runId) {
  const res = await api.get(`/modules/jd-agent/batch/run/${runId}`);
  return res.data;
}

