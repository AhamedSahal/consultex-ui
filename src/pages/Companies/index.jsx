import React, { useEffect, useState, useRef } from 'react';
import { Button, Input, Spin, Empty, Popconfirm, message, Progress } from 'antd';
import { useNavigate } from 'react-router-dom';
import CreateCompanyModal from './form';
import { fetchCompanies, deleteCompany, fetchCompanyDocuments } from './service';
import api from '../../api/axios';
import { DeleteOutlined } from '@ant-design/icons';

const { Search } = Input;

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function resolveLogoUrl(company) {
  const raw = company.logo_url || company.logoUrl;
  if (!raw) return '';

  // If backend already returned a full URL, use it as-is
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  // Ensure the path starts with a single leading slash
  const path = raw.startsWith('/') ? raw : `/${raw}`;

  const base = api.defaults.baseURL || '';
  if (!base) return path;

  // Use only the origin (protocol + host[:port]) so that
  // relative logo paths like "/media/logo.png" are resolved
  // as "https://api.example.com/media/logo.png" even when
  // the axios baseURL is "https://api.example.com/api".
  try {
    const url = new URL(base, window.location.origin);
    return `${url.origin}${path}`;
  } catch {
    const match = base.match(/^https?:\/\/[^/]+/i);
    const origin = match ? match[0] : base.replace(/\/+$/, '');
    return `${origin}${path}`;
  }
}

function computeEmbeddingStats(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return {
      total: 0,
      completed: 0,
      failed: 0,
      pendingOrProcessing: 0,
      percent: 0
    };
  }

  const total = documents.length;
  let completed = 0;
  let failed = 0;

  documents.forEach((doc) => {
    const status = String(doc.embedding_status || '').toUpperCase();
    if (status === 'COMPLETED') {
      completed += 1;
    } else if (status === 'FAILED') {
      failed += 1;
    }
  });

  const pendingOrProcessing = total - completed - failed;
  const percent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return {
    total,
    completed,
    failed,
    pendingOrProcessing,
    percent
  };
}

function CompaniesListPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [embeddingInfo, setEmbeddingInfo] = useState(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const loadCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load companies');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const trackEmbeddingProgress = async (companyId, companyName, initialDocuments) => {
    if (!companyId) {
      await loadCompanies();
      return;
    }

    let docs = Array.isArray(initialDocuments) ? initialDocuments : [];

    if (!docs.length) {
      await loadCompanies();
      return;
    }

    let stats = computeEmbeddingStats(docs);

    if (isMountedRef.current) {
      setEmbeddingInfo({
        companyId,
        companyName,
        ...stats
      });
    }

    while (stats.pendingOrProcessing > 0 && isMountedRef.current) {
      // Wait a bit before polling again
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (!isMountedRef.current) return;

      try {
        // eslint-disable-next-line no-await-in-loop
        docs = await fetchCompanyDocuments(companyId);
      } catch (err) {
        if (isMountedRef.current) {
          message.error('Failed to check document embedding status.');
          setEmbeddingInfo(null);
          await loadCompanies();
        }
        return;
      }

      stats = computeEmbeddingStats(docs);

      if (isMountedRef.current) {
        setEmbeddingInfo({
          companyId,
          companyName,
          ...stats
        });
      }
    }

    if (!isMountedRef.current) return;

    if (stats.failed > 0) {
      message.warning(
        'Embedding completed with some failures. Please review document statuses in the workspace.'
      );
    } else {
      message.success('Company documents have been embedded successfully.');
    }

    setEmbeddingInfo(null);
    await loadCompanies();
  };

  const handleOpenWorkspace = (company) => {
    const id = company.companyId || company.id || company._id;
    if (!id) return;
    navigate(`/companies/${id}/workspace`);
  };

  const handleCompanyCreated = (created) => {
    setModalOpen(false);

    // Backend returns shape: { companyId, company, documents }
    if (!created) {
      loadCompanies();
      return;
    }

    const company = created.company || created;
    const id = created.companyId || company.id || company._id;
    const documents = created.documents || [];

    if (id && Array.isArray(documents) && documents.length > 0) {
      trackEmbeddingProgress(id, company.name || 'New company', documents);
    } else {
      // No documents to embed yet – just refresh the list
      loadCompanies();
    }
  };

  const filtered = companies.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.industry && c.industry.toLowerCase().includes(term)) ||
      (c.country && c.country.toLowerCase().includes(term))
    );
  });

  const handleDeleteCompany = async (companyId) => {
    if (!companyId) return;
    setDeletingId(companyId);
    setError('');
    try {
      await deleteCompany(companyId);
      setCompanies((prev) =>
        prev.filter((c) => (c.id || c._id || c.companyId) !== companyId),
      );
      message.success('Company deleted.');
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to delete company';
      setError(msg);
      message.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="content-area">
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
          <p className="page-desc">Manage client organizations and their consulting workspaces.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Search
            placeholder="Search companies..."
            allowClear
            onSearch={(val) => setSearch(val)}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <Button type="primary" onClick={() => setModalOpen(true)}>
            Create Company
          </Button>
        </div>
      </div>

      {error && (
        <div className="agent-delete-error" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {embeddingInfo ? (
        (() => {
          const {
            companyName,
            total,
            completed,
            failed,
            percent,
            pendingOrProcessing
          } = embeddingInfo;
          const isEmbedding = pendingOrProcessing > 0;

          return (
            <div style={{ padding: '40px 0', maxWidth: 600 }}>
              <div
                style={{
                  marginBottom: 20,
                  padding: 16,
                  background: isEmbedding ? '#f0f7ff' : '#f6ffed',
                  borderRadius: 8,
                  border: `1px solid ${isEmbedding ? '#91caff' : '#b7eb8f'}`
                }}
              >
                <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>
                  Setting up workspace for {companyName || 'your new company'}...
                </div>
                <div style={{ marginBottom: 8, fontSize: 13 }}>
                  Document embedding: {completed} of {total} complete
                  {failed > 0 && ` (${failed} failed)`}
                </div>
                <Progress
                  percent={percent}
                  status={
                    failed > 0 && !isEmbedding ? 'exception' : isEmbedding ? 'active' : 'success'
                  }
                />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                You’ll see the companies list once embedding has finished.
              </div>
            </div>
          );
        })()
      ) : loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : filtered.length === 0 ? (
        <Empty description="No companies yet. Create your first company to get started." />
      ) : (
        <div className="agent-grid">
          {filtered.map((company) => {
            const id = company.id || company._id;
            const logoUrl = resolveLogoUrl(company);
            const documentsCount = company.documents_count || 0;

            return (
              <div key={id} className="agent-card">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 16,
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={company.name}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginRight: 12,
                        }}
                      />
                    ) : (
                      <div className="user-avatar small" style={{ marginRight: 12 }}>
                        {getInitials(company.name)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{company.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {company.country || 'Global'} · {company.industry || 'Industry'}
                      </div>
                    </div>
                  </div>
                  <Popconfirm
                    title="Delete company"
                    description="Delete this company and all its documents?"
                    okText="Yes, delete"
                    okButtonProps={{ danger: true }}
                    cancelText="Cancel"
                    onConfirm={() => handleDeleteCompany(id)}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deletingId === id}
                    />
                  </Popconfirm>
                </div>

                <div style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-muted)' }}>
                  {documentsCount} document{documentsCount !== 1 ? 's' : ''}
                </div>

                <Button type="primary" block onClick={() => handleOpenWorkspace(company)}>
                  Open Workspace
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <CreateCompanyModal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onCreated={handleCompanyCreated}
        />
      )}
    </div>
  );
}

export default CompaniesListPage;

