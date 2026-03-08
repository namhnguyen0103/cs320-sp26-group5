import { useState } from "react";
import { db_client } from "./auth/client";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const navigate = useNavigate();

  async function handleSubmit() {
    if (password !== confirm) {
      alert("Passwords don't match");
      return;
    }
    
    const { data, error } = await db_client.auth.signUp({
      email,
      password
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created! Check your email to verify.");
    console.log(data.user)  // DELETE

    navigate("/login");
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <h1 style={styles.title}>Synapse</h1>
        <p style={styles.subtitle}>Create an account</p>

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button style={styles.btn} onClick={handleSubmit}>
          Sign Up
        </button>

        <p style={styles.footer}>
          Already have an account? <a href="/login" style={styles.link}>Sign in</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f9f9f7",
    fontFamily: "'Georgia', serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    backgroundColor: "#fff",
    border: "1px solid #e5e5e0",
    borderRadius: "12px",
    padding: "40px",
    width: "100%",
    maxWidth: "380px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  subtitle: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    color: "#777",
  },
  input: {
    padding: "9px 13px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "'Georgia', serif",
  },
  btn: {
    marginTop: "4px",
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "'Georgia', serif",
  },
  footer: {
    margin: 0,
    fontSize: "13px",
    color: "#777",
    textAlign: "center" as const,
  },
  link: {
    color: "#1a1a1a",
    fontWeight: "bold",
  },
};
