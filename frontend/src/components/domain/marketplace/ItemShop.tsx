// file: frontend/src/components/domain/marketplace/ItemShop.tsx
"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { ShopItem } from "@/types/marketplace";

// 1. 중앙화된 커스텀 훅 import
import { useShopItems, usePurchaseMutation } from "@/hooks/useMarketplace";
import { useUserInventory } from "@/hooks/useInventory";

// 2. UI 컴포넌트 import
import { ShopItemCard } from "./ShopItemCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";

export const ItemShop = () => {
  const t = useTranslations("Marketplace");

  // 3. 상태 관리: 모달 상태 및 선택된 아이템 정보
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  // 4. 데이터 로직: 중앙화된 훅 사용
  const { data: items, isLoading, isError, error, refetch } = useShopItems();
  const { data: ownedItemIds = [], isLoading: isLoadingInventory } =
    useUserInventory();
  const purchaseMutation = usePurchaseMutation();

  // 5. 이벤트 핸들러: 구매 버튼 클릭 시 모달 열기
  const handlePurchaseClick = (item: ShopItem) => {
    setSelectedItem(item);
    setIsConfirmModalOpen(true);
  };

  // 6. 이벤트 핸들러: 모달에서 최종 구매 확정
  const handleConfirmPurchase = () => {
    if (selectedItem) {
      purchaseMutation.mutate(
        { type: "item", id: selectedItem.id },
        {
          onSuccess: () => {
            setIsConfirmModalOpen(false);
            setSelectedItem(null);
          },
        }
      );
    }
  };

  // --- 렌더링 로직 ---

  // 로딩 상태 처리
  if (isLoading || isLoadingInventory) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // 에러 상태 처리
  if (isError) {
    return (
      <Alert variant="destructive" className="mt-8 max-w-lg mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("loadError")}</AlertTitle>
        <AlertDescription>
          {error?.message || "아이템 목록을 불러오는 데 실패했습니다."}
        </AlertDescription>
        <Button onClick={() => refetch()} className="mt-4">
          {t("retryButton")}
        </Button>
      </Alert>
    );
  }

  // 메인 렌더링
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items?.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            // 7. 보유 여부(isOwned) prop 전달
            isOwned={ownedItemIds.includes(item.id)}
            // 8. 구매 뮤테이션 대신 모달 열기 핸들러 연결
            onPurchase={() => handlePurchaseClick(item)}
            // 9. 구매 진행 중 상태는 선택된 아이템에만 한정하여 전달
            isPurchasing={
              purchaseMutation.isPending &&
              purchaseMutation.variables?.id === item.id
            }
          />
        ))}
      </div>

      {/* 10. 구매 확인 모달 (Dialog) */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("purchaseConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("purchaseConfirmDescription", {
                itemName: selectedItem?.name,
                price: selectedItem?.price.toFixed(2),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">{t("cancelButton")}</Button>
            </DialogClose>
            <Button
              onClick={handleConfirmPurchase}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending && (
                <Spinner className="mr-2 h-4 w-4" />
              )}
              {t("confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
