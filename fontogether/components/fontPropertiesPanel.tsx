"use client";

import { ProjectData } from "@/types/font";
import { useState } from "react";
import Spacer from "./spacer";

interface FontPropertiesPanelProps {
  fontInfo: Record<string, any> | null;
  onFontInfoChange: (data: Record<string, any>) => void;
}

export default function FontPropertiesPanel({ fontInfo, onFontInfoChange }: FontPropertiesPanelProps) {
  const updateMetadata = (field: string, value: any) => {
    const newFontInfo = {
      ...fontInfo,
      [field]: value
    }
    onFontInfoChange(newFontInfo);
  };

  if (fontInfo === null) {
    return (
      <p className="p-4">데이터 로드 중...</p>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <h3 className="font-semibold text-md">글꼴 정보</h3>
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-1">서체 이름</label>
            <input
              type="text"
              value={fontInfo.familyName || ''}
              onChange={(e) => updateMetadata('familyName', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">스타일 이름</label>
            <input
              type="text"
              value={fontInfo.styleName || ''}
              onChange={(e) => updateMetadata('styleName', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">글꼴 전체 이름</label>
            <input
              type="text"
              value={fontInfo.styleMapFamilyName || ''}
              onChange={(e) => updateMetadata('styleMapFamilyName', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PostScript 서체 이름</label>
            <input
              type="text"
              value={fontInfo.postscriptFontName || ''}
              onChange={(e) => updateMetadata('postscriptFontName', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PostScript 스타일 이름</label>
            <input
              type="text"
              value={fontInfo.postscripeightName || ''}
              onChange={(e) => updateMetadata('postscriptWeightName', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PostScript 글꼴 전체 이름</label>
            <input
              type="text"
              value={fontInfo.postscriptFullName || ''}
              onChange={(e) => updateMetadata('postscriptFullName', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">저작권</label>
            <input
              type="text"
              value={fontInfo.copyright || ''}
              onChange={(e) => updateMetadata('copyright', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">글꼴 버전</label>
            <div className="flex flex-row items-center w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800">
              <input
                type="text"
                value={fontInfo.versionMajor || 1}
                onChange={(e) => {
                  const numStr = e.target.value;
                  const parsedNum = Number(numStr);
                  if (isNaN(parsedNum))
                    updateMetadata('versionMajor', 1);
                  else
                    updateMetadata('versionMajor', parsedNum)
                }}
                className="grow px-1 w-12 text-right"
              />
              <p>.</p>
              <input
                type="text"
                value={fontInfo.versionMinor || 0}
                onChange={(e) => {
                  const numStr = e.target.value;
                  const parsedNum = Number(numStr);
                  if (isNaN(parsedNum))
                    updateMetadata('versionMinor', 0);
                  else
                    updateMetadata('versionMinor', parsedNum)
                }}
                className="grow px-1 w-12 text-left"
              />
            </div>
          </div>
          {/* <div>
            <button className="px-4 py-1 bg-gray-100 dark:bg-zinc-900 rounded text-sm">
              언어별 메타데이터 편집
            </button>
          </div> */}
        </div>

        <h3 className="font-semibold text-md">메트릭 정보</h3>
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-1">1&nbsp;em 당 unit 수</label>
            <input
              type="number"
              value={fontInfo.unitsPerEm || 1000}
              onChange={(e) => updateMetadata('unitsPerEm', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">어센더</label>
            <input
              type="number"
              value={fontInfo.ascender || 800}
              onChange={(e) => updateMetadata('ascender', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">디센더</label>
            <input
              type="number"
              value={fontInfo.descender || 200}
              onChange={(e) => updateMetadata('descender', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">이탤릭 각도</label>
            <input
              type="number"
              value={fontInfo.italicAngle || 0}
              onChange={(e) => updateMetadata('italicAngle', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OpenType 어센더</label>
            <input
              type="number"
              value={fontInfo.openTypeHheaAscender || 800}
              onChange={(e) => updateMetadata('openTypeHheaAscender', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OpenType 디센더</label>
            <input
              type="number"
              value={fontInfo.openTypeHheaDescender || 200}
              onChange={(e) => updateMetadata('openTypeHheaDescender', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OpenType 줄 높이</label>
            <input
              type="number"
              value={fontInfo.openTypeHheaLineGap || 0}
              onChange={(e) => updateMetadata('openTypeHheaLineGap', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
