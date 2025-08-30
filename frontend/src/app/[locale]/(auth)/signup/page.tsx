// file: frontend/src/app/[locale]/signup/page.tsx

import SignupForm from "@/components/domain/SignupForm";
import AuthLayout from "@/components/layout/AuthLayout"; // 새로 만든 AuthLayout import

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
