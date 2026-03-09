import { useState } from "react";
import { db_client } from "./auth/client.ts";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleSubmit() {
    const { data, error } = await db_client.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert(error.message);
      return;
    }

    alert("Login successful!");
    console.log(data.session);  // DELETE

    // TODO: redirect to dashboard, populate with user's data
    navigate("/home");
  }

  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <h1 style={styles.title}>Synapse</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

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
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <button style={styles.btn} onClick={handleSubmit}>
          Sign In
        </button>

        <p style={styles.footer}>
          Don't have an account? <a href="/signup" style={styles.link}>Sign up</a>
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
