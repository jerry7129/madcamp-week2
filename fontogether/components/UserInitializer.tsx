"use client";

import { useRef } from "react";
import { useUserStore } from "@/store/userStore";

// 실제 프로젝트의 유저 타입에 맞게 변경하세요.
interface UserInitializerProps {
  user: any | null | undefined; 
}

export function UserInitializer({ user }: UserInitializerProps) {
  // 컴포넌트가 처음 렌더링될 때 딱 한 번만 실행하기 위한 플래그입니다.
  const isInitialized = useRef(false);
  console.log("서버에서 받은 유저 정보:", user);
  if (!isInitialized.current) {
    // useEffect를 기다리지 않고, 렌더링 중에 즉시 Zustand 상태를 업데이트합니다.
    useUserStore.setState({ user: user || null });
    isInitialized.current = true;
  }

  return null;
}
