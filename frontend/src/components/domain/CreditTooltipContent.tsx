// file: frontend/src/components/domain/CreditTooltipContent.tsx

import { CreditBalanceSummary } from "@/store/userStore";
import { useTranslations } from "next-intl";
import { Coins, Gift, CalendarClock } from "lucide-react";

interface CreditTooltipContentProps {
  balance: CreditBalanceSummary;
}

// 남은 일수를 계산하는 간단한 헬퍼 함수
const getDaysRemaining = (expiresAt: string) => {
  const now = new Date();
  const expiryDate = new Date(expiresAt);
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export const CreditTooltipContent = ({
  balance,
}: CreditTooltipContentProps) => {
  const t = useTranslations("CreditTooltip");
  const { breakdown } = balance;

  const freeCredits =
    breakdown.expiringWeekly +
    breakdown.event.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-4 w-64 text-sm">
      <div className="flex justify-between items-center font-bold mb-2 pb-2 border-b">
        <span>{t("title")}</span>
        <span className="flex items-center gap-1">
          <Coins className="h-4 w-4 text-yellow-500" />
          {balance.totalBalance.toLocaleString()}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("paid")}</span>
          <span className="font-semibold">
            {breakdown.purchased.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("free")}</span>
          <span className="font-semibold">{freeCredits.toLocaleString()}</span>
        </div>

        {/* 만료 예정 크레딧이 있을 경우에만 표시 */}
        {(breakdown.expiringWeekly > 0 || breakdown.event.length > 0) && (
          <div className="pt-2 border-t border-dashed">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
              <Gift className="h-3 w-3" /> {t("expiringSoon")}
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground/80 pl-2">
              {breakdown.expiringWeekly > 0 && (
                <li className="flex items-center gap-2">
                  <CalendarClock className="h-3 w-3" />
                  <span>
                    {t("weeklyAttendance")}:{" "}
                    {breakdown.expiringWeekly.toLocaleString()}{" "}
                    {t("weeklyReset")}
                  </span>
                </li>
              )}
              {breakdown.event.map((evt, index) => {
                const daysRemaining = getDaysRemaining(evt.expiresAt);
                return (
                  <li key={index} className="flex items-center gap-2">
                    <CalendarClock className="h-3 w-3" />
                    <span>
                      {t("event")}: {evt.amount.toLocaleString()} (
                      {daysRemaining}
                      {t("daysLeft")})
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
