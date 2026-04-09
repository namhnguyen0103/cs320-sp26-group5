import { ReactTyped } from "react-typed";
import { Link } from "react-router-dom";
export function Landing() {
  return (
  <div style={styles.page}>
    <div style={styles.content}>
      <h1 style={styles.logo}>
        <ReactTyped strings={["Synapse"]} typeSpeed={100} showCursor={false} />
      </h1>
      <p style={styles.headline}>
        <ReactTyped
          strings={["Synchronous, Collaborative, and Graphical"]}
          typeSpeed={60}
          showCursor={false}
        />
      </p>
      <div style={styles.buttonRow}>
        <button style={styles.box}><Link style={styles.link} to="/signup">
                  Get Started!
                </Link></button>
        <button style={styles.box2}><Link style={styles.link} to="/login">
                  Login
                </Link></button>
      </div>
    </div>

    <div>
        <h1 style={styles.headline}>Public/Private Workspaces</h1>
        <p style={styles.paragraph}>Toggle between public and private, allowing you to work solo or as a team</p>
    </div>

    <div>
        <h1 style={styles.headline}>Real-Time Collaboration</h1>
        <p style={styles.paragraph}>Edit notes, rearrange graphs simultaneously as a team. Every new sync changes instantly!</p>
    </div>

    <div>
        <h1 style={styles.headline}>Visual Note Graph</h1>
        <p style={styles.paragraph}>Every note turns into a dot! Watch as you connect between the dots!</p>
    </div>
  </div>
);
}

const styles = {
  paragraph:{
    fontFamily: "'Inter', sans-serif",
  },
  page: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "left",
    minHeight: "70vh",
    backgroundColor: "#f9f8f6",
    fontFamily: "'Inter', sans-serif",
    padding: "0 10%",
  },

  logo: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    fontSize: "4rem",
    fontWeight: "normal",
    color: "#333",
    margin: "0 0 10px 0",
    fontThickness: "0.05em",
    alignSelf: "flex-start",
  },

  box: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    fontSize: "1.25rem",
    fontWeight: "normal",
    color: "#333",
    backgroundColor: "#f9f8f6",
    border: "1px solid #f9f8f6",
    borderRadius: "14px",
    padding: "25px",
    marginLeft: "-385px",
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column" as const,
    alignSelf: "flex-start",
    flex: 1,
  },

  headline: {
    margin: "0 0 0 0",
    fontSize: "1.8rem",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "normal",
    color: "#1d1d1d",
    alignSelf: "flex-start"
  },

 box2: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    fontSize: "1.25rem",
    fontWeight: "normal",
    color: "#333",
    backgroundColor: "#f9f8f6",
    border: "1px solid #f9f8f6",
    borderRadius: "14px",
    padding: "25px",
    marginLeft: "-285px",
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column" as const,
    alignSelf: "flex-start",
    flex: 1,
  },

content: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",          
},

buttonRow: {
  display: "flex",
  flexDirection: "row",
  gap: "300px",  // space between the buttons
  alignItems: "center",
},

link: {
    color: "#1a1a1a",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 500,
},

};