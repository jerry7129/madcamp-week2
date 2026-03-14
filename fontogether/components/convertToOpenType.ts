import { GlyphData, ProjectData } from '@/types/font';
import opentype from 'opentype.js';

interface GlyphPoint {
  x: number;
  y: number;
  type?: 'line' | 'curve';
  smooth?: boolean;
}

/**
 * 사용자 데이터를 OpenType.js Font 객체로 변환
 */
export function convertToOpenType(
  fontData: ProjectData,
  unitsPerEm: number,
  ascender: number,
  descender: number,
  glyphs: GlyphData[]
): opentype.Font {
  const fontInfo = JSON.parse(fontData.fontInfo);

  // 1. .notdef 글리프 생성 (폰트 표준 필수 사항)
  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: unitsPerEm * 0.6,
    path: new opentype.Path()
  });

  // 2. 사용자 글리프 배열을 OpenType.js Glyph 객체로 변환
  const otGlyphs = glyphs.map((g) => {
    const otPath = new opentype.Path();

    // 컨투어(폐곡선) 데이터 처리
    const contours = g.outlineData?.contours;
    if (contours) {
      contours.forEach((contour: any) => {
        const points = contour.points;
        if (points.length === 0) return;

        // 첫 번째 점으로 이동
        otPath.moveTo(points[0].x, points[0].y);

        const offCurvePoints: GlyphPoint[] = [];

        // 순환 구조를 고려하여 점 순회
        for (let i = 1; i <= points.length; i++) {
          const pt = points[i % points.length];

          if (!pt.type) {
            // 제어점(Off-curve)인 경우 버퍼에 저장
            offCurvePoints.push(pt);
          } else {
            if (pt.type === 'line') {
              otPath.lineTo(pt.x, pt.y);
            } else if (pt.type === 'curve') {
              if (offCurvePoints.length === 1) {
                // 2차 베지어
                otPath.quadraticCurveTo(offCurvePoints[0].x, offCurvePoints[0].y, pt.x, pt.y);
              } else if (offCurvePoints.length === 2) {
                // 3차 베지어
                otPath.bezierCurveTo(
                  offCurvePoints[0].x, offCurvePoints[0].y,
                  offCurvePoints[1].x, offCurvePoints[1].y,
                  pt.x, pt.y
                );
              }
            }
            offCurvePoints.length = 0; // 버퍼 비우기
          }
        }
        otPath.close();
      });
    }

    return new opentype.Glyph({
      name: g.glyphName,
      unicode: (g.glyphName === '.notdef') ? 0 : g.unicodes[0],
      advanceWidth: g.advanceWidth,
      path: otPath
    });
  });

  // console.log('Name of the first glyph:', otGlyphs[0]?.name);
  console.log(otGlyphs.filter(g => g.name === '.notdef'));

  // 3. 최종 폰트 객체 생성 및 반환
  const targetFont = new opentype.Font({
    familyName: fontInfo.familyName || fontData.title || '내 글꼴',
    styleName: fontInfo.styleName || 'Regular',
    unitsPerEm: fontInfo.unitsPerEm || 1000,
    ascender: fontInfo.ascender || 800,
    descender: fontInfo.descender || -200,
    // glyphs: (!glyphs.some(g => g.glyphName === '.notdef')) ? [notdefGlyph, ...otGlyphs] : otGlyphs // .notdef가 반드시 0번 인덱스여야 함
    glyphs: [notdefGlyph, ...otGlyphs]
  });

  targetFont.names.postScriptName = { en: fontInfo.postscriptFontName };
  targetFont.names.fullName = { en: fontInfo.postscriptFullName };

  return targetFont;
}
