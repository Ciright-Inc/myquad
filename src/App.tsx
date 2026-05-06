import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LandingPage } from "@/components/LandingPage";
import { AuthLayout } from "@/components/AuthLayout";
import { QuadrantDashboard } from "@/components/QuadrantDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpHubPage } from "@/pages/SignUpHubPage";
import { SignUpIndividualPage } from "@/pages/SignUpIndividualPage";
import { SignUpEnterprisePage } from "@/pages/SignUpEnterprisePage";

function Protected({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f7f9fb] text-[#2C4F66]">
        Loading…
      </div>
    );
  }
  if (!token) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isOrgAdmin, loading, token } = useAuth();
  if (loading || !token) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f7f9fb] text-[#2C4F66]">
        Loading…
      </div>
    );
  }
  if (!isOrgAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AuthLayout />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpHubPage />} />
        <Route path="/sign-up/individual" element={<SignUpIndividualPage />} />
        <Route path="/sign-up/enterprise" element={<SignUpEnterprisePage />} />
      </Route>
      <Route
        path="/dashboard"
        element={
          <Protected>
            <QuadrantDashboard />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <AdminOnly>
              <AdminDashboard />
            </AdminOnly>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
