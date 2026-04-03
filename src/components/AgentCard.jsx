import React from 'react';
import { Link } from 'react-router-dom';

// Map agent template keys to their routes and button labels
const AGENT_ROUTES = {
  JD_AGENT:        { to: '/agents/jd-agent',         label: 'Use JD Agent' },
  HR_MANUAL_AGENT: { to: '/agents/hr-manual-agent',  label: 'Use HR Manual Agent' },
  HR_MANUAL:       { to: '/agents/hr-manual-agent',  label: 'Use HR Manual Agent' },
};

function AgentCard({ agent }) {
  const key    = agent.key || agent.template_key;
  const route  = AGENT_ROUTES[key];

  return (
    <div className="agent-card">
      {agent.badge && (
        <span className={agent.badge === 'PRIORITY' ? 'badge badge-priority' : 'badge badge-new'}>
          {agent.badge}
        </span>
      )}
      <h3>{agent.name || agent.template_name}</h3>
      <p>{agent.description || 'Consultex AI agent'}</p>
      {route ? (
        <Link
          to={route.to}
          className="btn btn-primary"
          style={{ marginTop: 12, display: 'inline-block' }}
        >
          {route.label}
        </Link>
      ) : (
        <button className="btn btn-secondary" style={{ marginTop: 12 }} disabled>
          Coming Soon
        </button>
      )}
    </div>
  );
}

export default AgentCard;
