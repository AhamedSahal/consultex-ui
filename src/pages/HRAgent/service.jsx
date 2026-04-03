import api from '../../api/axios';

export async function fetchAgentTemplates() {
  const res = await api.get('/agent-templates');
  return res.data;
}

