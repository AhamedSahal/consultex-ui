import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SearchOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { fetchJdHistory, fetchJdById, fetchCompanies, deleteJd } from './service';
import { downloadAsWord, downloadAsPdf } from './downloadUtils';

// ---------------------------------------------------------------------------
// Convert the 10-section JD JSON to markdown for download/preview
// ---------------------------------------------------------------------------
function jdJsonToMarkdown(jd) {
  if (!jd) return '';
  const lines = ['# JOB DESCRIPTION', ''];

  const info = jd.job_information || {};
  lines.push('## 1. JOB INFORMATION');
  if (info.job_title || info.reports_to)
    lines.push(`**Job Title:** ${info.job_title || 'TBD'} | **Reports To:** ${info.reports_to || 'TBD'}`);
  if (info.department || info.location)
    lines.push(`**Department:** ${info.department || 'TBD'} | **Location:** ${info.location || 'TBD'}`);
  if (info.grade || info.no_of_direct_reports)
    lines.push(`**Grade:** ${info.grade || 'TBD'} | **No. of Direct Reports:** ${info.no_of_direct_reports || 'TBD'}`);
  lines.push('');

  if (jd.job_purpose) {
    lines.push('## 2. JOB PURPOSE');
    lines.push(jd.job_purpose);
    lines.push('');
  }

  if (Array.isArray(jd.key_accountabilities) && jd.key_accountabilities.length > 0) {
    lines.push('## 3. KEY ACCOUNTABILITIES');
    for (const acc of jd.key_accountabilities) {
      if (acc.section) lines.push(`**${acc.section}**`);
      if (Array.isArray(acc.bullets)) acc.bullets.forEach((b) => lines.push(`- ${b}`));
      lines.push('');
    }
  }

  const fin = jd.financial_dimensions;
  if (fin && (fin.turnover || fin.budget_control)) {
    lines.push('## 4. FINANCIAL DIMENSIONS');
    if (fin.turnover) lines.push(`**Turnover:** ${fin.turnover}`);
    if (fin.budget_control) lines.push(`**Budget Control:** ${fin.budget_control}`);
    lines.push('');
  }

  if (jd.decision_making_authority) {
    lines.push('## 5. DECISION MAKING AUTHORITY');
    lines.push(jd.decision_making_authority);
    lines.push('');
  }

  if (Array.isArray(jd.key_communications) && jd.key_communications.length > 0) {
    lines.push('## 6. KEY COMMUNICATIONS');
    jd.key_communications.forEach((kc) => lines.push(`- ${kc}`));
    lines.push('');
  }

  if (jd.minimum_qualifications) {
    lines.push('## 7. MINIMUM QUALIFICATIONS');
    lines.push(jd.minimum_qualifications);
    lines.push('');
  }

  if (Array.isArray(jd.technical_skills) && jd.technical_skills.length > 0) {
    lines.push('## 8. TECHNICAL SKILLS');
    jd.technical_skills.forEach((ts) => lines.push(`- ${ts}`));
    lines.push('');
  }

  if (Array.isArray(jd.competencies) && jd.competencies.length > 0) {
    lines.push('## 9. COMPETENCIES');
    jd.competencies.forEach((comp) => lines.push(`- ${comp}`));
    lines.push('');
  }

  if (jd.special_requirements) {
    lines.push('## 10. SPECIAL REQUIREMENTS');
    lines.push(jd.special_requirements);
    lines.push('');
  }

  const approvals = jd.approvals;
  if (approvals) {
    lines.push('## APPROVALS');
    if (typeof approvals === 'object' && !Array.isArray(approvals)) {
      if (approvals.prepared_by) lines.push(`**Prepared By:** ${approvals.prepared_by}`);
      if (approvals.approved_by) lines.push(`**Approved By:** ${approvals.approved_by}`);
      if (approvals.date) lines.push(`**Date:** ${approvals.date}`);
    } else if (typeof approvals === 'string') {
      lines.push(approvals);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// View Modal — renders the JD JSON in structured sections
// ---------------------------------------------------------------------------
function JDViewModal({ jd, onClose, onDownload, downloading }) {
  if (!jd) return null;
  const content = jd.content || {};

  const info = content.job_information || {};

  return (
    <div className="jd-history-modal-overlay" onClick={onClose}>
      <div className="jd-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="jd-history-modal-header">
          <div className="jd-history-modal-title">
            <span>{content.job_information?.job_title || jd.title}</span>
            <span className={`jd-history-badge jd-history-badge-${jd.type}`}>
              {jd.type === 'batch' ? 'Batch' : 'Normal'}
            </span>
          </div>
          <div className="jd-history-modal-actions">
            <button
              type="button"
              className="jd-history-modal-download-btn jd-history-modal-download-pdf"
              onClick={() => onDownload('pdf', jd)}
              disabled={downloading === 'pdf'}
            >
              <FilePdfOutlined />
              <span>{downloading === 'pdf' ? 'Generating…' : 'PDF'}</span>
            </button>
            <button
              type="button"
              className="jd-history-modal-download-btn jd-history-modal-download-word"
              onClick={() => onDownload('word', jd)}
              disabled={downloading === 'word'}
            >
              <FileWordOutlined />
              <span>{downloading === 'word' ? 'Generating…' : 'Word'}</span>
            </button>
            <button type="button" className="jd-history-modal-close" onClick={onClose} title="Close">
              <CloseOutlined />
            </button>
          </div>
        </div>

        <div className="jd-history-modal-body">
          {/* Job Information */}
          <div className="jd-history-section">
            <div className="jd-history-section-header">1. JOB INFORMATION</div>
            <div className="jd-history-section-body">
              <div className="jd-history-info-grid">
                {[
                  ['Job Title', info.job_title],
                  ['Reports To', info.reports_to],
                  ['Department', info.department],
                  ['Location', info.location],
                  ['Grade', info.grade],
                  ['No. of Direct Reports', info.no_of_direct_reports],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="jd-history-info-cell">
                    <span className="jd-history-info-label">{k}</span>
                    <span className="jd-history-info-value">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Job Purpose */}
          {content.job_purpose && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">2. JOB PURPOSE</div>
              <div className="jd-history-section-body">
                <p className="jd-history-text">{content.job_purpose}</p>
              </div>
            </div>
          )}

          {/* Key Accountabilities */}
          {Array.isArray(content.key_accountabilities) && content.key_accountabilities.length > 0 && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">3. KEY ACCOUNTABILITIES</div>
              <div className="jd-history-section-body">
                {content.key_accountabilities.map((acc, i) => (
                  <div key={i} className="jd-history-accountability">
                    {acc.section && <div className="jd-history-accountability-title">{acc.section}</div>}
                    {Array.isArray(acc.bullets) && (
                      <ul className="jd-history-list">
                        {acc.bullets.map((b, j) => <li key={j}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Dimensions */}
          {content.financial_dimensions && (content.financial_dimensions.turnover || content.financial_dimensions.budget_control) && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">4. FINANCIAL DIMENSIONS</div>
              <div className="jd-history-section-body">
                {content.financial_dimensions.turnover && (
                  <p className="jd-history-text"><strong>Turnover:</strong> {content.financial_dimensions.turnover}</p>
                )}
                {content.financial_dimensions.budget_control && (
                  <p className="jd-history-text"><strong>Budget Control:</strong> {content.financial_dimensions.budget_control}</p>
                )}
              </div>
            </div>
          )}

          {/* Decision Making Authority */}
          {content.decision_making_authority && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">5. DECISION MAKING AUTHORITY</div>
              <div className="jd-history-section-body">
                <p className="jd-history-text">{content.decision_making_authority}</p>
              </div>
            </div>
          )}

          {/* Key Communications */}
          {Array.isArray(content.key_communications) && content.key_communications.length > 0 && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">6. KEY COMMUNICATIONS</div>
              <div className="jd-history-section-body">
                <ul className="jd-history-list">
                  {content.key_communications.map((kc, i) => <li key={i}>{kc}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Minimum Qualifications */}
          {content.minimum_qualifications && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">7. MINIMUM QUALIFICATIONS</div>
              <div className="jd-history-section-body">
                <p className="jd-history-text">{content.minimum_qualifications}</p>
              </div>
            </div>
          )}

          {/* Technical Skills */}
          {Array.isArray(content.technical_skills) && content.technical_skills.length > 0 && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">8. TECHNICAL SKILLS</div>
              <div className="jd-history-section-body">
                <ul className="jd-history-list">
                  {content.technical_skills.map((ts, i) => <li key={i}>{ts}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Competencies */}
          {Array.isArray(content.competencies) && content.competencies.length > 0 && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">9. COMPETENCIES</div>
              <div className="jd-history-section-body">
                <ul className="jd-history-list">
                  {content.competencies.map((comp, i) => <li key={i}>{comp}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Special Requirements */}
          {content.special_requirements && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">10. SPECIAL REQUIREMENTS</div>
              <div className="jd-history-section-body">
                <p className="jd-history-text">{content.special_requirements}</p>
              </div>
            </div>
          )}

          {/* Approvals */}
          {content.approvals && (
            <div className="jd-history-section">
              <div className="jd-history-section-header">APPROVALS</div>
              <div className="jd-history-section-body">
                {typeof content.approvals === 'object' && !Array.isArray(content.approvals) ? (
                  <div className="jd-history-info-grid">
                    {content.approvals.prepared_by && (
                      <div className="jd-history-info-cell">
                        <span className="jd-history-info-label">Prepared By</span>
                        <span className="jd-history-info-value">{content.approvals.prepared_by}</span>
                      </div>
                    )}
                    {content.approvals.approved_by && (
                      <div className="jd-history-info-cell">
                        <span className="jd-history-info-label">Approved By</span>
                        <span className="jd-history-info-value">{content.approvals.approved_by}</span>
                      </div>
                    )}
                    {content.approvals.date && (
                      <div className="jd-history-info-cell">
                        <span className="jd-history-info-label">Date</span>
                        <span className="jd-history-info-value">{content.approvals.date}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="jd-history-text">{String(content.approvals)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main JD History Tab
// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------
function DeleteConfirmModal({ jd, onConfirm, onCancel, deleting }) {
  if (!jd) return null;
  return (
    <div className="jd-history-modal-overlay" onClick={onCancel}>
      <div className="jd-history-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="jd-history-confirm-icon">
          <ExclamationCircleOutlined />
        </div>
        <div className="jd-history-confirm-title">Delete JD</div>
        <div className="jd-history-confirm-body">
          Are you sure you want to delete{' '}
          <strong>{jd.job_title || jd.title}</strong>? This action cannot be undone.
        </div>
        <div className="jd-history-confirm-actions">
          <button
            type="button"
            className="jd-history-confirm-cancel"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="jd-history-confirm-delete"
            onClick={onConfirm}
            disabled={deleting}
          >
            <DeleteOutlined />
            <span>{deleting ? 'Deleting…' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function JDHistoryTab() {
  const navigate = useNavigate();

  const [jds, setJds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // View modal
  const [viewJd, setViewJd] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  // Delete confirm
  const [confirmDeleteJd, setConfirmDeleteJd] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadJds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJdHistory({
        search: search || undefined,
        company_id: companyFilter || undefined,
        department: departmentFilter || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      });
      setJds(Array.isArray(data) ? data : []);
    } catch {
      setJds([]);
    } finally {
      setLoading(false);
    }
  }, [search, companyFilter, departmentFilter, typeFilter]);

  useEffect(() => {
    loadJds();
  }, [loadJds]);

  useEffect(() => {
    fetchCompanies()
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleView = async (row) => {
    setViewLoading(true);
    try {
      const full = await fetchJdById(row.id);
      setViewJd(full);
    } catch {
      setViewJd({ ...row, content: null });
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (format, jd) => {
    const content = jd.content;
    if (!content) return;
    const markdown = jdJsonToMarkdown(content);
    const slug = (content.job_information?.job_title || jd.title || 'job-description')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();
    setDownloading(format);
    try {
      if (format === 'word') {
        await downloadAsWord(markdown, slug, null, null);
      } else {
        await downloadAsPdf(markdown, slug, null, null);
      }
    } catch {
      // silent
    } finally {
      setDownloading(null);
    }
  };

  const handleRowDownload = async (format, row) => {
    setDownloading(`${format}-${row.id}`);
    try {
      const full = await fetchJdById(row.id);
      if (full?.content) {
        const markdown = jdJsonToMarkdown(full.content);
        const slug = (full.content.job_information?.job_title || full.title || 'job-description')
          .replace(/[^a-zA-Z0-9]/g, '-')
          .toLowerCase();
        if (format === 'word') {
          await downloadAsWord(markdown, slug, null, null);
        } else {
          await downloadAsPdf(markdown, slug, null, null);
        }
      }
    } catch {
      // silent
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteJd) return;
    setDeleting(true);
    try {
      await deleteJd(confirmDeleteJd.id);
      setJds((prev) => prev.filter((j) => j.id !== confirmDeleteJd.id));
      setConfirmDeleteJd(null);
    } catch {
      // silent — keep modal open so user knows it failed
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="jd-history-root">
      {/* ── Filters bar ── */}
      <div className="jd-history-filters">
        <div className="jd-history-filter-group">
          <FilterOutlined className="jd-history-filter-icon" />
          <span className="jd-history-filter-label">Filters:</span>
        </div>

        <div className="jd-history-search-wrap">
          <SearchOutlined className="jd-history-search-icon" />
          <input
            type="text"
            className="jd-history-search"
            placeholder="Search by job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="jd-history-select"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          type="text"
          className="jd-history-input"
          placeholder="Department..."
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        />

        <select
          className="jd-history-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="normal">Normal</option>
          <option value="batch">Batch</option>
        </select>

        <button
          type="button"
          className="jd-history-refresh-btn"
          onClick={loadJds}
          title="Refresh"
        >
          <ReloadOutlined />
        </button>
      </div>

      {/* ── Table ── */}
      <div className="jd-history-table-wrap">
        {loading ? (
          <div className="jd-history-loading">Loading JDs…</div>
        ) : jds.length === 0 ? (
          <div className="jd-history-empty">
            <p>No job descriptions found.</p>
            <p className="jd-history-empty-sub">Generate JDs through the chat or batch mode, then they will appear here.</p>
          </div>
        ) : (
          <table className="jd-history-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company</th>
                <th>Department</th>
                <th>Level</th>
                <th>Type</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jds.map((row) => (
                <tr key={row.id}>
                  <td className="jd-history-td-title">
                    {row.job_title || row.title}
                    {row.description && (
                      <span className="jd-history-td-desc">{row.description}</span>
                    )}
                  </td>
                  <td>{row.company_name || '-'}</td>
                  <td>{row.department || '-'}</td>
                  <td>{row.level || '-'}</td>
                  <td>
                    <span className={`jd-history-badge jd-history-badge-${row.type}`}>
                      {row.type === 'batch' ? 'Batch' : 'Normal'}
                    </span>
                  </td>
                  <td>{formatDate(row.created_at)}</td>
                  <td>
                    <div className="jd-history-row-actions">
                      <button
                        type="button"
                        className="jd-history-action-btn jd-history-action-view"
                        title="View"
                        onClick={() => handleView(row)}
                        disabled={viewLoading}
                      >
                        <EyeOutlined />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="jd-history-action-btn jd-history-action-pdf"
                        title="Download PDF"
                        onClick={() => handleRowDownload('pdf', row)}
                        disabled={downloading === `pdf-${row.id}`}
                      >
                        <FilePdfOutlined />
                        <span>{downloading === `pdf-${row.id}` ? '…' : 'PDF'}</span>
                      </button>
                      <button
                        type="button"
                        className="jd-history-action-btn jd-history-action-word"
                        title="Download Word"
                        onClick={() => handleRowDownload('word', row)}
                        disabled={downloading === `word-${row.id}`}
                      >
                        <FileWordOutlined />
                        <span>{downloading === `word-${row.id}` ? '…' : 'Word'}</span>
                      </button>
                      <button
                        type="button"
                        className="jd-history-action-btn jd-history-action-edit"
                        title="Edit"
                        onClick={() => navigate(`/jd/${row.id}`)}
                      >
                        <EditOutlined />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="jd-history-action-btn jd-history-action-delete"
                        title="Delete"
                        onClick={() => setConfirmDeleteJd(row)}
                      >
                        <DeleteOutlined />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── View Modal ── */}
      {viewJd && (
        <JDViewModal
          jd={viewJd}
          onClose={() => setViewJd(null)}
          onDownload={handleDownload}
          downloading={downloading}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDeleteJd && (
        <DeleteConfirmModal
          jd={confirmDeleteJd}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setConfirmDeleteJd(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
