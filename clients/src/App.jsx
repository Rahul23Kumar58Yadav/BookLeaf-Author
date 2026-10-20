import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import Topbar from "./components/layout/Topbar.jsx";
import Spinner from "./components/common/Spinner.jsx";

import LoginPage from "./pages/auth/LoginPage.jsx";
import MyBooksPage from "./pages/author/MyBooksPage.jsx";
import NewTicketPage from "./pages/author/NewTicketPage.jsx";
import MyTicketsPage from "./pages/author/MyTicketsPage.jsx";
import TicketDetailPage from "./pages/author/TicketDetailPage.jsx";
import TicketQueuePage from "./pages/admin/TicketQueuePage.jsx";
import TicketWorkspacePage from "./pages/admin/TicketWorkspacePage.jsx";

/** Where each role lands after login (and when they hit "/"). */
const homeFor = (user) => (user?.role === "admin" ? "/admin/tickets" : "/books");

/** Sidebar + topbar around every signed-in page. */
function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** "/" and unknown URLs: send people to their own home, or to login. */
function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={user ? homeFor(user) : "/login"} replace />;
}

/** The login page is pointless once signed in, so bounce to the role's home. */
function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to={homeFor(user)} replace /> : <LoginPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      {/* Author area. The server enforces access too; these guards only decide what the UI shows. */}
      <Route element={<ProtectedRoute role="author" />}>
        <Route element={<AppLayout />}>
          <Route path="/books" element={<MyBooksPage />} />
          <Route path="/tickets" element={<MyTicketsPage />} />
          <Route path="/tickets/new" element={<NewTicketPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Route>
      </Route>

      {/* Admin area */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/tickets" element={<TicketQueuePage />} />
          <Route path="/admin/tickets/:id" element={<TicketWorkspacePage />} />
        </Route>
      </Route>

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}