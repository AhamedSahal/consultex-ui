import React, { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import {
  UploadOutlined,
  BankOutlined,
  AppstoreOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  PlusOutlined,
  DeleteOutlined,
  MessageOutlined,
  MenuOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { fetchPlaybookStatus, uploadPlaybook, fetchCompanies, fetchPlaybooks, deletePlaybook, uploadJdTemplate, fetchJdTemplates, fetchJdTemplate, deleteJdTemplate, fetchChatSessions, createChatSession, fetchSessionMessages, saveSessionMessages, updateChatSession, deleteChatSession } from './service';
import PlaybookForm from './playbookForm';
import PlaybookListModal from './PlaybookListModal';
import CompanySelectForm from './companySelectForm';
import JDTemplateUploadModal from './JDTemplateUploadModal';
import JDTemplateSelectModal from './JDTemplateSelectModal';
import { downloadAsWord, downloadAsPdf } from './downloadUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../api/axios';

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

function getModelLabel(modelId) {
  for (const group of MODEL_GROUPS) {
    const found = group.models.find((m) => m.id === modelId);
    if (found) return found.name;
  }
  return modelId;
}


function resolveLogoUrl(company) {
  const raw = company?.logo_url || company?.logoUrl;
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const base = api.defaults.baseURL || '';
  if (!base) return path;
  try {
    const url = new URL(base, window.location.origin);
    return `${url.origin}${path}`;
  } catch {
    const match = base.match(/^https?:\/\/[^/]+/i);
    return `${match ? match[0] : base.replace(/\/+$/, '')}${path}`;
  }
}

function JDAgentPage() {
  const { logout } = useAuth();

  // Persisted chat sessions (loaded from DB)
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const activeChatIdRef = useRef(null);

  // Current chat state
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [lastJdId, setLastJdId] = useState(null);
  const listRef = useRef(null);

  const [playbookStatus, setPlaybookStatus] = useState(null);
  const [playbookId, setPlaybookId] = useState(null);
  const [playbookModalOpen, setPlaybookModalOpen] = useState(false);
  const [playbookTitle, setPlaybookTitle] = useState('');
  const [playbookFile, setPlaybookFile] = useState(null);
  const [uploadingPlaybook, setUploadingPlaybook] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [sidebarModelPickerOpen, setSidebarModelPickerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [downloading, setDownloading] = useState(null); // 'pdf' | 'word' | null

  const [playbookListOpen, setPlaybookListOpen] = useState(false);
  const [playbooks, setPlaybooks] = useState([]);
  const [playbooksLoading, setPlaybooksLoading] = useState(false);
  const [deletingPlaybookId, setDeletingPlaybookId] = useState(null);

  // JD Template state
  const [templateUploadOpen, setTemplateUploadOpen] = useState(false);
  const [templateSelectOpen, setTemplateSelectOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateFile, setTemplateFile] = useState(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null); // { id, name }
  const [deletingTemplateId, setDeletingTemplateId] = useState(null);

  // Keep ref in sync for saving sessions without stale closure
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Save messages to DB when AI response finishes streaming
  const prevSendingRef = useRef(false);
  useEffect(() => {
    if (prevSendingRef.current && !sending) {
      const id = activeChatIdRef.current;
      if (id && messages.length > 0) {
        saveSessionMessages(id, messages).catch(() => {});
        updateChatSession(id, { last_jd_id: lastJdId, selected_company: selectedCompany }).catch(() => {});
      }
    }
    prevSendingRef.current = sending;
  }, [sending]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    loadChatSessions();
    loadPlaybookStatus();
    loadCompanies();
  }, []);

  const loadChatSessions = async () => {
    try {
      const data = await fetchChatSessions();
      setChatSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load chat sessions', err);
    }
  };

  const loadPlaybookStatus = async () => {
    try {
      const data = await fetchPlaybookStatus();
      setPlaybookStatus(data);
      if (data) {
        const idFromStatus = data.playbookId || data.playbook_id || data.id || null;
        if (idFromStatus) setPlaybookId(idFromStatus);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch JD playbook status', err);
    }
  };

  const loadCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const data = await fetchCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch companies', err);
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setInput('');
    setLastJdId(null);
    setSelectedCompany(null);
  };

  const loadChatSession = async (session) => {
    setActiveChatId(session.id);
    activeChatIdRef.current = session.id;
    setLastJdId(session.last_jd_id || null);
    setSelectedCompany(session.selected_company || null);
    setInput('');
    setSidebarOpen(false);
    setMessages([]);
    try {
      const msgs = await fetchSessionMessages(session.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load session messages', err);
    }
  };

  const deleteChat = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sessionId);
    } catch (err) {
      message.error('Failed to delete chat.');
      return;
    }
    setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeChatIdRef.current === sessionId) {
      setMessages([]);
      setActiveChatId(null);
      activeChatIdRef.current = null;
      setLastJdId(null);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    // Create a new session in DB if none is active
    let currentChatId = activeChatIdRef.current;
    if (!currentChatId) {
      const title = text.length > 38 ? text.slice(0, 38) + '…' : text;
      let newSession;
      try {
        newSession = await createChatSession(title);
      } catch (err) {
        message.error('Failed to create chat session.');
        setSending(false);
        return;
      }
      setChatSessions((prev) => [newSession, ...prev]);
      setActiveChatId(newSession.id);
      activeChatIdRef.current = newSession.id;
      currentChatId = newSession.id;
    }

    const userMsg = { id: Date.now(), role: 'user', content: text };
    const currentMessages = [...messages, userMsg];

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setLastJdId(null);

    try {
      const historyForApi = currentMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const token = localStorage.getItem('accessToken');

      const playbookIdForChat =
        playbookId ||
        (playbookStatus &&
          (playbookStatus.id ||
            playbookStatus.playbook_id ||
            playbookStatus.playbookId)) ||
        null;

      const response = await fetch(`${API_BASE}/ai/chat-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: historyForApi,
          model: 'JD_AGENT',
          selected_model: selectedModel,
          jd_batch: false,
          agent_id: 1,
          company_id: selectedCompany ? Number(selectedCompany.id) : null,
          playbook_id: Number(playbookIdForChat),
          template_id: activeTemplate ? Number(activeTemplate.id) : null,
        }),
      });

      if (!response.ok) {
        let errorMessage =
          'Sorry, something went wrong while contacting the JD agent service.';
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
        } catch {
          // ignore parsing errors and fall back to default message
        }

        if (errorMessage === 'Token expired') {
          logout();
          errorMessage =
            'Your session has expired. Please sign in again to continue chatting.';
        }

        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'assistant', content: errorMessage },
        ]);
        setLastJdId(null);
        return;
      }

      if (!response.body) {
        throw new Error('No response body from JD agent stream');
      }

      const jdIdHeader =
        response.headers.get('x-jd-id') || response.headers.get('X-JD-Id');
      setLastJdId(jdIdHeader ? Number(jdIdHeader) || null : null);

      const aiMsgId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        { id: aiMsgId, role: 'assistant', content: '' },
      ]);

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
              prev.map((m) =>
                m.id === aiMsgId
                  ? { ...m, content: (m.content || '') + chunk }
                  : m
              )
            );
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('JD agent chat error', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content:
            err.message ||
            'Sorry, something went wrong while contacting the JD agent service.',
        },
      ]);
      setLastJdId(null);
    } finally {
      setSending(false);
    }
  };

  const openPlaybookList = async () => {
    setPlaybookListOpen(true);
    setPlaybooksLoading(true);
    try {
      const data = await fetchPlaybooks();
      setPlaybooks(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch playbooks', err);
      setPlaybooks([]);
    } finally {
      setPlaybooksLoading(false);
    }
  };

  const handleDeletePlaybook = async (id) => {
    setDeletingPlaybookId(id);
    try {
      await deletePlaybook(id);
      setPlaybooks((prev) => prev.filter((pb) => pb.id !== id));
      if (String(id) === String(playbookId)) {
        setPlaybookId(null);
        setPlaybookStatus(null);
      }
      message.success('Playbook deleted.');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to delete playbook.');
    } finally {
      setDeletingPlaybookId(null);
    }
  };

  const handlePlaybookSave = async () => {
    if (!playbookFile) {
      message.warning('Please choose a JD playbook file to upload.');
      return;
    }

    setUploadingPlaybook(true);
    try {
      const data = await uploadPlaybook(playbookFile);
      setPlaybookStatus((prev) => ({ ...(prev || {}), ...(data || {}) }));
      if (data) {
        const newId = data.playbookId || data.playbook_id || data.id || null;
        if (newId) setPlaybookId(newId);
      }
      message.success('JD playbook uploaded and indexed.');
      setPlaybookModalOpen(false);
      setPlaybookFile(null);
      setPlaybookTitle('');
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to upload JD playbook. Please try again.';
      message.error(msg);
    } finally {
      setUploadingPlaybook(false);
    }
  };

  const handleDownload = async (format, content) => {
    const slug = 'job-description';
    setDownloading(format);
    const companyForExport = selectedCompany
      ? { ...selectedCompany, logoUrl: resolveLogoUrl(selectedCompany) }
      : null;
    const templateTheme = activeTemplate?.primaryColor
      ? { primaryColor: activeTemplate.primaryColor }
      : null;
    try {
      if (format === 'word') {
        await downloadAsWord(content, slug, companyForExport, templateTheme);
      } else {
        await downloadAsPdf(content, slug, companyForExport, templateTheme);
      }
    } catch (err) {
      message.error(`Failed to generate ${format.toUpperCase()}. Please try again.`);
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const handleCompanySelect = () => {
    if (!selectedCompany) {
      message.warning('Please select a company.');
      return;
    }
    const id = activeChatIdRef.current;
    if (id) {
      updateChatSession(id, { selected_company: selectedCompany }).catch(() => {});
    }
    setCompanyModalOpen(false);
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  // ── JD Template handlers ────────────────────────────────────────────────────

  const openTemplateSelect = async () => {
    setTemplateSelectOpen(true);
    setTemplatesLoading(true);
    try {
      const data = await fetchJdTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch JD templates', err);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Extract layout info from a parsed template schema for the job_information section.
  // Returns the number of columns (2 = 1-per-row, 4 = 2-per-row).
  const extractJobInfoColumns = (schema) => {
    if (!schema || !Array.isArray(schema.sections)) return 2;
    for (const sec of schema.sections) {
      const compact = (sec.sectionTitle || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (['jobdetails', 'jobinformation', 'jobinfo'].some((p) => compact.includes(p))) {
        return sec.columns || 2;
      }
    }
    return 2;
  };

  const handleTemplateUpload = async () => {
    if (!templateFile) {
      message.warning('Please choose a DOCX template file.');
      return;
    }
    setUploadingTemplate(true);
    try {
      const data = await uploadJdTemplate(templateFile, templateName || templateFile.name);
      const primaryColor = data?.parsed_theme_json?.primaryColor || null;
      const jobInfoColumns = extractJobInfoColumns(data?.parsed_schema_json);
      setActiveTemplate({ id: data.id, name: data.name, primaryColor, jobInfoColumns });
      message.success('JD template uploaded and parsed.');
      setTemplateUploadOpen(false);
      setTemplateFile(null);
      setTemplateName('');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to upload template.';
      message.error(msg);
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleTemplateSelect = async (tpl) => {
    if (!tpl) {
      setActiveTemplate(null);
      message.info('Template cleared. JDs will use the default format.');
      setTemplateSelectOpen(false);
      return;
    }
    setTemplateSelectOpen(false);
    try {
      const full = await fetchJdTemplate(tpl.id);
      const primaryColor = full?.parsed_theme_json?.primaryColor || null;
      const jobInfoColumns = extractJobInfoColumns(full?.parsed_schema_json);
      setActiveTemplate({ id: tpl.id, name: tpl.name, primaryColor, jobInfoColumns });
    } catch {
      setActiveTemplate({ id: tpl.id, name: tpl.name, primaryColor: null, jobInfoColumns: 2 });
    }
    message.success(`Template "${tpl.name}" set as active.`);
  };

  const handleDeleteTemplate = async (id) => {
    setDeletingTemplateId(id);
    try {
      await deleteJdTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (activeTemplate && String(activeTemplate.id) === String(id)) {
        setActiveTemplate(null);
      }
      message.success('Template deleted.');
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to delete template.');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  return (
    <div className="jd-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="jd-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`jd-sidebar${sidebarOpen ? ' jd-sidebar-open' : ''}`}>
        <div className="jd-sidebar-top">
          <div className="jd-sidebar-brand">
            <MessageOutlined style={{ fontSize: 18 }} />
            <span>JD Agent</span>
          </div>
          <button className="jd-new-chat-btn" onClick={handleNewChat}>
            <PlusOutlined />
            <span>New Chat</span>
          </button>
        </div>

        <div className="jd-sidebar-model-row">
          <div className="jd-sidebar-model-picker-container">
            <button
              type="button"
              className="jd-sidebar-model-btn"
              onClick={() => setSidebarModelPickerOpen((o) => !o)}
              title="Select model"
            >
              <span className="jd-sidebar-model-dot" />
              <span className="jd-sidebar-model-name">{getModelLabel(selectedModel)}</span>
              <span className="jd-sidebar-model-chevron">▾</span>
            </button>
            {sidebarModelPickerOpen && (
              <div className="jd-sidebar-model-menu">
                {MODEL_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="jd-sidebar-model-group-label">{group.label}</div>
                    {group.models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`jd-sidebar-model-item${selectedModel === m.id ? ' jd-sidebar-model-item-active' : ''}`}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setSidebarModelPickerOpen(false);
                        }}
                      >
                        <span className="jd-sidebar-model-check">
                          {selectedModel === m.id ? '✓' : ''}
                        </span>
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="jd-sidebar-section-label">Your chats</div>

        <div className="jd-sidebar-list">
          {chatSessions.length === 0 ? (
            <div className="jd-sidebar-empty">No conversations yet</div>
          ) : (
            chatSessions.map((session) => (
              <div
                key={session.id}
                className={`jd-sidebar-item${activeChatId === session.id ? ' jd-sidebar-item-active' : ''}`}
                onClick={() => loadChatSession(session)}
              >
                <span className="jd-sidebar-item-title">{session.title}</span>
                <button
                  className="jd-sidebar-item-delete"
                  onClick={(e) => deleteChat(e, session.id)}
                  title="Delete chat"
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))
          )}
        </div>

      </aside>

      {/* ── Main chat area ── */}
      <div className="ai-chat-page">
        <div className="jd-mobile-header">
          <button className="jd-mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <MenuOutlined />
          </button>
          <span className="jd-mobile-title">JD Agent</span>
        </div>
        <div className="ai-chat-body">
          <div className="ai-chat-panel">
            <div className="ai-chat-messages" ref={listRef}>
              {messages.length === 0 ? (
                <div className="ai-chat-empty">
                  <div className="ai-chat-empty-icon">
                    <MessageOutlined />
                  </div>
                  <p className="ai-chat-empty-title">Start a new conversation</p>
                  <p className="ai-chat-empty-text">
                    Ask about job descriptions, HR agents, or any consulting workflow you want to
                    design.
                  </p>
                </div>
              ) : (
                messages.map((m) =>
                  m.role === 'assistant' ? (
                    <div key={m.id} className="ai-chat-bubble ai-chat-bubble-ai jd-result-bubble">
                      <div className="jd-chat-md">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                      {m.content && !sending && (
                        <div className="jd-download-row">
                          <button
                            type="button"
                            className="jd-download-btn jd-download-btn-pdf"
                            disabled={downloading === 'pdf'}
                            onClick={() => handleDownload('pdf', m.content)}
                          >
                            <FilePdfOutlined />
                            <span>{downloading === 'pdf' ? 'Generating…' : 'Download PDF'}</span>
                          </button>
                          <button
                            type="button"
                            className="jd-download-btn jd-download-btn-word"
                            disabled={downloading === 'word'}
                            onClick={() => handleDownload('word', m.content)}
                          >
                            <FileWordOutlined />
                            <span>
                              {downloading === 'word' ? 'Generating…' : 'Download Word'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={m.id} className="ai-chat-bubble ai-chat-bubble-user">
                      {m.content}
                    </div>
                  )
                )
              )}
              {sending && (
                <div className="ai-chat-bubble ai-chat-bubble-ai ai-chat-typing">
                  <span className="ai-chat-typing-dot" />
                  <span className="ai-chat-typing-dot" />
                  <span className="ai-chat-typing-dot" />
                </div>
              )}
            </div>

            <div className="jd-chat-meta-row">
              <div className="jd-chat-meta-right">
                {playbookStatus?.status === 'uploaded' && (
                  <span className="jd-chip jd-chip-success">
                    <span className="jd-chip-success-icon">✓</span>
                    <span>Playbook uploaded</span>
                  </span>
                )}
                {selectedCompany && (
                  <span className="jd-chip jd-chip-success">
                    <span className="jd-chip-success-icon">✓</span>
                    <span className="jd-chip-company-icon">
                      <BankOutlined />
                    </span>
                    <span>{selectedCompany.name}</span>
                  </span>
                )}
                {activeTemplate && (
                  <span className="jd-chip jd-chip-template">
                    <span className="jd-chip-success-icon">⊞</span>
                    <span>Template: {activeTemplate.name}</span>
                    <button
                      type="button"
                      className="jd-chip-clear-btn"
                      title="Clear template"
                      onClick={() => setActiveTemplate(null)}
                    >
                      ✕
                    </button>
                  </span>
                )}
                {lastJdId && (
                  <span className="jd-chip">
                    <a
                      href={`${API_BASE}/modules/jd-agent/jds/${lastJdId}/export?format=pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download PDF
                    </a>
                    <span style={{ margin: '0 4px' }}>|</span>
                    <a
                      href={`${API_BASE}/modules/jd-agent/jds/${lastJdId}/export?format=docx`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Word
                    </a>
                  </span>
                )}
              </div>
            </div>

            <form className="ai-chat-input-row" onSubmit={handleSend}>
              <div className="ai-chat-input-wrapper">
                <div className="jd-input-plus-container">
                  <button
                    type="button"
                    className="jd-input-plus-btn"
                    onClick={() => setQuickActionsOpen((open) => !open)}
                  >
                    <span className="jd-input-plus-icon">+</span>
                  </button>
                  {quickActionsOpen && (
                    <div className="jd-input-plus-menu">
                      <button
                        type="button"
                        className="jd-input-plus-menu-item"
                        onClick={() => {
                          setQuickActionsOpen(false);
                          setPlaybookModalOpen(true);
                        }}
                      >
                        <UploadOutlined />
                        <span>Upload Playbook</span>
                      </button>
                      <button
                        type="button"
                        className="jd-input-plus-menu-item"
                        onClick={() => {
                          setQuickActionsOpen(false);
                          openPlaybookList();
                        }}
                      >
                        <UnorderedListOutlined />
                        <span>View Playbooks</span>
                      </button>
                      <button
                        type="button"
                        className="jd-input-plus-menu-item"
                        onClick={() => {
                          setQuickActionsOpen(false);
                          setCompanyModalOpen(true);
                        }}
                      >
                        <BankOutlined />
                        <span>Select Company</span>
                      </button>
                      <button
                        type="button"
                        className="jd-input-plus-menu-item"
                        onClick={() => {
                          setQuickActionsOpen(false);
                          setTemplateUploadOpen(true);
                        }}
                      >
                        <UploadOutlined />
                        <span>Upload JD Template</span>
                      </button>
                      <button
                        type="button"
                        className="jd-input-plus-menu-item"
                        onClick={() => {
                          setQuickActionsOpen(false);
                          openTemplateSelect();
                        }}
                      >
                        <UnorderedListOutlined />
                        <span>Select JD Template</span>
                      </button>
                      <button
                        type="button"
                        className="jd-input-plus-menu-item jd-input-plus-menu-item-disabled"
                        onClick={() => {
                          setQuickActionsOpen(false);
                          message.info('Batch mode will be available soon.');
                        }}
                      >
                        <AppstoreOutlined />
                        <span>Batch mode</span>
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="What would you like to know?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="ai-chat-input"
                />
              </div>
              <div className="jd-model-picker-container">
                <button
                  type="button"
                  className="jd-model-picker-btn"
                  onClick={() => setModelPickerOpen((o) => !o)}
                  title="Select model"
                >
                  <span className="jd-model-picker-label">{getModelLabel(selectedModel)}</span>
                  <span className="jd-model-picker-chevron">▾</span>
                </button>
                {modelPickerOpen && (
                  <div className="jd-model-picker-menu">
                    {MODEL_GROUPS.map((group) => (
                      <div key={group.label}>
                        <div className="jd-model-picker-group-label">{group.label}</div>
                        {group.models.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`jd-model-picker-item${selectedModel === m.id ? ' jd-model-picker-item-active' : ''}`}
                            onClick={() => {
                              setSelectedModel(m.id);
                              setModelPickerOpen(false);
                            }}
                          >
                            <span className="jd-model-picker-check">
                              {selectedModel === m.id ? '✓' : ''}
                            </span>
                            <span>{m.name}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" className="ai-chat-send-btn" disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <PlaybookForm
        open={playbookModalOpen}
        onCancel={() => setPlaybookModalOpen(false)}
        onSave={handlePlaybookSave}
        confirmLoading={uploadingPlaybook}
        playbookTitle={playbookTitle}
        onTitleChange={(e) => setPlaybookTitle(e.target.value)}
        playbookFile={playbookFile}
        onFileChange={(e) => {
          const file = e.target.files && e.target.files[0];
          setPlaybookFile(file || null);
        }}
      />

      <PlaybookListModal
        open={playbookListOpen}
        onCancel={() => setPlaybookListOpen(false)}
        playbooks={playbooks}
        loading={playbooksLoading}
        activePlaybookId={playbookId}
        onDelete={handleDeletePlaybook}
        deletingId={deletingPlaybookId}
      />

      <CompanySelectForm
        open={companyModalOpen}
        onCancel={() => setCompanyModalOpen(false)}
        onSelect={handleCompanySelect}
        confirmLoading={companiesLoading}
        companySearch={companySearch}
        onCompanySearchChange={(e) => setCompanySearch(e.target.value)}
        companies={filteredCompanies}
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
      />

      <JDTemplateUploadModal
        open={templateUploadOpen}
        onCancel={() => { setTemplateUploadOpen(false); setTemplateFile(null); setTemplateName(''); }}
        onSave={handleTemplateUpload}
        confirmLoading={uploadingTemplate}
        templateName={templateName}
        onNameChange={(e) => setTemplateName(e.target.value)}
        templateFile={templateFile}
        onFileChange={(e) => setTemplateFile(e.target.files && e.target.files[0] || null)}
      />

      <JDTemplateSelectModal
        open={templateSelectOpen}
        onCancel={() => setTemplateSelectOpen(false)}
        templates={templates}
        loading={templatesLoading}
        activeTemplateId={activeTemplate ? activeTemplate.id : null}
        onSelect={handleTemplateSelect}
        onDelete={handleDeleteTemplate}
        deletingId={deletingTemplateId}
        onTemplatesChange={(updated) =>
          setTemplates((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)))
        }
      />
    </div>
  );
}

export default JDAgentPage;
