"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Loader2 } from "lucide-react";

// Zod 스키마를 컴포넌트 외부나 별도 파일로 분리하여 관리할 수도 있습니다.
const createPasswordSchema = (t: any) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(8, t("validation.currentPasswordRequired")),
      newPassword: z.string().min(8, t("validation.newPasswordMinLength")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.passwordsMustMatch"),
      path: ["confirmPassword"], // 에러 메시지를 confirmPassword 필드에 표시
    });

export function ChangePasswordForm() {
  const t = useTranslations("Dashboard.settings.password");
  const formSchema = createPasswordSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      return apiClient.put("/users/me/password", {
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      form.reset(); // 성공 시 폼 초기화
    },
    onError: (error: any) => {
      toast.error(
        t("updateError", {
          error: error.response?.data?.detail || error.message,
        })
      );
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updatePasswordMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("currentPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("newPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={updatePasswordMutation.isPending}>
            {updatePasswordMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("saveButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
