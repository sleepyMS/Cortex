// file: frontend/src/components/common/BackButton.tsx
"use client";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
