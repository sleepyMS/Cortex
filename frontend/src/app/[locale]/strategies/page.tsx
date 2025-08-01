// frontend/src/app/[locale]/strategies/page.tsx

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import apiClient from "@/lib/apiClient";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { StrategyCard } from "@/components/domain/strategy/StrategyCard";
import { PlusCircle, Search as SearchIcon } from "lucide-react";

interface StrategyResponse {
  id: number;
  author_id: number;
  name: string;
  description?: string | null;
  rules: any;
  is_public: boolean;
  created_at: string;
  updated_at?: string | null;
}

export default function StrategiesPage() {
  const t = useTranslations("StrategiesPage");

  // --- 상태 관리 (필터, 정렬, 페이지네이션) ---
  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const [actualSearchTerm, setActualSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "public" | "private"
  >("all");
  const [sortBy, setSortBy] = useState<
    "created_at_desc" | "updated_at_desc" | "name_asc"
  >("created_at_desc");
  const [page, setPage] = useState(0);
  const limit = 12;

  // 👈 검색어 디바운싱 로직 (주석 처리 또는 제거하여 명시적 검색으로 대체)
  // useEffect(() => {
  //   const handler = setTimeout(() => {
  //     setSearchTerm(inputSearchTerm);
  //     setPage(0);
  //   }, 300);
  //   return () => {
  //     clearTimeout(handler);
  //   };
  // }, [inputSearchTerm]);

  // 👈 검색 버튼 클릭 또는 엔터 키 입력 시 실제 검색을 트리거하는 함수
  const handleSearch = () => {
    setActualSearchTerm(inputSearchTerm);
    setPage(0); // 검색 시 페이지 리셋
  };

  // 👈 엔터 키 입력 핸들러 정의
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const {
    data: strategies,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<StrategyResponse[], Error>({
    queryKey: ["userStrategies", actualSearchTerm, filterStatus, sortBy, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("skip", (page * limit).toString());
      params.append("limit", limit.toString());
      if (actualSearchTerm) params.append("search_query", actualSearchTerm);

      if (filterStatus === "public") {
        params.append("is_public_filter", "true");
      } else if (filterStatus === "private") {
        params.append("is_public_filter", "false");
      }

      params.append("sort_by", sortBy);

      const { data } = await apiClient.get(`/strategies?${params.toString()}`);
      return data;
    },
    staleTime: 1000 * 60,
    keepPreviousData: true,
  });

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="container mx-auto max-w-5xl px-4 py-8 flex h-full min-h-[400px] items-center justify-center">
          <Spinner size="lg" />
          <p className="ml-4 text-muted-foreground">{t("loadingStrategies")}</p>
        </div>
      </AuthGuard>
    );
  }

  if (isError) {
    return (
      <AuthGuard>
        <div className="container mx-auto max-w-5xl px-4 py-8 text-destructive-foreground text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">
            {t("errorLoadingTitle")}
          </h1>
          <p className="mb-2">
            {t("fetchError", { errorDetail: error.message })}
          </p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            {t("retryLoad")}
          </Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <Link href="/strategies/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> {t("createNewStrategy")}
            </Button>
          </Link>
        </div>

        {/* 검색, 필터, 정렬 컨트롤 */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="relative col-span-1 md:col-span-2 flex items-center">
            <Input
              placeholder={t("searchPlaceholder")}
              value={inputSearchTerm}
              onChange={(e) => setInputSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress} // 👈 엔터 키 핸들러 연결
              className="pl-3 pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearch}
              className="absolute right-0 h-full rounded-r-md hover:bg-primary/10 hover:text-primary"
            >
              <SearchIcon className="h-4 w-4" />
            </Button>
          </div>

          <Select
            value={filterStatus}
            onValueChange={(value: "all" | "public" | "private") => {
              setFilterStatus(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("filterPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
              <SelectItem value="public">{t("filterPublic")}</SelectItem>
              <SelectItem value="private">{t("filterPrivate")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(
              value: "created_at_desc" | "updated_at_desc" | "name_asc"
            ) => {
              setSortBy(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("sortByPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">
                {t("sortByNewest")}
              </SelectItem>
              <SelectItem value="updated_at_desc">
                {t("sortByLastUpdated")}
              </SelectItem>
              <SelectItem value="name_asc">{t("sortByNameAsc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="my-8" />

        {/* 전략 목록 */}
        {!strategies || strategies.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[200px]">
            <p className="mb-4">{t("noStrategiesAvailable")}</p>
            <Link href="/strategies/new" passHref>
              <Button variant="secondary">
                <PlusCircle className="mr-2 h-4 w-4" /> {t("createNewStrategy")}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} />
            ))}
          </div>
        )}

        {/* 페이지네이션 컨트롤 */}
        {strategies && strategies.length > 0 && (
          <div className="flex justify-center mt-8 space-x-4">
            <Button
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page === 0}
              variant="outline"
            >
              {t("pagination.previous")}
            </Button>
            <Button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={strategies.length < limit}
              variant="outline"
            >
              {t("pagination.next")}
            </Button>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
