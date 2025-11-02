// file: src/components/domain/dashboard/ProfileManagementTab.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/userStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import Link from "next/link";
import { StrategyInList } from "@/types/strategy";

// UI 컴포넌트
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Link as LinkIcon,
  Save,
  Twitter,
  Github,
  Bot,
  Loader2,
  Globe,
  X,
} from "lucide-react";
import { PlanAvatar } from "@/components/ui/PlanAvatar";

// 타입 정의
interface UserProfile {
  username: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    website?: string;
  };
  featuredStrategyId?: string;
  featuredPostId?: string; // 👈 비록 지금은 사용하지 않지만, 원본 파일에 있으므로 유지합니다.
}

// --- 애니메이션 효과를 정의 ---
const barVariants = {
  hidden: {
    y: 50,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      staggerChildren: 0.2,
    },
  },
  exit: {
    y: 50,
    opacity: 0,
  },
} as const;

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
} as const;

// Zod 스키마 (파일 최상단에서 t를 인자로 받도록 수정)
const createProfileSchema = (t: any) =>
  z.object({
    username: z.string().min(3, t("validation.usernameMinLength")),
    bio: z.string().max(200, t("validation.bioMaxLength")).optional(),
    socialLinks: z
      .object({
        twitter: z.string().optional(),
        github: z.string().optional(),
        website: z
          .string()
          .url(t("validation.websiteUrl"))
          .or(z.literal(""))
          .optional(),
      })
      .optional(),
    featuredStrategyId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => val || undefined),
    featuredPostId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => val || undefined),
  });

