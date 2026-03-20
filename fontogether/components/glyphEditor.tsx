"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback, act, Dispatch, SetStateAction } from "react";
import paper from "paper";
import { GlyphData } from "@/types/font";

interface GlyphEditorProps {
  glyphData: GlyphData;
  updatedTime: number | null;
  onGlyphDataChange: (data: GlyphData, isCommit?: boolean) => void;
  key: string;
  zoomAction: {
    type: 'IN' | 'OUT' | 'RESET';
    timestamp: number;
  } | null;
  onZoomComplete: () => void;
  selectedTool: string;
  onToolChange?: (tool: string) => void;
}

export default function GlyphEditor({ glyphData, updatedTime, onGlyphDataChange, key, zoomAction, onZoomComplete, selectedTool, onToolChange }: GlyphEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectRef = useRef<paper.Project | null>(null);

  // Tool references
  const pointerToolRef = useRef<paper.Tool | null>(null);
  const penToolRef = useRef<paper.Tool | null>(null);
  const curveToolRef = useRef<paper.Tool | null>(null);
  const handToolRef = useRef<paper.Tool | null>(null);
  const rectangleToolRef = useRef<paper.Tool | null>(null);
  const circleToolRef = useRef<paper.Tool | null>(null);
  const zoomToolRef = useRef<paper.Tool | null>(null);
  const rulerToolRef = useRef<paper.Tool | null>(null);

  const drawingPathRef = useRef<paper.Path | null>(null);
  const selectedSegmentsRef = useRef<paper.Segment[]>([]);
  const highlightItemsRef = useRef<paper.Path.Circle[]>([]);
  const rulerLineRef = useRef<paper.Path.Line | null>(null);
  const rulerInfoRef = useRef<paper.PointText | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedPointInfo, setSelectedPointInfo] = useState<{ x: number; y: number } | null>(null);
  const [selectionBounds, setSelectionBounds] = useState<{ width: number; height: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Throttling logic for real-time visual syncing without DB commit
  const lastUpdateRef = useRef<number>(0);
  const throttledUpdate = useCallback((data: GlyphData) => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 50) { // 50ms throttle
      onGlyphDataChange(data, false);
      lastUpdateRef.current = now;
    }
  }, [onGlyphDataChange]);

  const clearHighlights = useCallback(() => {
    highlightItemsRef.current.forEach(item => item.remove());
    highlightItemsRef.current = [];
  }, []);

  const finishDrawing = useCallback(() => {
    if (drawingPathRef.current) {
      drawingPathRef.current.closed = true;
      drawingPathRef.current.fullySelected = true;
      drawingPathRef.current = null;
      selectedSegmentsRef.current = [];
      clearHighlights();
      // useLayoutEffect 내부에서 paper.view.draw()를 호출했으므로 여기서는 생략 가능
      // if (paper.view) paper.view.draw();
    }
  }, [clearHighlights]);

  const drawGlyph = (glyphData: GlyphData) => {
    const contours = glyphData.outlineData?.contours;
    if (!contours)
      return;

    contours.forEach((ct: any) => {
      const contour = ct.points

      const path = new paper.Path();
      path.strokeColor = new paper.Color('black');
      path.strokeWidth = 2;
      path.closed = true;

      // 3. 포인트 추가 로직 (순환 구조 고려)
      // 시작점이 제어점일 경우를 대비해 첫 On-curve 점을 찾음
      const startIndex = contour.findIndex((p: any) => p.type === 'line' || p.type === 'curve');
      if (startIndex === -1) return;

      for (let i = 0; i <= contour.length; i++) { 
        const idx = (startIndex + i) % contour.length;
        const pt = contour[idx];

        if (!pt.type) {
          // 제어점인 경우: Paper.js는 다음 점의 handleIn으로 이를 처리하거나 
          // segment의 handleOut으로 처리할 수 있습니다.
          // 여기서는 segments 배열에 직접 접근하여 처리하는 방식이 정확합니다.
        } else {
          // On-curve 점 추가
          const segment = new paper.Segment(new paper.Point(pt.x, pt.y));
          
          // 이전 점들이 제어점이었다면 handle 설정 (곡선 처리)
          const prevIdx1 = (idx - 1 + contour.length) % contour.length;
          const prevIdx2 = (idx - 2 + contour.length) % contour.length;

          if (!contour[prevIdx1].type) {
            if (!contour[prevIdx2].type) {
              // --- 제어점 2개 (3차 베지어) ---
              const cp2 = contour[prevIdx1]; // 현재 점(pt)과 연결된 제어점
              const cp1 = contour[prevIdx2]; // 이전 점과 연결된 제어점

              // 1. 현재 점의 handleIn 설정 (상대 좌표)
              segment.handleIn = new paper.Point(cp2.x - pt.x, cp2.y - pt.y);

              // 2. 이전 점(lastSegment)의 handleOut 설정 (상대 좌표)
              if (path.lastSegment) {
                const prevPt = path.lastSegment.point;
                path.lastSegment.handleOut = new paper.Point(cp1.x - prevPt.x, cp1.y - prevPt.y);
              }
            } else {
              // --- 제어점 1개 (2차 베지어) ---
              const cp = contour[prevIdx1];

              // 2차를 3차로 근사하기 위해 2/3 지점으로 핸들 분산 (선택 사항이지만 권장)
              segment.handleIn = new paper.Point((2/3) * (cp.x - pt.x), (2/3) * (cp.y - pt.y));
              
              if (path.lastSegment) {
                const prevPt = path.lastSegment.point;
                path.lastSegment.handleOut = new paper.Point((2/3) * (cp.x - prevPt.x), (2/3) * (cp.y - prevPt.y));
              }
            }
          }

          // 💡 마지막 점이 시작점과 좌표가 같다면 중복 추가하지 않고 핸들만 옮겨줌
          if (i === contour.length) {
            path.firstSegment.handleIn = segment.handleIn;
          } else {
            path.add(segment);
          }
        }
      }

      // 그룹을 만들어 한꺼번에 변환 적용
      const group = new paper.Group([path]);
      
      // 1) Y축 뒤집기 (폰트 좌표계 -> 캔버스 좌표계)
      group.scale(1, -1, new paper.Point(0, 0));

      // 그룹 해제 
      group.parent.insertChildren(group.index,  group.removeChildren());
      group.remove();
    });
  };

  useLayoutEffect(() => {
    if (!canvasRef.current) return;

    let isSpacePressed = false;
    let isMiddleMouseDown = false;

    // Draws grid
    const drawGrid = () => {
      const existingGrid = paper.project.getItem({ name: 'grid-layer' });
      if (existingGrid) existingGrid.remove();

      const gridLayer = new paper.Layer();
      gridLayer.name = 'grid-layer';
      // 💡 메인 도형 레이어 아래에 배치
      gridLayer.sendToBack();
      gridLayer.activate();

      const gridSize = 100; // 대그리드
      const subGridSize = 10; // 소그리드
      const viewBounds = paper.view.bounds;

      // 그리드 범위 설정 (전체 영역)
      const startX = -32768;
      const endX = 32767;
      const startY = -32768;
      const endY = 32767;

      // 세로선 그리기
      for (let x = startX; x <= endX; x += subGridSize) {
        const line = new paper.Path.Line(
          new paper.Point(x, startY),
          new paper.Point(x, endY)
        );
        const isMajor = x % gridSize === 0;
        line.strokeColor = new paper.Color(isMajor ? '#e5e7eb' : '#f3f4f6');
        line.strokeWidth = isMajor ? 1 : 0.5;
        line.data.isGuide = true;
      }

      // 가로선 그리기
      for (let y = startY; y <= endY; y += subGridSize) {
        const line = new paper.Path.Line(
          new paper.Point(startX, y),
          new paper.Point(endX, y)
        );
        const isMajor = y % gridSize === 0;
        line.strokeColor = new paper.Color(isMajor ? '#e5e7eb' : '#f3f4f6');
        line.strokeWidth = isMajor ? 1 : 0.5;
        line.data.isGuide = true;
      }

      // 💡 다시 메인 레이어로 활성 레이어 복구
      const mainLayer = paper.project.layers.find(l => l.name !== 'grid-layer');
      if (mainLayer) {
        mainLayer.activate();
      }
    }

    // Initialize canvas.
    if (projectRef.current) {
      paper.project.clear();
      projectRef.current.remove();
    }
    paper.setup(canvasRef.current);
    projectRef.current = paper.project;

    paper.settings.selectionColor = 'black';

    // Rerender canvas when it is resized.
    const updateCanvasSize = () => {
      const width = canvasRef.current!.clientWidth;
      const height = canvasRef.current!.clientHeight;
      paper.view.viewSize = new paper.Size(width, height);
    };
    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
      drawGrid();
      // paper.view.draw(); 
    });
    resizeObserver.observe(canvasRef.current);

    // Screen panning
    const handlePanning = (delta: paper.Point) => {
      paper.view.center = paper.view.center.subtract(delta);
      // paper.view.draw();
    };
    const panOnDrag = (event: paper.ToolEvent) => {
      // space가 눌려있거나 휠 버튼이 눌려있는 경우
      if (isSpacePressed || isMiddleMouseDown) {
        handlePanning(event.delta);
        return true;
      }
      return false;
    };

    // Font metrics and guides
    const metrics = {
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      capHeight: 700,
      xHeight: 500,
      advanceWidth: glyphData.advanceWidth,
    };

    // Baseline
    const baseline = new paper.Path.Line(
      new paper.Point(-32768, 0),
      new paper.Point(32767, 0),
    );
    baseline.strokeColor = new paper.Color("#e5e7eb");
    baseline.strokeWidth = 1;
    baseline.data.isGuide = true;
    baseline.locked = true;
    const baselineLabel = new paper.PointText({
      point: new paper.Point(-32760, 0),
      content: 'baseline',
      fillColor: '#9ca3af',
      fontSize: 10,
      guide: true,
      locked: true,
    });

    // X-height
    const xHeight = new paper.Path.Line(
      new paper.Point(-32768, metrics.xHeight),
      new paper.Point(32767, metrics.xHeight),
    );
    xHeight.strokeColor = new paper.Color("#d1d5db");
    xHeight.strokeWidth = 1;
    xHeight.data.isGuide = true;
    xHeight.locked = true;
    const xHeightLabel = new paper.PointText({
      point: new paper.Point(-32760, metrics.xHeight),
      content: 'x-height',
      fillColor: '#9ca3af',
      fontSize: 10,
      guide: true,
      locked: true,
    });

    // Cap height
    const capHeight = new paper.Path.Line(
      new paper.Point(-32768, metrics.capHeight),
      new paper.Point(32767, metrics.capHeight),
    );
    capHeight.strokeColor = new paper.Color("#d1d5db");
    capHeight.strokeWidth = 1;
    capHeight.data.isGuide = true;
    capHeight.locked = true;
    const capHeightLabel = new paper.PointText({
      point: new paper.Point(-32760, metrics.capHeight),
      content: 'cap-height',
      fillColor: '#9ca3af',
      fontSize: 10,
      guide: true,
      locked: true,
    });

    // Ascender
    const ascender = new paper.Path.Line(
      new paper.Point(-32768, metrics.ascender),
      new paper.Point(32767, metrics.ascender),
    );
    ascender.strokeColor = new paper.Color("#9ca3af");
    ascender.strokeWidth = 1;
    ascender.data.isGuide = true;
    ascender.locked = true;
    const ascenderLabel = new paper.PointText({
      point: new paper.Point(-32760, metrics.ascender),
      content: 'ascender',
      fillColor: '#9ca3af',
      fontSize: 10,
      guide: true,
      locked: true,
    });

    // Descender
    const descender = new paper.Path.Line(
      new paper.Point(-32768, metrics.descender),
      new paper.Point(32767, metrics.descender),
    );
    descender.strokeColor = new paper.Color("#9ca3af");
    descender.strokeWidth = 1;
    descender.data.isGuide = true;
    descender.locked = true;
    const descenderLabel = new paper.PointText({
      point: new paper.Point(-32760, metrics.descender),
      content: 'descender',
      fillColor: '#9ca3af',
      fontSize: 10,
      guide: true,
      locked: true,
    });

    // Origin line (vertical)
    const originLine = new paper.Path.Line(
      new paper.Point(0, -32768),
      new paper.Point(0, 32767),
    );
    originLine.strokeColor = new paper.Color("#e5e7eb");
    originLine.strokeWidth = 1;
    originLine.data.isGuide = true;
    originLine.locked = true;

    // Advance width line
    let advanceWidthLine: paper.Path.Line | null = null;
    let advanceWidthDragging = false;

    const updateAdvanceWidthLine = () => {
      if (advanceWidthLine) advanceWidthLine.remove();
      advanceWidthLine = new paper.Path.Line(
        new paper.Point(metrics.advanceWidth, -32768),
        new paper.Point(metrics.advanceWidth, 32767),
      );
      advanceWidthLine.strokeColor = new paper.Color("#3b82f6");
      advanceWidthLine.strokeWidth = 2;
      advanceWidthLine.data.isGuide = true;
      advanceWidthLine.locked = false;
    };
    updateAdvanceWidthLine();

    // Draw glyph data
    drawGlyph(glyphData);
    paper.view.center = new paper.Point(glyphData.advanceWidth / 2, -300);

    const createHighlight = (point: paper.Point, isHandle: boolean = false) => {
      const circle = new paper.Path.Circle({
        center: point,
        radius: isHandle ? 4 : 6,
        fillColor: isHandle ? '#60a5fa' : '#3b82f6', // Tailwind blue-500
        strokeColor: 'white',
        strokeWidth: 1,
        guide: true,
        insert: true,
      });
      circle.data.isGuide = true;
      highlightItemsRef.current.push(circle);
    };

    const refreshHighlights = () => {
      clearHighlights();
      selectedSegmentsRef.current.forEach(seg => {
        // 1. 꼭짓점 하이라이트
        createHighlight(seg.point);
        // 2. 조절점(HandleIn) 하이라이트 - 0이 아닐 때만
        if (!seg.handleIn.isZero()) {
          createHighlight(seg.point.add(seg.handleIn), true);
        }
        // 3. 조절점(HandleOut) 하이라이트 - 0이 아닐 때만
        if (!seg.handleOut.isZero()) {
          createHighlight(seg.point.add(seg.handleOut), true);
        }
      });
    };

    // Pointer tool: moves existing points
    pointerToolRef.current = new paper.Tool();
    let hitHandle: paper.Point | null = null;
    let selectionRect: paper.Path.Rectangle | null = null;

    pointerToolRef.current.onMouseDown = (event: paper.ToolEvent) => {
      // Advance width line 드래그 체크
      if (advanceWidthLine) {
        const hitResult = advanceWidthLine.hitTest(event.point, { tolerance: 10 });
        if (hitResult) {
          advanceWidthDragging = true;
          return;
        }
      }

      const hitResult = paper.project.hitTest(event.point, {
        segments: true,
        handles: true,
        tolerance: 8
      });

      hitHandle = null;
      const isModifier = event.modifiers.shift || event.modifiers.control || event.modifiers.meta;

      if (hitResult) {
        if (hitResult.type === 'segment') {
          let hitSegment = hitResult.segment as paper.Segment;

          if (isModifier) {
            const index = selectedSegmentsRef.current.indexOf(hitSegment);
            if (index > -1) {
              selectedSegmentsRef.current.splice(index, 1);
            } else {
              selectedSegmentsRef.current.push(hitSegment);
            }
          } else {
            if (!selectedSegmentsRef.current.includes(hitSegment)) {
              selectedSegmentsRef.current = [hitSegment];
            }
          }
        } else if (hitResult.type === 'handle-in') {
          // 💡 들어오는 핸들 선택
          hitHandle = hitResult.segment.handleIn;
          selectedSegmentsRef.current = [hitResult.segment];
        } else if (hitResult.type === 'handle-out') {
          // 💡 나가는 핸들 선택
          hitHandle = hitResult.segment.handleOut;
          selectedSegmentsRef.current = [hitResult.segment];
        }
        refreshHighlights();
      } else {
        if (!isModifier) {
          selectedSegmentsRef.current = [];
          refreshHighlights();
        }

        selectionRect = new paper.Path.Rectangle({
          from: event.point,
          to: event.point,
          strokeColor: '#606060',
          fillColor: new paper.Color(128/255, 128/255, 128/255, 0.1),
          strokeWidth: 1
        });
        selectionRect.data.isGuide = true
      }
    };

    pointerToolRef.current.onMouseDrag = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;

      // Advance width line 드래그
      if (advanceWidthDragging && advanceWidthLine) {
        metrics.advanceWidth = Math.max(0, event.point.x);
        updateAdvanceWidthLine();
        // 모든 글리프 윤곽선과 advance width 선을 함께 이동
        const deltaX = event.delta.x;
        paper.project.activeLayer.children.forEach((item: any) => {
          if (item instanceof paper.Path && !item.data.isGuide && item !== advanceWidthLine) {
            item.translate(new paper.Point(deltaX, 0));
          }
        });
        // paper.view.draw();
        return;
      }

      if (selectionRect) {
        selectionRect.segments[1].point.x = event.point.x;
        selectionRect.segments[2].point = event.point;
        selectionRect.segments[3].point.y = event.point.y;
      } else if (hitHandle) {
        hitHandle.x += event.delta.x;
        hitHandle.y += event.delta.y;
      } else if (selectedSegmentsRef.current.length > 0) {
        selectedSegmentsRef.current.forEach((seg, index) => {
          seg.point = seg.point.add(event.delta);
        });
      }
      refreshHighlights();
      // paper.view.draw();

      // 브로드캐스트용 실시간 전송 (DB 저장 안 함)
      const updatedData = syncPaperToData(paper.project);
      throttledUpdate({ ...glyphData, outlineData: updatedData });
    };

    pointerToolRef.current.onMouseUp = (event: paper.ToolEvent) => {
      if (advanceWidthDragging) {
        advanceWidthDragging = false;
        // paper.view.draw();
        return;
      }

      if (selectionRect) {
        const bounds = selectionRect.bounds;

        // 점의 좌표가 사각형 영역 안에 포함되는지 확인
        paper.project.activeLayer.children.forEach((item: any) => {
          if (item instanceof paper.Path && !item.data.isGuide) {
            item.segments.forEach((seg: paper.Segment) => {
              if (bounds.contains(seg.point)) {
                if (!selectedSegmentsRef.current.includes(seg)) {
                  selectedSegmentsRef.current.push(seg);
                }
              }
            });
          }
        });

        selectionRect.remove();
        selectionRect = null;
        refreshHighlights();
      }
      // paper.view.draw();

      // 저장 (최종 DB Commit)
      const updatedData = syncPaperToData(paper.project);
      onGlyphDataChange({ ...glyphData, outlineData: updatedData }, true);
    }

    // Pen tool: draw new shapes
    penToolRef.current = new paper.Tool();
    let lastSegment: paper.Segment | null = null;

    penToolRef.current.onMouseDown = (event: paper.ToolEvent) => {
      const currentPath = drawingPathRef.current;

      const hitResult = paper.project.hitTest(event.point, {
        stroke: true,
        tolerance: 8
      });

      // 이미 그려진 도형의 선 위를 찍은 경우 (그리는 중인 도형 제외)
      if (hitResult && hitResult.type === 'stroke' && hitResult.item !== currentPath) {
        const newSegment = (hitResult.item as paper.Path).divideAt(hitResult.location);
        
        // 추가된 점 선택 및 강조
        selectedSegmentsRef.current = [newSegment];
        refreshHighlights();
        // paper.view.draw();
        return; // 1번 기능 수행 후 종료 (초기 상태 유지)
      }

      // --- 2. 다른 곳을 클릭하여 도형 그리기 시작 또는 이어 나가기 ---
      if (!currentPath) {
        // 새 경로 시작 (처음에는 닫지 않음)
        drawingPathRef.current = new paper.Path({
          strokeColor: "black",
          strokeWidth: 2,
          closed: false,
          fullySelected: true
        });
      }

      // 클릭 지점이 최초의 점인지 확인 (도형 닫기 판정)
      const hitFirst = drawingPathRef.current!.hitTest(event.point, { segments: true, tolerance: 10 });
      if (hitFirst && hitFirst.segment === drawingPathRef.current!.firstSegment) {
        // 3. 최초의 점 클릭 시 도형 완성 및 닫기
        drawingPathRef.current!.closed = true;
        drawingPathRef.current = null; // 초기 상태로 복귀
        selectedSegmentsRef.current = [];
        refreshHighlights();
      } else {
        // 점을 계속 이어 나감 (드래그 시 곡률 조정을 위해 lastSegment 저장)
        lastSegment = drawingPathRef.current!.add(event.point) as paper.Segment;
        selectedSegmentsRef.current = [lastSegment!];
        refreshHighlights();
      }
      // paper.view.draw();
    };

    penToolRef.current.onMouseDrag = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;

      // lastSegment가 있고 현재 그리기 모드일 때만 실행
      if (lastSegment && drawingPathRef.current) {
        // 대칭 핸들 생성하여 부드러운 곡선 구현
        const delta = event.downPoint.subtract(event.point);
        lastSegment.handleIn = delta;
        lastSegment.handleOut = delta.multiply(-1);
        
        refreshHighlights();
        // paper.view.draw();

        // 브로드캐스트용 실시간 전송
        const updatedData = syncPaperToData(paper.project);
        throttledUpdate({ ...glyphData, outlineData: updatedData });
      }
    };

    penToolRef.current.onMouseUp = () => {
      lastSegment = null;

      // 저장 (최종 DB Commit)
      const updatedData = syncPaperToData(paper.project);
      onGlyphDataChange({ ...glyphData, outlineData: updatedData }, true);
    };

    // Curve tool: change curvature
    curveToolRef.current = new paper.Tool();
    let hitSegment: paper.Segment | null = null;
    let activeHandle: 'in' | 'out' | null = null;
    let isDragging = false; // 드래그 여부 확인용

    curveToolRef.current.onMouseDown = (event: paper.ToolEvent) => {
      const hitResult = paper.project.hitTest(event.point, {
        segments: true,
        handles: true,
        tolerance: 12
      });

      isDragging = false; // 클릭 시작 시 초기화
      hitSegment = null;
      activeHandle = null;

      if (hitResult) {
        hitSegment = hitResult.segment as paper.Segment;
        selectedSegmentsRef.current = [hitSegment];

        if (hitResult.type === 'handle-in') {
          activeHandle = 'in';
        } else if (hitResult.type === 'handle-out') {
          activeHandle = 'out';
        }
        refreshHighlights();
      }
    };

    curveToolRef.current.onMouseDrag = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;

      if (hitSegment) {
        isDragging = true;
        
        if (activeHandle) {
          const newHandlePos = event.point.subtract(hitSegment.point);
          if (activeHandle === 'in') {
            hitSegment.handleIn = newHandlePos;
            // hitSegment.handleOut = newHandlePos.multiply(-1);
          } else {
            hitSegment.handleOut = newHandlePos;
            // hitSegment.handleIn = newHandlePos.multiply(-1);
          }
        } else {
          const delta = event.point.subtract(hitSegment.point);
          hitSegment.handleOut = delta;
          hitSegment.handleIn = delta.multiply(-1);
        }
        
        refreshHighlights();
        // paper.view.draw();

        // 브로드캐스트용 실시간 전송
        const updatedData = syncPaperToData(paper.project);
        throttledUpdate({ ...glyphData, outlineData: updatedData });
      }
    };

    curveToolRef.current.onMouseUp = (event: paper.ToolEvent) => {
      if (hitSegment && !isDragging) {
        // 드래그 없이 떼면 첨점(Corner)으로 변경
        if (activeHandle) {
          if (activeHandle === 'in') {
            hitSegment.handleIn = new paper.Point(0, 0);
          } else {
            hitSegment.handleOut = new paper.Point(0, 0);
          }
        } else {
          hitSegment.handleIn = new paper.Point(0, 0);
          hitSegment.handleOut = new paper.Point(0, 0);
        }
        
        refreshHighlights();
        // paper.view.draw();
      }
      hitSegment = null;

      // 저장 (최종 DB Commit)
      const updatedData = syncPaperToData(paper.project);
      onGlyphDataChange({ ...glyphData, outlineData: updatedData }, true);
    };

    // Hand tool --- move screen around
    handToolRef.current = new paper.Tool();
    handToolRef.current.onMouseDrag = (event: paper.ToolEvent) => {
      handlePanning(event.delta);
      canvasRef.current!.style.cursor = 'grabbing';
    };
    handToolRef.current.onMouseUp = () => {
      canvasRef.current!.style.cursor = 'grab';
    };
    handToolRef.current.on('activate', () => {
      canvasRef.current!.style.cursor = 'grab';
    });

    // Rectangle tool
    rectangleToolRef.current = new paper.Tool();
    let rectStartPoint: paper.Point | null = null;
    let currentRect: paper.Path.Rectangle | null = null;
    let rectDoubleClickTimer: number | null = null;

    rectangleToolRef.current.onMouseDown = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.modifiers.meta : event.modifiers.control;
      const isShift = event.modifiers.shift;

      // 더블클릭 처리
      if (rectDoubleClickTimer) {
        clearTimeout(rectDoubleClickTimer);
        rectDoubleClickTimer = null;
        // 다이얼로그 표시 (임시로 기본값 사용)
        const width = 100;
        const height = 100;
        const rect = new paper.Path.Rectangle({
          point: event.point,
          size: [width, height],
          strokeColor: 'black',
          strokeWidth: 2,
        });
        return;
      }

      rectDoubleClickTimer = window.setTimeout(() => {
        rectDoubleClickTimer = null;
      }, 300);

      rectStartPoint = event.point;
      if (cmdOrCtrl) {
        // 중심점 기준
        rectStartPoint = event.point;
      }
    };

    rectangleToolRef.current.onMouseDrag = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;
      if (!rectStartPoint) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.modifiers.meta : event.modifiers.control;
      const isShift = event.modifiers.shift;

      let from = rectStartPoint;
      let to = event.point;

      if (cmdOrCtrl) {
        // 중심점 기준
        const size = event.point.subtract(rectStartPoint).multiply(2);
        from = rectStartPoint.subtract(size.divide(2));
        to = rectStartPoint.add(size.divide(2));
      }

      if (isShift) {
        // 정사각형
        const size = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
        to = new paper.Point(
          from.x + (to.x > from.x ? size : -size),
          from.y + (to.y > from.y ? size : -size)
        );
      }

      if (currentRect) currentRect.remove();
      currentRect = new paper.Path.Rectangle({
        from: from,
        to: to,
        strokeColor: 'black',
        strokeWidth: 2,
      });
      // paper.view.draw();

      // 브로드캐스트용 실시간 전송
      const updatedData = syncPaperToData(paper.project);
      throttledUpdate({ ...glyphData, outlineData: updatedData });
    };

    rectangleToolRef.current.onMouseUp = () => {
      if (currentRect) {
        currentRect.closed = true;
        currentRect = null;
      }
      rectStartPoint = null;

      // 저장 (최종 DB Commit)
      const updatedData = syncPaperToData(paper.project);
      onGlyphDataChange({ ...glyphData, outlineData: updatedData }, true);
    };

    // Circle tool
    circleToolRef.current = new paper.Tool();
    let circleStartPoint: paper.Point | null = null;
    let currentCircle: paper.Path.Ellipse | null = null;

    circleToolRef.current.onMouseDown = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.modifiers.meta : event.modifiers.control;
      circleStartPoint = event.point;
    };

    circleToolRef.current.onMouseDrag = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;
      if (!circleStartPoint) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.modifiers.meta : event.modifiers.control;
      const isShift = event.modifiers.shift;

      let bounds: paper.Rectangle;
      if (cmdOrCtrl) {
        // 중심점 기준
        const radius = circleStartPoint.getDistance(event.point);
        bounds = new paper.Rectangle(
          circleStartPoint.subtract([radius, radius]),
          new paper.Size(radius * 2, radius * 2)
        );
      } else {
        bounds = new paper.Rectangle(circleStartPoint, event.point);
      }

      if (isShift) {
        // 원 (정사각형에 내접)
        const size = Math.max(bounds.width, bounds.height);
        bounds = new paper.Rectangle(
          bounds.center.subtract([size / 2, size / 2]),
          new paper.Size(size, size)
        );
      }

      if (currentCircle) currentCircle.remove();
      currentCircle = new paper.Path.Ellipse({
        rectangle: bounds,
        strokeColor: 'black',
        strokeWidth: 2,
      });
      // paper.view.draw();
    };

    circleToolRef.current.onMouseUp = () => {
      if (currentCircle) {
        currentCircle.closed = true;
        currentCircle = null;
      }
      circleStartPoint = null;

      // 저장
      const updatedData = syncPaperToData(paper.project);
      onGlyphDataChange({ ...glyphData, outlineData: updatedData });
    };

    // Zoom tool
    zoomToolRef.current = new paper.Tool();
    let zoomStartPoint: paper.Point | null = null;
    let zoomRect: paper.Path.Rectangle | null = null;

    zoomToolRef.current.onMouseDown = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;
      zoomStartPoint = event.point;
      if (event.modifiers.shift) {
        // 줌 아웃
        const view = paper.view;
        view.zoom = Math.max(0.05, view.zoom / 1.2);
        // view.draw();
      }
    };

    zoomToolRef.current.onMouseDrag = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;
      if (!zoomStartPoint) return;

      if (zoomRect) zoomRect.remove();
      zoomRect = new paper.Path.Rectangle({
        from: zoomStartPoint,
        to: event.point,
        strokeColor: '#3b82f6',
        fillColor: new paper.Color(59, 130, 246, 0.1),
        strokeWidth: 1,
        guide: true,
      });
      // paper.view.draw();
    };

    zoomToolRef.current.onMouseUp = (event: paper.ToolEvent) => {
      if (zoomRect && zoomStartPoint) {
        const bounds = zoomRect.bounds;
        if (bounds.width > 10 && bounds.height > 10) {
          // 선택 영역에 맞춰 확대
          const view = paper.view;
          const viewSize = view.viewSize;
          const scaleX = viewSize.width / bounds.width;
          const scaleY = viewSize.height / bounds.height;
          const newZoom = Math.min(scaleX, scaleY) * view.zoom;
          
          if (newZoom >= 0.05 && newZoom <= 50) {
            view.zoom = newZoom;
            view.center = bounds.center;
          }
        } else if (!event.modifiers.shift) {
          // 클릭만 한 경우 줌 인
          const view = paper.view;
          const mousePosition = view.viewToProject(event.point);
          view.zoom = Math.min(50, view.zoom * 1.2);
          const newMousePosition = view.viewToProject(event.point);
          view.center = view.center.add(mousePosition.subtract(newMousePosition));
        }
        zoomRect.remove();
        zoomRect = null;
        // paper.view.draw();
      }
      zoomStartPoint = null;
    };

    // Ruler tool
    rulerToolRef.current = new paper.Tool();
    let rulerStartPoint: paper.Point | null = null;

    rulerToolRef.current.onMouseDown = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;
      rulerStartPoint = event.point;
      if (rulerLineRef.current) rulerLineRef.current.remove();
      if (rulerInfoRef.current) rulerInfoRef.current.remove();
    };

    rulerToolRef.current.onMouseDrag = (event: paper.ToolEvent) => {
      if (panOnDrag(event)) return;
      if (!rulerStartPoint) return;

      if (rulerLineRef.current) rulerLineRef.current.remove();
      rulerLineRef.current = new paper.Path.Line({
        from: rulerStartPoint,
        to: event.point,
        strokeColor: '#3b82f6',
        strokeWidth: 1,
        guide: true,
      });

      const dx = event.point.x - rulerStartPoint.x;
      const dy = event.point.y - rulerStartPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      const info = `거리: ${distance.toFixed(2)}\nX: ${dx.toFixed(2)}\nY: ${dy.toFixed(2)}\n각도: ${angle.toFixed(2)}°\n시작: (${rulerStartPoint.x.toFixed(2)}, ${rulerStartPoint.y.toFixed(2)})\n끝: (${event.point.x.toFixed(2)}, ${event.point.y.toFixed(2)})`;
      console.log(info);

      if (rulerInfoRef.current) rulerInfoRef.current.remove();
      
      // 배경 사각형
      const bgRect = new paper.Path.Rectangle({
        point: event.point.add([5, -60]),
        size: [150, 55],
        fillColor: new paper.Color(1, 1, 1, 0.9),
        strokeColor: '#3b82f6',
        strokeWidth: 1,
        guide: true,
      });
      
      rulerInfoRef.current = new paper.PointText({
        point: event.point.add([10, -10]),
        content: info,
        fillColor: 'black',
        fontSize: 10,
        guide: true,
      });

      // paper.view.draw();
    };

    rulerToolRef.current.onMouseUp = () => {
      rulerStartPoint = null;
    };

    // Delete points and keyboard shortcuts
    paper.view.on('keydown', (event: any) => {
      const key = event.key.toLowerCase();
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.modifiers.meta : event.modifiers.control;
      const isShift = event.modifiers.shift;

      if (event.key === 'delete' || event.key === 'backspace') {
        if (selectedSegmentsRef.current.length > 0) {
          event.preventDefault();
          selectedSegmentsRef.current.forEach(seg => {
            const parentPath = seg.path;
            seg.remove();

            if (parentPath && parentPath.segments.length === 0) {
              parentPath.remove();
            }
          });

          selectedSegmentsRef.current = [];
          clearHighlights();
          // paper.view.draw();
        }
      } else if (event.key === 'space') {
        // panning
        isSpacePressed = true;
        canvasRef.current!.style.cursor = 'grab';
      } else if ((key === '-' || key === '_') && !cmdOrCtrl) {
        // 줌 감소
        event.preventDefault();
        const view = paper.view;
        view.zoom = Math.max(0.05, view.zoom - 0.1);
        // view.draw();
      } else if ((key === '=' || key === '+') && !cmdOrCtrl) {
        // 줌 증가
        event.preventDefault();
        const view = paper.view;
        view.zoom = Math.min(50, view.zoom + 0.1);
        // view.draw();
      } else if (key === '1') {
        // 100% 줌
        event.preventDefault();
        const view = paper.view;
        view.zoom = 1.0;
        // view.draw();
      } else if (key === 'f') {
        // 화면에 맞추기
        event.preventDefault();
        // TODO: 글리프에 맞춰 줌 조정
      } else if (key === 'p') {
        // 펜 도구
        event.preventDefault();
        penToolRef.current?.activate();
        onToolChange?.('pen');
      } else if (key === 'v' || key === 'a') {
        // 포인터 도구
        event.preventDefault();
        pointerToolRef.current?.activate();
        onToolChange?.('pointer');
      } else if (key === '`' || key === 'c') {
        // 곡률 도구
        event.preventDefault();
        curveToolRef.current?.activate();
        onToolChange?.('curve');
      } else if (key === 'm') {
        // 사각형 도구
        event.preventDefault();
        rectangleToolRef.current?.activate();
        onToolChange?.('rectangle');
      } else if (key === 'l') {
        // 원 도구
        event.preventDefault();
        circleToolRef.current?.activate();
        onToolChange?.('circle');
      } else if (key === 'z') {
        // 줌 도구
        event.preventDefault();
        zoomToolRef.current?.activate();
        onToolChange?.('zoom');
      } else if (key === 'r') {
        // 자 도구
        event.preventDefault();
        rulerToolRef.current?.activate();
        onToolChange?.('ruler');
      } else if (key === 'h') {
        // 손 도구
        event.preventDefault();
        handToolRef.current?.activate();
        onToolChange?.('hand');
      } else if (key === 'd') {
        // 곡선 방향 반대
        event.preventDefault();
        selectedSegmentsRef.current.forEach(seg => {
          const temp = seg.handleIn;
          seg.handleIn = seg.handleOut.multiply(-1);
          seg.handleOut = temp.multiply(-1);
        });
        refreshHighlights();
        // paper.view.draw();
      } else if (event.key === 'Enter' && selectedSegmentsRef.current.length > 0) {
        // 점 이동 모달
        event.preventDefault();
        // TODO: 모달 표시
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        // 방향키로 점 이동
        if (selectedSegmentsRef.current.length > 0) {
          event.preventDefault();
          const unit = isShift ? 10 : cmdOrCtrl ? 100 : 1;
          const delta = new paper.Point(
            event.key === 'ArrowRight' ? unit : event.key === 'ArrowLeft' ? -unit : 0,
            event.key === 'ArrowUp' ? -unit : event.key === 'ArrowDown' ? unit : 0
          );
          selectedSegmentsRef.current.forEach(seg => {
            seg.point = seg.point.add(delta);
          });
          refreshHighlights();
          // paper.view.draw();
        }
      }

      // 외부 복붙 기능 (Cmd/Ctrl + V)
      if (cmdOrCtrl && key === 'v') {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
          navigator.clipboard.readText().then(text => {
            try {
              // SVG 파싱 시도
              const parser = new DOMParser();
              const svgDoc = parser.parseFromString(text, 'image/svg+xml');
              const svgElement = svgDoc.querySelector('svg');
              if (svgElement) {
                // SVG를 paper.js로 임포트
                paper.project.importSVG(svgElement, (item: any) => {
                  if (item) {
                    // 색상 제거하고 검은색 윤곽선만
                    item.strokeColor = new paper.Color(0, 0, 0);
                    item.fillColor = null;
                    item.strokeWidth = 2;
                    // guide 속성 제거
                    if (item.children) {
                      item.children.forEach((child: any) => {
                        child.data.isGuide = false;
                        child.strokeColor = new paper.Color(0, 0, 0);
                        child.fillColor = null;
                      });
                    }
                    // paper.view.draw();
                  }
                });
              }
            } catch (e) {
              console.error('Failed to paste SVG:', e);
            }
          }).catch(e => {
            console.error('Failed to read clipboard:', e);
          });
        }
      }
    });

    paper.view.on('keyup', (event: any) => {
      if (event.key === 'space') {
        isSpacePressed = false;
        canvasRef.current!.style.cursor = 'default';
      }
    });

    canvasRef.current!.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 1) {
        isMiddleMouseDown = true;
        canvasRef.current!.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });
    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button === 1) {
        isMiddleMouseDown = false;
        canvasRef.current!.style.cursor = 'default';
      }
    });

    // Scroll to zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const view = paper.view;
      const oldZoom = view.zoom;
      const mousePosition = view.viewToProject(new paper.Point(e.offsetX, e.offsetY));

      const zoomFactor = 1.1;
      const newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;

      if (newZoom < 0.05 || newZoom > 50) return;

      view.zoom = newZoom;

      const diff = mousePosition.subtract(view.center);
      const offset = mousePosition.subtract(diff.multiply(oldZoom / newZoom)).subtract(view.center);
      view.center = view.center.add(offset);

      // view.draw();
    }
    canvasRef.current.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      resizeObserver.disconnect();

      if (paper.project) {
        paper.project.clear();
        paper.project.remove();
      }

      projectRef.current = null;
    };
  }, [clearHighlights]);

  useEffect(() => {
    if (!paper.project) return;

    const view = paper.view;
    switch (zoomAction?.type) {
      case 'IN':
        view.zoom = view.zoom + 0.1;
        // view.draw();
        break;
      case 'OUT': 
        view.zoom = view.zoom - 0.1;
        // view.draw();
        break;
      case 'RESET':
        view.zoom = 1.0;
        view.center = new paper.Point(glyphData.advanceWidth / 2, -300);
        // view.draw();
        break;
    }

    if (selectedTool === 'pointer') {
      finishDrawing();
      pointerToolRef.current?.activate();
    } else if (selectedTool === 'pen') {
      penToolRef.current?.activate();
    } else if (selectedTool === 'curve') {
      finishDrawing();
      curveToolRef.current?.activate();
    } else if (selectedTool === 'hand') {
      finishDrawing();
      handToolRef.current?.activate();
    } else if (selectedTool === 'rectangle') {
      finishDrawing();
      rectangleToolRef.current?.activate();
    } else if (selectedTool === 'circle') {
      finishDrawing();
      circleToolRef.current?.activate();
    } else if (selectedTool === 'zoom') {
      finishDrawing();
      zoomToolRef.current?.activate();
    } else if (selectedTool === 'ruler') {
      finishDrawing();
      rulerToolRef.current?.activate();
    }

    onZoomComplete();
  }, [zoomAction, selectedTool, finishDrawing]);

  // Update mouse position, selection info, and zoom level
  useEffect(() => {
    if (!paper.project || !canvasRef.current) return;

    const updateMouseInfo = (e: MouseEvent) => {
      const view = paper.view;
      const point = view.viewToProject(new paper.Point(e.offsetX, e.offsetY));
      setMousePosition({ x: Math.round(point.x), y: Math.round(point.y) });
    };

    const updateSelectionInfo = () => {
      if (selectedSegmentsRef.current.length > 0) {
        const firstPoint = selectedSegmentsRef.current[0].point;
        setSelectedPointInfo({ x: Math.round(firstPoint.x), y: Math.round(firstPoint.y) });

        if (selectedSegmentsRef.current.length > 1) {
          const points = selectedSegmentsRef.current.map(s => s.point);
          const minX = Math.min(...points.map(p => p.x));
          const maxX = Math.max(...points.map(p => p.x));
          const minY = Math.min(...points.map(p => p.y));
          const maxY = Math.max(...points.map(p => p.y));
          setSelectionBounds({
            width: Math.round(maxX - minX),
            height: Math.round(maxY - minY),
          });
        } else {
          setSelectionBounds(null);
        }
      } else {
        setSelectedPointInfo(null);
        setSelectionBounds(null);
      }
    };

    const updateZoomLevel = () => {
      if (paper.view) {
        setZoomLevel(Math.round(paper.view.zoom * 100));
      }
    };

    canvasRef.current.addEventListener('mousemove', updateMouseInfo);
    const interval = setInterval(() => {
      updateSelectionInfo();
      updateZoomLevel();
    }, 100);

    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('mousemove', updateMouseInfo);
      }
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    paper.project.activeLayer.children.filter(
      (item) => item instanceof paper.Path && !item.data?.isGuide && !item.locked
    ).forEach(item => {
      item.remove();
    })
    drawGlyph(glyphData);
  }, [updatedTime]);

  return (
    <div className="w-full h-full bg-white overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        data-paper-resize="true"
      />
      
      {/* 좌표 정보 표시 */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded font-mono space-y-1 select-none">
        {mousePosition && (
          <div>마우스: ({mousePosition.x}, {mousePosition.y})</div>
        )}
        {selectedPointInfo && (
          <div>선택된 점: ({selectedPointInfo.x}, {selectedPointInfo.y})</div>
        )}
        {selectionBounds && (
          <div>선택 영역: {selectionBounds.width} × {selectionBounds.height}</div>
        )}
        <div className="border-t border-white border-opacity-30 mt-1 pt-1">줌: {zoomLevel}%</div>
      </div>
    </div>
  )
}





