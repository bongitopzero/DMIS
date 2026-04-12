import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import API from "../api/axios";
import { ToastManager, ToastContainer } from "./Toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Coordinator");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const navigate = useNavigate();

  // Subscribe to toast manager
  useEffect(() => {
    const unsubscribe = ToastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🔐 Attempting login with:", { email, password: "***" });
      
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      console.log("✅ Login successful. Response:", res.data);

      const userData = {
        token: res.data.token,
        user: {
          id: res.data._id,
          name: res.data.name,
          email: res.data.email,
          role: res.data.role,
          ministry: res.data.ministry || "",
        },
      };

      console.log("💾 Storing user data:", userData);
      localStorage.setItem("user", JSON.stringify(userData));
      
      const roleRoutes = {
        "Coordinator": "/dashboard",
        "Finance Officer": "/finance-dashboard",
        "Data Clerk": "/disaster-events",
        "Administrator": "/admin-dashboard",
      };

      const redirectPath = roleRoutes[res.data.role] || "/unauthorized";
      console.log("🚀 Redirecting to:", redirectPath);
      
      // Show success notification
      ToastManager.success(`✅ Welcome back, ${res.data.name}! Redirecting...`, 3000);
      
      // Redirect after brief delay to show notification
      setTimeout(() => {
        navigate(redirectPath);
      }, 1500);

    } catch (err) {
      console.error("❌ Login error:", err);
      console.error("Error response:", err.response?.data);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      {/* Toast Notifications */}
      <ToastContainer 
        toasts={toasts} 
        onRemove={(id) => {
          ToastManager.remove(id);
        }}
      />

      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-2xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to access the disaster management dashboard
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
            >
              <option value="Coordinator">DMA Coordinator</option>
              <option value="Data Clerk">Data Clerk</option>
              <option value="Finance Officer">Finance Officer</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-blue-900 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/40 disabled:bg-blue-400"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
