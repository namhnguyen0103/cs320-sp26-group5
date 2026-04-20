// src/components/Layout.tsx
import type { ReactNode } from "react";
import Navbar from "./Navbar";

type LayoutProps = {
  children: ReactNode;
  fullWidth?: boolean;
};

export default function Layout({ children, fullWidth = false }: LayoutProps) {
  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.tealBar} />
      <div style={fullWidth ? styles.contentFullWidth : styles.content}>
        {children}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    maxHeight:"100vh",
    backgroundColor: "#111",
    fontFamily: "Mukta Vaani, sans-serif",
    color: "#ddd",
    display: "flex",
    flexDirection: "column",
  },
  tealBar: {
    height: "3px",
    background: "#3DD6D0",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  contentFullWidth: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
};