// --- 1. 폼 로직을 별도 자식 컴포넌트로 분리 ---
function ProfileForm({ profileData }: { profileData: UserProfile }) {
  const t = useTranslations("Dashboard.profile");
  const { user } = useUserStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const formSchema = createProfileSchema(t);

  // 'myStrategies' 쿼리는 폼 내부(자식)에서 호출
  const { data: myStrategies, isLoading: isLoadingStrategies } = useQuery<
    StrategyInList[]
  >({
    queryKey: ["myStrategiesForProfile", user?.id],
    queryFn: async () => (await apiClient.get("/strategies")).data,
    enabled: !!user,
  });

  // 'useForm'이 profileData를 props로 받아 *동기적으로* defaultValues를 설정
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: profileData.username || "",
      bio: profileData.bio || "",
      socialLinks: {
        twitter: profileData.socialLinks?.twitter || "",
        github: profileData.socialLinks?.github || "",
        website: profileData.socialLinks?.website || "",
      },
      featuredStrategyId: profileData.featuredStrategyId || undefined,
      featuredPostId: profileData.featuredPostId || undefined,
    },
  });

  const { isDirty } = form.formState;

  // 'useEffect' + 'form.reset'은 더 이상 필요 없음

  const updateProfileMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiClient.put("/users/me/profile", data),
    onSuccess: (data) => {
      toast.success(t("saveSuccess"));

      // 1. react-query(Zustand) 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });

      // 2. 폼 상태를 'clean'으로 변경
      form.reset(form.getValues());

      // 3. Next.js의 클라이언트 사이드 라우터 캐시를 강제 갱신
      //    이것이 '뒤로 가기'나 <Link> 클릭 시 새 데이터를 보장합니다.
      router.refresh();
    },
    onError: (error: any) => {
      toast.error(
        t("saveError", { error: error.response?.data?.detail || error.message })
      );
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateProfileMutation.mutate(values);
  };

  return (
    <Form {...form}>
      {/* 폼이 여러 카드를 감싸는 것이 아니라, 
         플로팅 바와 폼 데이터를 공유하기 위한 래퍼 역할만 합니다. */}

      {/* 폼 태그는 개별 카드 그룹을 감싸도록 수정 (여기서는 모든 카드를 감싸도 무방) */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInfo.title")}</CardTitle>
            <CardDescription>{t("basicInfo.description")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 flex flex-col items-center gap-4 pt-4">
              {/* PlanAvatar는 props로 받은 profileData를 사용 */}
              <PlanAvatar username={profileData.username} />
            </div>
            <div className="md:col-span-2 space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("usernameLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bioLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("bioPlaceholder")}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 소셜 링크 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("socialLinks.title")}</CardTitle>
            <CardDescription>{t("socialLinks.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="socialLinks.twitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Twitter className="h-4 w-4 mr-2" />{" "}
                    {t("socialLinks.twitterLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://twitter.com/username"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="socialLinks.github"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Github className="h-4 w-4 mr-2" />{" "}
                    {t("socialLinks.githubLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/username"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="socialLinks.website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Globe className="h-4 w-4 mr-2" />{" "}
                    {t("socialLinks.websiteLabel")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("socialLinks.websitePlaceholder")}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 대표 콘텐츠 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("featuredContent.title")}</CardTitle>
            <CardDescription>
              {t("featuredContent.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="featuredStrategyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Bot className="h-4 w-4 mr-2" />
                    {t("featuredContent.strategyLabel")}
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value === "none" ? null : value);
                    }}
                    value={field.value || "none"}
                    // 폼이 초기화될 때 field.value(예: "저장된ID")가
                    // 이미 설정되어 있으므로, Select는 올바른 값을 표시합니다.
                  >
                    <FormControl>
                      <SelectTrigger disabled={isLoadingStrategies}>
                        <SelectValue
                          placeholder={
                            isLoadingStrategies
                              ? t("featuredContent.loading")
                              : t("featuredContent.selectPlaceholder")
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("featuredContent.none")}
                      </SelectItem>
                      {/* isLoadingStrategies가 true일 때는 Select가 비활성화되므로,
                        myStrategies가 undefined일 때 map을 돌려도 안전합니다.
                      */}
                      {myStrategies?.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("featuredContent.strategyDescription")}
                  </FormDescription>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>

      <div className="p-2" />

      {/* 플로팅 저장 바 */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            className="sticky bottom-4 inset-x-0 flex justify-center z-10 px-4"
            variants={barVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="w-full max-w-4xl p-3 bg-background/80 backdrop-blur-lg border rounded-lg shadow-2xl flex items-center">
              <motion.span
                className="text-sm font-semibold text-foreground hidden sm:inline"
                variants={itemVariants}
              >
                {t("unsavedChanges")}
              </motion.span>
              <motion.div
                className="flex items-center gap-2 ml-auto"
                variants={itemVariants}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset()} // form.reset()은 defaultValues로 복원
                >
                  <X className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("cancel")}</span>
                </Button>
                <Button
                  type="button"
                  // 폼 제출은 폼 내부의 submit이 아닌, 여기서 트리거
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">{t("saveChanges")}</span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Form>
  );
}

// --- 2. 부모 컴포넌트: 데이터 로딩 및 스켈레톤 담당 ---
export function ProfileManagementTab() {
  const t = useTranslations("Dashboard.profile");
  const { user } = useUserStore();
  const router = useRouter();

  // 부모는 오직 'userProfile' 쿼리만 담당
  const { data: profileData, isLoading: isLoadingProfile } =
    useQuery<UserProfile>({
      queryKey: ["userProfile", user?.id],
      queryFn: async () => (await apiClient.get(`/users/me/profile`)).data,
      enabled: !!user,
      // 폼의 기본값을 설정하는 데 사용되므로,
      // 캐시된 데이터(stale)를 사용하지 않고 항상 최신 데이터를 가져옵니다.
      staleTime: 0,
    });

  // 프로필 로딩 중이거나, 로드에 실패했거나, 데이터가 없으면 스켈레톤 표시
  if (isLoadingProfile || !profileData) {
    return <Skeleton className="w-full h-96" />;
  }

  // '내 공개 프로필 보기' 버튼은 폼과 관련 없으므로 부모에 배치
  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={`/profile/${profileData.username}`}>
            <LinkIcon className="mr-2 h-4 w-4" />
            {t("viewPublicProfile")}
          </Link>
        </Button>
      </div>

      {/* 로드된 profileData를 props로 전달하며 실제 폼(자식)을 렌더링 */}
      <ProfileForm profileData={profileData} />
    </div>
  );
}
