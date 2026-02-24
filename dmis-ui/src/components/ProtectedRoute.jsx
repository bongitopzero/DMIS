import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const storedUser = localStorage.getItem("user");

  // Not logged in
  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  const { user } = JSON.parse(storedUser);

  console.log("ProtectedRoute check:", {
    userRole: user.role,
    allowedRoles: allowedRoles,
    isAllowed: allowedRoles && allowedRoles.includes(user.role),
  });

  // Role not allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn(
      `Access denied. User role "${user.role}" not in allowed roles: `,
      allowedRoles
    );
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
