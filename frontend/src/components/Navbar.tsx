// src/components/Navbar.tsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import SearchBar from "./SearchBar";
import logoImage from "../assets/synapse_logo.png";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.email?.split("@")[0] || "Guest";

  function handleLogout() {
    signOut();
    navigate("/login");
  }

  return (
    <header style={styles.topBar}>
      {/* logo, breadcrumb*/}
      <div style={styles.left}>
        <img src={logoImage} alt="Synapse logo" style={styles.logoImg} />
        <Link to="/" style={styles.logo}>SYNAPSE</Link>
        <span style={styles.slash}>/</span>
        <span style={styles.breadcrumb}>Workspaces</span>
      </div>

      {/* links, might get rid of? */}
      <nav style={styles.navLinks}>
        <Link style={styles.link} to="/">Home</Link>
        <Link style={styles.link} to="/login">Login</Link>
        <Link style={styles.link} to="/signup">Signup</Link>
      </nav>
      <SearchBar placeholder="Search Synapse..." />

      {/* user, notifs, logout*/}
      <div style={styles.userArea}>
        <span style={styles.userName}>{displayName}</span>
        <div style={styles.avatar}>{displayName[0].toUpperCase()}</div>
        {user && (
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        )}
        <svg style={styles.bell} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1a5 5 0 00-5 5v2.5L2 10h12l-1-1.5V6a5 5 0 00-5-5zm0 14a2 2 0 01-2-2h4a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 14px",
    height: "44px",
    background: "#111",
    flexShrink: 0,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logo: {
    fontSize: "15px",
    fontWeight: "bold",
    color: "#eee",
    textDecoration: "none",
    letterSpacing: "0.3px",
    fontFamily: "Krona One, sans-serif",
  },
  logoImg: {
    width: "20px",
    marginBottom: "3px",
    

  },
  slash: {
    color: "#ffffff",
    fontSize: "14px",
  },
  breadcrumb: {
    color: "#ffffff",
    fontSize: "13px",
  },
  navLinks: {
    display: "flex",
    gap: "20px",
  },
  link: {
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 500,
  },
  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  userName: {
    fontSize: "13px",
    color: "#ffffff",
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "#333",
    color: "#eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
  },
  logoutBtn: {
    padding: "5px 12px",
    backgroundColor: "#3DD6D0",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
  },
  bell: {
    color: "#ffffff",
    flexShrink: 0,
  },
};