"use client";

import { useMemo } from "react";
import { FontData, ColorTag, FilterCategory } from "@/types/font";

interface FilterSidebarProps {
  fontData: FontData;
  filterCategory: FilterCategory;
  filterValue?: string;
  onFilterChange: (category: FilterCategory, value?: string) => void;
}

export default function FilterSidebar({ fontData, filterCategory, filterValue, onFilterChange }: FilterSidebarProps) {
  // 태그별 글리프 수 계산
  const tagCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    fontData.glyphs.forEach(g => {
      g.tags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [fontData.glyphs]);

  // 그룹별 글리프 수 계산
  const groupCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    fontData.glyphs.forEach(g => {
      g.groups?.forEach(group => {
        counts[group] = (counts[group] || 0) + 1;
      });
    });
    return counts;
  }, [fontData.glyphs]);

  // OpenType class별 글리프 수 계산
  const classCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    fontData.glyphs.forEach(g => {
      if (g.openTypeClass) {
        counts[g.openTypeClass] = (counts[g.openTypeClass] || 0) + 1;
      }
    });
    return counts;
  }, [fontData.glyphs]);

  const handleTagClick = (tag: string) => {
    onFilterChange('tag', tag);
  };

  const handleGroupClick = (group: string) => {
    onFilterChange('group', group);
  };

  const handleClassClick = (className: string) => {
    onFilterChange('opentype-class', className);
  };

  const colorMap = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-500',
};

  return (
    <div className="h-full overflow-y-auto select-none">
      <div className="p-2">
        <div className="space-y-1">
          <button
            onClick={() => onFilterChange('none')}
            className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between ${
              filterCategory === 'none' ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              
              <span className="capitalize">전체 글리프</span>
            </span>
            <span className="text-xs text-gray-500">{fontData.glyphs.length}</span>
          </button>
        </div>
      </div>

      {/* 태그 섹션 */}
      <div className="p-2">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">태그</h3>
        <div className="space-y-1">
          {(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'] as ColorTag[]).map(tag => {
            const count = tagCounts[tag] || 0;
            const isSelected = filterCategory === 'tag' && filterValue === tag;
            const colorName = colorMap[tag];
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between ${
                  isSelected ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${colorName}`} />
                  <span className="capitalize">{tag}</span>
                </span>
                {count > 0 && <span className="text-xs text-gray-500">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 그룹 섹션 */}
      {Object.keys(fontData.groups || {}).length > 0 && (
        <div className="p-2 dark:border-zinc-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">그룹</h3>
          <div className="space-y-1">
            {Object.keys(fontData.groups || {}).map(group => {
              const count = groupCounts[group] || 0;
              const isSelected = filterCategory === 'group' && filterValue === group;
              return (
                <button
                  key={group}
                  onClick={() => handleGroupClick(group)}
                  className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between ${
                    isSelected ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : ''
                  }`}
                >
                  <span>{group}</span>
                  {count > 0 && <span className="text-xs text-gray-500">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* OpenType 클래스 섹션 */}
      {Object.keys(classCounts).length > 0 && (
        <div className="p-2 dark:border-zinc-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">OpenType 클래스</h3>
          <div className="space-y-1">
            {Object.keys(classCounts).map(className => {
              const count = classCounts[className] || 0;
              const isSelected = filterCategory === 'opentype-class' && filterValue === className;
              return (
                <button
                  key={className}
                  onClick={() => handleClassClick(className)}
                  className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between ${
                    isSelected ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : ''
                  }`}
                >
                  <span>{className}</span>
                  {count > 0 && <span className="text-xs text-gray-500">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
