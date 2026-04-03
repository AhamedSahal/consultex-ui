import React, { useState, useEffect } from 'react';
import { createManualTemplate, updateManualTemplate } from './service';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CANONICAL_SECTIONS = [
  { key: 'job_information',      label: 'Job Information' },
  { key: 'job_purpose',          label: 'Job Purpose' },
  { key: 'key_accountabilities', label: 'Key Accountabilities' },
  { key: 'financial_dimensions', label: 'Financial Dimensions' },
  { key: 'key_communications',   label: 'Key Communications' },
  { key: 'minimum_qualifications', label: 'Minimum Qualifications' },
  { key: 'technical_skills',     label: 'Technical Skills' },
  { key: 'competencies',         label: 'Competencies' },
  { key: 'special_requirements', label: 'Special Requirements' },
  { key: 'approvals',            label: 'Approvals' },
];

const CANONICAL_FIELDS = [
  { key: 'job_title',           label: 'Job Title' },
  { key: 'reports_to',          label: 'Reports To' },
  { key: 'department',          label: 'Department' },
  { key: 'location',            label: 'Location' },
  { key: 'grade',               label: 'Grade' },
  { key: 'no_of_direct_reports', label: 'No. of Direct Reports' },
  { key: null,                  label: 'Custom (TBD)' },
];

const DEFAULT_LAYOUT_OPTIONS = [
  { value: 'single-column',          label: 'Full-width (1 col)' },
  { value: 'label-value',            label: '2 columns (Label | Value)' },
  { value: 'label-value-label-value', label: '4 columns (Label | Value | Label | Value)' },
];

const DEFAULT_JOB_INFO_FIELDS = [
  { label: 'Job Title',               canonicalKey: 'job_title' },
  { label: 'Reports To',              canonicalKey: 'reports_to' },
  { label: 'Department',              canonicalKey: 'department' },
  { label: 'Location',               canonicalKey: 'location' },
  { label: 'Grade',                   canonicalKey: 'grade' },
  { label: 'No. of Direct Reports',  canonicalKey: 'no_of_direct_reports' },
];

