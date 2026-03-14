"use client";

import { useState, useRef, useEffect } from 'react';
import opentype from 'opentype.js';

export default function A() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [fontData, setFontData] = useState<opentype.Font | null>(null)
  const [previewText, setPreviewText] = useState('A quick brown fox');

  useEffect(() => {
    opentype.load('/PretendardStd-Regular.otf', (e, f) => {
      if (e) {
        console.error(e);
      } else if (f) {
        setFontData(f);
        console.log(`Font file with ${f.glyphs.length} glyphs loaded`);

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current?.width || 800, canvasRef.current?.height || 400);
          f.draw(ctx, previewText, 0, (canvasRef.current?.height || 400) - 20, 24)
        }
      }
    });
  }, [previewText])

  return (
    <div
      className="p-2 flex flex-col bg-gray-100 dark:bg-zinc-900"
    >
      <input
        type="text"
        value={previewText}
        onChange={(e) => setPreviewText(e.target.value)}
        className="p-1 bg-white dark:bg-black border border-gray-300 dark:border-zinc-700 rounded"
      />
      <div className="grow p-2">
        <canvas ref={canvasRef} />
      </div>
      <div className="w-full">
        Ascender: {fontData?.ascender}, Descender: {fontData?.descender}, {JSON.stringify(fontData?.encoding, [], 2)}
      </div>
      <div>
        {JSON.stringify(fontData?.glyphs.get(3).getPath())}
      </div>
      <button onClick={() => fontData?.download()}>asdf</button>
    </div>
  );
}
