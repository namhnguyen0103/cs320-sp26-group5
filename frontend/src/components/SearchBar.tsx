// src/components/SearchBar.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export default function SearchBar({
  placeholder = "Search...",
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (onSearch) {
      onSearch(trimmed);
    } else {
      // Default: navigate to a search results page with query param
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <span style={styles.icon}>⌕</span>
        <input
          style={styles.input}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        {query && (
          <button style={styles.clearBtn} onClick={() => setQuery("")}>
            ✕
          </button>
        )}
        <button style={styles.searchBtn} onClick={handleSearch}>
          Search
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  container: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#fff",
    border: "1px solid #e5e5e0",
    borderRadius: "10px",
    padding: "8px 14px",
    width: "100%",
    maxWidth: "560px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    fontFamily: "'Georgia', serif",
  },
  icon: {
    fontSize: "18px",
    color: "#aaa",
    userSelect: "none" as const,
    lineHeight: 1,
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "14px",
    color: "#1a1a1a",
    backgroundColor: "transparent",
    fontFamily: "'Georgia', serif",
  },
  clearBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    color: "#aaa",
    padding: "0 4px",
    lineHeight: 1,
  },
  searchBtn: {
    padding: "6px 14px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
    whiteSpace: "nowrap" as const,
  },
};