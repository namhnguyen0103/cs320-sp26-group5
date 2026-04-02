// src/components/Navbar.tsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.email.split("@")[0] || "Guest";

  function handleLogout() {
    signOut();
    navigate("/login");
  }

  return (
    <header style={styles.topBar}>
      <div style={styles.logo}>◈ Synapse</div>
      <nav style={styles.navLinks}>
        <Link style={styles.link} to="/">
          Home
        </Link>
        <Link style={styles.link} to="/dashboard">
          Dashboard
        </Link>
        <Link style={styles.link} to="/editor">
          Text Editor
        </Link>
        <Link style={styles.link} to="/login">
          Login
        </Link>
        <Link style={styles.link} to="/signup">
          Signup
        </Link>
      </nav>
      <div style={styles.userArea}>
        <span style={styles.userName}>{displayName}</span>
        <div style={styles.avatar}>{displayName[0].toUpperCase()}</div>
        {user && (
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

const styles = {
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
  navLinks: {
    display: "flex",
    gap: "16px",
  },
  link: {
    color: "#1a1a1a",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
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
  logoutBtn: {
    padding: "6px 12px",
    marginLeft: "8px",
    backgroundColor: "#c0392b",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
  },
};