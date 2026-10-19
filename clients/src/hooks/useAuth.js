import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/** → { user, loading, isAdmin, login(email, password), logout() } */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}