import { GlyphData, ColorTag } from "@/types/font";
import { useEffect, useRef, useState } from "react";

interface GlyphPreviewProps {
  id: string;
  glyph?: GlyphData;
  onDoubleClick?: () => void;
  isSelected: boolean;
  size?: number;
}

export default function GlyphPreview({ id, glyph, onDoubleClick = () => {}, isSelected, size = 120 }: GlyphPreviewProps) {
  // const tagColor = glyph?.tags?.[0] as ColorTag | undefined;
  const tagColor = undefined;

  const colorName = tagColor ? {
    red: 'red',
    orange: 'orange',
    yellow: 'yellow',
    green: 'green',
    blue: 'blue',
    purple: 'purple',
    gray: 'gray',
  }[tagColor] : null;
  const bgColorName = colorName ? `bg-${colorName}-500` : 'bg-transparent';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contours] = useState(glyph?.outlineData.contours);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      if (contours) {
        contours.forEach((contour: { points: PointData[] }) => {
          drawContourOnCanvas(size, glyph?.advanceWidth || 1000, ctx, contour.points);
        });
      }
    }
    if (glyph?.glyphName === 'quotedbl') {
      console.log("changes caught on glyphPreview; redrawing");
    }
  }, [glyph, size, contours]);

  return (
    <div
      data-id={id}
      onDoubleClick={onDoubleClick}
      className={`relative ${isSelected ? "bg-gray-200 dark:bg-zinc-700" : "bg-white dark:bg-black"} shadow-md dark:shadow-zinc-800 rounded-lg select-none overflow-hidden`}
      // style={{ width: `${size}px` }}
    >
      {/* 태그 색상 표시 */}
      {/* <div className={`h-2 ${bgColorName} opacity-50`} /> */}
      
      {/* 글리프 미리보기 영역 */}
      <div className="p-2 pb-0">
        <canvas ref={canvasRef} width={size} height={size} className="mx-auto flex items-center justify-center" />
      </div>
      
      {/* 글리프 이름 */}
      <p className="p-1 text-xs text-center text-black dark:text-white">
        {glyph?.glyphName || `Glyph ${id}`}
      </p>
    </div>
  );
}


interface PointData {
  x: number;
  y: number;
  type?: 'line' | 'curve'; // type이 없는 경우도 처리
  smooth?: boolean;
}

const drawContourOnCanvas = (
  size: number,
  glyphWidth: number,
  ctx: CanvasRenderingContext2D,
  contour: PointData[]
) => {
  if (contour.length === 0) return;

  ctx.beginPath();

  const scale = size / 1000;

  // 폰트 좌표계 변환 적용 (캔버스 Y축 반전)
  ctx.save();
  ctx.translate((size - scale * glyphWidth) / 2, size - (120 * scale));
  ctx.scale(scale, -scale);

  ctx.beginPath();

  // 1. 실제 시작점(On-Curve) 찾기 로직
  // 첫 번째 점이 제어점인 경우, 뒤에서부터 탐색하여 첫 'line' 또는 'curve'를 시작점으로 잡음
  let startIndex = 0;
  for (let i = 0; i < contour.length; i++) {
    if (contour[i].type === 'line' || contour[i].type === 'curve') {
      startIndex = i;
      break;
    }
  }

  // 선 두께 설정
  ctx.lineWidth = 1 / scale;

  // 시작점 설정 (첫 On-Curve 점으로 이동)
  const firstOnCurve = contour[startIndex];
  ctx.moveTo(firstOnCurve.x, firstOnCurve.y);

  // 2. 순환 구조를 고려하여 그리기
  const offCurvePoints: PointData[] = [];
  
  // 시작점 이후부터 한 바퀴 돌고 시작점 전까지 다시 도는 방식
  for (let i = 1; i <= contour.length; i++) {
    const nextIndex = (startIndex + i) % contour.length;
    const point = contour[nextIndex];

    if (!point.type) {
      // 제어점(Off-Curve)인 경우 버퍼에 저장
      offCurvePoints.push(point);
    } else {
      // 끝점(On-Curve: line 또는 curve)을 만난 경우
      if (point.type === 'line') {
        ctx.lineTo(point.x, point.y);
      } else if (point.type === 'curve') {
        if (offCurvePoints.length === 1) {
          // 2차 베지어
          ctx.quadraticCurveTo(offCurvePoints[0].x, offCurvePoints[0].y, point.x, point.y);
        } else if (offCurvePoints.length === 2) {
          // 3차 베지어
          ctx.bezierCurveTo(
            offCurvePoints[0].x, offCurvePoints[0].y,
            offCurvePoints[1].x, offCurvePoints[1].y,
            point.x, point.y
          );
        } else {
          // 제어점이 없는 curve 타입은 line처럼 처리
          ctx.lineTo(point.x, point.y);
        }
      }
      // 사용한 제어점 버퍼 비우기
      offCurvePoints.length = 0;
    }
  }

  ctx.closePath();
  ctx.stroke();
  ctx.restore();
};