function buildDefaultSections(primaryColor) {
  return CANONICAL_SECTIONS.map((cs) => ({
    canonicalKey:   cs.key,
    sectionTitle:   cs.label.toUpperCase(),
    headerColor:    primaryColor,
    useCustomColor: false,
    layoutPattern:  cs.key === 'job_information' ? 'label-value' : 'single-column',
    fields: cs.key === 'job_information' ? DEFAULT_JOB_INFO_FIELDS.map((f) => ({ ...f })) : [],
    enabled: true,
  }));
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FieldRow({ field, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
      <input
        style={{ flex: 2, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
        placeholder="Field label (e.g. Job Code)"
        value={field.label}
        onChange={(e) => onChange({ ...field, label: e.target.value })}
      />
      <select
        style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
        value={field.canonicalKey ?? '__null__'}
        onChange={(e) => onChange({ ...field, canonicalKey: e.target.value === '__null__' ? null : e.target.value })}
      >
        {CANONICAL_FIELDS.map((cf) => (
          <option key={cf.key ?? '__null__'} value={cf.key ?? '__null__'}>{cf.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
        title="Remove field"
      >×</button>
    </div>
  );
}

function SectionRow({ section, onUpdate, primaryColor }) {
  const updateField = (idx, newField) => {
    const fields = section.fields.map((f, i) => (i === idx ? newField : f));
    onUpdate({ ...section, fields });
  };

  const addField = () => {
    onUpdate({ ...section, fields: [...section.fields, { label: '', canonicalKey: null }] });
  };

  const removeField = (idx) => {
    onUpdate({ ...section, fields: section.fields.filter((_, i) => i !== idx) });
  };

  const effectiveColor = section.useCustomColor ? section.headerColor : primaryColor;

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12,
      opacity: section.enabled ? 1 : 0.45,
    }}>
      {/* Section header bar */}
      <div style={{
        background: effectiveColor || '#2F5496',
        borderRadius: '7px 7px 0 0',
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <input
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontWeight: 600, fontSize: 14,
          }}
          value={section.sectionTitle}
          onChange={(e) => onUpdate({ ...section, sectionTitle: e.target.value })}
          disabled={!section.enabled}
          placeholder="Section title…"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={section.useCustomColor}
            onChange={(e) => onUpdate({ ...section, useCustomColor: e.target.checked })}
          />
          Custom color
        </label>
        {section.useCustomColor && (
          <input
            type="color"
            value={section.headerColor || '#2F5496'}
            onChange={(e) => onUpdate({ ...section, headerColor: e.target.value })}
            style={{ width: 32, height: 24, border: 'none', cursor: 'pointer', borderRadius: 3 }}
          />
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={(e) => onUpdate({ ...section, enabled: e.target.checked })}
          />
          Include
        </label>
      </div>

      {/* Section body */}
      {section.enabled && (
        <div style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>Maps to:</label>
            <select
              style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
              value={section.canonicalKey}
              onChange={(e) => onUpdate({ ...section, canonicalKey: e.target.value })}
            >
              {CANONICAL_SECTIONS.map((cs) => (
                <option key={cs.key} value={cs.key}>{cs.label}</option>
              ))}
            </select>
            <label style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>Layout:</label>
            <select
              style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
              value={section.layoutPattern}
              onChange={(e) => onUpdate({ ...section, layoutPattern: e.target.value })}
            >
              {DEFAULT_LAYOUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Fields editor — only for job_information */}
          {section.canonicalKey === 'job_information' && (
            <div style={{ background: '#f9fafb', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>
                Fields (label → maps to canonical value)
              </div>
              {section.fields.map((field, idx) => (
                <FieldRow
                  key={idx}
                  field={field}
                  onChange={(newField) => updateField(idx, newField)}
                  onRemove={() => removeField(idx)}
                />
              ))}
              <button
                type="button"
                onClick={addField}
                style={{
                  fontSize: 13, color: '#3b82f6', background: 'none', border: '1px dashed #93c5fd',
                  borderRadius: 4, padding: '3px 12px', cursor: 'pointer', marginTop: 4,
                }}
              >+ Add field</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

/**
 * JDTemplateBuilderModal
 *
 * Props:
 *   open          boolean
 *   onClose       () => void
 *   onSaved       (template) => void   — called with saved template record
 *   editTemplate  object | null        — if set, pre-fills the form for editing
 */
export default function JDTemplateBuilderModal({ open, onClose, onSaved, editTemplate }) {
  const [name, setName]               = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2F5496');
  const [sections, setSections]       = useState([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  // Initialise / reset when modal opens
  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);

    if (editTemplate) {
      // Pre-fill from existing manual template
      setName(editTemplate.name || '');
      const theme = editTemplate.parsed_theme_json || editTemplate.parsedTheme;
      const color = theme?.primaryColor || '#2F5496';
      setPrimaryColor(color);

      const schemaSections = (editTemplate.parsed_schema_json || editTemplate.parsedSchema)?.sections || [];
      const rebuilt = schemaSections.map((sec) => {
        const fields = sec.cells
          .filter((c) => c.col === 0 || c.col === 2)
          .map((c) => ({
            label:        c.text.replace(/:$/, '').trim(),
            canonicalKey: null, // will be re-derived on save; display is label-only
          }));
        return {
          canonicalKey:   CANONICAL_SECTIONS.find((cs) =>
            sec.sectionTitle && sec.sectionTitle.toLowerCase().includes(cs.label.toLowerCase().split(' ')[0])
          )?.key || 'job_information',
          sectionTitle:   sec.sectionTitle,
          headerColor:    sec.headerColor || color,
          useCustomColor: sec.headerColor && sec.headerColor !== color,
          layoutPattern:  sec.layoutPattern || 'single-column',
          fields,
          enabled: true,
        };
      });
      setSections(rebuilt.length > 0 ? rebuilt : buildDefaultSections(color));
    } else {
      // New template — start with defaults
      setName('');
      setPrimaryColor('#2F5496');
      setSections(buildDefaultSections('#2F5496'));
    }
  }, [open, editTemplate]);

  // Keep section colors in sync when primary changes (unless overridden)
  const handlePrimaryColorChange = (color) => {
    setPrimaryColor(color);
    setSections((prev) =>
      prev.map((s) => (s.useCustomColor ? s : { ...s, headerColor: color })),
    );
  };

  const updateSection = (idx, updated) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? updated : s)));
  };

  const handleSave = async () => {
    setError('');
    const activeSections = sections.filter((s) => s.enabled);
    if (!name.trim()) return setError('Template name is required.');
    if (activeSections.length === 0) return setError('At least one section must be enabled.');

    const payload = {
      name: name.trim(),
      primaryColor,
      sections: activeSections.map((s) => ({
        sectionTitle:  s.sectionTitle,
        canonicalKey:  s.canonicalKey,
        headerColor:   s.useCustomColor ? s.headerColor : primaryColor,
        layoutPattern: s.layoutPattern,
        fields: s.canonicalKey === 'job_information' ? s.fields : [],
      })),
    };

    setSaving(true);
    try {
      let saved;
      if (editTemplate?.id) {
        saved = await updateManualTemplate(editTemplate.id, payload);
      } else {
        saved = await createManualTemplate(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: 680, maxWidth: '95vw',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {editTemplate ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}
          >×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Template basics */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Template Name
              </label>
              <input
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 6,
                  border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box',
                }}
                placeholder="e.g. RAK Properties Template"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Primary Header Color
              </label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handlePrimaryColorChange(e.target.value)}
                style={{ width: 60, height: 38, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Sections */}
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>
            Sections (uncheck "Include" to hide a section from generated JDs)
          </div>
          {sections.map((sec, idx) => (
            <SectionRow
              key={idx}
              section={sec}
              primaryColor={primaryColor}
              onUpdate={(updated) => updateSection(idx, updated)}
            />
          ))}

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6,
              padding: '10px 14px', color: '#dc2626', fontSize: 13, marginTop: 8,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            type="button" onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: 6, border: '1px solid #d1d5db',
              background: '#fff', cursor: 'pointer', fontSize: 14,
            }}
          >Cancel</button>
          <button
            type="button" onClick={handleSave} disabled={saving}
            style={{
              padding: '8px 24px', borderRadius: 6, border: 'none',
              background: saving ? '#93c5fd' : '#3b82f6', color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >{saving ? 'Saving…' : 'Save Template'}</button>
        </div>
      </div>
    </div>
  );
}
