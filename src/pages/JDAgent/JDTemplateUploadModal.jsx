import React, { useRef } from 'react';
import { Modal, Input } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

function JDTemplateUploadModal({
  open,
  onCancel,
  onSave,
  confirmLoading,
  templateName,
  onNameChange,
  templateFile,
  onFileChange,
}) {
  const fileInputRef = useRef(null);

  return (
    <Modal
      title="Upload JD Template"
      open={open}
      onCancel={onCancel}
      onOk={onSave}
      okText="Upload Template"
      confirmLoading={confirmLoading}
      okButtonProps={{ disabled: !templateFile }}
    >
      <div className="form-group">
        <label className="form-label">Template Name</label>
        <Input
          placeholder="e.g. Standard JD Template 2024"
          value={templateName}
          onChange={onNameChange}
        />
      </div>
      <div className="form-group">
        <label className="form-label">DOCX File</label>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <UploadOutlined style={{ marginRight: 8 }} />
          Choose file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          {templateFile
            ? templateFile.name
            : 'Only .docx files are accepted (max 10 MB).'}
        </p>
      </div>
    </Modal>
  );
}

export default JDTemplateUploadModal;
