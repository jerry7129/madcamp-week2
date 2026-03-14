"use client";

import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";

interface AccountModalProps {
  onClose: () => void;
}

export default function AccountModal({ onClose }: AccountModalProps) {
  const router = useRouter();

  let user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);

  if (!user) {
    router.push('/');
    return null;
    // user = { email: "test@example.com", nickname: "TestUser", createdAt: "2024-01-01" };
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-black rounded-xl shadow-lg dark:shadow-zinc-500/50 w-96 overflow-hidden">
        {/* Header */}
        <div className="text-sm flex items-center justify-between p-2 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 active:bg-red-700 flex items-center justify-center"
              title="닫기"
            />
            <h2 className="font-bold select-none">계정 정보</h2>
          </div>
        </div>

        {/* Window body */}
        <div className="p-4">
          <p className="font-bold text-xl mb-2">{user.nickname}</p>
          <p className="font-light text-xs text-gray-500 dark:text-zinc-400">{user.email}</p>
          <div className="flex flex-row justify-end text-sm gap-2">
            <button
              className="mt-4 px-4 py-1 bg-gray-100 active:bg-gray-200 text-black dark:text-white rounded dark:bg-zinc-800 dark:active:bg-zinc-900"
              onClick={() => {
                router.push('/account');
                onClose();
              }}
            >
              계정 정보
            </button>
            <button
              className="mt-4 px-4 py-1 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded"
              onClick={async () => {
                try {
                  // 1. 서버에 만들어둔 로그아웃 API를 호출해서 브라우저의 accessToken 쿠키를 삭제합니다.
                  await fetch('/api/auth/logout', { method: 'POST' });

                  // 2. Zustand 스토어의 유저 정보를 비워줍니다.
                  clearUser();
                  
                  // 3. 모달을 닫고 메인 페이지로 이동합니다.
                  onClose();
                  router.push('/');
                  
                  // 4. 강제로 새로고침 효과를 주어 layout.tsx가 쿠키가 진짜 사라졌는지 다시 확인하게 만듭니다.
                  router.refresh(); 
                } catch (err) {
                  console.error("로그아웃 처리 중 에러 발생:", err);
                }
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
