import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type Workspace = {
  id: string;
  name: string;
};

function WorkspaceCard({workspace, onDelete, onOpen}: {workspace: Workspace; onDelete: (id: string) => void; onOpen: (id: string) => void;}) {
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

      {confirmDelete ? (
        <div style={styles.confirmRow}>
          <span style={styles.confirmText}>Delete this workspace?</span>
          <button style={styles.confirmYes} onClick={() => onDelete(workspace.id)}>Yes</button>
          <button style={styles.confirmNo} onClick={() => setConfirmDelete(false)}>No</button>
        </div>
      ) : (
        <div style={styles.cardActions}>
          <button style={styles.openBtn} onClick={() => onOpen(workspace.id)}>Open →</button>
          <button style={styles.shareBtn} onClick={() => {
            navigator.clipboard.writeText(workspace.id);
            alert("Workspace ID copied! Send this to your teammate.");
          }}>Copy ID</button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showNewForm, setShowNewForm] = useState(false); 
  const [newName, setNewName] = useState("");
  
  // NEW: Join State
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinId, setJoinId] = useState("");

  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");

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
        if (Array.isArray(data)) setWorkspaces(data);
      })
      .catch((err) => console.log("No workspaces yet or error fetching:", err));
  }, [userId, navigate]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`http://localhost:8000/workspaces/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete workspace");
      setWorkspaces(workspaces.filter((w) => w.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error deleting workspace.");
    }
  }

  function handleOpen(id: string) {
    navigate(`/editor/${id}`);
  }

  async function handleCreate() {
    if (!newName.trim() || !userId) return; 
    try {
      const res = await fetch("http://localhost:8000/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name: newName.trim() })
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      const newWorkspace = await res.json();
      setWorkspaces([...workspaces, newWorkspace]); 
      setNewName(""); 
      setShowNewForm(false); 
    } catch (error) {
      console.error(error);
    }
  }

  // NEW: Join Function
  async function handleJoin() {
    if (!joinId.trim()) return;
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`http://localhost:8000/workspaces/${joinId.trim()}/join`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to join");
      
      alert("Joined successfully!");
      window.location.reload(); // Refresh to see the new workspace
    } catch (error) {
      console.error(error);
      alert("Error joining. Ensure the ID is correct.");
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
          <div style={styles.headerButtons}>
            <button style={styles.joinBtn} onClick={() => {setShowJoinForm(!showJoinForm); setShowNewForm(false);}}>
              Join Workspace
            </button>
            <button style={styles.newBtn} onClick={() => {setShowNewForm(!showNewForm); setShowJoinForm(false);}}>
              + New Workspace
            </button>
          </div>
        </div>

        {showNewForm && (
          <div style={styles.newForm}>
            <input style={styles.input} placeholder="Workspace name..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} autoFocus />
            <button style={styles.createBtn} onClick={handleCreate}>Create</button>
            <button style={styles.cancelBtn} onClick={() => { setShowNewForm(false); setNewName(""); }}>Cancel</button>
          </div>
        )}

        {showJoinForm && (
          <div style={styles.newForm}>
            <input style={styles.input} placeholder="Paste Workspace ID here..." value={joinId} onChange={(e) => setJoinId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleJoin()} autoFocus />
            <button style={styles.createBtn} onClick={handleJoin}>Join</button>
            <button style={styles.cancelBtn} onClick={() => { setShowJoinForm(false); setJoinId(""); }}>Cancel</button>
          </div>
        )}

        {workspaces.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>No workspaces yet. Create or join one to get started.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {workspaces.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} onDelete={handleDelete} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  // ... Keep all your existing styles exactly the same, but add these three ...
  headerButtons: { display: "flex", gap: "10px" },
  joinBtn: { padding: "10px 18px", backgroundColor: "transparent", color: "#1a1a1a", border: "1px solid #1a1a1a", borderRadius: "8px", fontSize: "14px", cursor: "pointer" },
  cardActions: { display: "flex", gap: "8px", marginTop: "12px" },
  shareBtn: { flex: 1, padding: "8px 0", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "7px", fontSize: "13px", cursor: "pointer", color: "#475569" },
  
  page: { minHeight: "100vh", backgroundColor: "#f9f9f7", fontFamily: "'Georgia', serif", color: "#1a1a1a" },
  main: { maxWidth: "960px", margin: "0 auto", padding: "48px 24px" },
  pageHeading: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" },
  h1: { fontSize: "28px", fontWeight: "bold", margin: "0 0 6px 0" },
  subtitle: { fontSize: "14px", color: "#777", margin: 0 },
  newBtn: { padding: "10px 18px", backgroundColor: "#1a1a1a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer" },
  newForm: { display: "flex", gap: "10px", alignItems: "center", marginBottom: "28px", padding: "16px 20px", backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e5e5e0" },
  input: { flex: 1, padding: "9px 13px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "14px", outline: "none" },
  createBtn: { padding: "9px 16px", backgroundColor: "#1a1a1a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer" },
  cancelBtn: { padding: "9px 16px", backgroundColor: "transparent", color: "#555", border: "1px solid #ccc", borderRadius: "6px", fontSize: "14px", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "18px" },
  card: { backgroundColor: "#ffffff", border: "1px solid #e5e5e0", borderRadius: "12px", padding: "22px", display: "flex", flexDirection: "column" as const, gap: "8px", transition: "box-shadow 0.15s ease" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardIcon: { fontSize: "18px", color: "#aaa" },
  deleteBtn: { background: "none", border: "none", color: "#bbb", fontSize: "13px", cursor: "pointer", padding: "2px 4px", lineHeight: 1 },
  cardName: { margin: "4px 0 0 0", fontSize: "17px", fontWeight: "bold" },
  openBtn: { flex: 1, padding: "8px 0", backgroundColor: "transparent", border: "1px solid #1a1a1a", borderRadius: "7px", fontSize: "13px", cursor: "pointer", color: "#1a1a1a" },
  confirmRow: { marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" },
  confirmText: { fontSize: "12px", color: "#555", flex: 1 },
  confirmYes: { padding: "5px 12px", backgroundColor: "#c0392b", color: "#fff", border: "none", borderRadius: "5px", fontSize: "12px", cursor: "pointer" },
  confirmNo: { padding: "5px 12px", backgroundColor: "transparent", color: "#555", border: "1px solid #ccc", borderRadius: "5px", fontSize: "12px", cursor: "pointer" },
  empty: { textAlign: "center" as const, padding: "80px 20px" },
  emptyText: { color: "#aaa", fontSize: "15px" }
};