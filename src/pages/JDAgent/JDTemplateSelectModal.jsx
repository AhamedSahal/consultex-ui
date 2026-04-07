import React, { useState } from 'react';
import { Modal, Spin, Popconfirm, Button, Tooltip, message } from 'antd';
import {
  DeleteOutlined, FileTextOutlined, CheckCircleFilled,
  ReloadOutlined, EditOutlined, PlusOutlined, EyeOutlined,
} from '@ant-design/icons';
import { reparseJdTemplate, fetchJdTemplate } from './service';
import JDTemplateBuilderModal from './JDTemplateBuilderModal';

function JDTemplateSelectModal({
  open,
  onCancel,
  templates,
  loading,
  activeTemplateId,
  onSelect,
  onDelete,
  deletingId,
  onTemplatesChange,
}) {
  const [reparsingId, setReparsingId]         = useState(null);
  const [builderOpen, setBuilderOpen]         = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewOnly, setViewOnly]               = useState(false);
  const [loadingId, setLoadingId]             = useState(null);

  const handleReparse = async (e, tpl) => {
    e.stopPropagation();
    setReparsingId(tpl.id);
    try {
      const updated = await reparseJdTemplate(tpl.id);
      message.success(`Template "${tpl.name}" re-parsed successfully.`);
      if (onTemplatesChange) onTemplatesChange(updated);
    } catch (err) {
      message.error(err?.response?.data?.error || 'Re-parse failed.');
    } finally {
      setReparsingId(null);
    }
  };

  const openCreate = (e) => {
    e.stopPropagation();
    setEditingTemplate(null);
    setViewOnly(false);
    setBuilderOpen(true);
  };

  const openView = async (e, tpl) => {
    e.stopPropagation();
    setLoadingId(tpl.id);
    try {
      // Fetch full schema (list view only has name/date, no parsed_schema_json)
      const full = await fetchJdTemplate(tpl.id);
      setEditingTemplate(full);
      setViewOnly(true);
      setBuilderOpen(true);
    } catch (err) {
      message.error('Could not load template details.');
    } finally {
      setLoadingId(null);
    }
  };

  const openEdit = async (e, tpl) => {
    e.stopPropagation();
    setLoadingId(tpl.id);
    try {
      const full = await fetchJdTemplate(tpl.id);
      setEditingTemplate(full);
      setViewOnly(false);
      setBuilderOpen(true);
    } catch (err) {
      message.error('Could not load template details.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleBuilderSaved = (saved) => {
    if (onTemplatesChange) onTemplatesChange(saved);
    message.success(`Template "${saved.name}" saved.`);
  };

  return (
    <>
      <Modal
        title="Select JD Template"
        open={open}
        onCancel={onCancel}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button icon={<PlusOutlined />} onClick={openCreate}>
              Create Template
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              {activeTemplateId && (
                <Button onClick={() => onSelect(null)}>Clear Template</Button>
              )}
              <Button type="primary" onClick={onCancel}>Close</Button>
            </div>
          </div>
        }
        width={500}
      >
        {loading ? (
          <div className="pb-list-loading">
            <Spin />
          </div>
        ) : !templates || templates.length === 0 ? (
          <div className="pb-list-empty">
            <FileTextOutlined className="pb-list-empty-icon" />
            <p>No JD templates yet.</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Click <strong>Create Template</strong> to define one, or upload a DOCX from the + menu.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Click a template to activate it. Use <EyeOutlined /> to view, <EditOutlined /> to edit, or <ReloadOutlined /> to re-parse DOCX templates.
            </p>
            <div className="pb-list">
              {templates.map((tpl) => {
                const isActive =
                  tpl.id === activeTemplateId ||
                  String(tpl.id) === String(activeTemplateId);
                const date      = tpl.created_at || tpl.createdAt;
                const isManual  = tpl.template_type === 'manual';

                return (
                  <div
                    key={tpl.id}
                    className={`pb-list-item${isActive ? ' pb-list-item-active' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelect(tpl)}
                  >
                    <div className="pb-list-item-icon">
                      {isActive ? (
                        <CheckCircleFilled style={{ color: '#22c55e' }} />
                      ) : (
                        <FileTextOutlined />
                      )}
                    </div>
                    <div className="pb-list-item-body">
                      <div className="pb-list-item-name">
                        {tpl.name}
                        {isManual && (
                          <span style={{
                            fontSize: 10, background: '#ede9fe', color: '#7c3aed',
                            borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontWeight: 600,
                          }}>CUSTOM</span>
                        )}
                      </div>
                      {date && (
                        <div className="pb-list-item-date">
                          {new Date(date).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                    {isActive && <span className="pb-list-item-badge">Active</span>}

                    {/* View button — all templates */}
                    <Tooltip title="View template">
                      <button
                        type="button"
                        className="pb-list-item-del"
                        style={{ marginRight: 2, color: '#6b7280' }}
                        disabled={loadingId === tpl.id}
                        onClick={(e) => openView(e, tpl)}
                        title="View"
                      >
                        {loadingId === tpl.id ? <Spin size="small" /> : <EyeOutlined />}
                      </button>
                    </Tooltip>

                    {/* Edit button — all templates */}
                    <Tooltip title="Edit template">
                      <button
                        type="button"
                        className="pb-list-item-del"
                        style={{ marginRight: 2, color: '#3b82f6' }}
                        disabled={loadingId === tpl.id}
                        onClick={(e) => openEdit(e, tpl)}
                        title="Edit"
                      >
                        <EditOutlined />
                      </button>
                    </Tooltip>

                    {/* Re-parse — DOCX templates only */}
                    {!isManual && (
                      <Tooltip title="Re-parse template schema">
                        <button
                          type="button"
                          className="pb-list-item-del"
                          style={{ marginRight: 2, color: '#6366f1' }}
                          disabled={reparsingId === tpl.id}
                          onClick={(e) => handleReparse(e, tpl)}
                          title="Re-parse"
                        >
                          {reparsingId === tpl.id ? <Spin size="small" /> : <ReloadOutlined />}
                        </button>
                      </Tooltip>
                    )}

                    <Popconfirm
                      title="Delete template?"
                      description="This cannot be undone."
                      onConfirm={(e) => { e && e.stopPropagation(); onDelete(tpl.id); }}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                      cancelText="Cancel"
                      placement="left"
                    >
                      <button
                        type="button"
                        className="pb-list-item-del"
                        title="Delete template"
                        disabled={deletingId === tpl.id}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DeleteOutlined />
                      </button>
                    </Popconfirm>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      <JDTemplateBuilderModal
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setViewOnly(false); setEditingTemplate(null); }}
        onSaved={handleBuilderSaved}
        editTemplate={editingTemplate}
        viewOnly={viewOnly}
        onSwitchToEdit={() => setViewOnly(false)}
      />
    </>
  );
}

export default JDTemplateSelectModal;
