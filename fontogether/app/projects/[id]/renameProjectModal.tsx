import { ProjectData } from "@/types/font";
import { useEffect, useRef, useState } from "react";

export default function RenameProjectModal({ userId, projectId, onClose }: { userId: number, projectId: number, onClose: (newName: string | null) => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [newName, setNewName] = useState('')
  const [errorMessage, setErrorMessage] = useState('');
  const nameFIeldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/user/${userId}`)
      .then((res) => res.json())
      .then((projects) => {
        const targetProject = projects.find((p: ProjectData) => p.projectId === projectId);
        console.log(targetProject);
        setNewName(targetProject.title);
        setIsLoaded(true);
        nameFIeldRef.current?.focus();
      })
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-black rounded-xl shadow-lg dark:shadow-zinc-500/50 overflow-hidden">
        {/* Header */}
        <div className="text-sm flex items-center justify-between p-2 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onClose(null)}
              className="w-3 h-3 rounded-full bg-red-500 active:bg-red-700 flex items-center justify-center"
              title="닫기"
            />
            <h2 className="font-bold select-none">프로젝트 이름 변경</h2>
          </div>
        </div>

        {/* Window body */}
        <div className="p-4 select-none">
          <p className="font-sm mb-4">프로젝트의 새로운 이름을 입력하십시오.</p>
          <div className={`transition-opacity ${isLoaded ? '' : 'opacity-0'}`}>
            <input
              type="text"
              value={newName}
              ref={nameFIeldRef}
              onChange={(e) => {setErrorMessage(''); setNewName(e.target.value)}}
              className="border border-gray-300 dark:border-zinc-700 rounded-md p-1 w-80 outline-none focus:border-blue-500"
            />
          </div>
          {errorMessage.length < 1 || (
            <div className="text-red-500">{errorMessage}</div>
          )}
          <div className="flex flex-row justify-end text-sm gap-2">
            <button
              className="mt-4 px-4 py-1 bg-gray-100 active:bg-gray-200 text-black dark:text-white rounded-md dark:bg-zinc-800 dark:active:bg-zinc-900"
              onClick={() => onClose(null)}
            >
              취소
            </button>
            <button
              className="mt-4 px-4 py-1 bg-blue-500 text-white rounded-md active:bg-blue-600"
              onClick={() => {
                setErrorMessage('');
                fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${projectId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId,
                    title: newName
                  })
                })
                .then((res) => {
                  if (!res.ok) {
                    setErrorMessage('이름 변경 도중 오류가 발생했습니다. 다시 시도하세요.');
                    return;
                  }
                  onClose(newName);
                });
              }}
              disabled={newName.length < 1}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}