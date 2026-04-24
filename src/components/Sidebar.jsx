import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';

const workspaceItems = [
  {
    path: '/',
    label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    path: '/companies',
    label: 'Companies',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    path: '/chats',
    label: 'Recent Chats',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
];

const toolItems = [
  {
    path: '/agents',
    label: 'HR Agents',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    path: '/job-evaluation',
    label: 'Job Evaluation',
    badge: 'New',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <path d="M12 11h4"/>
        <path d="M12 16h4"/>
        <path d="M8 11h.01"/>
        <path d="M8 16h.01"/>
      </svg>
    ),
  },
  {
    path: '/paylense',
    label: 'Paylense',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="22" x2="21" y2="22"/>
        <line x1="6" y1="18" x2="6" y2="11"/>
        <line x1="10" y1="18" x2="10" y2="5"/>
        <line x1="14" y1="18" x2="14" y2="9"/>
        <line x1="18" y1="18" x2="18" y2="2"/>
      </svg>
    ),
  },
  {
    path: '/connect',
    label: 'Connect',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    path: '/resources',
    label: 'Resources',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    path: '/knowledge',
    label: 'Knowledge Base',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
];

function Sidebar({ user, onNewChat }) {
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-brand text-logo-gradient">Consultex AI</span>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">WORKSPACE</div>
        {workspaceItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => (isActive ? 'sidebar-item active' : 'sidebar-item')}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: '16px' }}>TOOLS</div>
        {toolItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? 'sidebar-item active' : 'sidebar-item')}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
          </NavLink>
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <div style={{ borderTop: '1px solid var(--panel-border)', margin: '8px 0' }} />
            <NavLink
              to="/admin/users"
              className={({ isActive }) => (isActive ? 'sidebar-item active' : 'sidebar-item')}
            >
              <span className="sidebar-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </span>
              <span>User Approvals</span>
            </NavLink>
          </>
        )}
      </div>

      <div className="sidebar-bottom">
        <button className="btn-new-chat" onClick={onNewChat}>
          <div className="btn-new-chat-plus">+</div>
          <div className="btn-new-chat-info">
            <span className="btn-new-chat-title">New Chat</span>
            <span className="btn-new-chat-subtitle">Ask anything</span>
          </div>
        </button>

        {user && (
          <div className="user-card-wrapper">
            <button
              type="button"
              className="user-card user-card-toggle"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <div className="user-avatar">{user.name?.charAt(0) || '?'}</div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="usage-line">{user.role || 'Member'}</span>
              </div>
              <div className={`user-card-chevron ${menuOpen ? 'open' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>
            {menuOpen && (
              <div className="user-menu">
                <div className="user-menu-header">
                  <div className="user-avatar small">{user.name?.charAt(0) || '?'}</div>
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    {user.email && <span className="usage-line">{user.email}</span>}
                  </div>
                </div>
                <button type="button" className="user-menu-item" onClick={() => handleNavigate('/settings')}>Settings</button>
                <button type="button" className="user-menu-item" onClick={() => handleNavigate('/settings?tab=plans')}>Plans &amp; Usage</button>
                <button type="button" className="user-menu-item" onClick={() => handleNavigate('/settings?tab=upgrade')}>Upgrade Plan</button>
                <button type="button" className="user-menu-item user-menu-item-danger" onClick={handleLogout}>Log out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
