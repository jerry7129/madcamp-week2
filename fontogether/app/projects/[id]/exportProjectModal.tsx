import { useState } from 'react';

export default function ExportProjectModal({ projectIds, onClose }: { projectIds: Set<number>, onClose: () => void }) {
  let [ selectedFormat, setSelectedFormat ] = useState<string>('ufo');

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
        <div className="p-4 pb-0">
          <p>내려받을 형식:</p>
          <select value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)} className="w-full mt-2 mb-4 px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-sm">
            <option value="ufo">UFO</option>
            <option value="otf">OTF</option>
            <option value="ttf">TTF</option>
            <option value="woff">WOFF</option>
            <option value="woff2">WOFF2</option>
          </select>
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
            onClick={() => {
              // const responses = [...projectIds].map(id => fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${id}/export`));
              [...projectIds].forEach(id => {
                // fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${id}/export`)
                // .then(res => {
                //   if (!res.ok) {
                //     return;
                //   }
                // })
                window.open(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${id}/export`, '_blank')
              })
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