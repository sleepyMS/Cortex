import React from "react";
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
import { activateModelVersion } from "@/lib/api/ai";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

interface AIModelVersionsTableProps {
  modelId: string;
  versions: AIModelVersion[];
  onVersionActivated: () => void;
}

export const AIModelVersionsTable: React.FC<AIModelVersionsTableProps> = ({
  modelId,
  versions,
  onVersionActivated,
}) => {
  const handleActivate = async (version: AIModelVersion) => {
    // In a real app, use a nice dialog. For now, native confirm is fine.
    if (
      !confirm(
        `Are you sure you want to rollback to version ${version.versionNumber}? \nThis will change the active model used for signals.`
      )
    ) {
      return;
    }

    try {
      await activateModelVersion(modelId, version.id);
      toast.success(`Version ${version.versionNumber} activated successfully`);
      onVersionActivated();
    } catch (e) {
      console.error(e);
      toast.error("Failed to activate version");
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
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
              <TableCell className="font-medium">v{v.versionNumber}</TableCell>
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
                {/* Display simple metrics if available */}
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
                    onClick={() => handleActivate(v)}
                    title="Rollback to this version"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Rollback
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
  );
};
