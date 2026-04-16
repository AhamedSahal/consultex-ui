import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const FILTERS = ['All', 'Pending', 'Active', 'Inactive'];

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user) {
    setUpdating(user.id);
    try {
      const { data } = await api.patch(`/admin/users/${user.id}`, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => (u.id === data.id ? { ...u, is_active: data.is_active } : u)));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user');
    } finally {
      setUpdating(null);
    }
  }

  const pending = users.filter((u) => !u.is_active);
  const active  = users.filter((u) => u.is_active);

  const filtered = users.filter((u) => {
    const matchSearch = search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All' ? true :
      filter === 'Pending' ? !u.is_active :
      filter === 'Active'  ? u.is_active :
      filter === 'Inactive' ? !u.is_active : true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="content-area"><div className="au-page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-desc">Review registrations and control who can access Consultex AI.</p>
        </div>
        <button className="btn btn-secondary au-refresh" onClick={fetchUsers}>
          <span>↻</span> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="au-stats">
        <div className="au-stat-card au-stat-total">
          <span className="au-stat-num">{users.length}</span>
          <span className="au-stat-label">Total Users</span>
        </div>
        <div className="au-stat-card au-stat-active">
          <span className="au-stat-num">{active.length}</span>
          <span className="au-stat-label">Active</span>
        </div>
        <div className="au-stat-card au-stat-pending">
          <span className="au-stat-num">{pending.length}</span>
          <span className="au-stat-label">Pending Approval</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="au-error">{error}</div>
      )}

      {/* Pending banner */}
      {pending.length > 0 && (
        <div className="au-pending-banner">
          <span className="au-pending-dot" />
          <strong>{pending.length} user{pending.length > 1 ? 's' : ''} waiting for approval</strong>
          <span className="au-pending-sub"> — review below and click Approve to grant access</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="au-toolbar">
        <div className="au-search-wrap">
          <span className="au-search-icon">🔍</span>
          <input
            className="au-search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="au-filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`au-filter-tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === 'Pending' && pending.length > 0 && (
                <span className="au-filter-badge">{pending.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="au-loading">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No users found</h3>
            <p>Try adjusting your search or filter.</p>
          </div>
        ) : (
          <table className="au-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <UserRow key={u.id} user={u} onToggle={toggleActive} loading={updating === u.id} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div></div>
  );
}

function UserRow({ user, onToggle, loading }) {
  const initials = user.name?.charAt(0)?.toUpperCase() || '?';
  const joined   = new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <tr className={`au-row${!user.is_active ? ' au-row-pending' : ''}`}>
      <td>
        <div className="au-user-cell">
          <div className={`au-avatar${!user.is_active ? ' au-avatar-pending' : ''}`}>
            {initials}
          </div>
          <div>
            <div className="au-user-name">{user.name}</div>
            <div className="au-user-email">{user.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className={`au-role-badge au-role-${user.role.toLowerCase()}`}>
          {user.role}
        </span>
      </td>
      <td>
        {user.is_active ? (
          <span className="au-status au-status-active">
            <span className="au-status-dot" /> Active
          </span>
        ) : (
          <span className="au-status au-status-pending">
            <span className="au-status-dot" /> Pending
          </span>
        )}
      </td>
      <td className="au-joined">{joined}</td>
      <td>
        {user.role === 'ADMIN' ? (
          <span className="au-action-none">—</span>
        ) : (
          <button
            className={`btn au-action-btn${user.is_active ? ' au-action-deactivate' : ' au-action-approve'}`}
            onClick={() => onToggle(user)}
            disabled={loading}
          >
            {loading ? (
              <span className="au-spinner" />
            ) : user.is_active ? (
              'Deactivate'
            ) : (
              '✓ Approve'
            )}
          </button>
        )}
      </td>
    </tr>
  );
}

export default AdminUsers;
