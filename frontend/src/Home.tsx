import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

const API = "http://localhost:8000";

type Workspace = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at?: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

function WorkspaceCard({
  workspace,
  onDelete,
  onOpen,
}: {
  workspace: Workspace;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
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
        Date created: {formatDate(workspace.created_at)}
        {workspace.updated_at && (
          <><br />Last edited: {formatDate(workspace.updated_at)}</>
        )}
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
          <button style={styles.shareBtn} onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(workspace.id);
            alert("Workspace ID copied! Send this to your teammate.");
          }}>Copy ID</button>
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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create / Join State
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinId, setJoinId] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch workspaces from backend
  useEffect(() => {
    if (!user?.userId) return;
    fetchWorkspaces();
  }, [user?.userId]);

  async function fetchWorkspaces() {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/workspaces/${user.userId}`);
      if (res.status === 404) {
        setWorkspaces([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      const data: Workspace[] = await res.json();
      setWorkspaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(id: string) {
    navigate(`/editor/${id}`);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`${API}/workspaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workspace");
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error(err);
      alert("Error deleting workspace.");
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !user?.userId) return;
    try {
      const res = await fetch(`${API}/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.userId, name: newName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      setNewName("");
      setShowNewForm(false);
      await fetchWorkspaces();
    } catch (err) {
      console.error(err);
      alert("Error creating workspace.");
    }
  }

  async function handleJoin() {
    if (!joinId.trim()) return;
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`${API}/workspaces/${joinId.trim()}/join`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to join");
      
      alert("Joined successfully!");
      setJoinId("");
      setShowJoinForm(false);
      await fetchWorkspaces(); // Refresh list automatically
    } catch (error) {
      console.error(error);
      alert("Error joining. Ensure the ID is correct.");
    }
  }

  function handleSearchSelect(workspace: Workspace) {
    setSearchQuery("");
    setSearchOpen(false);
    navigate(`/editor/${workspace.id}`);
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
        .search-dropdown-item:hover {
          background: #f1f5f9;
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
          <div className="nav-item" style={styles.navItem} onClick={signOut}>
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
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={styles.joinBtn}
                onClick={() => { setShowJoinForm(!showJoinForm); setShowNewForm(false); }}
              >
                Join Workspace
              </button>
              <button
                className="new-btn"
                style={styles.newBtn}
                onClick={() => { setShowNewForm(!showNewForm); setShowJoinForm(false); }}
              >
                + New Workspace
              </button>
            </div>
          </div>

          {/* Creation Forms */}
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

          {showJoinForm && (
            <div style={styles.newForm}>
              <input
                style={styles.input}
                placeholder="Paste Workspace ID here..."
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                autoFocus
              />
              <button style={styles.createBtn} onClick={handleJoin}>Join</button>
              <button style={styles.cancelBtn} onClick={() => { setShowJoinForm(false); setJoinId(""); }}>
                Cancel
              </button>
            </div>
          )}

          {/* Search bar with dropdown */}
          <div style={styles.toolbar}>
            <div ref={searchRef} style={styles.searchWrap}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "#555", flexShrink: 0 }}>
                <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                style={styles.searchInput}
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
              />
              {searchQuery && (
                <button
                  style={styles.clearBtn}
                  onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                >
                  ✕
                </button>
              )}

              {/* Dropdown */}
              {searchOpen && (
                <div style={styles.dropdown}>
                  {filteredWorkspaces.length === 0 ? (
                    <div style={styles.dropdownEmpty}>No workspaces found</div>
                  ) : (
                    filteredWorkspaces.map((w) => (
                      <button
                        key={w.id}
                        className="search-dropdown-item"
                        style={styles.dropdownItem}
                        onMouseDown={() => handleSearchSelect(w)}
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: "#888", flexShrink: 0 }}>
                          <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M4 7h8M4 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        <span style={styles.dropdownItemName}>{w.name}</span>
                        <span style={styles.dropdownItemDate}>{formatDate(w.created_at)}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>Loading workspaces...</p>
            </div>
          ) : workspaces.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No workspaces yet. Create or join one to get started.</p>
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
  joinBtn: {
    padding: "9px 18px",
    background: "transparent",
    color: "#3DD6D0",
    border: "1px solid #3DD6D0",
    borderRadius: "20px",
    fontFamily: "Mukta Vaani, sans-serif",
    fontSize: "13px",
    cursor: "pointer",
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
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#1e1e1e",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "7px 12px",
    maxWidth: "360px",
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
  clearBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "11px",
    color: "#555",
    padding: "0 2px",
    lineHeight: 1,
    flexShrink: 0,
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 100,
    maxHeight: "280px",
    overflowY: "auto",
    padding: "4px",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "9px 12px",
    background: "none",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    textAlign: "left",
  },
  dropdownItemName: {
    flex: 1,
    fontSize: "13px",
    color: "#1a1a1a",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dropdownItemDate: {
    fontSize: "11px",
    color: "#aaa",
    flexShrink: 0,
  },
  dropdownEmpty: {
    padding: "12px 16px",
    fontSize: "13px",
    color: "#aaa",
    textAlign: "center",
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
  cardMeta: {
    fontSize: "11px",
    color: "#555",
    marginTop: "8px",
    lineHeight: 1.6,
  },
  cardOpen: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
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
  shareBtn: {
    background: "none",
    border: "1px solid #333",
    borderRadius: "6px",
    padding: "6px 14px",
    fontSize: "12px",
    color: "#aaa",
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