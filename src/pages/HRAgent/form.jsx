import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { Button, Switch } from 'antd';
import { createAgentSchema } from './validation';

const PURPOSE_OPTIONS = [
  { value: 'JD Agent', label: 'JD Agent' },
  { value: 'Workforce Analytics', label: 'Workforce Analytics' },
  { value: 'Org Design', label: 'Org Design' },
  { value: 'Compensation Benchmark', label: 'Compensation Benchmark' },
  { value: 'Custom', label: 'Custom' }
];

const COUNTRY_OPTIONS = ['Global', 'USA', 'UK', 'UAE', 'India', 'Singapore'];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' }
];

const initialValues = {
  name: '',
  purpose: '',
  country: 'Global',
  status: 'DRAFT',
  strict_playbook: true,
  playbook_file: null
};

function CreateAgentForm({ onSubmit, onCancel, submitting }) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={createAgentSchema}
      onSubmit={onSubmit}
    >
      {({ setFieldValue, values }) => (
        <Form>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Agent Name</label>
              <Field
                name="name"
                as="input"
                className="form-input"
                placeholder="e.g. Job Description Agent"
              />
              <ErrorMessage name="name" component="div" className="form-error" />
            </div>
            <div className="form-group">
              <label className="form-label">Agent Purpose</label>
              <Field name="purpose" as="select" className="form-select">
                <option value="">Select purpose</option>
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Field>
              <ErrorMessage name="purpose" component="div" className="form-error" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Country</label>
              <Field name="country" as="select" className="form-select">
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Field>
              <ErrorMessage name="country" component="div" className="form-error" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <Field name="status" as="select" className="form-select">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Field>
              <ErrorMessage name="status" component="div" className="form-error" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Agent Playbook (PDF / DOCX / TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                const file = e.currentTarget.files && e.currentTarget.files[0];
                setFieldValue('playbook_file', file || null);
              }}
            />
            {values.playbook_file && (
              <div style={{ marginTop: 4, fontSize: 12 }}>{values.playbook_file.name}</div>
            )}
            <ErrorMessage name="playbook_file" component="div" className="form-error" />
          </div>

          <div className="form-group">
            <label className="form-label">Use playbook strictly</label>
            <Switch
              checked={values.strict_playbook}
              onChange={(checked) => setFieldValue('strict_playbook', checked)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Create Agent
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default CreateAgentForm;

