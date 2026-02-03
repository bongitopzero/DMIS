import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const storedUser = localStorage.getItem("user");

  // Not logged in
  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  const { user } = JSON.parse(storedUser);

  // Role not allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
