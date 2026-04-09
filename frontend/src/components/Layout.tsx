// src/components/Layout.tsx
import type { ReactNode } from "react";
import Navbar from "./Navbar";

type LayoutProps = {
  children: ReactNode;
  fullWidth?: boolean;
};

export default function Layout({
  children,
  fullWidth = false,
}: LayoutProps) {
  return (
    <div style={styles.page}>
      <Navbar />
      <div
        style={fullWidth
          ? styles.contentFullWidth
          : styles.content}
      >
        {children}
      </div>
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
  contentFullWidth: {
    paddingTop: "24px",
    width: "100%",
  },
};