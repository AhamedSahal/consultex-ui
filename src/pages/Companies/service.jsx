import api from '../../api/axios';

export async function fetchCompanies() {
  const res = await api.get('/companies');
  return res.data;
}

export async function createCompany(formData) {
  const res = await api.post('/companies', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function fetchCompanyDetails(companyId) {
  const res = await api.get(`/companies/${companyId}`);
  return res.data;
}

export async function fetchCompanyDocuments(companyId) {
  const res = await api.get(`/companies/${companyId}/documents`);
  return res.data;
}

export async function uploadCompanyDocuments(companyId, formData) {
  const res = await api.post(`/companies/${companyId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function deleteCompany(companyId) {
  const res = await api.delete(`/companies/${companyId}`);
  return res.data;
}

export async function deleteCompanyDocument(companyId, docId) {
  const res = await api.delete(`/companies/${companyId}/documents/${docId}`);
  return res.data;
}

export async function updateCompanyDocument(companyId, docId, data) {
  const res = await api.patch(`/companies/${companyId}/documents/${docId}`, data);
  return res.data;
}

