import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';

const menuItems = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/agents', label: 'HR Agents', icon: '👥' },
  { path: '/companies', label: 'Companies', icon: '🏢' },
  { path: '/connect', label: 'Connect', icon: '🔗' },
  { path: '/reports', label: 'Reports', icon: '📊' },
  { path: '/resources', label: 'Resources', icon: '📁' },
  { path: '/knowledge', label: 'Knowledge Base', icon: '📚' },
  { path: '/chats', label: 'Recent Chats', icon: '💬' }
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
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? 'sidebar-item active' : 'sidebar-item')}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
      <div className="sidebar-bottom">
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
                <span className="usage-line">0 / 30 Used / Available</span>
              </div>
              <div className={`user-card-chevron ${menuOpen ? 'open' : ''}`}>⌄</div>
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
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => handleNavigate('/settings')}
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => handleNavigate('/settings?tab=plans')}
                >
                  Plans &amp; Usage
                </button>
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => handleNavigate('/settings?tab=upgrade')}
                >
                  Upgrade Plan
                </button>
                <button
                  type="button"
                  className="user-menu-item user-menu-item-danger"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
        <button className="btn-new-chat" onClick={onNewChat}>
          <div className="btn-new-chat-avatar">+</div>
          <div className="btn-new-chat-info">
            <span className="btn-new-chat-title">New Chat</span>
            <span className="btn-new-chat-subtitle">Start a new conversation</span>
          </div>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
