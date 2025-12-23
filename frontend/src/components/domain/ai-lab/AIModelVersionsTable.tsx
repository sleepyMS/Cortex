"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { AIModelVersion } from "@/types/ai";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
      toast.success(`버전 ${selectedVersion.versionNumber}으로 롤백되었습니다`);
      onVersionActivated();
      setIsDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("버전 활성화에 실패했습니다");
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
              <TableHead>{isOptimized ? "Trial ID" : "Version"}</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Training Period</TableHead>
              <TableHead>Metrics</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">History</Badge>
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
                          ? "Apply this Trial"
                          : "Rollback to this version"
                      }
                      className={
                        isOptimized
                          ? "text-violet-400 hover:text-violet-300"
                          : ""
                      }
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {isOptimized ? "Apply" : "Rollback"}
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
                  No history available.
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
              {isOptimized ? "시도(Trial) 적용 확인" : "버전 롤백 확인"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isOptimized
                ? `선택한 시도(Trial #${selectedVersion?.versionNumber})의 설정을 모델에 적용하시겠습니까?`
                : `버전 ${selectedVersion?.versionNumber}으로 롤백하시겠습니까?`}
              <br />
              <br />이 버전이 활성화되면 AI 신호 생성에 사용되는 모델이
              변경됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivating}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRollback}
              disabled={isActivating}
              className="bg-primary"
            >
              {isActivating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  롤백 중...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  롤백
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
