"use client";

import { useState } from "react";
import { SortOption, FilterCategory, ColorTag } from "@/types/font";
import { Filter, ArrowUpDown, Tag, Plus, Copy, Trash2 } from "lucide-react";

interface GlyphViewControlsProps {
  glyphSize: number;
  onGlyphSizeChange: (size: number) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  filterCategory: FilterCategory;
  onFilterCategoryChange: (category: FilterCategory) => void;
  filterValue?: string;
  onFilterValueChange: (value: string) => void;
  availableTags: ColorTag[];
  availableGroups: string[];
  onAddGlyph: () => void;
  onDuplicateGlyph: () => void;
  onDeleteGlyph: () => void;
  selectedCount: number;
}

export default function GlyphViewControls({
  glyphSize,
  onGlyphSizeChange,
  sortOption,
  onSortChange,
  filterCategory,
  onFilterCategoryChange,
  filterValue,
  onFilterValueChange,
  availableTags,
  availableGroups,
  onAddGlyph,
  onDuplicateGlyph,
  onDeleteGlyph,
  selectedCount,
}: GlyphViewControlsProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="p-4 space-y-4 border-b border-gray-200 dark:border-zinc-700">
      {/* 크기 조절 */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">글리프 크기:</label>
        <input
          type="number"
          min="4"
          max="512"
          value={glyphSize}
          onChange={(e) => onGlyphSizeChange(Number(e.target.value))}
          className="w-20 px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-sm"
        />
        <span className="text-xs text-gray-500">px</span>
      </div>

      {/* 정렬 */}
      <div className="flex items-center gap-2">
        <ArrowUpDown size={16} />
        <label className="text-sm font-medium">정렬:</label>
        <select
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-sm"
        >
          <option value="index">인덱스</option>
          <option value="codepoint">코드 포인트</option>
          <option value="name">이름</option>
          <option value="user-friendly">사용자 친화적</option>
          <option value="script-order">문자 체계 순서</option>
        </select>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <Filter size={16} />
        <label className="text-sm font-medium">필터:</label>
        <select
          value={filterCategory}
          onChange={(e) => {
            onFilterCategoryChange(e.target.value as FilterCategory);
            onFilterValueChange('');
          }}
          className="px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-sm"
        >
          <option value="none">분류 없음</option>
          <option value="tag">태그</option>
          <option value="group">그룹</option>
          <option value="language">언어</option>
          <option value="script">문자 체계</option>
          <option value="opentype-class">OpenType 클래스</option>
        </select>
        {filterCategory !== 'none' && (
          <select
            value={filterValue || ''}
            onChange={(e) => onFilterValueChange(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-sm"
          >
            <option value="">전체</option>
            {filterCategory === 'tag' && availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
            {filterCategory === 'group' && availableGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAddGlyph}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          <Plus size={14} />
          추가
        </button>
        <button
          onClick={onDuplicateGlyph}
          disabled={selectedCount === 0}
          className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Copy size={14} />
          복제
        </button>
        <button
          onClick={onDeleteGlyph}
          disabled={selectedCount === 0}
          className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Trash2 size={14} />
          삭제
        </button>
        {selectedCount > 0 && (
          <span className="text-xs text-gray-500 ml-2">{selectedCount}개 선택됨</span>
        )}
      </div>
    </div>
  );
}
