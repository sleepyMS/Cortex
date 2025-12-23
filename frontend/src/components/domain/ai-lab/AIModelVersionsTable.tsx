"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { AIModelVersion } from "@/types/ai";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
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
import { activateModelVersion } from "@/lib/api/ai";
import { toast } from "sonner";
import { RotateCcw, Loader2 } from "lucide-react";

interface AIModelVersionsTableProps {
  modelId: string;
  versions: AIModelVersion[];
  onVersionActivated: () => void;
  isOptimized?: boolean;
}

export const AIModelVersionsTable: React.FC<AIModelVersionsTableProps> = ({
  modelId,
  versions,
  onVersionActivated,
  isOptimized = false,
}) => {
  const t = useTranslations("AILabPage");
  const [selectedVersion, setSelectedVersion] = useState<AIModelVersion | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleRollbackClick = (version: AIModelVersion) => {
    setSelectedVersion(version);
    setIsDialogOpen(true);
  };

  const handleConfirmRollback = async () => {
    if (!selectedVersion) return;

    setIsActivating(true);
    try {
      await activateModelVersion(modelId, selectedVersion.id);
      toast.success(
        t("detail.versionsTable.dialog.success", {
          version: selectedVersion.versionNumber,
        })
      );
      onVersionActivated();
      setIsDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(t("detail.versionsTable.dialog.error"));
    } finally {
      setIsActivating(false);
      setSelectedVersion(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {isOptimized
                  ? t("detail.versionsTable.trialId")
                  : t("detail.versionsTable.version")}
              </TableHead>
              <TableHead>{t("detail.versionsTable.createdAt")}</TableHead>
              <TableHead>{t("detail.versionsTable.trainingPeriod")}</TableHead>
              <TableHead>{t("detail.versionsTable.metrics")}</TableHead>
              <TableHead>{t("detail.versionsTable.status")}</TableHead>
              <TableHead className="text-right">
                {t("detail.versionsTable.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">
                  v{v.versionNumber}
                </TableCell>
                <TableCell>
                  {format(new Date(v.createdAt), "yyyy-MM-dd HH:mm")}
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(v.trainingStartDate), "yyyy-MM-dd")} ~{" "}
                    {format(new Date(v.trainingEndDate), "yyyy-MM-dd")}
                  </div>
                </TableCell>
                <TableCell>
                  {v.metrics?.accuracy ? (
                    <Badge variant="outline">
                      acc: {(v.metrics.accuracy * 100).toFixed(1)}%
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {v.isActive ? (
                    <Badge
                      variant="default"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      {t("detail.versionsTable.active")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {t("detail.versionsTable.history")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!v.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRollbackClick(v)}
                      title={
                        isOptimized
                          ? t("detail.versionsTable.applyTrial")
                          : t("detail.versionsTable.rollbackVersion")
                      }
                      className={
                        isOptimized
                          ? "text-violet-400 hover:text-violet-300"
                          : ""
                      }
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {isOptimized
                        ? t("detail.versionsTable.apply")
                        : t("detail.versionsTable.rollback")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {versions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("detail.versionsTable.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isOptimized
                ? t("detail.versionsTable.dialog.applyTitle")
                : t("detail.versionsTable.dialog.rollbackTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isOptimized
                ? t("detail.versionsTable.dialog.applyDesc", {
                    version: selectedVersion?.versionNumber,
                  })
                : t("detail.versionsTable.dialog.rollbackDesc", {
                    version: selectedVersion?.versionNumber,
                  })}
              <br />
              <br />
              {t("detail.versionsTable.dialog.warning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivating}>
              {t("detail.management.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRollback}
              disabled={isActivating}
              className="bg-primary"
            >
              {isActivating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isOptimized
                    ? t("detail.versionsTable.dialog.activating")
                    : t("detail.versionsTable.dialog.rollbacking")}
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {isOptimized
                    ? t("detail.versionsTable.dialog.confirmApply")
                    : t("detail.versionsTable.dialog.confirmRollback")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
