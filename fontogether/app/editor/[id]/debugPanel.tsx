import { ProjectData } from "@/types/font";
import { useState } from "react";

export default function DebugPanel({ fontData, onClose }: { fontData: ProjectData, onClose: () => void }) {
  const [selectedTab, setSelectedTab] = useState('features');

  const tabNames = ['features', 'featuresJSON', 'fontInfo', 'fontInfoJSON', 'metaInfo'];

  const featuresJSON = JSON.parse(fontData.features) || null;
  const fontInfoJSON = JSON.parse(fontData.fontInfo) || null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-black rounded-xl shadow-lg dark:shadow-zinc-500/50 overflow-hidden w-[80%] h-[80%] flex flex-col">
        {/* Header */}
        <div className="text-sm flex items-center justify-between p-2 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 active:bg-red-700 flex items-center justify-center"
              title="닫기"
            />
            <h2 className="font-bold select-none">새 프로젝트</h2>
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="w-full space-x-2 px-4 pt-4 border-t border-gray-300 dark:border-zinc-700"
        >
          <div className="p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl flex flex-grow select-none">
            {tabNames.map((tab) => (<button
              key={tab}
              className={`px-2 py-1 text-sm flex-grow font-medium rounded-lg ${selectedTab === tab ? 'bg-white dark:bg-black shadow-md' : 'text-gray-700 dark:text-gray-300'}`}
              onMouseDown={() => setSelectedTab(tab)}
            >
              {tab}
            </button>))}
          </div>
        </div>

        <div className="p-4 grow">
          {selectedTab === 'features' && (
            <textarea className="w-full h-full border p-1 rounded-md outline-none border-gray-300 dark:border-zinc-700 focus:border-blue-500 font-mono">{fontData.features}</textarea>
          )}

          {selectedTab === 'featuresJSON' && (
            <textarea className="w-full h-full border p-1 rounded-md outline-none border-gray-300 dark:border-zinc-700 focus:border-blue-500 font-mono">{JSON.stringify(featuresJSON, null, 2)}</textarea>
          )}

          {selectedTab === 'fontInfo' && (
            <textarea className="w-full h-full border p-1 rounded-md outline-none border-gray-300 dark:border-zinc-700 focus:border-blue-500 font-mono">{fontData.fontInfo}</textarea>
          )}

          {selectedTab === 'fontInfoJSON' && (
            <textarea className="w-full h-full border p-1 rounded-md outline-none border-gray-300 dark:border-zinc-700 focus:border-blue-500 font-mono">{JSON.stringify(fontInfoJSON, null, 2)}</textarea>
          )}

          {selectedTab === 'metaInfo' && (
            <textarea className="w-full h-full border p-1 rounded-md outline-none border-gray-300 dark:border-zinc-700 focus:border-blue-500 font-mono">{fontData.metaInfo}</textarea>
          )}
        </div>

        <div className="p-4 flex flex-row justify-end gap-2 border-t border-gray-300 dark:border-zinc-700">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 dark:bg-zinc-800 px-6 py-1 text-sm font-medium active:bg-gray-200 dark:active:bg-zinc-700"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}