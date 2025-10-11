"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import apiClient from "@/lib/apiClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

interface EmailVerificationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}

export default function EmailVerificationDialog({
  isOpen,
  onOpenChange,
  email,
}: EmailVerificationDialogProps) {
  const t = useTranslations("Auth.VerificationDialog");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post("/auth/request-email-verification", { email });
      setSuccess(t("resendSuccess"));
    } catch (err: any) {
      setError(err.response?.data?.detail || t("resendErrorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>

        {success && (
          <Alert variant="default" className="my-4">
            <AlertTitle>{t("successTitle")}</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="my-4">
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
          <Button onClick={handleResend} disabled={isLoading}>
            {isLoading && <Spinner size="sm" className="mr-2" />}
            {t("resendButton")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
