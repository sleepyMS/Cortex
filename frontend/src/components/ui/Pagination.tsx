// file: frontend/src/components/ui/Pagination.tsx
"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/Button";

// --- 1. 기본 UI 부품 정의 ---

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = { isActive?: boolean } & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({ variant: isActive ? "default" : "ghost", size }),
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

// --- 2. 로직을 처리하는 메인 컴포넌트 ---

interface PaginationComponentProps {
  count: number;
  page: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

const usePaginationRange = ({
  count,
  page,
  siblingCount = 1,
}: PaginationComponentProps) => {
  return React.useMemo(() => {
    const totalPageNumbers = siblingCount + 5;
    if (totalPageNumbers >= count) {
      return Array.from({ length: count }, (_, i) => i + 1);
    }
    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, count);
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < count - 2;
    const firstPageIndex = 1;
    const lastPageIndex = count;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "...", count];
    }
    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => count - rightItemCount + 1 + i
      );
      return [firstPageIndex, "...", ...rightRange];
    }
    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
    }
    return [];
  }, [count, page, siblingCount]);
};

export function PaginationComponent({
  count,
  page,
  onPageChange,
  siblingCount = 1,
}: PaginationComponentProps) {
  const paginationRange = usePaginationRange({
    count,
    page,
    onPageChange,
    siblingCount,
  });

  if (count <= 1) {
    return null;
  }

  const handlePreviousPage = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (page > 1) onPageChange(page - 1);
  };

  const handleNextPage = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (page < count) onPageChange(page + 1);
  };

  const handlePageClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    pageNumber: number
  ) => {
    e.preventDefault();
    onPageChange(pageNumber);
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={handlePreviousPage}
            className={
              page === 1 ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
        {paginationRange.map((pageNumber, index) => (
          <PaginationItem key={`${pageNumber}-${index}`}>
            {typeof pageNumber === "string" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                onClick={(e) => handlePageClick(e, pageNumber)}
                isActive={page === pageNumber}
              >
                {pageNumber}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={handleNextPage}
            className={
              page === count ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
