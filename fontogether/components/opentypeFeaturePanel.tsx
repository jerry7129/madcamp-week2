"use client";

import { useState } from "react";
import { FontData, FeatureFile, FeatureRule } from "@/types/font";
import { X } from "lucide-react";

interface OpenTypeFeaturePanelProps {
  fontData: FontData;
  onClose: () => void;
  onFontDataChange: (data: FontData) => void;
}

type FeatureSection = 
  | 'languages' 
  | 'tables' 
  | 'classes' 
  | 'lookups' 
  | 'gsub' 
  | 'gpos';

export default function OpenTypeFeaturePanel({ fontData, onClose, onFontDataChange }: OpenTypeFeaturePanelProps) {
  const [selectedSection, setSelectedSection] = useState<FeatureSection>('gsub');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const features = fontData.features || {
    languages: {},
    tables: {},
    classes: {},
    lookups: {},
    gsub: {},
    gpos: {},
  };

  const updateFeature = (section: FeatureSection, key: string, value: string | FeatureRule) => {
    const newFeatures: FeatureFile = {
      ...features,
      [section]: {
        ...(features[section] as any),
        [key]: value,
      },
    };
    onFontDataChange({
      ...fontData,
      features: newFeatures,
    });
  };

  const deleteFeature = (section: FeatureSection, key: string) => {
    const newFeatures: FeatureFile = {
      ...features,
      [section]: Object.fromEntries(
        Object.entries(features[section] || {}).filter(([k]) => k !== key)
      ),
    };
    onFontDataChange({
      ...fontData,
      features: newFeatures,
    });
    if (selectedItem === key) {
      setSelectedItem(null);
    }
  };

  const getItems = (section: FeatureSection): string[] => {
    return Object.keys(features[section] || {});
  };

  const getItemValue = (section: FeatureSection, key: string): string | FeatureRule => {
    return (features[section] as any)?.[key] || '';
  };

  const currentValue = selectedItem ? getItemValue(selectedSection, selectedItem) : '';
  const codeValue = typeof currentValue === 'string' ? currentValue : currentValue.code;
  const isEnabled = typeof currentValue === 'object' ? currentValue.enabled : true;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
      <div className="bg-gray-100 dark:bg-zinc-800 w-[90vw] h-[90vh] rounded-xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="text-sm flex items-center justify-between p-2 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
              title="닫기"
            />
            <h2 className="font-bold select-none">OpenType 기능 편집</h2>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-300 dark:border-zinc-600 overflow-y-auto bg-gray-100 dark:bg-zinc-900 resize-x">
            <div className="p-2">
              <button
                onClick={() => {
                  setSelectedSection('languages');
                  setSelectedItem(null);
                }}
                className={`w-full text-left p-3 rounded-lg text-sm ${
                  selectedSection === 'languages' ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : ''
                }`}
              >
                언어/스크립트
              </button>
              <button
                onClick={() => {
                  setSelectedSection('tables');
                  setSelectedItem(null);
                }}
                className={`w-full text-left p-3 rounded-lg text-sm ${
                  selectedSection === 'tables' ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : ''
                }`}
              >
                테이블
              </button>
              <button
                onClick={() => {
                  setSelectedSection('classes');
                  setSelectedItem(null);
                }}
                className={`w-full text-left p-3 rounded-lg text-sm ${
                  selectedSection === 'classes' ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : ''
                }`}
              >
                클래스
              </button>
              <button
                onClick={() => {
                  setSelectedSection('lookups');
                  setSelectedItem(null);
                }}
                className={`w-full text-left p-3 rounded-lg text-sm ${
                  selectedSection === 'lookups' ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                Lookups
              </button>
              <button
                onClick={() => {
                  setSelectedSection('gsub');
                  setSelectedItem(null);
                }}
                className={`w-full text-left p-3 rounded-lg text-sm ${
                  selectedSection === 'gsub' ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                GSUB
              </button>
              <button
                onClick={() => {
                  setSelectedSection('gpos');
                  setSelectedItem(null);
                }}
                className={`w-full text-left p-3 rounded-lg text-sm ${
                  selectedSection === 'gpos' ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                GPOS
              </button>
            </div>

            {/* Items list */}
            <div className="p-2 border-t border-gray-200 dark:border-zinc-700">
              <div className="p-1 flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">
                  {selectedSection === 'languages' && '언어'}
                  {selectedSection === 'tables' && '테이블'}
                  {selectedSection === 'classes' && '클래스'}
                  {selectedSection === 'lookups' && 'Lookup'}
                  {selectedSection === 'gsub' && '기능'}
                  {selectedSection === 'gpos' && '기능'}
                </h3>
                <button
                  onClick={() => {
                    const name = prompt('항목 이름을 입력하세요:');
                    if (name && name.trim()) {
                      if (selectedSection === 'gsub' || selectedSection === 'gpos') {
                        updateFeature(selectedSection, name.trim(), {
                          code: '',
                          enabled: true,
                        });
                      } else {
                        updateFeature(selectedSection, name.trim(), '');
                      }
                      setSelectedItem(name.trim());
                    }
                  }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-1">
                {getItems(selectedSection).map(item => (
                  <div
                    key={item}
                    className={`flex items-center justify-between p-2 rounded-md ${
                      selectedItem === item ? 'bg-gray-200 dark:bg-zinc-700' : ''
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <span className="text-sm">{item}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`"${item}"을(를) 삭제하시겠습니까?`)) {
                          deleteFeature(selectedSection, item);
                        }
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main editor */}
          <div className="flex-1 flex flex-col">
            {selectedItem ? (
              <>
                {(selectedSection === 'gsub' || selectedSection === 'gpos') && (
                  <div className="p-2 border-b border-gray-200 dark:border-zinc-700 flex items-center gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          updateFeature(selectedSection, selectedItem, {
                            code: codeValue,
                            enabled: e.target.checked,
                          });
                        }}
                      />
                      <span className="text-sm">활성화</span>
                    </label>
                  </div>
                )}
                <div className="flex-1 flex overflow-hidden">
                  {/* 줄 번호 */}
                  <div className="w-12 bg-gray-100 dark:bg-zinc-800 text-right p-4 font-mono text-xs text-gray-500 select-none border-r border-gray-200 dark:border-zinc-700">
                    {codeValue.split('\n').map((_, i) => (
                      <div key={i} className="!leading-[20px]">{i + 1}</div>
                    ))}
                  </div>
                  {/* 코드 에디터 */}
                  <textarea
                    value={codeValue}
                    onChange={(e) => {
                      if (selectedSection === 'gsub' || selectedSection === 'gpos') {
                        updateFeature(selectedSection, selectedItem, {
                          code: e.target.value,
                          enabled: isEnabled,
                        });
                      } else {
                        updateFeature(selectedSection, selectedItem, e.target.value);
                      }
                    }}
                    className="flex-1 p-4 font-mono text-sm !leading-[20px] border-0 resize-none focus:outline-none bg-white dark:bg-zinc-900"
                    placeholder="코드를 입력하세요..."
                    spellCheck={false}
                  />
                </div>
                {/* 현재 줄/칸 표시 */}
                <div className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 text-xs text-gray-500 select-none">
                  줄 1, 칸 1
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                항목을 선택하세요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