interface GlyphPoint {
  x: number;
  y: number;
  type?: 'line' | 'curve';
  smooth?: boolean;
}

interface Contour {
  points: GlyphPoint[];
}

interface GlyphOutlineData {
  components: any[];
  contours: Contour[];
}

/**
 * Paper.js의 Path 아이템들을 정형화된 데이터 구조로 변환
 */
const syncPaperToData = (project: paper.Project): GlyphOutlineData => {
  // 가이드나 그리드 레이어를 제외한 메인 레이어의 Path들만 추출
  const glyphPaths = project.activeLayer.children.filter(
    (item) => item instanceof paper.Path && !item.data?.isGuide && !item.locked
  ) as paper.Path[];

  const newContours: Contour[] = glyphPaths.map((path) => {
    const points: GlyphPoint[] = [];

    path.segments.forEach((segment) => {
      // 1. 현재 점 (On-curve)
      const pt = segment.point;
      
      // 2. 곡선 여부 판단 (핸들이 있으면 curve, 없으면 line)
      const isCurve = !segment.handleIn.isZero() || !segment.handleOut.isZero();

      // 3. 만약 이전 점의 handleOut과 현재 점의 handleIn이 있다면 제어점(Off-curve) 생성
      // Paper.js의 핸들을 절대 좌표 제어점으로 역산하여 데이터에 삽입
      if (isCurve && segment.previous) {
        const prevSegment = segment.previous;
        if (!prevSegment.handleOut.isZero()) {
          points.push({
            x: prevSegment.point.x + prevSegment.handleOut.x,
            y: - (prevSegment.point.y + prevSegment.handleOut.y),
            // smooth: true
            // type 없음 = 제어점
          });
        }
        if (!segment.handleIn.isZero()) {
          points.push({
            x: segment.point.x + segment.handleIn.x,
            y: - (segment.point.y + segment.handleIn.y),
            // smooth: true
          });
        }
      }

      points.push({
        x: pt.x,
        y: - pt.y,
        type: isCurve ? 'curve' : 'line',
        smooth: isCurve
      });
    });

    return { points: points };
  });

  // console.log(JSON.stringify(newContours));

  return { components: [], contours: newContours };
};
