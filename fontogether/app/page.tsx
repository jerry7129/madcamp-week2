"use client";
import Spacer from "@/components/spacer";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useUserStore } from "@/store/userStore";
import { navigate } from "next/dist/client/components/segment-cache/navigation";
import SocialLogin from "@/components/socialLogin";

export default function LoginView() {
  const router = useRouter();

  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() === '') {
      emailRef.current?.focus();
      setErrorMessage("이메일을 입력해주세요.");
      setUser(null);
      return;
    }
    if (password.trim() === '') {
      passwordRef.current?.focus();
      setErrorMessage("암호를 입력해주세요.");
      setUser(null);
      return;
    }

    console.log('Trying to log in');

    try {
      const serverUri = process.env.NEXT_PUBLIC_SERVER_URI || "";
      // Use the Next.js internal auth route to set JWT cookies correctly
      const response = await fetch(serverUri + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setErrorMessage(body?.error || `${response.status} ${response.statusText}`);
        return;
      }

      const result = await response.json();
      setUser(result.user);
      console.log(result.user);

      const projectsResponse = await fetch(serverUri + `/api/projects/user/${result.user.id}`);
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects');
      }
      const projects = await projectsResponse.json();
      console.log("Loaded projects:", projects);

      router.push(`/projects/${result.user.id}`);
    } catch (error) {
      console.error("Error occurred:", error);
      setErrorMessage("로그인 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (user) {
      router.replace(`/projects/${user.id}`);
    }
  }, [user, router]);

  return (
    <div className="h-screen py-15 bg-gray-100 dark:bg-zinc-900 text-center">
      <div className="mx-auto mb-12 font-thin text-6xl tracking-[0.2em]">FONTOGETHER</div>
      <div className="font-light text-lg tracking-widest">대충 있어 보이는 한 줄 소개를 여기에 입력</div>

      {/* Inner container */}
      <div className="mx-auto my-20 w-128 py-10 bg-white dark:bg-black rounded-xl shadow-md">
        {/* Login container */}
        <div className="mx-auto w-84 flex flex-col gap-4 mb-8">
          <div className="mb-8 text-2xl">로그인</div>
          <form className="flex flex-col gap-4">
            <div className="flex flex-col justify-start text-left">
              <p className="pb-2">이메일</p>
              <input
                type="text"
                ref={emailRef}
                value={email}
                onChange={(e) => setEmail(e.target.value)} className="p-1 rounded border border-gray-300 dark:border-zinc-700 outline-none transition-colors focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col justify-start text-left">
              <p className="pb-2">암호</p>
              <input
                type="password"
                ref={passwordRef}
                value={password}
                onChange={(e) => setPassword(e.target.value)} className="p-1 rounded border border-gray-300 dark:border-zinc-700 outline-none transition-colors focus:border-blue-500"
              />
            </div>
            <div className="text-red-500">{errorMessage}</div>
            <div className="flex flex-row pt-2 text-sm">
              <button
                type="button"
                className="rounded bg-gray-100 dark:bg-zinc-800 px-4 py-1"
                onClick={() => router.push('/register')}
              >회원가입</button>
              <Spacer />
              <button
                type="submit"
                className="rounded bg-blue-500 text-white px-4 py-1"
                onClick={(e) => handleLogin(e)}
              >로그인</button>
            </div>
          </form>

          <SocialLogin />
        </div>
      </div>
    </div>
  );
}
