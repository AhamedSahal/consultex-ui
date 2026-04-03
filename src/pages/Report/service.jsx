import api from '../../api/axios';

export const getReportsSummary = () =>
  api.get('/reports/summary').then((r) => r.data);

export const getReportsTimeline = (days = 30) =>
  api.get('/reports/timeline', { params: { days } }).then((r) => r.data);

export const getReportsByModel = () =>
  api.get('/reports/by-model').then((r) => r.data);

export const getReportsByAgent = () =>
  api.get('/reports/by-agent').then((r) => r.data);

export const getReportsByCompany = (limit = 10) =>
  api.get('/reports/by-company', { params: { limit } }).then((r) => r.data);

export const getRecentJDs = (limit = 10) =>
  api.get('/reports/recent-jds', { params: { limit } }).then((r) => r.data);

export const getUsageLogs = (limit = 20) =>
  api.get('/reports/usage-logs', { params: { limit } }).then((r) => r.data);

export const getTokenStats = (days = 30) =>
  api.get('/reports/tokens', { params: { days } }).then((r) => r.data);
