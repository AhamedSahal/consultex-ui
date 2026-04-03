import React, { useEffect, useState } from 'react';
import { Modal, Spin, Breadcrumb } from 'antd';
import {
  FolderOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { listOneDriveFiles } from './service';

// .doc (legacy binary Word) is excluded — mammoth only supports .docx
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const UNSUPPORTED_MSG    = 'Legacy .doc files are not supported. Please save the file as .docx and re-upload to OneDrive.';

function fileExt(name = '') {
  return (name.split('.').pop() || '').toLowerCase();
}

function fileIcon(name = '') {
  const ext = fileExt(name);
  if (ext === 'pdf')  return <FilePdfOutlined style={{ color: '#e05555' }} />;
  if (ext === 'docx') return <FileWordOutlined style={{ color: '#2d6cdf' }} />;
  return <FileTextOutlined style={{ color: '#888' }} />;
}

function isAllowed(item) {
  if (item.folder) return true;
  const name = (item.name || '').toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function isUnsupported(item) {
  if (item.folder) return false;
  return fileExt(item.name) === 'doc';
}

function OneDrivePickerModal({ open, onCancel, onSelect }) {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [folderStack, setFolderStack] = useState([]); // [{ id, name }, ...]
  const [selected, setSelected]     = useState(null);

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;

  async function loadFolder(folderId) {
    setLoading(true);
    setError('');
    setSelected(null);
    try {
      const data = await listOneDriveFiles(folderId);
      // Show allowed + .doc (greyed out with warning), hide everything else
    setItems((data || []).filter((i) => isAllowed(i) || isUnsupported(i)));
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to list OneDrive files');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      setFolderStack([]);
      setSelected(null);
      loadFolder(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleItemClick(item) {
    if (item.folder) {
      setFolderStack((prev) => [...prev, { id: item.id, name: item.name }]);
      loadFolder(item.id);
    } else {
      setSelected(item);
    }
  }

  function handleBack() {
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    loadFolder(newStack.length > 0 ? newStack[newStack.length - 1].id : null);
  }

  function handleOk() {
    if (selected) onSelect(selected);
  }

  const breadcrumbs = [{ name: 'OneDrive', id: null }, ...folderStack];

  return (
    <Modal
      title="Select HR Manual from OneDrive"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Select"
      okButtonProps={{ disabled: !selected }}
      width={560}
    >
      {/* Breadcrumb navigation */}
      <Breadcrumb
        style={{ marginBottom: 12, fontSize: 13 }}
        items={breadcrumbs.map((crumb, idx) => ({
          title: (
            <span
              style={{ cursor: idx < breadcrumbs.length - 1 ? 'pointer' : 'default', color: idx < breadcrumbs.length - 1 ? 'var(--primary, #5b6dff)' : undefined }}
              onClick={() => {
                if (idx < breadcrumbs.length - 1) {
                  const newStack = folderStack.slice(0, idx);
                  setFolderStack(newStack);
                  loadFolder(newStack.length > 0 ? newStack[newStack.length - 1].id : null);
                }
              }}
            >
              {crumb.name}
            </span>
          ),
        }))}
      />

      {folderStack.length > 0 && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary mb-2"
          onClick={handleBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
        >
          <ArrowLeftOutlined /> Back
        </button>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin />
        </div>
      )}

      {!loading && error && (
        <div style={{ color: '#e05555', fontSize: 13, padding: '8px 0' }}>
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
          No supported files found (PDF, DOCX, TXT).
        </div>
      )}

      {!loading && !error && (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.map((item) => {
            const isFolder   = !!item.folder;
            const isActive   = selected?.id === item.id;
            const unsupported = isUnsupported(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => !unsupported && handleItemClick(item)}
                title={unsupported ? UNSUPPORTED_MSG : undefined}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            10,
                  width:          '100%',
                  padding:        '8px 10px',
                  border:         'none',
                  borderRadius:   6,
                  cursor:         unsupported ? 'not-allowed' : 'pointer',
                  background:     isActive ? 'var(--primary-light, #eef0ff)' : 'transparent',
                  textAlign:      'left',
                  marginBottom:   2,
                  fontSize:       14,
                  opacity:        unsupported ? 0.45 : 1,
                  color:          isActive ? 'var(--primary, #5b6dff)' : 'inherit',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>
                  {isFolder ? <FolderOutlined style={{ color: '#f0a500' }} /> : fileIcon(item.name)}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                {unsupported && (
                  <span style={{ fontSize: 11, color: '#e05555', flexShrink: 0 }}>convert to .docx</span>
                )}
                {!isFolder && !unsupported && item.size && (
                  <span style={{ fontSize: 12, color: '#aaa', flexShrink: 0 }}>
                    {(item.size / 1024).toFixed(0)} KB
                  </span>
                )}
                {isFolder && (
                  <span style={{ fontSize: 12, color: '#aaa', flexShrink: 0 }}>›</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-soft, #f5f6fb)', borderRadius: 6, fontSize: 13 }}>
          Selected: <strong>{selected.name}</strong>
        </div>
      )}
    </Modal>
  );
}

export default OneDrivePickerModal;
