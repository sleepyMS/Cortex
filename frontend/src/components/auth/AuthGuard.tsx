"use client";

import { useUserStore } from "@/store/userStore";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthInitialized, accessToken } = useUserStore();

  useEffect(() => {
    if (isAuthInitialized && !accessToken) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthInitialized, accessToken, router, pathname]);

  if (isAuthInitialized && !accessToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
