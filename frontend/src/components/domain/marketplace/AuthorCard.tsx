// file: src/components/domain/marketplace/AuthorCard.tsx

"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import Link from "next/link";

interface Author {
  username?: string;
  avatarUrl?: string;
}

interface AuthorCardProps {
  author: Author;
}

export function AuthorCard({ author }: AuthorCardProps) {
  const t = useTranslations("Marketplace.AuthorCard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          href={`/profile/${author.username}`}
          className="flex items-center gap-4 group"
        >
          <Avatar>
            <AvatarImage src={author.avatarUrl} />
            <AvatarFallback>
              {author.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold group-hover:underline">
              {author.username}
            </p>
            <p className="text-xs text-muted-foreground">{t("viewProfile")}</p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
