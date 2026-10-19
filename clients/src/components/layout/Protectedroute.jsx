import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { PageSpinner } from "../common";
import { homeFor } from "./navConfig";

/**
 * Route guard. Usage in App.jsx:
 *   <Route element={<ProtectedRoute roles={["author"]} />}> ...author routes... </Route>
 * This is UX only; the API enforces the real access rules.
 */
export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner label="Checking your session" />;

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;

  return <Outlet />;
}