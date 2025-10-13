"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Twitter, Github, Globe } from "lucide-react";
import { PlanAvatar } from "@/components/ui/PlanAvatar";
import { Button } from "@/components/ui/Button";
import type { UserProfile } from "@/types/user";

export function UserProfileDisplay({ profile }: { profile: UserProfile }) {
  const t = useTranslations("PublicProfile");

  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
      <PlanAvatar username={profile.username} size="lg" />
      <div className="flex-1 text-center md:text-left">
        <h1 className="text-4xl font-bold">{profile.username}</h1>
        {profile.bio && (
          <p className="mt-2 text-lg text-muted-foreground">{profile.bio}</p>
        )}
        <div className="mt-4 flex justify-center md:justify-start items-center gap-4">
          {profile.socialLinks?.twitter && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={profile.socialLinks.twitter} target="_blank">
                <Twitter className="h-5 w-5" />
              </Link>
            </Button>
          )}
          {profile.socialLinks?.github && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={profile.socialLinks.github} target="_blank">
                <Github className="h-5 w-5" />
              </Link>
            </Button>
          )}
          {profile.socialLinks?.website && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={profile.socialLinks.website} target="_blank">
                <Globe className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
