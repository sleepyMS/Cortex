"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/userStore";
import { useDeleteAccountMutation } from "@/hooks/useUserMutations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Loader2 } from "lucide-react";

export function DangerZoneCard() {
  const t = useTranslations("Dashboard.settings.dangerZone");
  const { user } = useUserStore();
  const deleteAccountMutation = useDeleteAccountMutation();

  const [confirmInput, setConfirmInput] = useState("");
  const isConfirmationMatching = confirmInput === user?.username;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">{t("deleteButton")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("dialog.description1")}
                <br />
                <strong>{t("dialog.description2")}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="confirm-username">
                {t("dialog.confirmLabel", { username: user?.username })}
              </Label>
              <Input
                id="confirm-username"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("dialog.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={
                  !isConfirmationMatching || deleteAccountMutation.isPending
                }
                onClick={() => deleteAccountMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAccountMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("dialog.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
