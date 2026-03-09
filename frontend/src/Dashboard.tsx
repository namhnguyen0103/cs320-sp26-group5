// TODO: implement main dashboard
    // This is just a placeholder page to test auth
    // Frontend guys build an actual dashboard
    // Encase auth-sensitive stuff in ProtectedRoute in App



export default function Dashboard() {
  return (
    <div style={styles.page}>
      <div style={styles.box}>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.subtitle}>This is a placeholder page for now.</p>
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
};