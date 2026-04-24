import React from 'react';
import { Select } from 'antd';

const { Option } = Select;

const PERCENTILES = ['P10', 'P25', 'P40', 'P50', 'P65', 'P75', 'P90'];
const PEER_GROUPS = ['All Companies', 'Tuscan Curated', 'Industry Peers', 'Regional Peers'];

export const defaultValues = {
  gradeDataset:     '',
  jobFunctions:     [],
  grades:           [],
  countries:        [],
  regions:          [],
  industries:       [],
  payComponent:     '',
  targetPercentile: 'P50',
  peerGroup:        'All Companies',
  yearFrom:         '',
  yearTo:           '',
  currency:         '',
  // advanced kept for future
  companySizeMin:   null,
  companySizeMax:   null,
  revenueMin:       '',
  revenueMax:       '',
  ownershipType:    'All',
  city:             '',
  excludeOutliers:  true,
  minIncumbents:    10,
  minCompanies:     3,
  dataConfidence:   'High',
  riskFlags:        ['below_market', 'compression'],
  payStrategy:      'Market Match',
  comparisonType:   'Company vs Market',
};

export default function FilterForm({ values, onChange, onReset, onSubmit, loading, filterOptions = {}, gradeUploads = [], onClose }) {
  const v   = { ...defaultValues, ...values };
  const set = (key) => (val) => onChange(key, val);

  const opts = filterOptions;

  // Build year options from DB data + fallback
  const yearOpts = opts.years?.length
    ? opts.years
    : ['2020', '2021', '2022', '2023', '2024', '2025'];

  // Pay component options from DB compensation_elements
  const payComponentOpts = opts.compensation_elements?.length
    ? opts.compensation_elements
    : ['Monthly Total Package', 'Monthly Basic Salary', 'Monthly Fixed Cash', 'Monthly Total Earnings'];

  const isGradeMode = !!v.gradeDataset;

  return (
    <>
      <div className="bmr-modal-body">

        {/* Grade Report Dataset — full width row at top */}
       

        <div className="bmr-filter-grid">
          <div className="bmr-filter-group">
          <label className="bmr-filter-label">
            Grade Report Dataset
            <span className="bmr-filter-label-hint"> (Select for Grade Report Generation)</span>
          </label>
          <Select
            allowClear showSearch
            placeholder="Leave blank for Benchmark Report"
            value={v.gradeDataset || undefined}
            onChange={val => onChange('gradeDataset', val || '')}
            className="bmr-select bmr-select--grade"
          >
            {gradeUploads.map(u => (
              <Option key={u.id} value={u.id}>{u.name}</Option>
            ))}
          </Select>
          {isGradeMode && (
            <div className="bmr-grade-mode-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Grade Report mode — will generate Overall Compensation Report
            </div>
          )}
           </div>
          {/* Job Function */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Job Function</label>
            <Select
              mode="multiple" allowClear showSearch
              placeholder="Select job functions"
              value={v.jobFunctions} onChange={set('jobFunctions')}
              className="bmr-select" maxTagCount={3}
            >
              {(opts.job_functions || []).map(f => <Option key={f} value={f}>{f}</Option>)}
            </Select>
          </div>

          {/* Grade */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Grade / Level</label>
            <Select
              mode="multiple" allowClear showSearch
              placeholder="Select grades"
              value={v.grades} onChange={set('grades')}
              className="bmr-select" maxTagCount={4}
            >
              {(opts.grades || []).map(g => <Option key={g} value={g}>{g}</Option>)}
            </Select>
          </div>

          {/* Country */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Country</label>
            <Select
              mode="multiple" allowClear showSearch
              placeholder="Select countries"
              value={v.countries} onChange={set('countries')}
              className="bmr-select" maxTagCount={3}
            >
              {(opts.countries || []).map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </div>

          {/* Region */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Region</label>
            <Select
              mode="multiple" allowClear showSearch
              placeholder="Select regions"
              value={v.regions} onChange={set('regions')}
              className="bmr-select" maxTagCount={3}
            >
              {(opts.regions || []).map(r => <Option key={r} value={r}>{r}</Option>)}
            </Select>
          </div>

          {/* Industry */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Industry / Sector</label>
            <Select
              mode="multiple" allowClear showSearch
              placeholder="Select industries"
              value={v.industries} onChange={set('industries')}
              className="bmr-select" maxTagCount={3}
            >
              {(opts.industries || []).map(i => <Option key={i} value={i}>{i}</Option>)}
            </Select>
          </div>

          {/* Pay Component */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Pay Component</label>
            <Select
              allowClear showSearch
              placeholder="Select pay component"
              value={v.payComponent || undefined}
              onChange={val => onChange('payComponent', val || '')}
              className="bmr-select"
            >
              {payComponentOpts.map(p => <Option key={p} value={p}>{p}</Option>)}
            </Select>
          </div>

          {/* Target Percentile */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Target Percentile <span className="bmr-req">*</span></label>
            <Select
              value={v.targetPercentile}
              onChange={set('targetPercentile')}
              className="bmr-select"
            >
              {PERCENTILES.map(p => <Option key={p} value={p}>{p}</Option>)}
            </Select>
          </div>

          {/* Peer Group */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Peer Group</label>
            <Select
              value={v.peerGroup}
              onChange={set('peerGroup')}
              className="bmr-select"
            >
              {PEER_GROUPS.map(g => <Option key={g} value={g}>{g}</Option>)}
            </Select>
          </div>

          {/* Year From */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">Start Year</label>
            <Select
              allowClear
              placeholder="From year"
              value={v.yearFrom || undefined}
              onChange={val => onChange('yearFrom', val || '')}
              className="bmr-select"
            >
              {yearOpts.map(y => <Option key={y} value={y}>{y}</Option>)}
            </Select>
          </div>

          {/* Year To */}
          <div className="bmr-filter-group">
            <label className="bmr-filter-label">End Year</label>
            <Select
              allowClear
              placeholder="To year"
              value={v.yearTo || undefined}
              onChange={val => onChange('yearTo', val || '')}
              className="bmr-select"
            >
              {yearOpts.map(y => <Option key={y} value={y}>{y}</Option>)}
            </Select>
          </div>

        </div>
        {/* end bmr-filter-grid */}
      </div>

      {/* Footer */}
      <div className="bmr-modal-footer">
        <div className="bmr-modal-footer-left">
          <button className="bmr-btn-reset" onClick={onReset}>Reset All</button>
        </div>
        <div className="bmr-modal-footer-right">
          <button className="bmr-btn-generate" onClick={onSubmit} disabled={loading}>
            {loading ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ animation: 'spin 0.8s linear infinite' }}>
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                {isGradeMode ? 'Generate Grade Report' : 'Generate Report'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
