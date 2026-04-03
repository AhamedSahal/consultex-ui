import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Tag, Button, Input, Spin, Progress, message, Popconfirm, Modal } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, LoadingOutlined, EditOutlined } from '@ant-design/icons';
import {
  fetchCompanyDetails,
  fetchCompanyDocuments,
  uploadCompanyDocuments,
  deleteCompanyDocument,
  updateCompanyDocument,
} from './service';

const POLL_INTERVAL_MS = 2500;

function statusTag(status) {
  const value = status || 'PENDING';
  const upper = String(value).toUpperCase();
  let color = 'default';
  if (upper === 'COMPLETED') color = 'green';
  else if (upper === 'PROCESSING') color = 'blue';
  else if (upper === 'FAILED') color = 'red';
  else if (upper === 'PENDING') color = 'orange';
  return <Tag color={color}>{upper}</Tag>;
}

function CompanyWorkspacePage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [editingDoc, setEditingDoc] = useState(null); // { id, title }
  const [editTitle, setEditTitle] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadAll = async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const [companyData, docsData] = await Promise.all([
        fetchCompanyDetails(companyId),
        fetchCompanyDocuments(companyId)
      ]);
      setCompany(companyData || null);
      setDocuments(Array.isArray(docsData) ? docsData : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load workspace');
      setCompany(null);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [companyId]);

  // Poll document status when any document is PENDING or PROCESSING
  const pollRef = useRef(null);
  const hasPendingOrProcessing = (docs) =>
    Array.isArray(docs) && docs.some((d) => {
      const s = (d.embedding_status || '').toUpperCase();
      return s === 'PENDING' || s === 'PROCESSING';
    });

  const hadInProgressRef = useRef(false);

  useEffect(() => {
    if (!companyId || !hasPendingOrProcessing(documents)) return;

    pollRef.current = setInterval(async () => {
      try {
        const docsData = await fetchCompanyDocuments(companyId);
        setDocuments(Array.isArray(docsData) ? docsData : []);
      } catch {
        // Ignore poll errors
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [companyId, documents]);

  // Show a success / info message when embedding finishes
  useEffect(() => {
    if (!Array.isArray(documents) || documents.length === 0) {
      hadInProgressRef.current = false;
      return;
    }

    const inProgress = hasPendingOrProcessing(documents);
    const anyFailed = documents.some(
      (d) => (d.embedding_status || '').toUpperCase() === 'FAILED',
    );

    if (hadInProgressRef.current && !inProgress) {
      if (!anyFailed) {
        message.success('Document embedding completed successfully.');
      } else {
        message.warning('Embedding completed with some failures. Please review document statuses.');
      }
    }

    hadInProgressRef.current = inProgress;
  }, [documents]);

  const handleAddDocumentRow = () => {
    setPendingDocs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), title: '', file: null }
    ]);
  };

  const handleRemoveDocumentRow = (id) => {
    setPendingDocs((prev) => prev.filter((row) => row.id !== id));
  };

  const handleChangeDocumentTitle = (id, value) => {
    setPendingDocs((prev) => prev.map((row) => (row.id === id ? { ...row, title: value } : row)));
  };

  const handleChangeDocumentFile = (id, file) => {
    setPendingDocs((prev) => prev.map((row) => (row.id === id ? { ...row, file } : row)));
  };

  const handleUploadAll = async () => {
    try {
      setUploading(true);
      const formData = new FormData();
      const metaArr = [];
      pendingDocs.forEach((doc) => {
        if (!doc.file) return;
        formData.append('documents', doc.file);
        metaArr.push({
          title: doc.title || doc.file.name,
          doc_type: 'COMPANY_DOC'
        });
      });
      if (metaArr.length === 0) {
        setUploading(false);
        return;
      }
      formData.append('documents_meta', JSON.stringify(metaArr));
      await uploadCompanyDocuments(companyId, formData);
      setPendingDocs([]);
      await loadAll();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to upload documents', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteCompanyDocument(companyId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      message.success('Document deleted.');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleOpenEdit = (record) => {
    setEditingDoc(record);
    setEditTitle(record.title || record.original_filename || '');
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    setEditSaving(true);
    try {
      const updated = await updateCompanyDocument(companyId, editingDoc.id, { title: editTitle });
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      setEditingDoc(null);
      message.success('Document updated.');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to update document');
    } finally {
      setEditSaving(false);
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => text || record.original_filename || record.filename
    },
    {
      title: 'File',
      dataIndex: 'filename',
      key: 'filename',
      render: (text, record) => text || record.original_filename || '-'
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => {
        if (!value) return '-';
        const d = new Date(value);
        // eslint-disable-next-line react/jsx-one-expression-per-line
        return <span>{d.toLocaleDateString()} {d.toLocaleTimeString()}</span>;
      }
    },
    {
      title: 'Embedding Status',
      dataIndex: 'embedding_status',
      key: 'embedding_status',
      render: (status) => statusTag(status)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete document?"
            description="This will permanently remove the document and its embeddings."
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => handleDeleteDoc(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      )
    }
  ];

  const formatFileSize = (file) => {
    if (!file || !file.size) return '';
    const mb = file.size / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const renderUploadSection = () => (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ marginBottom: 12 }}>Add Documents</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pendingDocs.length === 0 && <div style={{ fontSize: 13 }}>No documents added yet.</div>}

        {pendingDocs.map((row) => (
          <div
            key={row.id}
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              position: 'relative'
            }}
          >
            <div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Policy / Document Name*</div>
              <Input
                placeholder="Enter document name"
                value={row.title}
                onChange={(e) => handleChangeDocumentTitle(row.id, e.target.value)}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>Upload Policy / Document*</div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  handleChangeDocumentFile(row.id, file || null);
                }}
              />
              {row.file && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#555' }}>
                  Selected: {row.file.name}
                  {formatFileSize(row.file) && ` (${formatFileSize(row.file)})`}
                </div>
              )}
            </div>

            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveDocumentRow(row.id)}
              style={{ position: 'absolute', top: 8, right: 8 }}
            />
          </div>
        ))}

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddDocumentRow}
          style={{ width: 'fit-content', marginTop: 4 }}
        >
          Add Document
        </Button>
      </div>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={handleUploadAll}
          loading={uploading}
        >
          Upload Documents
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="content-area" style={{ textAlign: 'center', paddingTop: 40 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="page-header">
        <div>
          <h1 className="page-title">{company?.name || 'Company Workspace'}</h1>
          <p className="page-desc">
            {company?.country || 'Global'} · {company?.industry || 'Industry'}
          </p>
        </div>
      </div>

      {error && (
        <div className="agent-delete-error" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {documents.length > 0 && (() => {
        const total = documents.length;
        const completed = documents.filter((d) => (d.embedding_status || '').toUpperCase() === 'COMPLETED').length;
        const failed = documents.filter((d) => (d.embedding_status || '').toUpperCase() === 'FAILED').length;
        const pendingOrProcessing = total - completed - failed;
        const percent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
        const isEmbedding = pendingOrProcessing > 0;

        return (
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              background: isEmbedding ? '#f0f7ff' : '#f6ffed',
              borderRadius: 8,
              border: `1px solid ${isEmbedding ? '#91caff' : '#b7eb8f'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              {isEmbedding && <LoadingOutlined style={{ fontSize: 18, color: '#1890ff' }} />}
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                Document embedding: {completed} of {total} complete
                {failed > 0 && ` (${failed} failed)`}
              </span>
            </div>
            <Progress
              percent={percent}
              status={failed > 0 && !isEmbedding ? 'exception' : isEmbedding ? 'active' : 'success'}
              strokeColor={failed > 0 && completed > 0 ? { '0%': '#52c41a', '100%': '#ff4d4f' } : undefined}
            />
          </div>
        );
      })()}

      <Table
        rowKey={(record) => record.id || record._id || record.storage_key || record.key}
        dataSource={documents || []}
        columns={columns}
        pagination={false}
        locale={{ emptyText: 'No documents uploaded yet.' }}
      />

      {renderUploadSection()}
    </div>
  );
}

export default CompanyWorkspacePage;

