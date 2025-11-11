// file: frontend/src/components/domain/marketplace/PurchaseConfirmationModal.tsx
"use client";

import { useTranslations } from "next-intl";
import { MarketplaceStrategy, ShopItem } from "@/types/marketplace";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface PurchaseConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  product: MarketplaceStrategy | ShopItem | null;
  isPending: boolean;
}

export const PurchaseConfirmationModal = ({
  isOpen,
  onOpenChange,
  onConfirm,
  product,
  isPending,
}: PurchaseConfirmationModalProps) => {
  const t = useTranslations("Marketplace");

  if (!product) return null;

  // 상품 타입에 따라 다른 번역 키를 사용
  const descriptionKey =
    product.productType === "STRATEGY"
      ? "purchaseConfirmDescriptionPaidCredit"
      : "purchaseConfirmDescriptionCredit";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("purchaseConfirmTitle")}</DialogTitle>
          <DialogDescription>
            {t(descriptionKey, {
              productName: product.name,
              price: product.price.toLocaleString(),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">{t("Common.cancel")}</Button>
          </DialogClose>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending && <Spinner className="mr-2 h-4 w-4" />}
            {t("Common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
