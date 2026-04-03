import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

function Home({ user }) {
  const [tasks, setTasks] = useState([]);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    api.get('/jd/drafts').then((r) => setTasks(r.data.slice(0, 5))).catch(() => {});
  }, []);

  const features = [
    { path: '/agents', label: 'HR Agents', desc: 'Manage and create HR agents', icon: '👥' },
    { path: '/connect', label: 'Connect', desc: 'External integrations', icon: '🔗' },
    { path: '/reports', label: 'Reports', desc: 'Analytics and reports', icon: '📊' },
    { path: '/resources', label: 'Resources', desc: 'Templates and files', icon: '📁' }
  ];

  return (
    <div className="content-area">
      <h1 style={{ marginBottom: 8, fontSize: 28 }}>Welcome, {user?.name || 'User'}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Your Consultex AI dashboard</p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div className="feature-grid" style={{ marginBottom: 32 }}>
            {features.map((f) => (
              <Link key={f.path} to={f.path} className="feature-card">
                <h3>{f.label}</h3>
                <p>{f.desc}</p>
              </Link>
            ))}
          </div>

          <div className="card">
            <h3 className="card-title">Recent Chats</h3>
            {chats.length === 0 ? (
              <p className="card-desc">No recent chats</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {chats.map((c) => (
                  <li key={c.id}>{c.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ flex: '0 1 340px' }}>
          <div className="card">
            <h3 className="card-title">Task Dashboard</h3>
            <div style={{ marginBottom: 16 }}>
              <strong>Active Chats</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>0 active</p>
            </div>
            <div>
              <strong>HR Tasks</strong>
              {tasks.length === 0 ? (
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>No recent tasks</p>
              ) : (
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {tasks.map((t) => (
                    <li key={t.id} style={{ marginBottom: 4 }}>
                      <Link to={`/jd/${t.id}`} style={{ color: 'var(--orange)' }}>
                        {t.job_title || 'Untitled JD'} - {t.status}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
