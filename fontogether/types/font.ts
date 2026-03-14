// UFO 형식의 폰트 데이터 구조 (JSON 변환 형태)

export interface GlyphData_OLD {
  id: number;
  name: string;
  unicode?: number[];
  advanceWidth: number;
  advanceHeight?: number; // 세로쓰기 지원 시
  contours?: Contour[];
  components?: Component[];
  tags?: string[]; // 색상 태그 (빨주노초파보분회)
  groups?: string[]; // 사용자 정의 그룹
  note?: string; // 메모
  openTypeClass?: string;
  lsb?: number; // Left Side Bearing
  rsb?: number; // Right Side Bearing
  tsb?: number; // Top Side Bearing (세로쓰기)
  bsb?: number; // Bottom Side Bearing (세로쓰기)
}

export interface Contour {
  points: Point[];
  closed: boolean;
}

export interface Point {
  x: number;
  y: number;
  type?: 'line' | 'curve' | 'qcurve'; // line, offcurve, curve
  smooth?: boolean;
}

export interface Component {
  base: string; // 참조하는 글리프 이름
  transformation: {
    xScale?: number;
    yScale?: number;
    xOffset?: number;
    yOffset?: number;
    rotation?: number;
  };
}

export interface FontData {
  metadata: FontMetadata;
  metrics: FontMetrics;
  glyphs: GlyphData_OLD[];
  features?: FeatureFile;
  groups?: { [key: string]: string[] }; // 그룹 이름 -> 글리프 이름 배열
  kerning?: { [key: string]: number }; // 케닝 데이터
}

export interface FontMetadata {
  familyName: string;
  styleName: string;
  fullName: string;
  postscriptName: string;
  version: string;
  copyright?: string;
  designer?: string;
  manufacturer?: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
  italicAngle?: number;
  underlinePosition?: number;
  underlineThickness?: number;
  strikeoutPosition?: number;
  strikeoutThickness?: number;
  verticalWriting?: boolean;
  unicodeRanges?: number[][];
  codePages?: number[];
  panose?: number[];
}

export interface FontMetrics {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
  italicAngle?: number;
  underlinePosition?: number;
  underlineThickness?: number;
  strikeoutPosition?: number;
  strikeoutThickness?: number;
  verticalWriting?: boolean;
}

export interface FeatureFile {
  languages?: { [key: string]: string }; // 언어 코드 -> 스크립트
  tables?: { [key: string]: string }; // 테이블 선언
  classes?: { [key: string]: string[] }; // 클래스 정의
  lookups?: { [key: string]: string }; // named lookup 선언
  gsub?: { [key: string]: FeatureRule }; // GSUB 기능
  gpos?: { [key: string]: FeatureRule }; // GPOS 기능
}

export interface FeatureRule {
  code: string;
  enabled: boolean;
}

export type SortOption = 
  | 'index' 
  | 'codepoint' 
  | 'name' 
  | 'user-friendly' 
  | 'script-order';

export type FilterCategory = 
  | 'tag' 
  | 'group' 
  | 'language' 
  | 'script' 
  | 'opentype-class' 
  | 'none';

export type ColorTag = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';




/* =============== */

export interface ProjectData {
  createdAt: Date;
  features: string;
  // fontInfo: FontInfo;
  fontInfo: string;
  groups: string;
  // groups: Groups;
  isShared: boolean;
  kerning: string;
  // kerning: Kerning;
  layerConfig: string;
  // layerConfig: LayerContents;
  // metaInfo: MetaInfo;
  metaInfo: string;
  ownerId: number;
  ownerNickname: string;
  projectId: number;
  role: 'OWNER' | 'EDITOR' | 'VIEWER'; // Needs check
  title: string;
  updatedAt: Date;
}

export interface MetaInfo {
  creator: string;
  formatVersion: number;
  formatVersionMinor: number
};

export interface FontInfo {
  /* Generic Identification Information */
  familyName: string;
  styleName: string;
  styleMapFamilyName: string;
  styleMapStyleName: string;
  versionMajor: number;
  versionMinor: number;
  year: number;

  /* Generic Legal Information */
  copyright: string;
  trademark: string;

  /* Generic Dimension Information */
  unitsPerEm: number;
  descender: number;
  xHeight: number;
  capHeight: number;
  ascender: number;
  italicAngle: number;

  /* Generic Miscellaneous Information */
  note: string

  /* OpenType gasp Table Fields */
  openTypeGaspRangeRecords: { rangeMaxPPEM: number, rangeGaspBehavior: number[] }[];

  /* OpenType head Table Fields */
  openTypeHeadCreated: string;
  openTypeHeadLowestRecPPEM: string;
  openTYpeHeadFlags: number[];

  /* OpenType hhea Table Fields */
  openTypeHheaAscender: number;
  openTypeHheaDescender: number;
  openTypeHheaLineGap: number;
  openTypeHheaCaretSlopeRise: number;
  openTypeHheaCaretSlopeRun: number;
  openTypeHheaCaretOffset: number;

  /* OpenType name Table Fields */
  openTypeNameDesigner: string;
  openTypeNameDesignerURL: string;
  openTypeNameManufacturer: string;
  openTypeNameManufacturerURL: string;
  openTypeNameLicense: string;
  openTypeNameLicenseURL: string;
  openTypeNameVersion: string;
  openTypeNameUniqueID: string;
  openTypeNameDescription: string;
  openTypeNamePreferredFamilyName: string;
  openTypeNamePreferredSubfamilyName: string;
  openTypeNameCompatibleFullName: string;
  openTypeNameSampleText: string;
  openTypeNameWWSFamilyName: string;
  openTypeNameWWSSubfamilyName: string;
  openTypeNameRecords: { nameID: number, platformID: number, encodingID: number, languageID: number, string: string }[];

