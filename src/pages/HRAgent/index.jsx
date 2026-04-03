import React, { useEffect, useState } from 'react';
import { Button, Input } from 'antd';
import AgentCard from '../../components/AgentCard';
import { fetchAgentTemplates } from './service';

function HRAgentPage() {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchAgentTemplates();
        if (!cancelled) {
          setTemplates(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err.message || 'Failed to load agents');
          setTemplates([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = templates.filter((t) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(term)) ||
      (t.description && t.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="content-area">
      <div className="page-header">
        <div>
          <h1 className="page-title">HR Agents</h1>
          <p className="page-desc">Browse and manage your HR agents for consulting workflows.</p>
        </div>
      </div>

      <div className="search-bar">
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>

      {error && (
        <div className="agent-delete-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No HR agents found</h3>
          <p>Please check back later.</p>
        </div>
      ) : (
        <div className="agent-grid">
          {filtered.map((tpl) => (
            <AgentCard key={tpl.id} agent={tpl} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HRAgentPage;

