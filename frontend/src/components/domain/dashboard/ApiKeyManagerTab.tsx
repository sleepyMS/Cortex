"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import apiClient from "@/lib/apiClient";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { PlusCircle, Trash2, KeyRound, Loader2 } from "lucide-react";

// UI 컴포넌트
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";

// 타입 정의
interface ApiKey {
  id: string;
  exchange: string;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
}

// Zod 스키마 생성 함수
const createApiKeySchema = (t: any) =>
  z.object({
    exchange: z.string().min(2, t("form.validation.exchangeRequired")),
    apiKey: z.string().min(10, t("form.validation.apiKeyRequired")),
    secretKey: z.string().min(10, t("form.validation.secretKeyRequired")),
    memo: z.string().optional(),
  });

// API 호출 함수
const fetchApiKeys = async (): Promise<ApiKey[]> => {
  const { data } = await apiClient.get("/api_keys");
  return data;
};

export function ApiKeyManagerTab() {
  const t = useTranslations("Dashboard.settings.apiKeys");
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);

  const apiKeySchema = createApiKeySchema(t);
  const form = useForm<z.infer<typeof apiKeySchema>>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { exchange: "binance", apiKey: "", secretKey: "", memo: "" },
  });

  const {
    data: apiKeys,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: fetchApiKeys,
  });

  const addKeyMutation = useMutation({
    mutationFn: (newKey: z.infer<typeof apiKeySchema>) =>
      apiClient.post("/api_keys", newKey),
    onSuccess: () => {
      toast.success(t("addSuccess"));
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(
        t("addError", { error: error.response?.data?.detail || error.message })
      );
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (keyId: string) => apiClient.delete(`/api_keys/${keyId}`),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      setKeyToDelete(null);
    },
    onError: (error: any) => {
      toast.error(
        t("deleteError", {
          error: error.response?.data?.detail || error.message,
        })
      );
    },
  });

  const onAddSubmit = (values: z.infer<typeof apiKeySchema>) => {
    addKeyMutation.mutate(values);
  };

  const handleDeleteConfirm = () => {
    if (keyToDelete) {
      deleteKeyMutation.mutate(keyToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return <p className="text-destructive">{t("loadError")}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("addButton")}
              </Button>
            </DialogTrigger>
            <DialogContent className="p-6 sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t("form.title")}</DialogTitle>
                <DialogDescription>{t("form.description")}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onAddSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="exchange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.exchangeLabel")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.apiKeyLabel")}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.secretKeyLabel")}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="memo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.memoLabel")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("form.memoPlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={addKeyMutation.isPending}>
                      {addKeyMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("form.submitButton")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.exchange")}</TableHead>
                <TableHead>{t("table.memo")}</TableHead>
                <TableHead>{t("table.registeredAt")}</TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys && apiKeys.length > 0 ? (
                apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">
                      {key.exchange}
                    </TableCell>
                    <TableCell>{key.memo || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(key.createdAt), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setKeyToDelete(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <KeyRound className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    {t("table.empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <AlertDialog
          open={!!keyToDelete}
          onOpenChange={(open) => !open && setKeyToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDialog.description", {
                  exchange: keyToDelete?.exchange,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setKeyToDelete(null)}>
                {t("deleteDialog.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteKeyMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteKeyMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("deleteDialog.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
