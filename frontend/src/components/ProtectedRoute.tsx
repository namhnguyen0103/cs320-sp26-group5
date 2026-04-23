// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // TODO: add in-between loading state for style points
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}