// file: frontend/src/components/domain/marketplace/MarketplaceFilter.tsx (신규 파일)
"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useDebounce } from "use-debounce";
import { Search, ListFilter, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Button } from "@/components/ui/Button";

// 백엔드와 협의된 필터 옵션
const STRATEGY_CATEGORIES = [
  "Scalping",
  "Swing",
  "TrendFollowing",
  "Grid",
  "Arbitrage",
];

interface MarketplaceFilterProps {
  onFilterChange: (filters: {
    searchTerm?: string;
    sortBy?: string;
    categories?: string[];
  }) => void;
  isFetching: boolean;
}

export const MarketplaceFilter = ({
  onFilterChange,
  isFetching,
}: MarketplaceFilterProps) => {
  const t = useTranslations("Marketplace.filters");

  // 필터 상태 관리
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500); // 500ms 디바운스
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // 필터 상태가 변경될 때마다 부모 컴포넌트로 알림
  useEffect(() => {
    onFilterChange({
      searchTerm: debouncedSearchTerm,
      sortBy,
      categories: selectedCategories,
    });
  }, [debouncedSearchTerm, sortBy, selectedCategories, onFilterChange]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSortBy("createdAt_desc");
    setSelectedCategories([]);
  };

  const hasActiveFilters =
    searchTerm || sortBy !== "createdAt_desc" || selectedCategories.length > 0;

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isFetching}
        />
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full md:w-auto"
              disabled={isFetching}
            >
              <ListFilter className="mr-2 h-4 w-4" />
              {t("filterButton")}
              {selectedCategories.length > 0 && (
                <span className="ml-2 h-6 px-2 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                  {selectedCategories.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("categoryLabel")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STRATEGY_CATEGORIES.map((category) => (
              <DropdownMenuCheckboxItem
                key={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryChange(category)}
              >
                {category}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={sortBy} onValueChange={setSortBy} disabled={isFetching}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder={t("sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt_desc">{t("sort.newest")}</SelectItem>
            <SelectItem value="totalReturnPct_desc">
              {t("sort.highestReturn")}
            </SelectItem>
            <SelectItem value="mddPct_asc">{t("sort.lowestMdd")}</SelectItem>
            <SelectItem value="price_asc">{t("sort.priceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("sort.priceDesc")}</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            disabled={isFetching}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
