import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const raw = import.meta.env.VITE_API_URL || '';
const API_BASE = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;

const MODEL_GROUPS = [
  {
    label: 'Claude',
    models: [
      { id: 'claude-opus-4-6', name: 'Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6' },
      { id: 'claude-haiku-4-5', name: 'Haiku 4.5' },
    ],
  },
  {
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
  },
];

const SUGGESTIONS = [
  'Draft a job description for a Chief Financial Officer',
  'Summarize HR consulting best practices',
  'Compare competency frameworks for senior leaders',
  'Outline a 90-day onboarding plan',
];

function getModelLabel(modelId) {
  for (const group of MODEL_GROUPS) {
    const found = group.models.find((m) => m.id === modelId);
    if (found) return found.name;
  }
  return modelId;
}

function isClaudeId(modelId) {
  return modelId.startsWith('claude-');
}

function AIChat() {
  const { user, logout } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // OneDrive file picker
  const [odPickerOpen, setOdPickerOpen]   = useState(false);
  const [odFiles, setOdFiles]             = useState([]);
  const [odLoading, setOdLoading]         = useState(false);
  const [odBreadcrumb, setOdBreadcrumb]   = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]); // [{id, name}]

  const userInitial = (user?.name || 'U')[0].toUpperCase();

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Close model picker on outside click
  useEffect(() => {
    if (!modelPickerOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.aichat-model-container')) setModelPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelPickerOpen]);

  // ── OneDrive picker helpers ───────────────────────────────────────────────
  const loadOdFiles = (folderId, folderName) => {
    setOdLoading(true);
    const params = folderId ? { folderId } : {};
    api.get('/connect/onedrive/files', { params })
      .then((r) => {
        setOdFiles(r.data);
        if (folderId && folderName) {
          setOdBreadcrumb((prev) => [...prev, { id: folderId, name: folderName }]);
        }
      })
      .catch(() => setOdFiles([]))
      .finally(() => setOdLoading(false));
  };

  const openOdPicker = () => {
    setOdPickerOpen(true);
    setOdFiles([]);
    setOdBreadcrumb([]);
    loadOdFiles(null);
  };

  const odGoBack = () => {
    const prev = odBreadcrumb.slice(0, -1);
    setOdBreadcrumb(prev);
    const parentId = prev.length > 0 ? prev[prev.length - 1].id : null;
    loadOdFiles(parentId, null);
  };

  const toggleAttach = (item) => {
    if (item.folder) { loadOdFiles(item.id, item.name); return; }
    setAttachedFiles((prev) =>
      prev.find((f) => f.id === item.id)
        ? prev.filter((f) => f.id !== item.id)
        : [...prev, { id: item.id, name: item.name }]
    );
  };

  const removeAttached = (id) => setAttachedFiles((prev) => prev.filter((f) => f.id !== id));

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const fileLabel = attachedFiles.length > 0
      ? ` [Attached: ${attachedFiles.map((f) => f.name).join(', ')}]`
      : '';
    const userMsg = { id: Date.now(), role: 'user', content: text + fileLabel };
    const currentMessages = [...messages, { role: 'user', content: text }];

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const historyForApi = currentMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE}/ai/chat-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: historyForApi,
          selected_model: selectedModel,
          onedrive_file_ids: attachedFiles.map((f) => f.id),
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Sorry, something went wrong while contacting the AI service.';
        try {
          const rawText = await response.text();
          if (rawText) {
            try {
              const data = JSON.parse(rawText);
              if (typeof data.error === 'string') errorMessage = data.error;
            } catch {
              errorMessage = rawText;
            }
          }
        } catch { /* ignore */ }

        if (errorMessage === 'Token expired') {
          logout();
          errorMessage = 'Your session has expired. Please sign in again.';
        }

        setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: errorMessage }]);
        return;
      }

      if (!response.body) throw new Error('No response body from AI stream');

      const aiMsgId = Date.now() + 1;
      setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          const chunk = decoder.decode(result.value, { stream: !done });
          if (chunk) {
            setMessages((prev) =>
              prev.map((m) => m.id === aiMsgId ? { ...m, content: (m.content || '') + chunk } : m)
            );
          }
        }
      }
    } catch (err) {
      console.error('AI chat error', err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: err.message || 'Something went wrong.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSuggestion = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="aichat-v2">
      {/* Ambient background blobs */}
      <div className="aichat-blob aichat-blob-1" />
      <div className="aichat-blob aichat-blob-2" />
      <div className="aichat-blob aichat-blob-3" />

      {/* Top header bar */}
      <header className="aichat-header">
        <div className="aichat-header-left">
          <div className="aichat-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <span className="aichat-header-title">AI Assistant</span>
          </div>
        </div>
        <div className="aichat-header-right">
          <span className="aichat-header-model-badge">
            <span className={`aichat-header-model-dot ${isClaudeId(selectedModel) ? 'dot-claude' : 'dot-openai'}`} />
            {getModelLabel(selectedModel)}
          </span>
        </div>
      </header>

      {/* Messages area */}
      <div className="aichat-messages" ref={listRef}>
        {messages.length === 0 ? (
          <div className="aichat-empty">
            <div className="aichat-empty-ring" />
            <div className="aichat-empty-avatar">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="aichat-empty-greeting">
              Hello, <span className="aichat-empty-name">{user?.name || 'Consultant'}</span>
            </h2>
            <p className="aichat-empty-sub">
              Ask me anything — from job descriptions and competency frameworks to HR consulting strategy.
            </p>
            <div className="aichat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="aichat-suggestion" onClick={() => handleSuggestion(s)}>
                  <span className="aichat-suggestion-icon">→</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.role === 'assistant' ? (
              <div key={m.id} className="aichat-row aichat-row-ai">
                <div className="aichat-ai-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="aichat-bubble aichat-bubble-ai">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ node, ...props }) => <h2 className="aichat-md-h2" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="aichat-md-h3" {...props} />,
                      p: ({ node, ...props }) => <p className="aichat-md-p" {...props} />,
                      ul: ({ node, ...props }) => <ul className="aichat-md-ul" {...props} />,
                      li: ({ node, ...props }) => <li className="aichat-md-li" {...props} />,
                      code: ({ node, inline, ...props }) =>
                        inline
                          ? <code className="aichat-md-code-inline" {...props} />
                          : <code className="aichat-md-code-block" {...props} />,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div key={m.id} className="aichat-row aichat-row-user">
                <div className="aichat-bubble aichat-bubble-user">{m.content}</div>
                <div className="aichat-user-avatar">{userInitial}</div>
              </div>
            )
          )
        )}

        {sending && (
          <div className="aichat-row aichat-row-ai">
            <div className="aichat-ai-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="aichat-bubble aichat-bubble-ai aichat-typing-bubble">
              <span className="aichat-dot" />
              <span className="aichat-dot" />
              <span className="aichat-dot" />
            </div>
          </div>
        )}
      </div>

      {/* OneDrive file picker modal */}
      {odPickerOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOdPickerOpen(false); }}
        >
          <div style={{ background: '#fff', borderRadius: 14, width: 520, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>☁️ Attach OneDrive File</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {odBreadcrumb.length === 0 ? 'My Drive' : odBreadcrumb.map((b) => b.name).join(' / ')}
                </div>
              </div>
              <button onClick={() => setOdPickerOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
            </div>
            {/* Back */}
            {odBreadcrumb.length > 0 && (
              <button onClick={odGoBack} style={{ margin: '10px 20px 0', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, color: '#6b7280', alignSelf: 'flex-start' }}>← Back</button>
            )}
            {/* File list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 16px' }}>
              {odLoading ? (
                <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>
              ) : odFiles.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14 }}>Folder is empty.</p>
              ) : (
                odFiles.map((item) => {
                  const isAttached = attachedFiles.some((f) => f.id === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleAttach(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: isAttached ? '#fff7ed' : 'transparent', border: `1px solid ${isAttached ? '#fed7aa' : 'transparent'}` }}
                      onMouseEnter={(e) => { if (!isAttached) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={(e) => { if (!isAttached) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 20 }}>{item.folder ? '📁' : '📄'}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: item.folder ? 600 : 400 }}>{item.name}</span>
                      {item.folder
                        ? <span style={{ fontSize: 12, color: '#6b7280' }}>Open →</span>
                        : isAttached
                          ? <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>✓ Added</span>
                          : <span style={{ fontSize: 12, color: '#6b7280' }}>Add</span>
                      }
                    </div>
                  );
                })
              )}
            </div>
            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''} selected</span>
              <button onClick={() => setOdPickerOpen(false)} className="btn btn-primary" style={{ padding: '6px 20px', fontSize: 13 }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="aichat-input-area">
        <form className="aichat-input-form" onSubmit={handleSend}>
          {/* Attached file chips */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, paddingLeft: 4 }}>
              {attachedFiles.map((f) => (
                <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 20, fontSize: 12, color: '#ea580c', fontWeight: 500 }}>
                  📄 {f.name}
                  <button type="button" onClick={() => removeAttached(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ea580c', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="aichat-input-box">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="aichat-input"
            />
            <div className="aichat-input-actions">
              {/* OneDrive attach button */}
              <button
                type="button"
                title="Attach OneDrive file"
                onClick={openOdPicker}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 18, lineHeight: 1, color: attachedFiles.length > 0 ? '#ea580c' : '#9ca3af' }}
              >☁️</button>
              {/* Model picker */}
              <div className="aichat-model-container">
                <button
                  type="button"
                  className="aichat-model-btn"
                  onClick={() => setModelPickerOpen((o) => !o)}
                >
                  <span className={`aichat-model-dot ${isClaudeId(selectedModel) ? 'dot-claude' : 'dot-openai'}`} />
                  <span className="aichat-model-label">{getModelLabel(selectedModel)}</span>
                  <span className="aichat-model-chevron">▾</span>
                </button>
                {modelPickerOpen && (
                  <div className="aichat-model-menu">
                    {MODEL_GROUPS.map((group) => (
                      <div key={group.label}>
                        <div className="aichat-model-group-label">{group.label}</div>
                        {group.models.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`aichat-model-item${selectedModel === m.id ? ' aichat-model-item-active' : ''}`}
                            onClick={() => { setSelectedModel(m.id); setModelPickerOpen(false); }}
                          >
                            <span className="aichat-model-check">{selectedModel === m.id ? '✓' : ''}</span>
                            <span>{m.name}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Send */}
              <button type="submit" className="aichat-send-btn" disabled={sending} title="Send">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <p className="aichat-disclaimer">AI can make mistakes. Verify important information.</p>
        </form>
      </div>
    </div>
  );
}

export default AIChat;
