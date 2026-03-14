// 임시 폰트 데이터 생성
import { FontData, GlyphData_OLD } from '@/types/font';

export function createMockFontData(): FontData {
  const glyphs: GlyphData_OLD[] = [];
  
  // 기본 라틴 문자
  for (let i = 0; i < 26; i++) {
    const charCode = 65 + i; // A-Z
    glyphs.push({
      id: i,
      name: String.fromCharCode(charCode),
      unicode: [charCode],
      advanceWidth: 500,
      lsb: 50,
      rsb: 50,
      tags: i % 8 === 0 ? ['red'] : i % 8 === 1 ? ['orange'] : [],
      groups: i < 13 ? ['Uppercase'] : [],
      openTypeClass: 'base',
    });
  }
  
  // 소문자
  for (let i = 0; i < 26; i++) {
    const charCode = 97 + i; // a-z
    glyphs.push({
      id: 26 + i,
      name: String.fromCharCode(charCode),
      unicode: [charCode],
      advanceWidth: 450,
      lsb: 50,
      rsb: 50,
      tags: [],
      groups: ['Lowercase'],
      openTypeClass: 'base',
    });
  }
  
  // 숫자
  for (let i = 0; i < 10; i++) {
    const charCode = 48 + i; // 0-9
    glyphs.push({
      id: 52 + i,
      name: String.fromCharCode(charCode),
      unicode: [charCode],
      advanceWidth: 500,
      lsb: 50,
      rsb: 50,
      tags: [],
      groups: ['Numbers'],
      openTypeClass: 'base',
    });
  }
  
  // 한글 (예시)
  const hangulStart = 0xAC00;
  for (let i = 0; i < 20; i++) {
    glyphs.push({
      id: 62 + i,
      name: `uni${(hangulStart + i).toString(16).toUpperCase()}`,
      unicode: [hangulStart + i],
      advanceWidth: 1000,
      lsb: 50,
      rsb: 50,
      tags: [],
      groups: ['Hangul'],
      openTypeClass: 'base',
    });
  }
  
  return {
    metadata: {
      familyName: 'Sample Font',
      styleName: 'Regular',
      fullName: 'Sample Font Regular',
      postscriptName: 'SampleFont-Regular',
      version: '1.000',
      copyright: '© 2024',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      capHeight: 700,
      xHeight: 500,
      verticalWriting: false,
    },
    metrics: {
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      capHeight: 700,
      xHeight: 500,
    },
    glyphs,
    groups: {
      'Uppercase': glyphs.filter(g => g.groups?.includes('Uppercase')).map(g => g.name),
      'Lowercase': glyphs.filter(g => g.groups?.includes('Lowercase')).map(g => g.name),
      'Numbers': glyphs.filter(g => g.groups?.includes('Numbers')).map(g => g.name),
      'Hangul': glyphs.filter(g => g.groups?.includes('Hangul')).map(g => g.name),
    },
    features: {
      languages: {
        'KOR': 'DFLT',
        'ENG': 'DFLT',
      },
      gsub: {
        'liga': {
          code: 'feature liga {\n  sub f i by f_i;\n} liga;',
          enabled: true,
        },
      },
      gpos: {},
    },
  };
}
