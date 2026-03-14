"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserStore } from '@/store/userStore';

function SocialLoginView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const setUser = useUserStore((s) => s.setUser);
  
  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      sendCodeToBackend(code);
    }
  }, [searchParams]);

  const sendCodeToBackend = async (code: string) => {
    try {
      const serverUri = process.env.NEXT_PUBLIC_SERVER_URI || "";
      const response = await fetch(serverUri + '/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: process.env.NEXT_PUBLIC_REDIRECTION_URI }),
        credentials: 'include',
      });
      const result = await response.json();
      console.log(result);

      if (response.status === 200) {
        // 계정 존재: 로그인 처리
        console.log('login success');
        setUser(result.user);
        router.push(`/projects/${result.user.id}`);
      } else if (response.status === 404) {
        // 계정 없음: 회원가입 페이지로 리다이렉트
        const query = new URLSearchParams({
          email: result.user.email,
          name: result.user.nickname,
        }).toString();
        console.log(query);
        router.push(`/socialRegister?${query}`);
      } else {
        console.error(response)
        throw new Error(result.response)
      }
    } catch (error) {
      console.error("Error during social login:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">소셜 로그인 중...</h1>
      <p className="mb-8">잠시만 기다려주세요.</p>
      <h2 className="text-lg font-semibold mb-4">오랫동안 진행이 되지 않나요?</h2>
      <a href="/" className="text-blue-500 hover:underline">첫 페이지로 돌아가기</a>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SocialLoginView />
    </Suspense>
  )
}
