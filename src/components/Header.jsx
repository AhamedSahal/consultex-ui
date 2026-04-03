import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const pathLabels = {
  '/': 'Home',
  '/agents': 'HR Agents',
  '/connect': 'Connect',
  '/reports': 'Reports',
  '/resources': 'Resources',
  '/knowledge': 'Knowledge Base',
  '/chats': 'Recent Chats',
  '/settings': 'Settings',
  '/agents/create': 'Create New HR Agent',
  '/agents/edit': 'Edit HR Agent'
};

function getBreadcrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = [{ path: '/', label: 'Home' }];
  let current = '';
  for (let i = 0; i < parts.length; i++) {
    current += '/' + parts[i];
    const label = pathLabels[current] || parts[i].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ path: current, label });
  }
  return crumbs;
}

function Header({ breadcrumbLabel }) {
  const location = useLocation();
  const crumbs = getBreadcrumbs(location.pathname);

  return (
    <header className="header">
      <nav className="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.path}>
            {i > 0 && <span className="breadcrumb-sep">/</span>}
            <Link to={c.path} className={i === crumbs.length - 1 ? 'breadcrumb-current' : ''}>
              {i === crumbs.length - 1 && breadcrumbLabel ? breadcrumbLabel : c.label}
            </Link>
          </span>
        ))}
      </nav>
    </header>
  );
}

export default Header;
