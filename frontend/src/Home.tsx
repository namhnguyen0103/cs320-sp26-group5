import { useState } from "react";

// Shape of a workspace object: add more fields here later (ex. createdAt)
type Workspace = {
  id: number;
  name: string;
};

// Placeholder data: will be replaced by a Supabase fetch later
const INITIAL_WORKSPACES: Workspace[] = [
  { id: 1, name: "CS Notes" },
  { id: 2, name: "CS320 Project" },
  { id: 3, name: "Coding Ideas" },
];

// A single Workspace Card: receives the workspace object and two callbacks (onDelete and onOpen)
function WorkspaceCard({workspace, onDelete,onOpen}: {workspace: Workspace; onDelete: (id: number) => void; onOpen: (id: number) => void;}) {
  // Tracks whether the delete confirmation is showing for this card
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardIcon}>◈</span>
        <button style={styles.deleteBtn} onClick={() => setConfirmDelete(true)} title="Delete workspace">
          ✕
        </button>
      </div>

      <h3 style={styles.cardName}>{workspace.name}</h3>

      {/* Show a confirm prompt on delete click, otherwise just the Open button */}
      {confirmDelete ? (
        <div style={styles.confirmRow}>
          <span style={styles.confirmText}>Delete this workspace?</span>
          <button style={styles.confirmYes} onClick={() => onDelete(workspace.id)}>Yes</button>
          <button style={styles.confirmNo} onClick={() => setConfirmDelete(false)}>No</button>
        </div>
      ) : (
        <button style={styles.openBtn} onClick={() => onOpen(workspace.id)}>Open →</button>
      )}
    </div>
  );
}

// Default Export is Home, meaning that this is rendered when navigated to. And then we call WorkspaceCard within here
export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [showNewForm, setShowNewForm] = useState(false); //  whether the "create new workspace" form is visible
  const [newName, setNewName] = useState("");

  function handleDelete(id: number) {
    setWorkspaces(workspaces.filter((w) => w.id !== id));
  }

  // Placeholder: will be replaced with real navigation once routing is set up
  function handleOpen(id: number) {
    alert(`Opening workspace ${id}: navigation goes here!`);
  }

  function handleCreate() {
    if (!newName.trim()) return; // do nothing if input is blank
    const newWorkspace: Workspace = {
      id: 8, // temp ID (lucky number) until the backend assigns a real one
      name: newName.trim(),
    };
    setWorkspaces([...workspaces, newWorkspace]); // add to workspaces list
    setNewName(""); // clear the input
    setShowNewForm(false); // hide the form
  }

  return (
    <div style={styles.page}>
      <header style={styles.topBar}>
        <div style={styles.logo}>◈ Synapse</div>
        <div style={styles.userArea}>
          {/* Hardcoded for now: swap in real user from auth later */}
          <span style={styles.userName}>Michael</span>
          <div style={styles.avatar}>M</div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.pageHeading}>
          <div>
            <h1 style={styles.h1}>My Workspaces</h1>
            <p style={styles.subtitle}>Select a workspace to open its graph and notes.</p>
          </div>
          <button style={styles.newBtn} onClick={() => setShowNewForm(!showNewForm)}>
            + New Workspace
          </button>
        </div>

        {/* New workspace form: only renders when showNewForm is true */}
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

        {workspaces.length === 0 ? (
          // if empty, then display message
          <div style={styles.empty}>
            <p style={styles.emptyText}>No workspaces yet. Create one to get started.</p>
          </div>
        ) : (
          // If not empty, then this loop below draws all the cards onto the screen
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
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f9f9f7",
    fontFamily: "'Georgia', serif",
    color: "#1a1a1a",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 40px",
    borderBottom: "1px solid #e5e5e0",
    backgroundColor: "#ffffff",
  },
  logo: {
    fontSize: "20px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
    color: "#1a1a1a",
  },
  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userName: {
    fontSize: "14px",
    color: "#555",
  },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold",
  },
  main: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "48px 24px",
  },
  pageHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "32px",
  },
  h1: {
    fontSize: "28px",
    fontWeight: "bold",
    margin: "0 0 6px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#777",
    margin: 0,
  },
  newBtn: {
    padding: "10px 18px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  newForm: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginBottom: "28px",
    padding: "16px 20px",
    backgroundColor: "#fff",
    borderRadius: "10px",
    border: "1px solid #e5e5e0",
  },
  input: {
    flex: 1,
    padding: "9px 13px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
  },
  createBtn: {
    padding: "9px 16px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "9px 16px",
    backgroundColor: "transparent",
    color: "#555",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "18px",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e5e0",
    borderRadius: "12px",
    padding: "22px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    transition: "box-shadow 0.15s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardIcon: {
    fontSize: "18px",
    color: "#aaa",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#bbb",
    fontSize: "13px",
    cursor: "pointer",
    padding: "2px 4px",
    lineHeight: 1,
  },
  cardName: {
    margin: "4px 0 0 0",
    fontSize: "17px",
    fontWeight: "bold",
  },
  openBtn: {
    marginTop: "12px",
    padding: "8px 0",
    backgroundColor: "transparent",
    border: "1px solid #1a1a1a",
    borderRadius: "7px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#1a1a1a",
  },
  confirmRow: {
    marginTop: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  confirmText: {
    fontSize: "12px",
    color: "#555",
    flex: 1,
  },
  confirmYes: {
    padding: "5px 12px",
    backgroundColor: "#c0392b",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    fontSize: "12px",
    cursor: "pointer",
  },
  confirmNo: {
    padding: "5px 12px",
    backgroundColor: "transparent",
    color: "#555",
    border: "1px solid #ccc",
    borderRadius: "5px",
    fontSize: "12px",
    cursor: "pointer",
  },
  empty: {
    textAlign: "center" as const,
    padding: "80px 20px",
  },
  emptyText: {
    color: "#aaa",
    fontSize: "15px",
  },
};