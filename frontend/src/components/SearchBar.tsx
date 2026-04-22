import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const API = "http://localhost:8000";

type FileResult = {
  id: string;
  title: string;
  workspace_id: string;
  workspaceName: string;
};

interface SearchBarProps {
  placeholder?: string;
}

export default function SearchBar({ placeholder = "Search files..." }: SearchBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [allFiles, setAllFiles] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Fetch all files across all workspaces (cached in state after first load)
  async function loadFiles() {
    if (!user?.userId || allFiles.length > 0) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token") || "";

      const wsRes = await fetch(`${API}/workspaces/${user.userId}`);
      if (wsRes.status === 404) return;
      if (!wsRes.ok) throw new Error("Failed to fetch workspaces");
      const workspaces: { id: string; name: string }[] = await wsRes.json();

      const perWorkspace = await Promise.all(
        workspaces.map(async (ws) => {
          const res = await fetch(`${API}/workspaces/${ws.id}/files`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return [];
          const files: { id: string; title: string }[] = await res.json();
          return files.map((f) => ({
            id: f.id,
            title: f.title,
            workspace_id: ws.id,
            workspaceName: ws.name,
          }));
        })
      );

      setAllFiles(perWorkspace.flat());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = query.trim()
    ? allFiles.filter((f) => f.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  function handleSelect(file: FileResult) {
    setQuery("");
    setOpen(false);
    navigate(`/editor/${file.workspace_id}`);
  }

  return (
    <div ref={wrapperRef} style={styles.wrapper}>
      <div style={styles.container}>
        <span style={styles.icon}>⌕</span>
        <input
          style={styles.input}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); loadFiles(); }}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        />
        {query && (
          <button style={styles.clearBtn} onClick={() => { setQuery(""); setOpen(false); }}>
            ✕
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div style={styles.dropdown}>
          {loading ? (
            <div style={styles.msg}>Searching...</div>
          ) : filtered.length === 0 ? (
            <div style={styles.msg}>No files found for "{query}"</div>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                style={styles.item}
                onMouseDown={() => handleSelect(f)}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "#888", flexShrink: 0 }}>
                  <path d="M3 2h7l3 3v9H3V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                <span style={styles.fileName}>{f.title}</span>
                <span style={styles.wsName}>{f.workspaceName}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    width: "100%",
    maxWidth: "320px",
  },
  container: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#1e1e1e",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "6px 10px",
  },
  icon: {
    fontSize: "16px",
    color: "#555",
    userSelect: "none",
    lineHeight: 1,
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "13px",
    color: "#ccc",
    backgroundColor: "transparent",
    minWidth: 0,
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
    boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
    zIndex: 200,
    maxHeight: "300px",
    overflowY: "auto",
    padding: "4px",
    minWidth: "260px",
  },
  item: {
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
  fileName: {
    flex: 1,
    fontSize: "13px",
    color: "#1a1a1a",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  wsName: {
    fontSize: "11px",
    color: "#aaa",
    flexShrink: 0,
    maxWidth: "90px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  msg: {
    padding: "12px 16px",
    fontSize: "13px",
    color: "#aaa",
    textAlign: "center",
  },
};
