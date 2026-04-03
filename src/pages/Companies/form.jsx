import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input, Button } from 'reactstrap';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createCompany } from './service';
import { CompanySchema } from './validation';

const INDUSTRY_OPTIONS = [
  'Technology',
  'Banking',
  'Financial Services',
  'Pharmaceuticals & Healthcare',
  'Education',
  'Retail',
  'Oil & Gas',
  'Real Estate',
  'Other'
];

const COUNTRY_OPTIONS = ['Global', 'USA', 'UK', 'UAE', 'Saudi Arabia', 'India'];

const initialValues = {
  name: '',
  industry: '',
  industry_other: '',
  country: 'Global',
  status: 'ACTIVE',
  notes: ''
};

const formatFileSize = (file) => {
  if (!file || !file.size) return '';
  const mb = file.size / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

function buildFormData(values, logoFile, documents) {
  const formData = new FormData();
  formData.append("name", values.name || "");
  formData.append("country", values.country || "");
  formData.append("status", values.status || "ACTIVE");
  formData.append("notes", values.notes || "");

  const industry =
    values.industry === "Other" && values.industry_other
      ? values.industry_other
      : values.industry || "";
  formData.append("industry", industry);

  if (logoFile) {
    formData.append("logo", logoFile);
  }

  // 1) append all files
  const metaArr = [];
  documents.forEach((doc) => {
    if (!doc.file) return;
    formData.append("documents", doc.file);
    metaArr.push({
      title: doc.title || doc.file.name,
      doc_type: "COMPANY_DOC" // optional but useful
    });
  });

  // 2) append meta ONCE as JSON array string
  formData.append("documents_meta", JSON.stringify(metaArr));

  return formData;
}

function CreateCompanyModal({ open, onCancel, onCreated }) {
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [documents, setDocuments] = useState([]);

  const save = (data, action) => {
    action.setSubmitting(true);
    const formData = buildFormData(data, logoFile, documents);
    createCompany(formData)
      .then((res) => {
        if (res?.status === 'OK') {
          toast.success(res.message || 'Company created successfully');
          onCreated && onCreated(res.data);
        } else if (res?.status && res.status !== 'OK') {
          toast.error(res?.message || 'Failed to create company');
        } else {
          toast.success('Company created successfully');
          onCreated && onCreated(res);
        }
        action.setSubmitting(false);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || 'Failed to create company';
        toast.error(msg);
        action.setSubmitting(false);
      });
  };

  const handleAddDocumentRow = () => {
    setDocuments((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), title: '', file: null }
    ]);
  };

  const handleRemoveDocumentRow = (id) => {
    setDocuments((prev) => prev.filter((row) => row.id !== id));
  };

  const handleChangeDocumentTitle = (id, value) => {
    setDocuments((prev) => prev.map((row) => (row.id === id ? { ...row, title: value } : row)));
  };

  const handleChangeDocumentFile = (id, file) => {
    setDocuments((prev) => prev.map((row) => (row.id === id ? { ...row, file } : row)));
  };

  const handleClose = (isSubmitting) => {
    if (isSubmitting) return;
    onCancel && onCancel();
  };

  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialValues}
      validationSchema={CompanySchema}
      onSubmit={save}
    >
      {({ values, handleSubmit, setFieldValue, isSubmitting }) => (
        <Modal isOpen={open} toggle={() => handleClose(isSubmitting)} size="lg">
          <ModalHeader toggle={() => handleClose(isSubmitting)}>Create Company</ModalHeader>
          <Form onSubmit={handleSubmit} autoComplete="off">
            <ModalBody>
              <div className="row g-3">
                <div className="col-md-8">
                  <FormGroup>
                    <Label for="name">Company Name <span style={{ color: 'red' }}>*</span></Label>
                    <Field name="name" as={Input} id="name" placeholder="e.g. ICT Holding" className="form-control" />
                    <ErrorMessage name="name">
                      {(msg) => <div style={{ color: 'red', fontSize: 12 }}>{msg}</div>}
                    </ErrorMessage>
                  </FormGroup>

                  <FormGroup>
                    <Label for="industry">Industry <span style={{ color: 'red' }}>*</span></Label>
                    <Field name="industry" as={Input} type="select" id="industry" className="form-control">
                      <option value="">Select industry</option>
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="industry">
                      {(msg) => <div style={{ color: 'red', fontSize: 12 }}>{msg}</div>}
                    </ErrorMessage>
                  </FormGroup>

                  {values.industry === 'Other' && (
                    <FormGroup>
                      <Label for="industry_other">Specify Industry <span style={{ color: 'red' }}>*</span></Label>
                      <Field name="industry_other" as={Input} id="industry_other" placeholder="Enter industry" className="form-control" />
                      <ErrorMessage name="industry_other">
                        {(msg) => <div style={{ color: 'red', fontSize: 12 }}>{msg}</div>}
                      </ErrorMessage>
                    </FormGroup>
                  )}

                  <FormGroup>
                    <Label for="country">Country / Region <span style={{ color: 'red' }}>*</span></Label>
                    <Field name="country" as={Input} type="select" id="country" className="form-control">
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="country">
                      {(msg) => <div style={{ color: 'red', fontSize: 12 }}>{msg}</div>}
                    </ErrorMessage>
                  </FormGroup>

                  <FormGroup>
                    <Label>Status <span style={{ color: 'red' }}>*</span></Label>
                    <div className="d-flex gap-2">
                      <FormGroup check>
                        <Label check>
                          <Field name="status" type="radio" value="ACTIVE" as={Input} /> Active
                        </Label>
                      </FormGroup>
                      <FormGroup check>
                        <Label check>
                          <Field name="status" type="radio" value="INACTIVE" as={Input} /> Inactive
                        </Label>
                      </FormGroup>
                    </div>
                  </FormGroup>
                </div>

                <div className="col-md-4">
                  <FormGroup>
                    <Label>Logo (optional)</Label>
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setLogoFile(file || null);
                        setLogoPreview(file ? URL.createObjectURL(file) : '');
                      }}
                    />
                    {logoPreview && (
                      <div className="mt-2">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                  </FormGroup>

                  <FormGroup>
                    <Label for="notes">Notes (optional)</Label>
                    <Field name="notes" as={Input} type="textarea" id="notes" rows={4} placeholder="Internal notes about this client..." className="form-control" />
                  </FormGroup>
                </div>
              </div>

              <div className="mt-4">
                <h5 className="mb-3">Documents</h5>
                <div className="d-flex flex-column gap-2">
                  {documents.length === 0 && <div className="text-muted small">No documents added yet.</div>}

                  {documents.map((row) => (
                    <div
                      key={row.id}
                      className="border rounded p-3 position-relative"
                    >
                      <FormGroup>
                        <Label className="small">Policy / Document Name*</Label>
                        <Input
                          placeholder="Enter document name"
                          value={row.title}
                          onChange={(e) => handleChangeDocumentTitle(row.id, e.target.value)}
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label className="small">Upload Policy / Document*</Label>
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleChangeDocumentFile(row.id, file || null);
                          }}
                        />
                        {row.file && (
                          <div className="mt-1 small text-muted">
                            Selected: {row.file.name}
                            {formatFileSize(row.file) && ` (${formatFileSize(row.file)})`}
                          </div>
                        )}
                      </FormGroup>
                      <Button
                        color="danger"
                        outline
                        size="sm"
                        className="position-absolute top-0 end-0 m-2"
                        onClick={() => handleRemoveDocumentRow(row.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  <Button type="button" color="secondary" outline onClick={handleAddDocumentRow}>
                    Add Document
                  </Button>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={() => handleClose(isSubmitting)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" color="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Company'}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

export default CreateCompanyModal;
