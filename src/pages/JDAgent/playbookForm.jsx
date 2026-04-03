import React from 'react';
import { Modal, Input } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

function PlaybookForm({
  open,
  onCancel,
  onSave,
  confirmLoading,
  playbookTitle,
  onTitleChange,
  playbookFile,
  onFileChange,
  title = 'Upload JD Playbook',
}) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={onSave}
      okText="Save"
      confirmLoading={confirmLoading}
    >
      <div className="form-group">
        <label className="form-label">Playbook Title</label>
        <Input
          placeholder="e.g. Product hiring playbook"
          value={playbookTitle}
          onChange={onTitleChange}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Upload file</label>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const inputEl = document.getElementById('jd-playbook-file-input');
            if (inputEl) {
              inputEl.click();
            }
          }}
        >
          <UploadOutlined style={{ marginRight: 8 }} />
          Choose file
        </button>
        <input
          id="jd-playbook-file-input"
          type="file"
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          {playbookFile
            ? playbookFile.name
            : 'Drag & drop or click to browse your document.'}
        </p>
      </div>
    </Modal>
  );
}

export default PlaybookForm;

