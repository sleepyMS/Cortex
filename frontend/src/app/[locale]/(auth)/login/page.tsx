// file: frontend/src/app/[locale]/login/page.tsx

import LoginForm from "@/components/domain/LoginForm";
import AuthLayout from "@/components/layout/AuthLayout"; // 새로 만든 AuthLayout import

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
