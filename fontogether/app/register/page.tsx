"use client";
import SocialLogin from "@/components/socialLogin";
import { useRouter } from "next/navigation";
import { useState, useRef } from 'react';

export default function LoginView() {
  let [nickname, setNickname] = useState('');
  let [email, setEmail] = useState('');
  let [password, setPassword] = useState('');
  let [passwordConfirm, setPasswordConfirm] = useState('');
  let [errorMessage, setErrorMessage] = useState('');
  let nicknameRef = useRef<HTMLInputElement>(null);
  let emailRef = useRef<HTMLInputElement>(null);
  let passwordRef = useRef<HTMLInputElement>(null);
  let passwordConfirmRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const registerHandler = async () => {
    if (email.trim() === '') {
      emailRef.current?.focus();
      setErrorMessage('이메일을 입력해 주세요.');
      return;
    }
    if (password.trim() === '') {
      passwordRef.current?.focus();
      setErrorMessage('암호를 입력해 주세요.');
      return;
    }
    if (passwordConfirm.trim() === '') {
      passwordConfirmRef.current?.focus();
      setErrorMessage('암호 확인을 입력해 주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      passwordConfirmRef.current?.focus();
      setErrorMessage('암호가 일치하지 않습니다.');
      return;
    }
    if (nickname.trim() === '') {
      nicknameRef.current?.focus();
      setErrorMessage('닉네임을 입력해 주세요.');
      return;
    }

    try {
      const serverUri = process.env.NEXT_PUBLIC_SERVER_URI || "";
      const response = await fetch(serverUri + '/api/users/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email, password: password, nickname: nickname }),
      });

      if (!response.ok)
        throw new Error('Errr')
      
      const result = await response.json();
      router.push('../');
    } catch (error) {
      console.error('error occurred:', error);
      setErrorMessage(`오류 발생: ${error}`)
    }
  };
  return (
    <div className="h-screen py-15 bg-gray-100 dark:bg-zinc-900 text-center">
      <div className="mx-auto mb-12 font-thin text-6xl tracking-[0.2em]">FONTOGETHER</div>
      <div className="font-light text-lg tracking-widest">대충 있어 보이는 한 줄 소개를 여기에 입력</div>
      {/* Inner container */}
      <div className="mx-auto my-20 w-128 py-10 bg-white dark:bg-black rounded-xl shadow-md">
        <div className="mb-8 text-2xl">회원가입</div>
        {/* Buttons container */}
        <div className="mx-auto w-84 flex flex-col gap-4">
          <div className="flex flex-col justify-start text-left">
            <p className="pb-2">이메일</p>
            <input type="text" value={email} ref={emailRef} onChange={(e) => {setEmail(e.target.value)}} className="p-1 rounded border border-gray-300 dark:border-zinc-700 outline-none transition-color focus:border-blue-500" />
          </div>
          <div className="flex flex-col justify-start text-left">
            <p className="pb-2">암호</p>
            <input type="password" value={password} ref={passwordRef} onChange={(e) => {setPassword(e.target.value)}} className="p-1 rounded border border-gray-300 dark:border-zinc-700 outline-none transition-color focus:border-blue-500" />
          </div>
          <div className="flex flex-col justify-start text-left">
            <p className="pb-2">암호 확인</p>
            <input type="password" value={passwordConfirm} ref={passwordConfirmRef} onChange={(e) => {setPasswordConfirm(e.target.value)}} className="p-1 rounded border border-gray-300 dark:border-zinc-700 outline-none transition-color focus:border-blue-500" />
          </div>
          <div className="flex flex-col justify-start text-left">
            <p className="pb-2">닉네임</p>
            <input type="text" value={nickname} ref={nicknameRef} onChange={(e) => {setNickname(e.target.value)}} className="p-1 rounded border border-gray-300 dark:border-zinc-700 outline-none transition-color focus:border-blue-500" />
          </div>
          <div className="text-red-500">{errorMessage}</div>
          <div className="flex flex-row justify-end gap-2 text-sm">
            <button onClick={() => {router.back()}} className="px-6 py-1 bg-gray-100 dark:bg-zinc-800 rounded">취소</button>
            <button onClick={registerHandler} className="px-6 py-1 bg-blue-500 rounded text-white">확인</button>
          </div>

          <SocialLogin />
        </div>
      </div>
    </div>
  );
}
