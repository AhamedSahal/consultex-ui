import React from 'react';
import { Modal, Spin, Popconfirm, Button, Tooltip } from 'antd';
import { DeleteOutlined, FileTextOutlined, UploadOutlined, LoadingOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';

function EmbedStatus({ status }) {
  if (status === 'PENDING' || status === 'PROCESSING') {
    return (
      <Tooltip title="Embedding in progress…">
        <Spin indicator={<LoadingOutlined spin />} size="small" style={{ marginLeft: 6 }} />
      </Tooltip>
    );
  }
  if (status === 'DONE') {
    return (
      <Tooltip title="Ready">
        <CheckCircleOutlined style={{ marginLeft: 6, color: '#52c41a', fontSize: 13 }} />
      </Tooltip>
    );
  }
  if (status === 'FAILED') {
    return (
      <Tooltip title="Embedding failed">
        <WarningOutlined style={{ marginLeft: 6, color: '#ff4d4f', fontSize: 13 }} />
      </Tooltip>
    );
  }
  return null;
}

function PlaybookListModal({ open, onCancel, playbooks, loading, activePlaybookId, onDelete, deletingId, onSelect, onUpload }) {
  return (
    <Modal
      title="Playbooks"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={460}
    >
      {onUpload && (
        <div style={{ marginBottom: 12, textAlign: 'right' }}>
          <Button icon={<UploadOutlined />} onClick={onUpload}>Upload Playbook</Button>
        </div>
      )}
      {loading ? (
        <div className="pb-list-loading">
          <Spin />
        </div>
      ) : !playbooks || playbooks.length === 0 ? (
        <div className="pb-list-empty">
          <FileTextOutlined className="pb-list-empty-icon" />
          <p>No playbooks uploaded yet.</p>
        </div>
      ) : (
        <div className="pb-list">
          {playbooks.map((pb) => {
            const isActive = pb.id === activePlaybookId || String(pb.id) === String(activePlaybookId);
            const name = pb.title || pb.filename || pb.name || `Playbook #${pb.id}`;
            const date = pb.created_at || pb.createdAt || pb.uploadedAt;
            return (
              <div
                key={pb.id}
                className={`pb-list-item${isActive ? ' pb-list-item-active' : ''}`}
                onClick={() => onSelect && onSelect(pb)}
                style={onSelect ? { cursor: 'pointer' } : undefined}
              >
                <div className="pb-list-item-icon">
                  <FileTextOutlined />
                </div>
                <div className="pb-list-item-body">
                  <div className="pb-list-item-name" style={{ display: 'flex', alignItems: 'center' }}>
                    {name}
                    <EmbedStatus status={pb.embedding_status} />
                  </div>
                  {date && (
                    <div className="pb-list-item-date">
                      {new Date(date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  )}
                </div>
                {isActive && <span className="pb-list-item-badge">Active</span>}
                <Popconfirm
                  title="Delete playbook?"
                  description="This cannot be undone."
                  onConfirm={() => onDelete(pb.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  cancelText="Cancel"
                  placement="left"
                >
                  <button
                    type="button"
                    className="pb-list-item-del"
                    title="Delete playbook"
                    disabled={deletingId === pb.id}
                  >
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export default PlaybookListModal;
