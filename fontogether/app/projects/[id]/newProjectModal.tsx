import { useState, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import Spacer from '@/components/spacer';

export default function NewProjectModal({ onClose }: { onClose: () => void }) {
  const user = useUserStore((s) => s.user);

  const [projectName, setProjectName] = useState('');
  const [proceedingMessage, setProceedingMessage] = useState('');

  const tabCategories = [
    { label: '빈 프로젝트', category: 'emptyProject' },
    { label: '템플릿', category: 'template' },
    { label: '파일 업로드', category: 'fileUpload' }
  ];
  const [ selectedTabIndex, setSelectedTabIndex ] = useState(0);

  const glyphSetNames = [
    { displayText: '라틴 (Adobe Latin 1)', name: 'English' },
    { displayText: '한국어', name: 'Korean' },
  ];
  const [ selectedGlyphSetIndex, setSelectedGlyphSetIndex ] = useState(0);

  const [ selectedFile, setSelectedFile ] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCreateFromTemplate = async (templateName: string, projectName: string) => {
    setProceedingMessage('파일 생성 중...');

    const response = await fetch((process.env.NEXT_PUBLIC_SERVER_URI || "") + `/api/projects/template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: user.id,
        templateName,
        title: projectName
      })
    });

    setProceedingMessage('');

    if (!response.ok) {
      alert('something went wrong');
      return;
    }

    alert('템플릿이 생성되었습니다.')
    onClose();
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("업로드할 파일을 선택해주세요.");
      return;
    }

    setProceedingMessage('파일 업로드 중...');
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', user.id);
    formData.append('title', projectName);

    try {
      const response = await fetch((process.env.NEXT_PUBLIC_SERVER_URI || "") + '/api/projects/ufo', {
        method: "POST",
        body: formData,
      });

      setProceedingMessage('');
      if (response.ok) {
        alert("파일이 성공적으로 업로드되었습니다.");
        onClose();
        setSelectedFile(null);
      } else {
        throw new Error(response.status + await response.text());
      }
    } catch (error) {
      console.error(error);
      alert("파일 업로드에 실패했습니다. 다시 시도해주세요.\n" + error);
    }
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
            <h2 className="font-bold select-none">새 프로젝트</h2>
          </div>
        </div>

        <div className="p-4">
          <p>프로젝트 이름:</p>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full mt-2 p-1 border rounded-md border-gray-300 dark:border-zinc-700 outline-none focus:border-blue-500"
          />
        </div>

        {/* Tab bar */}
        <div
          className="w-full space-x-2 px-4 pt-4 border-t border-gray-300 dark:border-zinc-700"
        >
          <div className="p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl flex flex-grow select-none">
            {tabCategories.map((tab, index) => (index === 1 ? null : (
              <button
                key={tab.category}
                className={`px-2 py-1 text-sm flex-grow font-medium rounded-lg ${selectedTabIndex === index ? 'bg-white dark:bg-black shadow-md' : 'text-gray-700 dark:text-gray-300'}`}
                onMouseDown={() => setSelectedTabIndex(index)}
              >
                {tab.label}
              </button>
            )))}
          </div>
        </div>

        <div className="p-4">
          {(selectedTabIndex === 0) && (
            <>
              <p>사용할 글리프 집합:</p>
              <div className="mt-2 flex flex-col overflow-y-auto border border-gray-300 dark:border-zinc-700">
                {glyphSetNames.map((data, index) => (
                  <div
                    key={data.name}
                    className={`flex-shrink-0 px-2 py-1 text-sm select-none ${(selectedGlyphSetIndex === index) ? 'bg-blue-500 text-white' : (index % 2 !== 0) ? 'bg-gray-100 dark:bg-zinc-800' : ''}`}
                    onClick={() => setSelectedGlyphSetIndex(index)}
                  >
                    {data.displayText}
                  </div>
                ))}
              </div>
            </>
          )}

          {(selectedTabIndex === 2) && (
            <>
              <div className="flex flex-row gap-2 items-center">
                <button
                  className="px-4 py-1 bg-gray-100 active:bg-gray-200 text-black dark:text-white rounded dark:bg-zinc-800 dark:active:bg-zinc-900 select-none"
                  onClick={() => fileInputRef.current?.click()}
                >파일 선택</button>
                {selectedFile ? (
                  <>
                    <div className="text-sm">{selectedFile?.name.trim() || ""}</div>
                    <button
                      className="text-sm text-red-500 select-none"
                      onClick={() => setSelectedFile(null)}
                    >×</button>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">선택된 파일 없음</div>
                )}
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-zinc-500 !leading-normal">UFO(Unified Font Object)를 압축한 .zip 파일만 업로드 가능합니다.</p>
              <input
                type="file"
                accept=".ufo,.zip,.ttf,.otf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </>
          )}
        </div>

        <div className="p-4 flex flex-row justify-end gap-2 border-t border-gray-300 dark:border-zinc-700">
          {proceedingMessage.length > 0 && (
            <p className="text-sm">{proceedingMessage}</p>
          )}
          <Spacer />
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
              if (selectedTabIndex === 2) {
                handleUpload();
              } else {
                handleCreateFromTemplate(glyphSetNames[selectedGlyphSetIndex].name, projectName);
              }
            }}
            disabled={(selectedTabIndex === 2 && !selectedFile) || (selectedTabIndex === 0 && projectName.length < 1)}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}