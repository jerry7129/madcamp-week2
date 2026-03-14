"use client";
import { useRouter } from "next/navigation";
import { useState, useRef } from 'react';

export default function LoginView() {
  let [nickname, setNickname] = useState('');
  let [errorMessage, setErrorMessage] = useState('');
  let email = 'test@example.com';
  let nicknameRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const registerHandler = async () => {
    if (nickname.trim() === '') {
      nicknameRef.current?.focus();
      setErrorMessage('닉네임을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('http://10.249.16.96:444/api/users/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email, password: null, nickname: nickname }),
      });

      if (!response.ok)
        throw new Error('Errr')
      
      const result = await response.json();
      console.log('succeed:', result);
      alert("회원가입에 성공했습니다.");
      router.push('../');
    } catch (error) {
      console.error('error occurred:', error);
      setErrorMessage(`오류 발생: ${error}`)
    }
  };
  return (
    <div className="h-screen py-15 bg-gray-100 dark:bg-gray-900 text-center">
      <div className="mx-auto mb-12 font-thin text-6xl tracking-[0.2em]">FONTOGETHER</div>
      <div className="font-light text-lg tracking-widest">대충 있어 보이는 한 줄 소개를 여기에 입력</div>
      {/* Inner container */}
      <div className="mx-auto my-20 w-128 py-10 bg-white dark:bg-black rounded-xl shadow-md">
        <div className="mb-8 text-2xl">회원가입</div>
        {/* Buttons container */}
        <div className="mx-auto w-84 flex flex-col gap-5">
          <div className="flex flex-col justify-start text-left">
            <p className="pb-2">닉네임</p>
            <input type="text" value={nickname} ref={nicknameRef} onChange={(e) => {setNickname(e.target.value)}} className="p-1 rounded-sm border border-gray-500 outline-none transition-color focus:border-blue-500" />
          </div>
          <div className="text-red-500">{errorMessage}</div>
          <div className="flex flex-row justify-end gap-2 text-sm">
            <button onClick={() => {router.push('/')}} className="px-6 py-1 bg-gray-100 rounded">취소</button>
            <button onClick={registerHandler} className="px-6 py-1 bg-blue-500 rounded text-white">확인</button>
          </div>
        </div>
      </div>
    </div>
  );
}
