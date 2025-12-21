// file: frontend/src/app/[locale]/login/page.tsx

import LoginForm from "@/components/domain/auth/LoginForm";
import AuthLayout from "@/components/layout/AuthLayout";

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
