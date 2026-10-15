import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Dashboard from "./components/Dashboard";
import WorkspacePage from "./components/WorkspacePage";
import Login from "./components/Login";
import Signup from "./components/Signup";

function isTokenValid() {
  const token = localStorage.getItem("token");

  if (!token) return false;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return false;

    const base64 = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))
    );

    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem("token");
      return false;
    }

    return true;
  } catch {
    localStorage.removeItem("token");
    return false;
  }
}

function ProtectedRoute({ children }) {
  if (!isTokenValid()) {
    return <Navigate to="/signup" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/signup" replace />}
        />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspace/:workspaceId"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={<Navigate to="/signup" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
