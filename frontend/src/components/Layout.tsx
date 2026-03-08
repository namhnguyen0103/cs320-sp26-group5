// src/components/Layout.tsx
import type { ReactNode } from "react";
import Navbar from "./Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>{children}</div>
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
  content: {
    paddingTop: "24px",
    maxWidth: "960px",
    margin: "0 auto",
  },
};