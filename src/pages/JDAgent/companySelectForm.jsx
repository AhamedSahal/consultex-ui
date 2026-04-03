import React from 'react';
import { Modal, Input } from 'antd';
import api from '../../api/axios';

function resolveCompanyLogoUrl(company) {
  const raw = company.logo_url || company.logoUrl;
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const base = api.defaults.baseURL || '';
  if (!base) return path;

  try {
    const url = new URL(base, window.location.origin);
    return `${url.origin}${path}`;
  } catch {
    const match = base.match(/^https?:\/\/[^/]+/i);
    const origin = match ? match[0] : base.replace(/\/+$/, '');
    return `${origin}${path}`;
  }
}

function CompanySelectForm({
  open,
  onCancel,
  onSelect,
  confirmLoading,
  companySearch,
  onCompanySearchChange,
  companies,
  selectedCompany,
  onSelectCompany,
}) {
  return (
    <Modal
      title="Select Company"
      open={open}
      onCancel={onCancel}
      onOk={onSelect}
      okText="Select"
      confirmLoading={confirmLoading}
    >
      <div className="form-group">
        <Input
          placeholder="Search"
          value={companySearch}
          onChange={onCompanySearchChange}
        />
      </div>
      <div className="jd-company-list">
        {companies.map((company) => {
          const logoUrl = resolveCompanyLogoUrl(company);

          return (
            <button
              key={company.id}
              type="button"
              className={`jd-company-item${
                selectedCompany && selectedCompany.id === company.id
                  ? ' jd-company-item-active'
                  : ''
              }`}
              onClick={() => onSelectCompany(company)}
            >
              <span className="jd-company-logo">
                {logoUrl ? (
                  <img src={logoUrl} alt={company.name} />
                ) : (
                  (company.name || '?')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                )}
              </span>
              <span className="jd-company-name">{company.name}</span>
            </button>
          );
        })}
        {!confirmLoading && companies.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            No companies found.
          </p>
        )}
      </div>
    </Modal>
  );
}

export default CompanySelectForm;

