import React, { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

const UNTITLED = 'Untitled Document';

function useLocalStorage(key, defaultVal) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? defaultVal; }
    catch { return defaultVal; }
  });
  const save = useCallback(v => {
    setVal(v);
    localStorage.setItem(key, JSON.stringify(v));
  }, [key]);
  return [val, save];
}

const EMPTY_DOC = { id: Date.now(), title: UNTITLED, content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

export default function App() {
  const [docs, setDocs] = useLocalStorage('quill-docs', [EMPTY_DOC]);
  const [activeId, setActiveId] = useLocalStorage('quill-active', EMPTY_DOC.id);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('parchment'); // parchment | night | minimal
  const [saved, setSaved] = useState(true);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const textareaRef = useRef(null);
  const saveTimer = useRef(null);

  const activeDoc = docs.find(d => d.id === activeId) || docs[0];

  const updateDoc = useCallback((id, changes) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...changes, updatedAt: new Date().toISOString() } : d));
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(true), 1200);
  }, [setDocs]);

  const newDoc = () => {
    const doc = { id: Date.now(), title: UNTITLED, content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setDocs(prev => [doc, ...prev]);
    setActiveId(doc.id);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const deleteDoc = (id) => {
    if (docs.length === 1) return;
    const next = docs.find(d => d.id !== id);
    setDocs(prev => prev.filter(d => d.id !== id));
    if (activeId === id) setActiveId(next.id);
  };

  const handleContentChange = (e) => {
    updateDoc(activeDoc.id, { content: e.target.value });
    // Auto-title from first line
    const firstLine = e.target.value.split('\n')[0].slice(0, 60).trim();
    if (firstLine && activeDoc.title === UNTITLED) {
      updateDoc(activeDoc.id, { content: e.target.value, title: firstLine });
    }
  };

  const startRename = (doc) => {
    setRenaming(doc.id);
    setRenameVal(doc.title);
  };
  const commitRename = () => {
    if (renameVal.trim()) updateDoc(renaming, { title: renameVal.trim() });
    setRenaming(null);
  };

  const wordCount = (activeDoc?.content || '').trim().split(/\s+/).filter(Boolean).length;
  const charCount = (activeDoc?.content || '').length;
  const readTime = Math.max(1, Math.round(wordCount / 200));
  const lineCount = (activeDoc?.content || '').split('\n').length;

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const exportTxt = () => {
    const blob = new Blob([activeDoc.content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeDoc.title}.txt`;
    a.click();
  };

  const insertTab = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const val = ta.value;
      const newVal = val.slice(0, start) + '  ' + val.slice(ta.selectionEnd);
      updateDoc(activeDoc.id, { content: newVal });
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      setSaved(true);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setSearchOpen(s => !s);
    }
  };

  const highlightedContent = searchVal
    ? (activeDoc?.content || '').replace(new RegExp(`(${searchVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '[$1]')
    : activeDoc?.content || '';

  const matchCount = searchVal
    ? ((activeDoc?.content || '').match(new RegExp(searchVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
    : 0;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className={`app ${focusMode ? 'focus-mode' : ''}`} data-theme={theme}>
      {/* Sidebar */}
      {!focusMode && (
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                <path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
              </svg>
              <span>Quill</span>
            </div>
            <button className="icon-btn" onClick={() => setSidebarOpen(false)} title="Close sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          </div>

          <button className="new-doc-btn" onClick={newDoc}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Document
          </button>

          <div className="doc-list">
            {docs.map(doc => (
              <div
                key={doc.id}
                className={`doc-item ${doc.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(doc.id)}
              >
                <div className="doc-item-inner">
                  {renaming === doc.id ? (
                    <input
                      className="rename-input"
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className="doc-title-row">
                        <span className="doc-title">{doc.title}</span>
                        <div className="doc-actions">
                          <button className="doc-action-btn" onClick={e => { e.stopPropagation(); startRename(doc); }} title="Rename">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="doc-action-btn delete" onClick={e => { e.stopPropagation(); deleteDoc(doc.id); }} title="Delete">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <span className="doc-meta">{formatDate(doc.updatedAt)} · {doc.content.trim().split(/\s+/).filter(Boolean).length}w</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="theme-switcher">
              {['parchment', 'night', 'minimal'].map(t => (
                <button key={t} className={`theme-btn ${theme === t ? 'active' : ''}`} onClick={() => setTheme(t)} title={t}>
                  {t === 'parchment' ? '☀' : t === 'night' ? '☾' : '○'}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Main editor area */}
      <main className="editor-area">
        {/* Toolbar */}
        {!focusMode && (
          <header className="toolbar">
            <div className="toolbar-left">
              {!sidebarOpen && (
                <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="Open sidebar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              )}
              <div className="doc-name-display">
                <h1>{activeDoc?.title || UNTITLED}</h1>
              </div>
            </div>
            <div className="toolbar-right">
              <div className="save-indicator">
                {saved
                  ? <><span className="save-dot saved" />Saved</>
                  : <><span className="save-dot saving" />Saving…</>
                }
              </div>
              <button className={`icon-btn ${searchOpen ? 'active' : ''}`} onClick={() => setSearchOpen(s => !s)} title="Find (Ctrl+F)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
              </button>
              <button className={`icon-btn ${showStats ? 'active' : ''}`} onClick={() => setShowStats(s => !s)} title="Statistics">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
              </button>
              <button className={`icon-btn ${wordWrap ? 'active' : ''}`} onClick={() => setWordWrap(w => !w)} title="Word wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M3 12h15a3 3 0 010 6h-4l2-2m0 4l-2-2"/>
                </svg>
              </button>
              <div className="font-size-control">
                <button className="icon-btn small" onClick={() => setFontSize(f => Math.max(11, f - 1))}>A−</button>
                <span className="font-size-val">{fontSize}</span>
                <button className="icon-btn small" onClick={() => setFontSize(f => Math.min(28, f + 1))}>A+</button>
              </div>
              <button className="icon-btn" onClick={() => setFocusMode(true)} title="Focus mode">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
                </svg>
              </button>
              <button className="icon-btn" onClick={exportTxt} title="Export .txt">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          </header>
        )}

        {/* Search bar */}
        {searchOpen && !focusMode && (
          <div className="search-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              autoFocus
              placeholder="Find in document…"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && (setSearchOpen(false), setSearchVal(''))}
            />
            {searchVal && <span className="match-count">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>}
            <button className="icon-btn small" onClick={() => { setSearchOpen(false); setSearchVal(''); }}>✕</button>
          </div>
        )}

        {/* Stats panel */}
        {showStats && !focusMode && (
          <div className="stats-panel">
            <div className="stat"><span className="stat-val">{wordCount.toLocaleString()}</span><span className="stat-label">Words</span></div>
            <div className="stat"><span className="stat-val">{charCount.toLocaleString()}</span><span className="stat-label">Characters</span></div>
            <div className="stat"><span className="stat-val">{lineCount.toLocaleString()}</span><span className="stat-label">Lines</span></div>
            <div className="stat"><span className="stat-val">{readTime} min</span><span className="stat-label">Read time</span></div>
          </div>
        )}

        {/* Writing area */}
        <div className="writing-area">
          {focusMode && (
            <button className="exit-focus" onClick={() => setFocusMode(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
              </svg>
              Exit focus
            </button>
          )}
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={activeDoc?.content || ''}
            onChange={handleContentChange}
            onKeyDown={insertTab}
            placeholder="Start writing…"
            spellCheck
            style={{
              fontSize: `${fontSize}px`,
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              overflowX: wordWrap ? 'hidden' : 'auto',
            }}
          />
        </div>

        {/* Status bar */}
        {!focusMode && (
          <footer className="status-bar">
            <span>{wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars</span>
            <span>Ln {(activeDoc?.content || '').slice(0, textareaRef.current?.selectionStart || 0).split('\n').length}</span>
            <span className="kbd-hint">⌘S save · ⌘F find · Tab indent</span>
          </footer>
        )}
      </main>
    </div>
  );
}
