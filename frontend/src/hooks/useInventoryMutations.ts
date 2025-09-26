// // file: frontend/src/hooks/useInventoryMutations.ts
// "use client";

// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { useTranslations } from "next-intl";
// import { toast } from "sonner";
// import apiClient from "@/lib/apiClient";
// import { UserInventoryItem } from "./useInventory"; // 상세 타입 import

// // --- API 호출 함수 ---

// /**
//  * 특정 인스턴스 ID의 아이템을 사용하는 API를 호출합니다.
//  * @param instanceId - 사용할 아이템의 고유 인스턴스 ID
//  */
// const useItemApiFn = async (instanceId: string): Promise<any> => {
//   const { data } = await apiClient.post(
//     `/users/me/inventory/${instanceId}/use`
//   );
//   return data;
// };

// // --- 커스텀 훅 ---

// /**
//  * 인벤토리의 아이템을 사용하는 뮤테이션 훅입니다.
//  * 낙관적 업데이트를 통해 즉각적인 UI 피드백을 제공합니다.
//  */
// export const useUseItemMutation = () => {
//   const queryClient = useQueryClient();
//   const t = useTranslations("Inventory");

//   return useMutation({
//     mutationFn: useItemApiFn,

//     /**
//      * 뮤테이션이 시작되기 전에 실행됩니다. (낙관적 업데이트)
//      * UI를 즉시 업데이트하여 빠른 사용자 경험을 제공합니다.
//      */
//     onMutate: async (instanceId: string) => {
//       // 진행 중인 refetch를 취소하여 낙관적 업데이트를 덮어쓰지 않도록 합니다.
//       await queryClient.cancelQueries({ queryKey: ["userInventoryDetails"] });

//       // 이전 인벤토리 데이터의 스냅샷을 만듭니다.
//       const previousInventory = queryClient.getQueryData<UserInventoryItem[]>([
//         "userInventoryDetails",
//       ]);

//       // 인벤토리 캐시를 직접 업데이트하여 해당 아이템의 상태를 '사용됨'으로 변경합니다.
//       queryClient.setQueryData<UserInventoryItem[]>(
//         ["userInventoryDetails"],
//         (oldInventory = []) =>
//           oldInventory.map((item) =>
//             item.instanceId === instanceId ? { ...item, isUsed: true } : item
//           )
//       );

//       // 롤백에 사용할 스냅샷 데이터를 반환합니다.
//       return { previousInventory };
//     },

//     /**
//      * 뮤테이션이 실패했을 때 실행됩니다.
//      * 낙관적 업데이트를 이전 상태로 롤백합니다.
//      */
//     onError: (err: any, variables, context) => {
//       // onMutate에서 반환된 스냅샷으로 데이터를 복원합니다.
//       if (context?.previousInventory) {
//         queryClient.setQueryData(
//           ["userInventoryDetails"],
//           context.previousInventory
//         );
//       }
//       toast.error(
//         t("useItemError", { error: err.response?.data?.detail || err.message })
//       );
//     },

//     /**
//      * 뮤테이션이 성공적으로 완료된 후 실행됩니다.
//      */
//     onSuccess: () => {
//       toast.success(t("useItemSuccess"));
//     },

//     /**
//      * 뮤테이션의 성공/실패 여부와 관계없이 항상 마지막에 실행됩니다.
//      * 서버의 최신 상태와 UI를 동기화합니다.
//      */
//     onSettled: () => {
//       queryClient.invalidateQueries({ queryKey: ["userInventoryDetails"] });
//       // 아이템 사용으로 인해 사용자 정보(e.g., 백테스트 가능 횟수)가 변경될 수 있으므로 함께 갱신
//       queryClient.invalidateQueries({ queryKey: ["user", "me"] });
//     },
//   });
// };
