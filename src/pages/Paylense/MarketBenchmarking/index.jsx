import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tooltip } from 'antd';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  generateBenchmarkReport,
  saveBenchmarkReport,
  fetchBenchmarkReports,
  deleteBenchmarkReport,
  fetchFilters,
  fetchGradeUploads,
} from '../service';
import GradeReport from './GradeReport';
import FilterForm, { defaultValues } from './FilterForm';
import './index.css';

// ── Small shared components ──────────────────────────────────────────────────

function StatusBadge({ value }) {
  if (!value) return null;
  const map = { 'At Risk': 'bmr-badge--risk', 'Below Market': 'bmr-badge--risk', 'Good': 'bmr-badge--good', 'Above Market': 'bmr-badge--above', 'Strong': 'bmr-badge--strong' };
  return <span className={`bmr-badge ${map[value] || ''}`}>{value}</span>;
}

function VariancePct({ value }) {
  if (value === null || value === undefined) return <span>—</span>;
  const n = Number(value);
  return <span className={n > 0 ? 'bmr-var--pos' : n < 0 ? 'bmr-var--neg' : ''}>{n > 0 ? '+' : ''}{n}%</span>;
}

function DonutChart({ distribution }) {
  const { below_p25 = 0, p25_to_p50 = 0, p50_to_p75 = 0, above_p75 = 0, total = 1 } = distribution || {};
  const safe = total || 1;
  const segments = [
    { pct: (below_p25  / safe) * 100, color: '#ef4444', label: 'Below P25 (At Risk)', count: below_p25  },
    { pct: (p25_to_p50 / safe) * 100, color: '#f59e0b', label: 'P25 – P50',           count: p25_to_p50 },
    { pct: (p50_to_p75 / safe) * 100, color: '#3b82f6', label: 'P50 – P75',           count: p50_to_p75 },
    { pct: (above_p75  / safe) * 100, color: '#10b981', label: 'Above P75 (Lead)',     count: above_p75  },
  ];
  const R = 52; const cx = 70; const cy = 70; const stroke = 22;
  const circ = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="bmr-donut-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.6s ease' }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 7} textAnchor="middle" className="bmr-donut-total">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="bmr-donut-label">Total Roles</text>
      </svg>
      <div className="bmr-donut-legend">
        {segments.map((s, i) => (
          <div key={i} className="bmr-donut-leg-item">
            <span className="bmr-donut-leg-dot" style={{ background: s.color }} />
            <span className="bmr-donut-leg-text">{s.label}</span>
            <span className="bmr-donut-leg-pct">{s.count} ({Math.round(s.pct)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketPositionChart({ gradePositions }) {
  if (!gradePositions?.length) return <div className="bmr-empty-chart">No grade data available</div>;
  const allVals = gradePositions.flatMap(r => [r.p25, r.p50, r.p75, r.p90].filter(Boolean));
  const minVal  = Math.min(...allVals) * 0.85;
  const maxVal  = Math.max(...allVals) * 1.05;
  const range   = maxVal - minVal || 1;
  const chartH = 200; const chartW = 480; const padL = 60; const padB = 30; const padT = 20;
  const xStep = gradePositions.length > 1 ? (chartW - padL - 40) / (gradePositions.length - 1) : chartW / 2;
  const toY = (v) => padT + chartH - ((v - minVal) / range) * chartH;
  const toX = (i) => padL + i * xStep;
  const lineFor = (key, color, dashed = false) => {
    const d = gradePositions.map((r, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(r[key])}`).join(' ');
    return <path d={d} fill="none" stroke={color} strokeWidth={dashed ? 1.5 : 2} strokeDasharray={dashed ? '5 3' : undefined} opacity={dashed ? 0.6 : 1} />;
  };
  return (
    <div className="bmr-chart-outer">
      <svg width="100%" viewBox={`0 0 ${chartW + 20} ${chartH + padT + padB + 10}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const v = minVal + f * range; const y = toY(v);
          return <g key={f}><line x1={padL - 5} y1={y} x2={chartW + 10} y2={y} stroke="#e5e7eb" strokeWidth={1} /><text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{v >= 1000 ? `${Math.round(v / 1000)}K` : Math.round(v)}</text></g>;
        })}
        {lineFor('p25', '#94a3b8', true)}
        {lineFor('p75', '#94a3b8', true)}
        {lineFor('p50', '#3b82f6')}
        {gradePositions.map((r, i) => {
          const prev = gradePositions[i - 1];
          const pct  = prev ? Math.round(((r.p50 - prev.p50) / prev.p50) * 100) : null;
          return (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(r.p50)} r={5} fill="#3b82f6" />
              {pct !== null && (
                <text x={(toX(i) + toX(i - 1)) / 2} y={toY((r.p50 + prev.p50) / 2) - 10}
                  textAnchor="middle" fontSize="10" fill={pct >= 0 ? '#10b981' : '#ef4444'} fontWeight="600">
                  {pct >= 0 ? '+' : ''}{pct}%
                </text>
              )}
            </g>
          );
        })}
        {gradePositions.map((r, i) => (
          <text key={i} x={toX(i)} y={chartH + padT + padB - 2} textAnchor="middle" fontSize="11" fill="#6b7280">{r.grade}</text>
        ))}
      </svg>
      <div className="bmr-chart-legend">
        <span><span className="bmr-leg-line" style={{ background: '#94a3b8', opacity: 0.6 }} />P25</span>
        <span><span className="bmr-leg-line" style={{ background: '#3b82f6' }} />P50 (Market)</span>
        <span><span className="bmr-leg-line" style={{ background: '#94a3b8', opacity: 0.6 }} />P75</span>
        <span><span className="bmr-leg-dot" style={{ background: '#10b981' }} />Your P50</span>
      </div>
    </div>
  );
}

// ── Benchmark AI Chat popup ──────────────────────────────────────────────────

const _raw = import.meta.env.VITE_API_URL || '';
const CHAT_API_BASE = _raw && !/^https?:\/\//i.test(_raw) ? `https://${_raw}` : _raw;

const BMR_SUGGESTIONS = [
  'What does this benchmark tell me about pay competitiveness?',
  'Which grades are most at risk of attrition?',
  'Suggest a pay adjustment strategy for below-market grades',
  'How should I interpret the pay spread heatmap?',
];

function BenchmarkAIChat({ open, onClose, reportContext }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [model,     setModel]     = useState('claude-sonnet-4-6');
  const [modelOpen, setModelOpen] = useState(false);
  const listRef  = useRef(null);
  const inputRef = useRef(null);

  // Build a compact system context from the report data
  const systemPrompt = reportContext
    ? `You are PayLens AI, a compensation benchmarking expert. The user is viewing a benchmark report with the following summary:
Jobs Benchmarked: ${reportContext.summary?.jobs_benchmarked ?? '—'}
Grades Covered: ${reportContext.summary?.grades_covered ?? '—'} (${reportContext.summary?.grade_range ?? ''})
Companies in Market: ${reportContext.summary?.companies_in_market ?? '—'}
Incumbents Analyzed: ${reportContext.summary?.incumbents_analyzed ?? '—'}
Market Confidence: ${reportContext.summary?.market_confidence ?? '—'}
Active Filters: ${(reportContext.active_filters || []).join(', ') || 'None'}
Grade Positions: ${JSON.stringify((reportContext.grade_positions || []).slice(0, 8))}
Answer concisely and focus on actionable compensation insights.`
    : 'You are PayLens AI, a compensation benchmarking expert. Answer concisely and focus on actionable insights.';

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (open) { setMessages([]); setInput(''); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  useEffect(() => {
    if (!modelOpen) return;
    const h = (e) => { if (!e.target.closest('.bmr-chat-model-wrap')) setModelOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [modelOpen]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { id: Date.now(), role: 'user', content: text };
    const history = [...messages, { role: 'user', content: text }];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${CHAT_API_BASE}/ai/chat-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          selected_model: model,
          system_prompt: systemPrompt,
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => 'Request failed');
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `Error: ${err}` }]);
        return;
      }

      const aiId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder('utf-8');
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = dec.decode(value, { stream: !done });
          if (chunk) setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: m.content + chunk } : m));
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: err.message || 'Something went wrong.' }]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const MODELS = [
    { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', dot: 'claude' },
    { id: 'claude-opus-4-7',   label: 'Opus 4.7',   dot: 'claude' },
    { id: 'claude-haiku-4-5',  label: 'Haiku 4.5',  dot: 'claude' },
    { id: 'gpt-4o',            label: 'GPT-4o',      dot: 'openai' },
  ];
  const modelLabel = MODELS.find(m => m.id === model)?.label || model;
  const isClaudeModel = model.startsWith('claude-');

  return (
    <div className="bmr-chat-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bmr-chat-popup">

        {/* Header */}
        <div className="bmr-chat-header">
          <div className="bmr-chat-header-left">
            <div className="bmr-chat-avatar-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <p className="bmr-chat-title">PayLens AI Assistant</p>
              <p className="bmr-chat-sub">Benchmark-aware compensation insights</p>
            </div>
          </div>
          <div className="bmr-chat-header-right">
            <span className={`bmr-chat-model-dot ${isClaudeModel ? 'bmr-chat-dot--claude' : 'bmr-chat-dot--openai'}`} />
            <span className="bmr-chat-model-name">{modelLabel}</span>
            <button className="bmr-chat-close" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="bmr-chat-messages" ref={listRef}>
          {messages.length === 0 ? (
            <div className="bmr-chat-empty">
              <div className="bmr-chat-empty-ring" />
              <div className="bmr-chat-empty-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <p className="bmr-chat-empty-title">Ask about this benchmark</p>
              <p className="bmr-chat-empty-sub">I have full context of the current report</p>
              <div className="bmr-chat-suggestions">
                {BMR_SUGGESTIONS.map((s, i) => (
                  <button key={i} className="bmr-chat-suggestion" onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                    <span className="bmr-chat-sug-arrow">→</span>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(m => m.role === 'assistant' ? (
              <div key={m.id} className="bmr-chat-row bmr-chat-row--ai">
                <div className="bmr-chat-ai-avatar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="bmr-chat-bubble bmr-chat-bubble--ai">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}
                    components={{
                      p:    ({node,...p}) => <p className="aichat-md-p" {...p}/>,
                      ul:   ({node,...p}) => <ul className="aichat-md-ul" {...p}/>,
                      li:   ({node,...p}) => <li className="aichat-md-li" {...p}/>,
                      code: ({node,inline,...p}) => inline
                        ? <code className="aichat-md-code-inline" {...p}/>
                        : <code className="aichat-md-code-block" {...p}/>,
                    }}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div key={m.id} className="bmr-chat-row bmr-chat-row--user">
                <div className="bmr-chat-bubble bmr-chat-bubble--user">{m.content}</div>
                <div className="bmr-chat-user-avatar">AI</div>
              </div>
            ))
          )}

          {sending && (
            <div className="bmr-chat-row bmr-chat-row--ai">
              <div className="bmr-chat-ai-avatar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="bmr-chat-bubble bmr-chat-bubble--ai bmr-chat-typing">
                <span className="aichat-dot"/><span className="aichat-dot"/><span className="aichat-dot"/>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form className="bmr-chat-input-area" onSubmit={handleSend}>
          <div className="bmr-chat-input-box">
            <input
              ref={inputRef}
              className="bmr-chat-input"
              placeholder="Ask about this benchmark report…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              disabled={sending}
            />
            <div className="bmr-chat-input-actions">
              {/* Model picker */}
              <div className="bmr-chat-model-wrap">
                <button type="button" className="bmr-chat-model-btn" onClick={() => setModelOpen(v => !v)}>
                  <span className={`bmr-chat-model-dot ${isClaudeModel ? 'bmr-chat-dot--claude' : 'bmr-chat-dot--openai'}`} />
                  {modelLabel}
                </button>
                {modelOpen && (
                  <div className="bmr-chat-model-menu">
                    {MODELS.map(m => (
                      <button key={m.id} type="button"
                        className={`bmr-chat-model-item${model === m.id ? ' active' : ''}`}
                        onClick={() => { setModel(m.id); setModelOpen(false); }}>
                        <span className={`bmr-chat-model-dot ${m.dot === 'claude' ? 'bmr-chat-dot--claude' : 'bmr-chat-dot--openai'}`} />
                        {m.label}
                        {model === m.id && <span className="bmr-chat-model-check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Send */}
              <button type="submit" className="bmr-chat-send" disabled={sending || !input.trim()}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
          <p className="bmr-chat-disclaimer">AI can make mistakes. Verify important compensation decisions.</p>
        </form>
      </div>
    </div>
  );
}

// ── Pay Spread Heatmap ───────────────────────────────────────────────────────

function PaySpreadHeatmap({ data = [] }) {
  if (!data.length) return null;

  const grades    = [...new Set(data.map(d => d.grade))].sort((a, b) => Number(a) - Number(b));
  const functions = [...new Set(data.map(d => d.job_function))].sort();

  const cvOf = (grade, fn) => data.find(d => d.grade === grade && d.job_function === fn)?.cv ?? null;

  const cellColor = (cv) => {
    if (cv === null) return { bg: '#f9fafb', text: '#9ca3af' };
    if (cv < 30)    return { bg: '#dcfce7', text: '#15803d' };  // low  — green
    if (cv < 50)    return { bg: '#fef9c3', text: '#a16207' };  // med  — yellow
    return           { bg: '#fee2e2', text: '#b91c1c' };         // high — red
  };

  return (
    <div className="bmr-card bmr-heatmap-card">
      <div className="bmr-card-header">
        <div>
          <h3 className="bmr-card-title">Pay Spread Heatmap (Coefficient of Variation)</h3>
          <p className="bmr-card-sub">CV = (P75 – P25) / P50. Higher values indicate wider pay spread.</p>
        </div>
        <div className="bmr-heatmap-legend">
          <span className="bmr-hm-leg"><span style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }} />Low (&lt;30%)</span>
          <span className="bmr-hm-leg"><span style={{ background: '#fef9c3', border: '1px solid #fde68a' }} />Medium (30–50%)</span>
          <span className="bmr-hm-leg"><span style={{ background: '#fee2e2', border: '1px solid #fecaca' }} />High (&gt;50%)</span>
        </div>
      </div>
      <div className="bmr-heatmap-wrap">
        <table className="bmr-heatmap-table">
          <thead>
            <tr>
              <th className="bmr-hm-grade-head">Grade</th>
              {functions.map(fn => <th key={fn} className="bmr-hm-fn-head">{fn}</th>)}
            </tr>
          </thead>
          <tbody>
            {grades.map((grade, gi) => (
              <tr key={grade} style={{ animation: `fadeUp 0.3s ease ${gi * 0.04}s both` }}>
                <td className="bmr-hm-grade-cell">Level {grade}</td>
                {functions.map(fn => {
                  const cv = cvOf(grade, fn);
                  const { bg, text } = cellColor(cv);
                  return (
                    <td key={fn} className="bmr-hm-cell" style={{ background: bg, color: text }}>
                      {cv !== null ? `${cv}%` : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Animated Generating Screen ───────────────────────────────────────────────

const GEN_STEPS_BENCHMARK = [
  { label: 'Validating dataset & filters',       icon: '🔍' },
  { label: 'Querying market benchmark data',      icon: '📊' },
  { label: 'Computing grade position analysis',   icon: '📐' },
  { label: 'Calculating variance & distribution', icon: '📈' },
  { label: 'Generating AI insight summary',       icon: '🤖' },
];

const GEN_STEPS_GRADE = [
  { label: 'Validating grade dataset',            icon: '🔍' },
  { label: 'Loading compensation sheets',         icon: '📋' },
  { label: 'Computing percentile bands',          icon: '📐' },
  { label: 'Calculating compensation mix',        icon: '📊' },
  { label: 'Building overall compensation report',icon: '📈' },
];

function GeneratingScreen({ mode = 'benchmark' }) {
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps,  setDoneSteps]  = useState([]);

  const steps = mode === 'grade' ? GEN_STEPS_GRADE : GEN_STEPS_BENCHMARK;
  const title = mode === 'grade' ? 'Generating Grade Report' : 'Generating Benchmark Report';
  const sub   = mode === 'grade' ? 'Building your Overall Compensation Report…' : 'PayLens AI is analysing your market data…';

  useEffect(() => {
    const timers = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i), i * 900));
      if (i > 0) timers.push(setTimeout(() => setDoneSteps(d => [...d, i - 1]), i * 900));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="bmr-generating">
      <div className="bmr-gen-orb-wrap">
        <div className="bmr-gen-orb" />
        <div className="bmr-gen-spinner" />
        <div className="bmr-gen-spinner-2" />
        <div className="bmr-gen-orb-inner">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" className="bmr-gen-icon">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
      </div>

      <div className="bmr-gen-content">
        <h2 className="bmr-gen-title">{title}</h2>
        <p className="bmr-gen-sub">{sub}</p>
        <div className="bmr-gen-dots">
          <div className="bmr-gen-dot" />
          <div className="bmr-gen-dot" />
          <div className="bmr-gen-dot" />
        </div>
      </div>

      <div className="bmr-gen-steps">
        {steps.map((s, i) => {
          const isDone   = doneSteps.includes(i);
          const isActive = activeStep === i && !isDone;
          return (
            <div key={i} className={`bmr-gen-step${isActive ? ' bmr-gen-step--active' : ''}${isDone ? ' bmr-gen-step--done' : ''}`}>
              <div className="bmr-gen-step-icon">{s.icon}</div>
              <span className="bmr-gen-step-label">{s.label}</span>
              {isActive && <div className="bmr-gen-step-spin" />}
              {isDone && (
                <div className="bmr-gen-step-check">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function BenchmarkReportGen({ uploads = [], activeUploadId, filterOptions = {} }) {
  const [filters,        setFilters]       = useState(defaultValues);
  const [modalOpen,      setModalOpen]     = useState(false);
  const [generating,     setGenerating]    = useState(false);
  const [generatingMode, setGeneratingMode]= useState('benchmark');
  const [saving,         setSaving]        = useState(false);
  const [report,        setReport]       = useState(null);
  const [gradeReport,   setGradeReport]  = useState(null);
  const [savedReports,  setSavedReports] = useState([]);
  const [localFilters,  setLocalFilters] = useState({});
  const [gradeUploads,  setGradeUploads] = useState([]);
  const [chatOpen,      setChatOpen]     = useState(false);
  const ctaBtnRef = useRef(null);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  const handleFilterReset = useCallback(() => setFilters(defaultValues), []);

  useEffect(() => {
    if (!activeUploadId) return;
    fetchFilters(activeUploadId).then(setLocalFilters).catch(() => {});
  }, [activeUploadId]);

  useEffect(() => {
    fetchBenchmarkReports().then(setSavedReports).catch(() => {});
    fetchGradeUploads().then(setGradeUploads).catch(() => {});
  }, []);

  // Close modal on Esc
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const buildPayload = useCallback(() => ({
    upload_id:         activeUploadId,
    job_functions:     filters.jobFunctions,
    grades:            filters.grades,
    countries:         filters.countries,
    regions:           filters.regions,
    industries:        filters.industries,
    pay_component:     filters.payComponent || undefined,
    target_percentile: filters.targetPercentile,
    peer_group:        filters.peerGroup,
    year_from:         filters.yearFrom || undefined,
    year_to:           filters.yearTo   || undefined,
    currency:          filters.currency || undefined,
    // advanced (preserved for future)
    company_size_min:  filters.companySizeMin,
    company_size_max:  filters.companySizeMax,
    revenue_min:       filters.revenueMin,
    revenue_max:       filters.revenueMax,
    ownership_type:    filters.ownershipType,
    city:              filters.city || undefined,
    exclude_outliers:  filters.excludeOutliers,
    min_incumbents:    filters.minIncumbents,
    min_companies:     filters.minCompanies,
    data_confidence:   filters.dataConfidence,
    risk_flags:        filters.riskFlags,
    pay_strategy:      filters.payStrategy,
    comparison_type:   filters.comparisonType,
  }), [activeUploadId, filters]);

  const handleGenerate = async () => {
    setModalOpen(false);
    setGeneratingMode(filters.gradeDataset ? 'grade' : 'benchmark');
    setGenerating(true);
    const minDelay = new Promise(resolve => setTimeout(resolve, 4500));
    try {
      let result;
      if (filters.gradeDataset) {
        const { generateGradeReport } = await import('../service');
        const [data] = await Promise.all([
          generateGradeReport({
            grade_upload_id:   filters.gradeDataset,
            job_functions:     filters.jobFunctions,
            grades:            filters.grades,
            countries:         filters.countries,
            regions:           filters.regions,
            industries:        filters.industries,
            pay_component:     filters.payComponent || undefined,
            target_percentile: filters.targetPercentile,
            peer_group:        filters.peerGroup,
            year_from:         filters.yearFrom || undefined,
            year_to:           filters.yearTo   || undefined,
          }),
          minDelay,
        ]);
        const selectedUpload = gradeUploads.find(u => u.id === filters.gradeDataset);
        result = () => { setGradeReport({ ...data, _datasetName: selectedUpload?.name || '' }); setReport(null); };
      } else {
        if (!activeUploadId) { toast.error('Please select a dataset first'); setGenerating(false); return; }
        const [data] = await Promise.all([generateBenchmarkReport(buildPayload()), minDelay]);
        result = () => { setReport(data); setGradeReport(null); };
      }
      result();
    } catch (err) {
      await minDelay;
      toast.error(err?.response?.data?.error || 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const name = `Benchmark Report – ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      await saveBenchmarkReport({ uploadId: activeUploadId, name, filters: report.filters_applied, reportData: report, aiSummary: report.ai_insight?.competitive_position || null });
      toast.success('Report saved');
      const updated = await fetchBenchmarkReports();
      setSavedReports(updated);
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteSaved = async (id) => {
    try { await deleteBenchmarkReport(id); setSavedReports(prev => prev.filter(r => r.id !== id)); }
    catch { toast.error('Delete failed'); }
  };

  // CTA ripple effect
  const handleCtaClick = (e) => {
    const btn = ctaBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'bmr-cta-ripple';
    ripple.style.left = `${e.clientX - rect.left - 5}px`;
    ripple.style.top  = `${e.clientY - rect.top - 5}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    setModalOpen(true);
  };

  // Grade summary rows — market_p50 from BE is already the chosen target percentile column
  const gradePositions   = report?.grade_positions || [];
  const gradeSummaryRows = gradePositions.map((r) => {
    const yourP50 = r.market_p50 || r.p50 || 0;
    const mktP50  = r.p50 || r.market_p50 || 0;
    const varAed  = yourP50 && mktP50 ? yourP50 - mktP50 : null;
    const varPct  = mktP50 ? Math.round(((yourP50 - mktP50) / mktP50) * 100) : null;
    const status  = varPct === null ? null : varPct > 10 ? 'Strong' : varPct > 0 ? 'Good' : varPct > -10 ? 'At Risk' : 'Below Market';
    return { ...r, your_p50: yourP50, var_aed: varAed, var_pct: varPct, status, position: varPct === null ? null : varPct >= 0 ? 'Above Market' : 'Below Market' };
  });
  const totalAvgP50  = gradeSummaryRows.length ? Math.round(gradeSummaryRows.reduce((s, r) => s + (r.your_p50 || 0), 0) / gradeSummaryRows.length) : null;
  const totalMktP50  = gradeSummaryRows.length ? Math.round(gradeSummaryRows.reduce((s, r) => s + (r.market_p50 || 0), 0) / gradeSummaryRows.length) : null;
  const totalVarAed  = totalAvgP50 && totalMktP50 ? totalAvgP50 - totalMktP50 : null;
  const totalVarPct  = totalMktP50 ? Math.round(((totalAvgP50 - totalMktP50) / totalMktP50) * 100) : null;
  const ai           = report?.ai_insight;
  const overallPct   = ai?.overall_pct ?? totalVarPct;

  // ── Generating overlay ──────────────────────────────────────────────────────
  if (generating) return <GeneratingScreen mode={generatingMode} />;

  return (
    <div className="bmr-root">

      {/* ── FILTER MODAL ──────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="bmr-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="bmr-modal">
            <div className="bmr-modal-header">
              <div className="bmr-modal-header-left">
                <div className="bmr-modal-header-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                </div>
                <div>
                  <p className="bmr-modal-title">Configure Benchmark Report</p>
                  <p className="bmr-modal-sub">Set your filters to generate an AI-powered market analysis</p>
                </div>
              </div>
              <button className="bmr-modal-close" onClick={() => setModalOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <FilterForm
              values={filters}
              onChange={handleFilterChange}
              onReset={handleFilterReset}
              onSubmit={handleGenerate}
              loading={generating}
              filterOptions={localFilters}
              gradeUploads={gradeUploads}
              onClose={() => setModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── GRADE REPORT VIEW ─────────────────────────────────────────────── */}
      {gradeReport && (
        <GradeReport
          report={gradeReport}
          onRegenerate={() => setModalOpen(true)}
          onBack={() => { setGradeReport(null); }}
        />
      )}

      {/* ── LANDING / EMPTY STATE ──────────────────────────────────────────── */}
      {!report && !gradeReport ? (
        <div className="bmr-landing">
          <div className="bmr-orb bmr-orb-1" />
          <div className="bmr-orb bmr-orb-2" />
          <div className="bmr-orb bmr-orb-3" />

          <div className="bmr-landing-content">
            <div className="bmr-landing-icon-wrap">
              <div className="bmr-landing-icon-bg" />
              <div className="bmr-landing-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
            </div>

            <div className="bmr-landing-text">
              <h2 className="bmr-landing-title">Benchmark Report Gen</h2>
              <p className="bmr-landing-sub">
                Generate an AI-powered compensation benchmark report with grade-by-grade market positioning, variance analysis, and strategic insights.
              </p>
            </div>

            <button className="bmr-cta-btn" ref={ctaBtnRef} onClick={handleCtaClick}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Configure &amp; Generate Report
            </button>

            <div className="bmr-landing-pills">
              {[
                { dot: '#f97316', label: 'AI-Powered Insights'       },
                { dot: '#3b82f6', label: 'Grade-Level Analysis'       },
                { dot: '#10b981', label: 'Market Position Tracking'   },
                { dot: '#8b5cf6', label: 'Risk Flag Detection'        },
              ].map((p, i) => (
                <div key={i} className="bmr-landing-pill">
                  <span className="bmr-landing-pill-dot" style={{ background: p.dot }} />
                  {p.label}
                </div>
              ))}
            </div>

            {savedReports.length > 0 && (
              <div className="bmr-saved-list">
                <p className="bmr-saved-list-title">RECENT SAVED REPORTS</p>
                {savedReports.slice(0, 4).map((r) => (
                  <div key={r.id} className="bmr-saved-item">
                    <div>
                      <span className="bmr-saved-item-name">{r.name}</span>
                      <span className="bmr-saved-item-date">{new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="bmr-saved-item-actions">
                      <button className="bmr-saved-load" onClick={async () => {
                        try {
                          const { fetchBenchmarkReportById } = await import('../service');
                          const full = await fetchBenchmarkReportById(r.id);
                          setReport(full.report_data);
                        } catch { toast.error('Failed to load report'); }
                      }}>Load</button>
                      <button className="bmr-saved-del" onClick={() => handleDeleteSaved(r.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : !gradeReport ? (

        /* ── BENCHMARK REPORT VIEW ────────────────────────────────────────── */
        <div className="bmr-report-view">

          {/* No-data warning */}
          {report.summary?.jobs_benchmarked === 0 && (
            <div className="bmr-no-data-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <strong>No data matched your filters.</strong> Try broadening your selection — remove some criteria or choose wider values for grade, country, or industry.
              </div>
              <button className="bmr-af-edit" onClick={() => setModalOpen(true)} style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>Edit Filters</button>
            </div>
          )}

          {/* Report header */}
          <div className="bmr-report-header">
            <div>
              <h2 className="bmr-report-title">
                Benchmark Report Generated
                <span className="bmr-report-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
              </h2>
              <p className="bmr-report-sub">AI-generated insights based on your selected filters and market data.</p>
            </div>
            <div className="bmr-report-actions">
              <button className="bmr-action-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Share
              </button>
              <button className="bmr-action-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </button>
              <button className="bmr-action-btn" onClick={handleSave} disabled={saving}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="bmr-action-btn bmr-action-btn--primary" onClick={() => { setModalOpen(true); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Regenerate with AI
              </button>
            </div>
          </div>

          {/* Active filter tags */}
          {report.active_filters?.length > 0 && (
            <div className="bmr-active-filters">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span className="bmr-af-label">Active Filters</span>
              {report.active_filters.slice(0, 8).map((f, i) => <span key={i} className="bmr-af-tag">{f}</span>)}
              {report.active_filters.length > 8 && <span className="bmr-af-more">+{report.active_filters.length - 8} more</span>}
              <button className="bmr-af-edit" onClick={() => setModalOpen(true)}>✏ Edit Filters</button>
            </div>
          )}

          {/* Stat cards */}
          <div className="bmr-stat-cards">
            {[
              { label: 'Jobs Benchmarked',   value: report.summary?.jobs_benchmarked,                               sub: '+8 vs last run',         icon: '💼' },
              { label: 'Grades Covered',      value: report.summary?.grades_covered,                                 sub: report.summary?.grade_range, icon: '📊' },
              { label: 'Companies in Market', value: report.summary?.companies_in_market,                            sub: '≥ 5 companies filter',   icon: '🏢' },
              { label: 'Incumbents Analyzed', value: report.summary?.incumbents_analyzed?.toLocaleString(),           sub: '≥ 30 incumbents filter', icon: '👥' },
              { label: 'Market Confidence',   value: report.summary?.market_confidence, sub: report.summary?.market_confidence === 'High' ? 'Strong data quality' : 'Check sample sizes', icon: '🛡', highlight: report.summary?.market_confidence === 'High' ? 'green' : report.summary?.market_confidence === 'Medium' ? 'orange' : 'red' },
              { label: 'Overall Position',    value: overallPct !== null ? `${overallPct > 0 ? '+' : ''}${overallPct}%` : '—', sub: `vs ${filters.targetPercentile || 'P50'} target`, icon: '🎯', highlight: overallPct > 0 ? 'green' : overallPct < 0 ? 'red' : 'neutral' },
            ].map((card, i) => (
              <div key={i} className="bmr-stat-card">
                <div className="bmr-stat-card-top">
                  <span className="bmr-stat-icon">{card.icon}</span>
                  <span className={`bmr-stat-value${card.highlight ? ` bmr-stat-value--${card.highlight}` : ''}`}>{card.value ?? '—'}</span>
                </div>
                <div className="bmr-stat-label">{card.label}</div>
                {card.sub && <div className="bmr-stat-sub">{card.sub}</div>}
              </div>
            ))}
          </div>

          {/* Chart + AI */}
          <div className="bmr-mid-grid">
            <div className="bmr-card">
              <div className="bmr-card-header">
                <div>
                  <h3 className="bmr-card-title">Market Position Overview</h3>
                  <p className="bmr-card-sub">Company position vs market by grade (P50)</p>
                </div>
                <Tooltip title="Shows grade-by-grade P25/P50/P75 lines with variance percentages"><span className="bmr-info-icon">ⓘ</span></Tooltip>
              </div>
              <MarketPositionChart gradePositions={gradePositions} />
              {overallPct !== null && (
                <div className={`bmr-chart-banner${overallPct >= 0 ? ' bmr-chart-banner--pos' : ' bmr-chart-banner--neg'}`}>
                  {overallPct >= 0 ? '✓' : '⚠'} You are {overallPct >= 0 ? '+' : ''}{overallPct}% {overallPct >= 0 ? 'above' : 'below'} market (P50) on average.
                  <button className="bmr-chart-banner-btn">View Detailed Chart</button>
                </div>
              )}
            </div>

            <div className="bmr-card bmr-ai-card">
              <div className="bmr-card-header">
                <div>
                  <h3 className="bmr-card-title"><span className="bmr-ai-icon">AI</span> AI Insight Summary</h3>
                  <p className="bmr-card-sub">Generated by PayLens AI</p>
                </div>
              </div>
              {ai ? (
                <div className="bmr-ai-insights">
                  {[
                    { key: 'competitive_position', label: 'Competitive Position', icon: '🏆', color: '#10b981' },
                    { key: 'opportunity',           label: 'Opportunity',          icon: '⚠',  color: '#f59e0b' },
                    { key: 'strength',              label: 'Strength',             icon: '💪',  color: '#3b82f6' },
                    { key: 'watch_out',             label: 'Watch Out',            icon: '👁',  color: '#8b5cf6' },
                  ].map(({ key, label, icon, color }) => ai[key] ? (
                    <div key={key} className="bmr-ai-insight-item">
                      <div className="bmr-ai-insight-header" style={{ color }}><span>{icon}</span><span className="bmr-ai-insight-label">{label}</span></div>
                      <p className="bmr-ai-insight-text">{ai[key]}</p>
                    </div>
                  ) : null)}
                </div>
              ) : (
                <div className="bmr-ai-placeholder"><p>AI insight unavailable. Regenerate to include AI analysis.</p></div>
              )}
              <button className="bmr-view-full-ai">View Full AI Analysis →</button>
            </div>
          </div>

          {/* Bottom grid */}
          <div className="bmr-bottom-grid">
            {/* Grade summary table */}
            <div className="bmr-card">
              <div className="bmr-card-header">
                <h3 className="bmr-card-title">Benchmark Summary by Grade</h3>
                <Tooltip title="P50 comparison per grade vs market median"><span className="bmr-info-icon">ⓘ</span></Tooltip>
              </div>
              <div className="bmr-table-wrap">
                <table className="bmr-table">
                  <thead>
                    <tr><th>Grade</th><th>Your P50</th><th>Market P50</th><th>Variance</th><th>Variance (%)</th><th>Position vs P50</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {gradeSummaryRows.map((r, i) => (
                      <tr key={i}>
                        <td className="bmr-grade-cell">{r.grade}</td>
                        <td>{r.your_p50?.toLocaleString() ?? '—'}</td>
                        <td>{r.market_p50?.toLocaleString() ?? '—'}</td>
                        <td>{r.var_aed !== null ? <span className={r.var_aed >= 0 ? 'bmr-var--pos' : 'bmr-var--neg'}>{r.var_aed >= 0 ? '+' : ''}{Math.round(r.var_aed).toLocaleString()}</span> : '—'}</td>
                        <td><VariancePct value={r.var_pct} /></td>
                        <td className="bmr-pos-cell">{r.position ?? '—'}</td>
                        <td><StatusBadge value={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                  {gradeSummaryRows.length > 0 && (
                    <tfoot>
                      <tr className="bmr-total-row">
                        <td>Total / Avg</td>
                        <td>{totalAvgP50?.toLocaleString() ?? '—'}</td>
                        <td>{totalMktP50?.toLocaleString() ?? '—'}</td>
                        <td>{totalVarAed !== null ? <span className={totalVarAed >= 0 ? 'bmr-var--pos' : 'bmr-var--neg'}>{totalVarAed >= 0 ? '+' : ''}{totalVarAed.toLocaleString()}</span> : '—'}</td>
                        <td><VariancePct value={totalVarPct} /></td>
                        <td>{totalVarPct >= 0 ? 'Above P50' : 'Below P50'}</td>
                        <td><StatusBadge value={totalVarPct > 0 ? 'Good' : 'At Risk'} /></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {report.summary?.jobs_benchmarked > 0 && (
                <button className="bmr-view-all-link">View all jobs ({report.summary.jobs_benchmarked}) →</button>
              )}
            </div>

            {/* Donut distribution */}
            <div className="bmr-card">
              <div className="bmr-card-header">
                <h3 className="bmr-card-title">Market Position Distribution</h3>
                <Tooltip title="Distribution of roles by market position bucket"><span className="bmr-info-icon">ⓘ</span></Tooltip>
              </div>
              <p className="bmr-card-sub" style={{ marginBottom: 12 }}>Distribution of roles by market position</p>
              <DonutChart distribution={report.distribution} />
              <button className="bmr-view-all-link">View by job function →</button>
            </div>

            {/* Top variance */}
            <div className="bmr-card">
              <div className="bmr-card-header">
                <h3 className="bmr-card-title">Top Variance (vs Market P50)</h3>
                <button className="bmr-view-all-link" style={{ margin: 0 }}>View All</button>
              </div>
              <div className="bmr-variance-list">
                {(report.top_variance_jobs || []).slice(0, 5).map((j, i) => {
                  const ref  = gradeSummaryRows.find(r => r.grade === j.grade);
                  const mkt  = ref?.market_p50 || j.market_p50;
                  const your = j.market_p50;
                  const vAed = mkt && your ? Math.round(your - mkt) : null;
                  const vPct = mkt && your ? Math.round(((your - mkt) / mkt) * 100) : null;
                  return (
                    <div key={i} className="bmr-variance-row">
                      <div className="bmr-variance-job">
                        <span className="bmr-variance-title">{j.job_name}</span>
                        <span className="bmr-variance-meta">{j.grade}</span>
                      </div>
                      <div className="bmr-variance-nums">
                        <VariancePct value={vPct} />
                        {vAed !== null && <span className={`bmr-variance-aed ${vAed >= 0 ? 'bmr-var--pos' : 'bmr-var--neg'}`}>{vAed >= 0 ? '+' : ''}{vAed.toLocaleString()}</span>}
                      </div>
                      <StatusBadge value={vPct === null ? null : vPct > 0 ? 'Above Market' : 'Below Market'} />
                    </div>
                  );
                })}
                {!report.top_variance_jobs?.length && (
                  <p style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No job data available.</p>
                )}
              </div>
              <button className="bmr-view-all-link">View all variances →</button>
            </div>
          </div>

          {/* Pay Spread Heatmap */}
          {report.pay_spread_heatmap?.length > 0 && (
            <PaySpreadHeatmap data={report.pay_spread_heatmap} />
          )}

          {/* AI ask banner */}
          <div className="bmr-ai-banner">
            <div className="bmr-ai-banner-left">
              <span className="bmr-ai-banner-icon">AI</span>
              <div>
                <p className="bmr-ai-banner-title">Need recommendations?</p>
                <p className="bmr-ai-banner-sub">Ask PayLens AI for tailored compensation recommendations based on this benchmark.</p>
              </div>
            </div>
            <button className="bmr-ask-ai-btn" onClick={() => setChatOpen(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Ask AI Assistant
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* AI Chat popup */}
          <BenchmarkAIChat
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            reportContext={report}
          />
        </div>
      ) : null}

      {/* Floating Edit Filters button when benchmark report is shown */}
      {report && !gradeReport && (
        <button className="bmr-edit-filters-fab" onClick={() => setModalOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Edit Filters
        </button>
      )}
    </div>
  );
}
