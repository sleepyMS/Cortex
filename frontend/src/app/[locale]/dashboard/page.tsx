import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardClient />
    </AuthGuard>
  );
}
