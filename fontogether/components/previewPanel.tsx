"use client";

import { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { GlyphData, ProjectData } from "@/types/font";
import { ChevronUp, ChevronDown } from "lucide-react";
import { convertToOpenType } from "./convertToOpenType";
import opentype from "opentype.js";

interface PreviewPanelProps {
  fontData: ProjectData | null;
  glyphData: GlyphData[];
  onHeightChange?: (height: number) => void;
  initialHeight?: number;
}

export default function PreviewPanel({ fontData, glyphData, onHeightChange, initialHeight = 256 }: PreviewPanelProps) {
  // const [previewText, setPreviewText] = useState("The quick brown fox jumps over the lazy dog.");
  const [previewText, setPreviewText] = useState("");

  const [selectedLanguage, setSelectedLanguage] = useState<string>('ENG');
  const [selectedScript, setSelectedScript] = useState<string>('DFLT');
  const [activeFeatures, setActiveFeatures] = useState<Set<string>>(new Set());
  const [fontSize, setFontSize] = useState<number>(48);
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [tracking, setTracking] = useState<number>(0);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);

  // const availableLanguages = Object.keys(fontData.features?.languages || {});
  // const availableFeatures = [
  //   ...Object.keys(fontData.features?.gsub || {}),
  //   ...Object.keys(fontData.features?.gpos || {}),
  // ];

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = panelHeight;
    e.preventDefault();
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;
    const deltaY = resizeStartY.current - e.clientY; // 위로 드래그하면 높이 증가
    const newHeight = Math.max(100, Math.min(600, resizeStartHeight.current + deltaY));
    setPanelHeight(newHeight);
    onHeightChange?.(newHeight);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  const previewFont: opentype.Font | undefined = useMemo(() => {
    if (!fontData) return;

    const fontInfo = JSON.parse(fontData.fontInfo);
    return convertToOpenType(fontData, fontInfo.unitsPerEm, fontInfo.ascender, fontInfo.descender, glyphData);
  }, [fontData, glyphData]);

  const renderText = (canvas: HTMLCanvasElement | null, font: opentype.Font | undefined, text: string) => {
    if (!canvas) return;
    if (!font) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // for (const char of text) {
    //   const glyph = font.charToGlyph(char);
    //   if (!glyph)
    //     return;
    // }

    // 1. 기존 화면 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. 텍스트 그리기 (ctx, text, x, y, fontSize, options)
    const x = 0;
    const y = canvas.clientHeight / 2 + (300 / 1000) * fontSize;

    console.log('about to draw')

    font.draw(ctx, text, x, y, fontSize, {
      kerning: false,
      features: {}
    });
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing]);

  useEffect(() => {
    renderText(canvasRef.current, previewFont, previewText);
  }, [previewFont, previewText, fontSize, lineHeight, tracking])

  if (isCollapsed) {
    return (
      <div className="px-2 py-1 border-t border-gray-200 flex flex-row justify-between items-center dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
        <span className="text-xs font-medium select-none">미리보기</span>
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 select-none rounded"
        >
          <ChevronUp size={16} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900"
      style={{ height: `${panelHeight}px` }}
    >
      {/* 리사이즈 핸들 */}
      <div
        onMouseDown={handleResizeStart}
        className="h-1 cursor-ns-resize bg-transparent select-none"
      />

      {/* 컨트롤 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: OpenType 기능 선택 */}
        <div className="w-24 border-r border-gray-200 dark:border-zinc-700 overflow-y-auto p-2">
          <div className="space-y-3">
            {/* <div>
              <label className="block text-xs font-medium mb-1 select-none">OpenType 기능</label>
              <div className="space-y-1">
                {availableFeatures.map(feature => (
                  <label key={feature} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={activeFeatures.has(feature)}
                      onChange={(e) => {
                        const newSet = new Set(activeFeatures);
                        if (e.target.checked) {
                          newSet.add(feature);
                        } else {
                          newSet.delete(feature);
                        }
                        setActiveFeatures(newSet);
                      }}
                      className="w-3 h-3"
                    />
                    <span>{feature}</span>
                  </label>
                ))}
              </div>
            </div> */}
            {/* <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium mb-1 select-none">언어</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-xs"
                >
                  {availableLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 select-none">스크립트</label>
                <select
                  value={selectedScript}
                  onChange={(e) => setSelectedScript(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="DFLT">DFLT</option>
                </select>
              </div>
            </div> */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium mb-1 select-none">글꼴 크기</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 select-none">줄 간격</label>
                <input
                  type="number"
                  value={lineHeight}
                  step="0.1"
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 select-none">트래킹</label>
                <input
                  type="number"
                  value={tracking}
                  onChange={(e) => setTracking(Number(e.target.value))}
                  step="0.05"
                  className="w-full px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-xs"
                />
              </div>
              <div className="p-4">
                <button
                  onClick={() => {
                    previewFont?.download(`${fontData?.title}.otf`);
                  }}
                  className="px-4 py-1 rounded bg-gray-100 dark:bg-zinc-900 text-sm active:bg-gray-200 dark:active:bg-zinc-800"
                >내려받기</button>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 미리보기 영역 */}
        <div className="grow flex flex-col">
          <div className="px-2 py-1 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between">
            <span className="text-xs font-medium select-none">미리보기</span>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          <input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            className="outline-none bg-white dark:bg-black m-2 p-1 rounded border border-gray-300 dark:border-zinc-700 focus:border-blue-500"
          />
          <div ref={canvasContainerRef} className="grow p-4 overflow-auto">
            <canvas ref={canvasRef} width={canvasRef.current?.clientWidth || 600} height={canvasRef.current?.clientHeight || 240} className="w-full h-full" style={{ imageRendering: 'auto' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
