import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Shape of a workspace object: id changed to string to support Supabase UUIDs
type Workspace = {
  id: string;
  name: string;
};

// A single Workspace Card: receives the workspace object and two callbacks (onDelete and onOpen)
function WorkspaceCard({workspace, onDelete, onOpen}: {workspace: Workspace; onDelete: (id: string) => void; onOpen: (id: string) => void;}) {
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

// Default Export is Home
export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showNewForm, setShowNewForm] = useState(false); 
  const [newName, setNewName] = useState("");

  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");

  // Fetch workspaces from backend when the component loads
  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    fetch(`http://localhost:8000/workspaces/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("No workspaces found");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkspaces(data);
        }
      })
      .catch((err) => console.log("No workspaces yet or error fetching:", err));
  }, [userId, navigate]);

  // Sends DELETE request to backend, then updates UI
  async function handleDelete(id: string) {
    try {
      const res = await fetch(`http://localhost:8000/workspaces/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete workspace");
      
      setWorkspaces(workspaces.filter((w) => w.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error deleting workspace.");
    }
  }

  // Routes to the text editor with the workspace ID in the URL
  function handleOpen(id: string) {
    navigate(`/editor/${id}`);
  }

  // Sends POST request to create workspace in database, then updates UI
  async function handleCreate() {
    if (!newName.trim() || !userId) return; 
    
    try {
      const res = await fetch("http://localhost:8000/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: newName.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to create workspace");

      const newWorkspace = await res.json();
      setWorkspaces([...workspaces, newWorkspace]); 
      setNewName(""); 
      setShowNewForm(false); 
    } catch (error) {
      console.error(error);
      alert("Error creating workspace. Is the backend running?");
    }
  }

  return (
    <div style={styles.page}>
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