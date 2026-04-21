import { useState } from "react";

type Workspace = {
  id: number;
  name: string;
  created: string;
  edited: string;
};

const INITIAL_WORKSPACES: Workspace[] = [
  { id: 1, name: "CS Notes", created: "3/8/26", edited: "3:14pm 3/10/26" },
  { id: 2, name: "CS320 Project", created: "3/9/26", edited: "9:02am 3/11/26" },
  { id: 3, name: "Coding Ideas", created: "3/10/26", edited: "1:45pm 3/12/26" },
];

function WorkspaceCard({
  workspace,
  onDelete,
  onOpen,
}: {
  workspace: Workspace;
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#3a3a3a" }}>
          <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4 7h8M4 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <button style={styles.deleteBtn} onClick={() => setConfirmDelete(true)} title="Delete workspace">
          ✕
        </button>
      </div>

      <h3 style={styles.cardName}>{workspace.name}</h3>
      <p style={styles.cardMeta}>
        Date created: {workspace.created}
        <br />
        Last edited: {workspace.edited}
      </p>

      {confirmDelete ? (
        <div style={styles.confirmRow}>
          <span style={styles.confirmText}>Delete this workspace?</span>
          <button style={styles.confirmYes} onClick={() => onDelete(workspace.id)}>Yes</button>
          <button style={styles.confirmNo} onClick={() => setConfirmDelete(false)}>No</button>
        </div>
      ) : (
        <div style={styles.cardOpen}>
          <button style={styles.openBtn} onClick={() => onOpen(workspace.id)}>Open →</button>
        </div>
      )}
    </div>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.navIcon}>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.navIcon}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 6a1.5 1.5 0 012.914.5c0 1-1.414 1.5-1.414 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={styles.navIcon}>
      <path d="M6 8h7M10 5l3 3-3 3M5 3H3a1 1 0 00-1 1v8a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [nextId, setNextId] = useState(10);

  function handleDelete(id: number) {
    setWorkspaces(workspaces.filter((w) => w.id !== id));
  }

  function handleOpen(id: number) {
    alert(`Opening workspace ${id}: navigation goes here!`);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const now = new Date();
    const d = `${now.getMonth() + 1}/${now.getDate()}/${String(now.getFullYear()).slice(-2)}`;
    const newWorkspace: Workspace = {
      id: nextId,
      name: newName.trim(),
      created: d,
      edited: "just now",
    };
    setWorkspaces([...workspaces, newWorkspace]);
    setNextId(nextId + 1);
    setNewName("");
    setShowNewForm(false);
  }

  return (
    <>
      <style>{`
        .sidebar {
          width: 52px;
          transition: width 0.22s ease;
          overflow: hidden;
          flex-shrink: 0;
        }
        .sidebar:hover {
          width: 190px;
        }
        .nav-label {
          opacity: 0;
          transition: opacity 0.18s ease;
          white-space: nowrap;
          font-size: 13px;
          color: #888;
        }
        .sidebar:hover .nav-label {
          opacity: 1;
        }
        .nav-item:hover {
          background: #222;
        }
        .open-btn:hover {
          color: #2dd4bf !important;
          border-color: #2dd4bf !important;
        }
        .new-btn:hover {
          background: #26bfac !important;
        }
      `}</style>

      <div style={styles.body}>

        {/* Collapsible sidebar */}
        <div className="sidebar" style={styles.sidebar}>
          <div className="nav-item" style={styles.navItem}>
            <IconSettings />
            <span className="nav-label">Settings</span>
          </div>
          <div style={{ flex: 1 }} />
          <div className="nav-item" style={styles.navItem}>
            <IconHelp />
            <span className="nav-label">Help</span>
          </div>
          <div className="nav-item" style={styles.navItem}>
            <IconLogout />
            <span className="nav-label">Logout</span>
          </div>
        </div>

        {/* Main content */}
        <main style={styles.main}>
          <div style={styles.pageHeading}>
            <div>
              <h1 style={styles.h1}>Workspaces</h1>
              <p style={styles.subtitle}>Select a workspace to open its graph and notes.</p>
            </div>
            <button
              className="new-btn"
              style={styles.newBtn}
              onClick={() => setShowNewForm(!showNewForm)}
            >
              + New Workspace
            </button>
          </div>

          {showNewForm && (
            <div style={styles.newForm}>
              <input
                style={styles.input}
                placeholder="Workspace name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <button style={styles.createBtn} onClick={handleCreate}>Create</button>
              <button style={styles.cancelBtn} onClick={() => { setShowNewForm(false); setNewName(""); }}>
                Cancel
              </button>
            </div>
          )}

          <div style={styles.toolbar}>
            <div style={styles.searchWrap}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "#555", flexShrink: 0 }}>
                <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input style={styles.searchInput} placeholder="search" />
            </div>
            <button style={styles.filterBtn}>Status ▾</button>
            <button style={styles.filterBtn}>Sort by... ⇅</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
              <button style={styles.viewBtn}>⊞</button>
              <button style={styles.viewBtn}>☰</button>
            </div>
          </div>

          {workspaces.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No workspaces yet. Create one to get started.</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {workspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onDelete={handleDelete}
                  onOpen={handleOpen}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    height: "100%",
  },
  sidebar: {
    background: "#1a1a1a",
    borderRight: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    padding: "12px 0",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "9px 18px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  navIcon: {
    color: "#666",
    flexShrink: 0,
  },
  main: {
    flex: 1,
    padding: "40px",
    overflowY: "auto",
  },
  pageHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "28px",
  },
  h1: {
    fontFamily: "Mukta Vaani, sans-serif",
    fontSize: "34px",
    fontWeight: "bold",
    margin: "0 0 12px 0",
    color: "#eee",
  },
  subtitle: {
    fontSize: "13px",
    color: "#555",
    margin: 0,
  },
  newBtn: {
    padding: "9px 18px",
    background: "linear-gradient(#71F7DC 12%, #3DD6D0 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "20px",
    fontFamily: "Mukta Vaani, sans-serif",
    fontSize: "13px",
    cursor: "pointer",
  },
  newForm: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "24px",
    padding: "14px 16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "10px",
    border: "1px solid #2a2a2a",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    background: "#111",
    border: "1px solid #333",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#ddd",
    outline: "none",
  },
  createBtn: {
    padding: "8px 16px",
    backgroundColor: "#3DD6D0",
    color: "#0a2e2a",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#666",
    border: "1px solid #333",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#1e1e1e",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "7px 12px",
    maxWidth: "260px",
    flex: 1,
  },
  searchInput: {
    background: "none",
    border: "none",
    outline: "none",
    color: "#aaa",
    fontSize: "13px",
    width: "100%",
  },
  filterBtn: {
    background: "#1e1e1e",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "7px 12px",
    fontSize: "12px",
    color: "#888",
    cursor: "pointer",
  },
  viewBtn: {
    background: "#1e1e1e",
    border: "1px solid #2a2a2a",
    borderRadius: "6px",
    padding: "6px 9px",
    cursor: "pointer",
    color: "#666",
    fontSize: "14px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "14px",
  },
  card: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#444",
    fontSize: "12px",
    cursor: "pointer",
    padding: "2px 4px",
    lineHeight: 1,
  },
  cardName: {
    margin: "14px 0 0 0",
    fontSize: "15px",
    fontWeight: "bold",
    color: "#ddd",
  },
  cardMeta: { //info
    fontSize: "11px",
    color: "#555",
    marginTop: "8px",
    lineHeight: 1.6,
  },
  cardOpen: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "flex-end",
  },
  openBtn: {
    background: "none",
    border: "1px solid #333",
    borderRadius: "6px",
    padding: "6px 14px",
    fontSize: "12px",
    color: "#ffffff",
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  },
  confirmRow: {
    marginTop: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  confirmText: {
    fontSize: "11px",
    color: "#555",
    flex: 1,
  },
  confirmYes: {
    padding: "5px 12px",
    backgroundColor: "#3DD6D0",
    color: "#ffffff",
    border: "none",
    borderRadius: "5px",
    fontSize: "11px",
    cursor: "pointer",
  },
  confirmNo: {
    padding: "5px 12px",
    backgroundColor: "transparent",
    color: "#666",
    border: "1px solid #333",
    borderRadius: "5px",
    fontSize: "11px",
    cursor: "pointer",
  },
  empty: {
    textAlign: "center",
    padding: "80px 20px",
  },
  emptyText: {
    color: "#444",
    fontSize: "14px",
  },
};

