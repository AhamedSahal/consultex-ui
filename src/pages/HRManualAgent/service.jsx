import api from '../../api/axios';

// ── Runs ───────────────────────────────────────────────────────────────────────

/**
 * Start an HR Manual update run.
 * Pass a FormData object so that an optional file upload is included.
 *
 * Required FormData fields:
 *   manual_source  — 'ONEDRIVE' | 'UPLOAD'
 *
 * ONEDRIVE:
 *   manual_file_id   — OneDrive item ID
 *   manual_file_name — display name
 *   playbook_id?     — optional
 *
 * UPLOAD:
 *   hr_manual_file   — File object
 *   playbook_id?     — optional
 */
export async function startRun(formData) {
  const res = await api.post('/modules/hr-manual/run', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data; // { runId }
}

export async function listRuns() {
  const res = await api.get('/modules/hr-manual/runs');
  return res.data;
}

export async function getRun(runId) {
  const res = await api.get(`/modules/hr-manual/run/${runId}`);
  return res.data;
}

export async function cancelRun(runId, companyId) {
  const res = await api.post(`/modules/hr-manual/run/${runId}/cancel`, {}, {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data; // { ok: true }
}

export async function getChanges(runId, companyId) {
  const res = await api.get(`/modules/hr-manual/run/${runId}/changes`, {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data;
}

export async function getExport(runId, companyId) {
  const res = await api.get(`/modules/hr-manual/run/${runId}/export`, {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data; // { url, filePath, fileName }
}

export async function getRedFlags(runId, companyId) {
  const res = await api.get(`/modules/hr-manual/run/${runId}/red-flags`, {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data;
}

export async function getOpenItems(runId, companyId) {
  const res = await api.get(`/modules/hr-manual/run/${runId}/open-items`, {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data;
}

export async function getTraceLog(runId, companyId) {
  const res = await api.get(`/modules/hr-manual/run/${runId}/trace-log`, {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data;
}

export async function exportRedFlagsDoc(runId, companyId) {
  const res = await api.get(`/modules/hr-manual/run/${runId}/red-flags/export`, {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data; // { url, fileName }
}

export async function exportOpenItemsDoc(runId, companyId) {
  const res = await api.get(`/modules/hr-manual/run/${runId}/open-items/export`, {
    params: companyId ? { company_id: companyId } : {},
  });
  return res.data; // { url, fileName }
}


// ── Reuse JD-Agent helpers ────────────────────────────────────────────────────

export async function fetchCompanies() {
  const res = await api.get('/companies');
  return res.data;
}

export async function fetchPlaybooks() {
  const res = await api.get('/modules/hr-manual/playbooks');
  return res.data;
}

export async function uploadPlaybook(title, file) {
  const fd = new FormData();
  fd.append('playbook_file', file);
  if (title) fd.append('title', title);
  const res = await api.post('/modules/hr-manual/playbook', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deletePlaybook(id) {
  const res = await api.delete(`/modules/hr-manual/playbook/${id}`);
  return res.data;
}

// ── OneDrive ──────────────────────────────────────────────────────────────────

export async function listOneDriveFiles(folderId) {
  const params = folderId ? { folderId } : {};
  const res = await api.get('/connect/onedrive/files', { params });
  return res.data; // array of OneDrive file/folder items
}
