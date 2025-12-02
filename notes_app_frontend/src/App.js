import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * Ocean Professional theme constants pulled from style guide.
 */
const THEME = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
};

/**
 * Storage keys and helpers
 */
const LS_KEYS = {
  NOTES: 'mn.notes',
  THEME: 'mn.theme',
  LAST_EDITED_ID: 'mn.lastEditedId',
};

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Try to detect API base from environment variables exposed to frontend
 */
function getApiBase() {
  // CRA exposes env vars prefixed with REACT_APP_
  const envBase = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL;
  if (!envBase) return null;
  try {
    const url = new URL(envBase);
    return url.toString().replace(/\/+$/, '');
  } catch {
    // If value isn't a valid URL, attempt to treat as path
    return String(envBase).replace(/\/+$/, '');
  }
}

/**
 * API client that gracefully falls back to localStorage when API is not configured.
 */
function useNotesApi() {
  const apiBase = useMemo(() => getApiBase(), []);
  const usingApi = Boolean(apiBase);

  // PUBLIC_INTERFACE
  async function listNotes() {
    if (usingApi) {
      try {
        const res = await fetch(`${apiBase}/notes`, { headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed to fetch notes');
        return await res.json();
      } catch (e) {
        console.warn('API fetch failed, falling back to local notes.', e);
      }
    }
    const raw = localStorage.getItem(LS_KEYS.NOTES);
    return raw ? JSON.parse(raw) : [];
  }

  // PUBLIC_INTERFACE
  async function saveNote(note) {
    if (usingApi) {
      try {
        const method = note.id ? 'PUT' : 'POST';
        const url = note.id ? `${apiBase}/notes/${note.id}` : `${apiBase}/notes`;
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note),
        });
        if (!res.ok) throw new Error('Failed to save note');
        return await res.json();
      } catch (e) {
        console.warn('API save failed, storing locally.', e);
      }
    }
    const notes = await listNotes();
    let updated;
    if (note.id) {
      updated = notes.map(n => (n.id === note.id ? { ...note, updatedAt: new Date().toISOString() } : n));
    } else {
      updated = [
        {
          ...note,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...notes,
      ];
    }
    localStorage.setItem(LS_KEYS.NOTES, JSON.stringify(updated));
    return updated.find(n => n.id === (note.id || updated[0].id));
  }

  // PUBLIC_INTERFACE
  async function deleteNote(id) {
    if (usingApi) {
      try {
        const res = await fetch(`${apiBase}/notes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete note');
        return true;
      } catch (e) {
        console.warn('API delete failed, removing locally.', e);
      }
    }
    const notes = await listNotes();
    const updated = notes.filter(n => n.id !== id);
    localStorage.setItem(LS_KEYS.NOTES, JSON.stringify(updated));
    return true;
  }

  return { usingApi, listNotes, saveNote, deleteNote };
}

/**
 * Header component with title, theme toggle, and search input
 */
function Header({ theme, onToggleTheme, search, setSearch }) {
  return (
    <header style={styles.header}>
      <div style={styles.brandRow}>
        <div style={styles.brandCircle} aria-hidden />
        <h1 style={styles.title}>Minimalist Notes</h1>
      </div>
      <div style={styles.headerControls}>
        <div style={styles.searchWrap}>
          <span aria-hidden style={styles.searchIcon}>🔍</span>
          <input
            aria-label="Search notes"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <button
          onClick={onToggleTheme}
          style={styles.themeButton}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}

/**
 * Notes list panel
 */
function NotesList({ notes, selectedId, onSelect, onCreate, onDelete }) {
  return (
    <aside style={styles.listPane} aria-label="Notes list">
      <div style={styles.listHeader}>
        <h2 style={styles.listTitle}>Your Notes</h2>
        <button style={styles.primaryBtn} onClick={onCreate}>+ New</button>
      </div>
      <div style={styles.listScroll}>
        {notes.length === 0 ? (
          <div style={styles.emptyState}>No notes yet. Create your first note.</div>
        ) : (
          notes.map(n => (
            <button
              key={n.id}
              onClick={() => onSelect(n.id)}
              style={{
                ...styles.noteListItem,
                borderColor: selectedId === n.id ? THEME.primary : 'rgba(0,0,0,0.06)',
                boxShadow: selectedId === n.id ? '0 1px 0 0 rgba(37,99,235,0.2)' : 'none',
              }}
              className="note-list-item"
            >
              <div style={styles.noteItemHeader}>
                <span style={styles.noteItemTitle}>{n.title || 'Untitled'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
                  style={styles.deleteBtn}
                  aria-label="Delete note"
                  title="Delete note"
                >
                  ␡
                </button>
              </div>
              <p style={styles.noteItemPreview}>{n.content?.slice(0, 80) || 'No content...'}</p>
              <span style={styles.noteItemTime}>
                {n.updatedAt ? new Date(n.updatedAt).toLocaleString() : ''}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

/**
 * Editor panel
 */
function Editor({ note, onChange, onSave }) {
  if (!note) {
    return (
      <section style={styles.editorPaneEmpty}>
        <div>
          <h2 style={{ marginBottom: 8 }}>Select a note</h2>
          <p style={{ color: 'rgba(17,24,39,0.6)' }}>Or create a new one to start writing.</p>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.editorPane}>
      <input
        style={styles.titleInput}
        placeholder="Note title"
        value={note.title || ''}
        onChange={(e) => onChange({ ...note, title: e.target.value })}
      />
      <textarea
        style={styles.textarea}
        placeholder="Start typing..."
        value={note.content || ''}
        onChange={(e) => onChange({ ...note, content: e.target.value })}
      />
      <div style={styles.editorActions}>
        <button style={styles.primaryBtn} onClick={onSave}>Save</button>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem(LS_KEYS.THEME) || 'light');
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem(LS_KEYS.LAST_EDITED_ID) || null);
  const [draft, setDraft] = useState(null);

  const { listNotes, saveNote, deleteNote } = useNotesApi();

  // Theme persistence and application
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LS_KEYS.THEME, theme);
  }, [theme]);

  // Load notes on first render
  useEffect(() => {
    (async () => {
      const initial = await listNotes();
      // Sort notes by updatedAt desc if present
      initial.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      setNotes(initial);
      if (initial.length > 0 && !selectedId) {
        setSelectedId(initial[0].id);
        setDraft(initial[0]);
      } else if (selectedId) {
        const found = initial.find(n => n.id === selectedId);
        if (found) setDraft(found);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep last selected
  useEffect(() => {
    if (selectedId) {
      localStorage.setItem(LS_KEYS.LAST_EDITED_ID, selectedId);
    }
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  function handleCreate() {
    const newDraft = { id: null, title: '', content: '' };
    setDraft(newDraft);
    setSelectedId(null);
  }

  async function handleSave() {
    if (!draft) return;
    const saved = await saveNote(draft);
    // update list
    setNotes(prev => {
      const exists = prev.some(n => n.id === saved.id);
      const updated = exists ? prev.map(n => (n.id === saved.id ? saved : n)) : [saved, ...prev];
      // sort
      updated.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      return updated;
    });
    setSelectedId(saved.id);
    setDraft(saved);
  }

  async function handleDelete(id) {
    await deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setDraft(null);
    }
  }

  function handleSelect(id) {
    setSelectedId(id);
    const found = notes.find(n => n.id === id);
    setDraft(found || null);
  }

  const containerStyle = {
    ...styles.app,
    background: theme === 'light' ? THEME.background : '#0b1220',
    color: theme === 'light' ? THEME.text : '#e5e7eb',
  };

  return (
    <div className="App" style={containerStyle}>
      <div style={styles.gradientBackdrop} aria-hidden />
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
        search={search}
        setSearch={setSearch}
      />
      <main style={styles.main}>
        <NotesList
          notes={filtered}
          selectedId={selectedId}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
        <Editor
          note={draft}
          onChange={setDraft}
          onSave={handleSave}
        />
      </main>
      <footer style={styles.footer}>
        <span>Ocean Professional • Minimalist Notes</span>
        <span style={{ opacity: 0.7 }}>
          {process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL ? 'Connected to API' : 'Local only'}
        </span>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    transition: 'background 300ms ease, color 300ms ease',
  },
  gradientBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(1000px 600px at 10% 0%, rgba(37,99,235,0.08), rgba(255,255,255,0)),' +
                'radial-gradient(800px 500px at 90% 0%, rgba(245,158,11,0.08), rgba(255,255,255,0))',
    pointerEvents: 'none',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'saturate(180%) blur(6px)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brandCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.secondary})`,
    boxShadow: '0 4px 18px rgba(37,99,235,0.35)',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: THEME.text,
    letterSpacing: 0.2,
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  searchWrap: {
    position: 'relative',
    width: 260,
    maxWidth: '50vw',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: 0.6,
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 32px',
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.08)',
    background: THEME.surface,
    outline: 'none',
    transition: 'box-shadow 200ms ease, border-color 200ms ease',
  },
  themeButton: {
    border: '1px solid rgba(0,0,0,0.08)',
    background: THEME.surface,
    borderRadius: 10,
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'transform 150ms ease',
  },
  main: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: 16,
    padding: 16,
  },
  listPane: {
    background: THEME.surface,
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    minHeight: 'calc(100vh - 170px)',
    flexDirection: 'column',
    boxShadow: '0 10px 20px rgba(0,0,0,0.03)',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottom: '1px dashed rgba(0,0,0,0.08)',
    marginBottom: 8,
  },
  listTitle: {
    margin: 0,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(17,24,39,0.7)',
  },
  listScroll: {
    overflowY: 'auto',
    paddingRight: 4,
  },
  noteListItem: {
    width: '100%',
    textAlign: 'left',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    background: '#fff',
    cursor: 'pointer',
    transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
  },
  noteItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  noteItemTitle: {
    fontWeight: 600,
    color: THEME.text,
  },
  noteItemPreview: {
    margin: '4px 0 6px',
    color: 'rgba(17,24,39,0.7)',
    fontSize: 13,
  },
  noteItemTime: {
    fontSize: 11,
    color: 'rgba(17,24,39,0.45)',
  },
  deleteBtn: {
    border: 'none',
    background: 'transparent',
    color: THEME.error,
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
  },
  editorPane: {
    background: THEME.surface,
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 12,
    padding: 16,
    minHeight: 'calc(100vh - 170px)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 20px rgba(0,0,0,0.03)',
  },
  editorPaneEmpty: {
    background: THEME.surface,
    border: '1px dashed rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 16,
    minHeight: 'calc(100vh - 170px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: 700,
    border: 'none',
    outline: 'none',
    padding: '6px 8px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.02)',
    marginBottom: 12,
  },
  textarea: {
    flex: 1,
    resize: 'none',
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.06)',
    padding: 12,
    outline: 'none',
    fontSize: 14,
    lineHeight: 1.6,
  },
  editorActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: 12,
    gap: 8,
  },
  primaryBtn: {
    background: THEME.primary,
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(37,99,235,0.25)',
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'saturate(180%) blur(6px)',
    position: 'sticky',
    bottom: 0,
  },
};

/**
 * Responsive tweaks
 */
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  @media (max-width: 900px) {
    main { 
      grid-template-columns: 1fr !important;
    }
    aside[aria-label="Notes list"] {
      min-height: 320px !important;
    }
  }
  .note-list-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.06) !important;
  }
`;
document.head.appendChild(styleTag);

export default App;
