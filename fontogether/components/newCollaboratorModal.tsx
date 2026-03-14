import { useState } from "react";

export default function NewCollaboratorModal({ ownerId, projectId, onClose }: { ownerId: number, projectId: number, onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [errorMessage, setErrorMessage] = useState('');

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
            <h2 className="font-bold select-none">협업 인원 추가</h2>
          </div>
        </div>

        {/* Window body */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div>이메일</div>
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage('');
              }}
              className=" p-1 border border-gray-300 dark:border-zinc-700 rounded-md focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div>권한</div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="p-1 border border-gray-300 dark:border-zinc-700 rounded-md focus:border-blue-500 outline-none"
            >
              <option value="EDITOR">편집자</option>
              <option value="VIEWER">뷰어</option>
            </select>
          </div>
          {errorMessage.length > 0 && (
            <div className="text-red-500">{errorMessage}</div>
          )}
        </div>

        <div className="p-4 flex flex-row justify-end gap-2 border-t border-gray-300 dark:border-zinc-700">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 dark:bg-zinc-800 px-6 py-1 text-sm font-medium active:bg-gray-200 dark:active:bg-zinc-700"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-6 py-1 text-sm font-medium text-white active:bg-blue-600 disabled:bg-blue-500/50"
            onClick={async () => {
              if (email.length < 1) {
                setErrorMessage('이메일을 입력하세요.');
                return;
              }
              const response = await fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${projectId}/collaborators`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  requesterId: ownerId,
                  email: email,
                  role: role,
                })
              });
              
              if (!response.ok) {
                setErrorMessage('입력한 이메일을 사용하는 사용자가 없습니다.');
                return;
              };

              onClose();
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}