  /* OpenType OS/2 Table Fields */
  openTypeOS2WidthClass: number;
  openTypeOS2WeightClass: number;
  openTypeOS2Selection: number[];
  openTypeOS2VendorID: string;
  openTypeOS2Panose: number[];
  openTypeOS2FamilyClass: number[];
  openTypeOS2UnicodeRanges: number[];
  openTypeOS2CodePageRanges: number[];
  openTypeOS2TypoAscender: number;
  openTypeOS2TypoDescender: number;
  openTypeOS2TypoLineGap: number;
  openTypeOS2WinAscent: number;
  openTypeOS2WinDescent: number;
  openTypeOS2Type: number[];
  openTypeOS2SubscriptXSize: number;
  openTypeOS2SubscriptYSize: number;
  openTypeOS2SubscriptXOffset: number;
  openTypeOS2SubscriptYOffset: number;
  openTypeOS2SuperscriptXSize: number;
  openTypeOS2SuperscriptYSize: number;
  openTypeOS2SuperscriptXOffset: number;
  openTypeOS2SuperscriptYOffset: number;
  openTypeOS2StrikeoutSize: number;
  openTypeOS2StrikeoutPosition: number;

  /* OpenType vhea Table Fields */
  openTypeVheaVertTypoAscender: number;
  openTypeVheaVertTypoDescender: number;
  openTypeVheaVertTypoLineGap: number;
  openTypeVheaCaretSlopeRise: number;
  openTypeVheaCaretSlopeRun: number;
  openTypeVheaCaretOffset: number;

  /* PostScript Specific Data */
  // 22 properties

  /* Macintosh FOND Resource Data */
  mackntoshFONDFamilyID: number;
  macintoshFONDName: string;

  /* WOFF Data */
  woffMajorVersion: number;
  woffMinorVersion: number;
  woffMetadataUniqueID: { id: string };
  woffMetadataVendor: { name: string, url: string, dir: string, class: string };
  woffMetadataCredits: { credits: { name: string, url: string, rold: string, dir: string, class: string }[] };
  woffMetadataDescription: { url: string, text: WOFFMetadataTextRecord[] };
  woffMetadataLicense: { url: string, id: string, text: WOFFMetadataTextRecord[] };
  woffMetadataCopyright: { text: WOFFMetadataTextRecord[] };
  woffMetadataTrademark: { text: WOFFMetadataTextRecord[] };
  woffMetadataLicensee: { name: string, dir: string, class: string };
  woffMetadataExtensions: WOFFMetadataExtensionRecord[];

  /* Guidelines */
  guidelines: Guideline[];
}

/* WOFF */

interface WOFFMetadataTextRecord {
  text: string;
  language: string;
  dir: string;
  class: string;
}

interface WOFFMetadataExtensionRecord {
  id: string;
  names: WOFFMetadataExtensionNameRecord[];
  items: WOFFMetadataExtensionItemRecord[];
}

interface WOFFMetadataExtensionItemRecord {
  id: string;
  names: WOFFMetadataExtensionNameRecord[];
  values: WOFFMetadataExtensionValueRecord[];
}

interface WOFFMetadataExtensionNameRecord {
  text: string;
  language: string;
  dir: string;
  class: string;
}

interface WOFFMetadataExtensionValueRecord {
  text: string;
  language: string;
  dir: string;
  class: string;
}

/* Guideline */

interface Guideline {
  x: number;
  y: number;
  angle: number;
  name: string;
  color: string;
  identifier: string;
}

/* Groups */

type Groups = { [key: string]: string[] };

/* Kerning */

type Kerning = { [key: string]: { [key: string]: number } };

/* Layer Contents */

type LayerContents = LayerContent[];
type LayerContent = string[];

/* Glyph data */

// Actual data retrived from server
export interface RawGlyphData {
  advanceHeight: number;
  advanceWidth: number;
  formatVersion: number;
  glyphName: string;
  glyphUuid: string;
  lastModifiedBy: number | null;
  layerName: string;
  outlineData: string;
  projectId: number;
  properties: string;
  unicodes: string[];
  updatedAt: Date;
}

// Machine-readable glyph data
export interface GlyphData {
  advanceHeight: number;
  advanceWidth: number;
  formatVersion: number;
  glyphName: string;
  glyphUuid: string;
  lastModifiedBy: number | null;
  layerName: string;
  outlineData: any;
  projectId: number;
  properties: any; // ??
  unicodes: number[];
  updatedAt: Date;
}

// Specifications from UFO font format
interface Glyph {
  name: string;
  format: number;
  formatMinor: number;
  advances: Advance | null;
  unicode: Unicode[];
  note: string | null;
  image: Image;
  guideline: Guideline[];
  // anchor: Anchor[];
  // outline: Outline;
  // lib: Lib;
}

interface Advance {
  width: number;
  height: number;
}

interface Unicode {
  hex: number;
}

interface Image {
  fileName: string;
  xScale: number;
  xyScale: number;
  yxScale: number;
  yScale: number;
  xOffset: number;
  yOffset: number;
  color: string;
}
