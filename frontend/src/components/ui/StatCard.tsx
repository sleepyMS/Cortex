import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

// StatCard가 받을 Props 타입 정의
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ElementType;
  description?: string;
  colorClass?: string;
  isLoading?: boolean;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  colorClass,
  isLoading,
}: StatCardProps) => {
  const content = (
    <>
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div>
        <div
          className={cn("text-2xl font-bold", colorClass)}
          data-testid="stat-card-value"
        >
          {value}
        </div>
      </div>
    </>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-2/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        {description ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">{content}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          content
        )}
      </CardHeader>
    </Card>
  );
};
