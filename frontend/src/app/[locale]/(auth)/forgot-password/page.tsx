// file: frontend/src/app/[locale]/(auth)/forgot-password/page.tsx

import ForgotPasswordForm from "@/components/domain/auth/ForgotPasswordForm";
import AuthLayout from "@/components/layout/AuthLayout";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
