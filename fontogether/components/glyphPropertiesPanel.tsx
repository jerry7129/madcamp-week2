"use client";

import { AGL_DATA } from "@/data/AGL_DATA";
import { GlyphData, FontData } from "@/types/font";
import { useState, useEffect, useRef } from "react";

interface GlyphPropertiesPanelProps {
  glyphs: GlyphData[];
  fontData: FontData;
  onGlyphsChange: (glyphs: GlyphData[]) => void;
}

export default function GlyphPropertiesPanel({ glyphs, fontData, onGlyphsChange }: GlyphPropertiesPanelProps) {
  const isMultiple = glyphs.length > 1;
  const firstGlyph = glyphs[0];

  const [nameField, setNameField] = useState(firstGlyph?.glyphName);
  const [unicodeField, setUnicodeField] = useState<string>('');
  const unicodeFieldRef = useRef<HTMLInputElement>(null);

  const parseUnicodeCommaSeparatedList = (input: string): number[] | null => {
    const codes = input.split(',').map(s => s.trim()).filter(s => Boolean(s)).map(s => parseInt(s, 16));
    if (codes.some(n => isNaN(n))) {
      return null;
    }
    return codes;
  };
  const sanitizeUnicodeField = () => {
    setUnicodeField(firstGlyph.unicodes.map(n => n.toString(16).toUpperCase().padStart(4, '0')).join(', ') || '');
  };
  const [unicodeFieldInvalid, setUnicodeFieldInvalid] = useState(false);

  useEffect(() => {
    if (document.activeElement === unicodeFieldRef.current) return;

    const glyphName = firstGlyph ? firstGlyph.glyphName : '';
    setNameField(glyphName);

    const unicodeString = firstGlyph ? firstGlyph.unicodes.map(n => n.toString(16).toUpperCase().padStart(4, '0')).join(', ') : '';
    setUnicodeField(unicodeString);
  }, [glyphs.map(g => g.glyphUuid)]);

  const updateGlyph = (field: string, value: any) => {
    onGlyphsChange(
      glyphs.map(g => ({
        ...g,
        [field]: value,
      }))
    );
  };

  const updateMetric = (field: string, value: number) => {
    onGlyphsChange(
      glyphs.map(g => ({
        ...g,
        [field]: value,
      }))
    );
  };

  if (!firstGlyph) {
    return (
      <div className="p-4 text-sm text-gray-500">
        글리프를 선택하세요.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 text-sm">
      {/* 메타데이터 */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold">글리프 메타데이터</h3>
        <div>
          <label className="block text-sm font-medium mb-1">글리프 이름</label>
          <input
            type="text"
            value={nameField}
            onChange={(e) => {setNameField(e.target.value); updateGlyph('glyphName', e.target.value)}}
            disabled={isMultiple}
            className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 disabled:opacity-50"
          />
          <button
            onClick={() => {
              if (firstGlyph.unicodes[0]) {
                const aglName = AGL_DATA[firstGlyph.unicodes[0]];
                if (aglName) {
                  updateGlyph('glyphName', aglName);
                } else if (firstGlyph.unicodes.length > 0) {
                  const hexString = firstGlyph.unicodes[0].toString(16).toUpperCase().padStart(4, '0');
                  updateGlyph('glyphName', `uni${hexString}`);
                } else {
                  updateGlyph('glyphName', 'glyph');
                }
              }
            }}
            className="mt-1 text-xs text-blue-500 hover:underline"
          >
            유니코드로부터 이름 지정
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">유니코드 포인트</label>
          <input
            type="text"
            value={unicodeField}
            ref={unicodeFieldRef}
            onChange={(e) => {
              setUnicodeField(e.target.value);
              let parseResult = parseUnicodeCommaSeparatedList(e.target.value);
              if (parseResult !== null) {
                updateGlyph('unicode', parseResult.length > 0 ? parseResult : undefined);
                setUnicodeFieldInvalid(false);
              } else {
                updateGlyph('unicode', []);
                setUnicodeFieldInvalid(true);
              }
            }}
            placeholder="예: 32, A0"
            className={`w-full px-2 py-1 border rounded bg-white dark:bg-zinc-800 outline-none ${unicodeFieldInvalid ? 'border-red-500' : 'border-gray-300 dark:border-zinc-600 focus:border-blue-500'}`}
            onBlur={() => sanitizeUnicodeField()}
          />
        </div>
        {/* <div>
          <label className="block text-sm font-medium mb-1">OpenType Glyph class</label>
          <select
            // value={firstGlyph.openTypeClass || 'auto'}
            value={'auto'}
            onChange={(e) => updateGlyph('openTypeClass', e.target.value || undefined)}
            className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
          >
            <option value="auto">자동</option>
            <option value="base">Base</option>
            <option value="ligature">Ligature</option>
            <option value="mark">Mark</option>
            <option value="component">Component</option>
          </select>
        </div> */}
      </div>

      {/* 메트릭 */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold">메트릭</h3>
        <div className="grid grid-cols-2 gap-2">
          {/* <div>
            <label className="block text-xs font-medium mb-1">LSB</label>
            <input
              type="number"
              // value={firstGlyph.lsb || 0}
              value={0}
              onChange={(e) => updateMetric('lsb', Math.round(Number(e.target.value)))}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">RSB</label>
            <input
              type="number"
              // value={firstGlyph.rsb || 0}
              value={0}
              onChange={(e) => updateMetric('rsb', Math.round(Number(e.target.value)))}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div> */}
          <div>
            <label className="block text-xs font-medium mb-1">글리프 폭</label>
            <input
              type="number"
              value={firstGlyph.advanceWidth}
              onChange={(e) => updateMetric('advanceWidth', Math.round(Number(e.target.value)))}
              className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
            />
          </div>
        </div>
        {fontData.metadata.verticalWriting && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">TSB</label>
              <input
                type="number"
                // value={firstGlyph.tsb || 0}
                value={0}
                onChange={(e) => updateMetric('tsb', Math.round(Number(e.target.value)))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">BSB</label>
              <input
                type="number"
                // value={firstGlyph.bsb || 0}
                value={0}
                onChange={(e) => updateMetric('bsb', Math.round(Number(e.target.value)))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">AH</label>
              <input
                type="number"
                // value={firstGlyph.advanceHeight || 0}
                value={0}
                onChange={(e) => updateMetric('advanceHeight', Math.round(Number(e.target.value)))}
                className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* 태그 및 그룹 */}
      {/* <div className="space-y-4">
        <h3 className="text-sm font-bold">태그 및 그룹</h3>
        <div>
          <label className="block text-xs font-medium mb-1">태그</label>
          <div className="flex flex-wrap gap-1">
            {['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'].map(tag => (
              <button
                key={tag}
                onClick={() => {
                  // const currentTags = firstGlyph.tags || [];
                  // const newTags = currentTags.includes(tag)
                  //   ? currentTags.filter(t => t !== tag)
                  //   : [tag]; // 하나만 선택 가능
                  // updateGlyph('tags', newTags);
                }}
                className={`px-2 py-1 text-xs rounded-full ${
                  // firstGlyph.tags?.includes(tag)
                  //   ? `bg-${tag}-500 text-white`
                    // : 'bg-gray-200 dark:bg-zinc-700'
                    'bg-gray-200 dark:bg-zinc-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">그룹</label>
          <div className="space-y-1">
            {Object.keys(fontData.groups || {}).map(group => (
              <label key={group} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  // checked={firstGlyph.groups?.includes(group) || false}
                  checked={false}
                  onChange={(e) => {
                    // const currentGroups = firstGlyph.groups || [];
                    // const newGroups = e.target.checked
                    //   ? [...currentGroups, group]
                    //   : currentGroups.filter(g => g !== group);
                    // updateGlyph('groups', newGroups);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-xs">{group}</span>
              </label>
            ))}
          </div>
        </div>
      </div> */}

      {/* 메모 */}
      {/* <div className="space-y-4">
        <h3 className="text-sm font-bold">메모</h3>
        <textarea
          // value={firstGlyph.note || ''}
          value={""}
          onChange={(e) => updateGlyph('note', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-sm"
          rows={4}
        />
      </div> */}

      {isMultiple && (
        <div className="text-xs text-gray-500">
          {glyphs.length}개의 글리프가 선택되었습니다. 변경사항은 모두에 적용됩니다.
        </div>
      )}
    </div>
  );
}
