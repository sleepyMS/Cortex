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
import { PlanAvatar } from "@/components/ui/PlanAvatar"; // PlanAvatar 경로 수정 가정

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
  featuredPostId?: string;
}

// --- 애니메이션 효과를 정의 ---
const barVariants = {
  hidden: {
    y: 50, // 아래쪽 50px 위치에서 시작
    opacity: 0,
  },
  visible: {
    y: 0, // 최종 위치로 이동
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      staggerChildren: 0.2, // 자식 요소들을 0.1초 간격으로 애니메이션
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

// Zod 스키마
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

    // featuredStrategyId와 featuredPostId에 transform을 추가하여,
    // 빈 문자열이나 null이 제출될 경우 undefined로 변환합니다.
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

export function ProfileManagementTab() {
  const t = useTranslations("Dashboard.profile");
  const { user } = useUserStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const formSchema = createProfileSchema(t);

  // 데이터 로딩: 현재 사용자 프로필, 판매 전략, 커뮤니티 게시물
  const { data: profileData, isLoading: isLoadingProfile } =
    useQuery<UserProfile>({
      queryKey: ["userProfile", user?.id],
      queryFn: async () => (await apiClient.get(`/users/me/profile`)).data,
      enabled: !!user,
    });

  const { data: myStrategies, isLoading: isLoadingStrategies } = useQuery<
    StrategyInList[]
  >({
    queryKey: ["myStrategiesForProfile", user?.id],
    queryFn: async () => (await apiClient.get("/strategies")).data, // 현재 유저의 전략 목록 API
    enabled: !!user,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const { isDirty } = form.formState;

  useEffect(() => {
    if (profileData) {
      form.reset({
        username: profileData.username || "",
        bio: profileData.bio || "",
        socialLinks: {
          twitter: profileData.socialLinks?.twitter || "",
          github: profileData.socialLinks?.github || "",
          website: profileData.socialLinks?.website || "",
        },
        featuredStrategyId: profileData.featuredStrategyId || undefined,
        featuredPostId: profileData.featuredPostId || undefined,
      });
    }
  }, [profileData, form.reset]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      apiClient.put("/users/me/profile", data),
    onSuccess: () => {
      toast.success(t("saveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });
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

  if (isLoadingProfile) {
    return <Skeleton className="w-full h-96" />;
  }

  return (
    <Form {...form}>
      {/* --- 👇 [2. 핵심 수정] onSumbit을 form 태그가 아닌, 플로팅 바의 '저장' 버튼에서 처리합니다. --- */}
      <div className="space-y-8">
        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            {/* --- 👇 [3. 핵심 수정] 버튼을 form 바깥으로 빼내고, type="button"을 명시합니다. --- */}
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{t("basicInfo.title")}</CardTitle>
                <CardDescription>{t("basicInfo.description")}</CardDescription>
              </div>
              <Button
                type="button" // 폼 제출 방지
                variant="outline"
                onClick={() => router.push(`/profile/${user?.username}`)}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {t("viewPublicProfile")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 flex flex-col items-center gap-4 pt-4">
              <PlanAvatar username={profileData?.username} />
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                        // "none"을 선택하면 form의 상태를 null로 설정
                        field.onChange(value === "none" ? null : value);
                      }}
                      value={field.value || "none"} // form 상태가 null 또는 undefined일 때 "none"을 표시
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
                        {myStrategies &&
                          myStrategies.map((strategy) => (
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
      </div>

      <div className="p-2" />

      {/* --- isDirty가 true일 때만 보이는 플로팅 저장 바 --- */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            className="sticky bottom-4 inset-x-0 flex justify-center z-10"
            variants={barVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-4xl p-3 bg-background/80 backdrop-blur-lg border rounded-lg shadow-2xl flex items-center justify-between">
              <motion.span
                className="text-sm font-semibold text-foreground"
                variants={itemVariants}
              >
                {t("unsavedChanges")}
              </motion.span>
              <motion.div className="space-x-2" variants={itemVariants}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset()}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  {t("saveChanges")}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Form>
  );
}
