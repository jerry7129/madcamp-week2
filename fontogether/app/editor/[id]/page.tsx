"use client";

import { act, useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { Panel, Group } from "react-resizable-panels";
import { ChevronLeft, Circle, Fullscreen, Hand, MousePointer2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PenTool, RectangleHorizontal, RulerDimensionLine, Search, SplinePointer, Users, ZoomIn, ZoomOut, Settings, Ligature, SquarePlus, ArrowDownWideNarrow, Minus, Info } from "lucide-react";

import Topbar from "@/components/topbar";
import Spacer from "@/components/spacer";
import TopbarButton, { TopbarButtonGroup, TopbarDropdownButton, TopbarGroupedButton } from "@/components/topbarButton";
import GlyphPreview from "@/components/glyphPreview";
import GlyphGrid from "@/components/glyphGrid";
import GlyphViewControls from "@/components/glyphViewControls";
import FilterSidebar from "@/components/filterSidebar";
import FontPropertiesPanel from "@/components/fontPropertiesPanel";
import GlyphPropertiesPanel from "@/components/glyphPropertiesPanel";
import PreviewPanel from "@/components/previewPanel";
import OpenTypeFeaturePanel from "@/components/opentypeFeaturePanel";
import CollaboratePanel from "@/components/collaboratorPanel";
import { FontData, GlyphData_OLD, SortOption, FilterCategory, ColorTag, ProjectData, RawGlyphData, GlyphData } from "@/types/font";
import { createMockFontData } from "@/utils/mockData";
import { Plus, Trash2 } from "lucide-react";
import opentype from 'opentype.js'
import { useUserStore } from "@/store/userStore";

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import DebugPanel from "./debugPanel";

const DynamicGlyphCanvas = dynamic(() => import('@/components/glyphEditor'), {
  ssr: false,
  loading: () => <p className="p-4 text-center grow">캔버스 로드 중...</p>,
});

export default function GlyphsView() {
  const pathname = usePathname();
  const lastDir = pathname.split('/').pop() || '';
  const projectId = parseInt(lastDir);
  const user = useUserStore(s => s.user) || {id: 0, nickname: 'Nickname'};
  const router = useRouter();

  // --- 추가된 에러 상태 ---
  const [isError, setIsError] = useState(false); 

  const [currentUserCount, setCurrentUserCount] = useState(0);
  // 💡 웹소켓 인스턴스를 저장할 상태 (이 상태 하나로 전체에서 사용합니다)
  const [stompClient, setStompClient] = useState<Client | null>(null);

  // 1. 현재 접속자 수 조회 (useEffect로 이동)
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${projectId}/glyphs/collaborators/count`)
      .then(res => res.text())
      .then(string => {
        setCurrentUserCount(Math.max(Number(string) - 1, 0));
      })
      .catch(err => console.error("접속자 수 조회 실패:", err));
  }, [projectId]);

  const [updatedTime, setUpdatedTime] = useState<number | null>(null);
  // 2. 웹소켓 구독 (useCallback으로 메모이제이션)
  const subscribeToTopics = useCallback((client: Client, currentProjectId: number, currentUserId: number) => {
    // A. 글리프 업데이트
    client.subscribe(`/topic/project/${currentProjectId}/glyph/update`, (message) => {
      const payload = JSON.parse(message.body);
      if (payload.userId === currentUserId) return;

      setGlyphData(prev => {
        const glyphIndex = prev.findIndex(g => g.glyphName === payload.glyphName);
        if (glyphIndex < 0) return prev;
        const newData = [...prev];
        newData[glyphIndex] = {
          ...newData[glyphIndex],
          outlineData: JSON.parse(payload.outlineData)
        };
        return newData;
      });
      setUpdatedTime(Date.now());
    });

    // B. 프로젝트 상세 정보
    client.subscribe(`/topic/project/${currentProjectId}/update/details`, (message) => {
      const payload = JSON.parse(message.body);
      if (payload.updateType === 'FONT_INFO') {
        setFontData(prev => prev ? { ...prev, fontInfo: payload.data } : prev);
        setFontInfo(JSON.parse(payload.data));
      }
    });

    // C. 사용자 접속 현황
    client.subscribe(`/topic/project/${currentProjectId}/presence`, (message) => {
      // console.log('접속자 업데이트:', JSON.parse(message.body));
    });

    // D. 강퇴 알림
    client.subscribe(`/topic/project/${currentProjectId}/kick`, (message) => {
      const payload = JSON.parse(message.body);
      if (payload.kickedUserId === currentUserId) {
        router.push(`/projects/${currentUserId}`);
      }
    });
  }, [router]); // router를 의존성 배열에 추가

// 3. 웹소켓 연결 (마운트 시 1회 실행)
  useEffect(() => {
    if (isNaN(projectId) || !user.id) return;

    const newClient = new Client({
      webSocketFactory: () => new SockJS((process.env.NEXT_PUBLIC_SERVER_URI || '') + '/ws'),
      reconnectDelay: 5000,
      debug: (str) => { /* console.log(str) */ },
      onConnect: () => {
        console.log("WebSocket Connected!");
        
        subscribeToTopics(newClient, projectId, user.id);
        
        newClient.publish({
          destination: '/app/project/join',
          body: JSON.stringify({ projectId, userId: user.id, nickname: user.nickname })
        });
      },
      onStompError: (frame) => {
        console.error('Broker error:', frame.headers['message']);
      }
    });

    newClient.activate();
    setStompClient(newClient); // 💡 상태에 저장

    return () => {
      if (newClient.connected) {
        newClient.publish({
          destination: '/app/project/leave',
          body: JSON.stringify({ projectId, userId: user.id, nickname: user.nickname }),
        });
        newClient.deactivate();
      }
    };
  }, [projectId, user.id, user.nickname, subscribeToTopics]); // 의존성 배열 완벽하게 맞춤

  /* Exit 핸들러 수정 */
  const handleExit = () => {
    if (activeTab !== null) {
      setActiveTab(null);
    } else {
      router.back(); // 뒤로 가기하면 언마운트 되면서 useEffect의 cleanup 로직이 실행되어 자동으로 leave 처리됩니다.
    }
  }

  // --- Font Data ---
  const [sampleFontData, setSampleFontData] = useState<FontData>(createMockFontData());
  const [clipboardGlyphs, setClipboardGlyphs] = useState<GlyphData[]>([]);

  const [fontData, setFontData] = useState<ProjectData | null>(null);
  const [glyphData, setGlyphData] = useState<GlyphData[]>([]);

  const updateGlyphData = (newGlyphData: GlyphData) => {
    /* non-web socket method */
    // fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${projectId}/glyphs`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     projectId: projectId,
    //     glyphName: newGlyphData.glyphName,
    //     unicodes: newGlyphData.unicodes.map(num => num.toString(16).toUpperCase().padStart(4, '0')),
    //     outlineData: JSON.stringify(newGlyphData.outlineData),
    //     advanceWidth: newGlyphData.advanceWidth,
    //   })
    // })
    //   .then(res => console.log(res));

    /* web socket method */
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/glyph/update',
        body: JSON.stringify({
          projectId: projectId,
          glyphName: newGlyphData.glyphName,
          outlineData: JSON.stringify(newGlyphData.outlineData),
          advanceWidth: newGlyphData.advanceWidth,
          userId: user.id,
          nickname: user.nickname,
          unicodes: newGlyphData.unicodes
        })
      });
    }

    /* Update local variable */
    const targetIndex = glyphData.findIndex(g => g.glyphUuid === newGlyphData.glyphUuid);
    let newData = [...glyphData];
    newData[targetIndex] = newGlyphData;
    setGlyphData(newData);
  }

  /* 4. 데이터 초기 로드 */
  const [fontInfo, setFontInfo] = useState<Record<string, any> | null>(null);
useEffect(() => {
    const getProjectData = async () => {
      try {
        const serverUri = process.env.NEXT_PUBLIC_SERVER_URI || "";
        
        const projectResp = await fetch(`${serverUri}/api/projects/${projectId}`);
        if (!projectResp.ok) throw new Error("Project fetch failed");
        const currentData: ProjectData = await projectResp.json();
        setFontData(currentData);
        setFontInfo(JSON.parse(currentData.fontInfo || '{}'));

        const glyphDataResponse = await fetch(`${serverUri}/api/projects/${projectId}/glyphs`);
        if (!glyphDataResponse.ok) throw new Error("Glyphs fetch failed");
        const rawGlyphs: RawGlyphData[] = await glyphDataResponse.json();
        const glyphs: GlyphData[] = rawGlyphs.map(rgd => { return {
          advanceHeight: rgd.advanceHeight,
          advanceWidth: rgd.advanceWidth,
          formatVersion: rgd.formatVersion,
          glyphName: rgd.glyphName,
          glyphUuid: rgd.glyphUuid,
          lastModifiedBy: rgd.lastModifiedBy,
          layerName: rgd.layerName,
          outlineData: rgd.outlineData ? JSON.parse(rgd.outlineData) : {components: [], contours: []},
          projectId: rgd.projectId,
          properties: rgd.properties ? JSON.parse(rgd.properties) : {},
          unicodes: rgd.unicodes.map((str: string) => parseInt(str, 16)),
          updatedAt: new Date(rgd.updatedAt),
        } as GlyphData});
        setGlyphData(glyphs);
        console.log(`Loaded ${glyphs.length} glyphs`);
      } catch (err) {
        console.error(err);
        setIsError(true);
      }
    };

    if (!isNaN(projectId)) {
      getProjectData();
    } else {
      setIsError(true);
    }
  }, [projectId]);


  useMemo(() => {
    setFontInfo(JSON.parse(fontData?.fontInfo || '{}'));
  }, [fontData])

  const updateFontInfoHandler = useCallback((newFontInfo: Record<string, any>) => {
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/project/update/details',
        body: JSON.stringify({
          projectId: projectId,
          userId: user.id,
          updateType: 'FONT_INFO',
          data: JSON.stringify(newFontInfo)
        })
      });
    }

    setFontData(prev => {
      if (prev === null)
        return null;

      return ({
        ...prev,
        fontInfo: JSON.stringify(newFontInfo)
      });
    });
    setFontInfo(newFontInfo);
  }, []);

  // --- Sidebar State ---
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // --- debug dialog ---
  const [isDebugDialogShown, setIsDebugDialogShown] = useState(false);

  // --- Zoom State ---
  const [zoomAction, setZoomAction] = useState<{ type: 'IN' | 'OUT' | 'RESET'; timestamp: number; } | null>(null);

  // --- Toolbar State ---
  const [selectedTool, setSelectedTool] = useState("pointer");

  // --- Glyph View State ---
  const [glyphSize, setGlyphSize] = useState(72);
  const [sortOption, setSortOption] = useState<SortOption>('index');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('none');
  const [filterValue, setFilterValue] = useState<string>('');
  const sortOptionRef = useRef<HTMLSelectElement>(null);

  // --- Right Sidebar Panel State ---
  const [rightPanel, setRightPanel] = useState<'font' | 'glyph' | 'collaborate'>('font');
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  // --- Selection Logic ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  // --- Opened tabs ---
  const [openedTabs, setOpenedTabs] = useState<(string | null)[]>([null]) // null for main window
  const [activeTab, setActiveTab] = useState<string | null>(null) // null for main window

  const openTab = (id: string, setActive: boolean = true) => {
    // 이미 열려 있는 탭인지 확인
    if (openedTabs.includes(id)) {
      if (setActive) {
        setActiveTab(id);
      }
      return;
    }
    setOpenedTabs(prev => {
      return [...prev, id]
    })
    if (setActive) {
      setActiveTab(id)
    }
  };
  const closeTab = (id: string) => {
  setOpenedTabs((prevTabs) => {
    const newTabs = prevTabs.filter((tabId) => tabId !== id);

    if (activeTab === id) {
      if (newTabs.length > 0) {
        const currentIndex = prevTabs.indexOf(id);
        const nextTab = newTabs[Math.max(currentIndex - 1, 0)];
        setActiveTab(nextTab);
      } else {
        setActiveTab(null);
      }
    }
    
    return newTabs; // 새로운 주소의 배열을 반환하여 뷰 갱신 트리거
  });
};

  const switchTab = (id: string | null) => {
    setActiveTab(id)
  }

  // --- Available tags and groups ---
  const availableTags = useMemo(() => {
    const tags = new Set<ColorTag>();
    sampleFontData.glyphs.forEach(g => g.tags?.forEach(t => tags.add(t as ColorTag)));
    return Array.from(tags);
  }, [sampleFontData.glyphs]);

  const availableGroups = useMemo(() => {
    return Object.keys(sampleFontData.groups || {});
  }, [sampleFontData.groups]);

  // --- Glyph operations ---
  const handleAddGlyph = useCallback(() => {
    const newId = crypto.randomUUID();

    let newIndex = glyphData.length;
    while (glyphData.findIndex(g => g.glyphName === `glyph${newIndex}`) >= 0) {
      newIndex++;
    }

    const newGlyph: GlyphData = {
      glyphUuid: newId,
      glyphName: `glyph${newIndex}`,
      advanceWidth: 500,
      advanceHeight: 1000,
      formatVersion: 2,
      lastModifiedBy: null,
      layerName: 'public.default',
      outlineData: {components: [], contours: []},
      projectId: fontData?.projectId || 0,
      properties: {},
      unicodes: [],
      updatedAt: new Date()
    };
    setGlyphData(prev => [...prev, newGlyph]);

    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/glyph/action',
        body: JSON.stringify({
          projectId: 1,
          action: 'ADD',
          glyphName: `glyph${newIndex}`
        })
      });
    }
  }, [glyphData]);

  const handleDuplicateGlyph = useCallback(() => {
    if (selectedIds.size === 0) return;
    const newGlyphs = Array.from(selectedIds).map(id => {
      const glyph = glyphData.find(g => g.glyphUuid === id);
      if (!glyph) return null;
      const newId = Math.max(...sampleFontData.glyphs.map(g => g.id), -1) + 1;
      return { ...glyph, id: newId, name: `${glyph.glyphName}.copy` };
    }).filter((g) => g !== null);
    setSampleFontData(prev => ({
      ...prev,
      glyphs: [...prev.glyphs, ...newGlyphs],
    }));
  }, [selectedIds, sampleFontData.glyphs]);

  const handleDeleteGlyph = useCallback(() => {
    if (selectedIds.size === 0) return;

    selectedIds.forEach(id => {
      const targetGlyphName = glyphData.find(g => g.glyphUuid === id)?.glyphName || '';
      if (stompClient && stompClient.connected) {
        stompClient.publish({
          destination: '/app/glyph/action',
          body: JSON.stringify({
            projectId: 1,
            action: 'DELETE',
            glyphName: targetGlyphName
          })
        });
      }
    });

    setGlyphData(prev => 
      prev.filter(g => !selectedIds.has(g.glyphUuid)),
    );
    setSelectedIds(new Set());

    // 열려 있는 탭 닫기
    selectedIds.forEach(id => {
      if (openedTabs.includes(id)) {
        closeTab(id);
      }
    });
  }, [selectedIds, openedTabs]);

  const handleCutGlyph = useCallback(() => {
    const selectedGlyphs = glyphData.filter(g => selectedIds.has(g.glyphUuid));
    setClipboardGlyphs(selectedGlyphs);
    handleDeleteGlyph();
  }, [selectedIds, glyphData, handleDeleteGlyph]);

  const handleCopyGlyph = useCallback(() => {
    const selectedGlyphs = glyphData.filter(g => selectedIds.has(g.glyphUuid));
    setClipboardGlyphs(selectedGlyphs);
  }, [selectedIds, glyphData]);

  const handlePasteGlyph = useCallback((newSlot: boolean = false) => {
    if (clipboardGlyphs.length === 0) return;
    if (newSlot) {
      const newGlyphs = clipboardGlyphs.map(glyph => {
        const newId = crypto.randomUUID();
        return { ...glyph, id: newId, name: `${glyph.glyphName}.copy` };
      });
      setGlyphData(prev =>
        [...prev, ...newGlyphs],
      );
    } else {
      // 선택된 글리프에 붙여넣기 (첫 번째 글리프만)
      if (selectedIds.size === 0) return;
      const targetId = Array.from(selectedIds)[0];
      const sourceGlyph = clipboardGlyphs[0];
      setGlyphData(prev =>
        prev.map(g => g.glyphUuid === targetId ? { ...sourceGlyph, glyphUuid: targetId, glyphName: g.glyphName } : g),
      );
    }
  }, [clipboardGlyphs, sampleFontData.glyphs, selectedIds]);

  const handleGlyphReorder = useCallback((newOrder: string[]) => {
    const orderedGlyphs = newOrder.map(id => glyphData.find(g => g.glyphUuid === id)).filter((g): g is GlyphData => g !== undefined);
    const remainingGlyphs = glyphData.filter(g => !newOrder.includes(g.glyphUuid));

    const nameMap = [...orderedGlyphs.map(g => g.glyphName), ...remainingGlyphs.map(g => g.glyphName)];
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/glyph/action',
        body: JSON.stringify({
          projectId: 1,
          action: 'REORDER',
          newOrder: nameMap
        })
      });
    }

    setGlyphData(prev => [...orderedGlyphs, ...remainingGlyphs]);
  }, [glyphData]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 텍스트 필드에 포커스가 있을 때는 단축키 비활성화
      const activeElement = document.activeElement;
      const isTextInput = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
      const isTextInputFocused = isTextInput && document.activeElement === activeElement;

      // 방향키로 선택 이동 (텍스트 필드가 아닐 때만)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !cmdOrCtrl && !e.shiftKey && activeTab === null && !isTextInputFocused) {
        e.preventDefault();
        // TODO: 선택된 글리프 이동 구현
      }

      // Return: 선택된 글리프 열기
      if (e.key === 'Enter' && activeTab === null && selectedIds.size > 0 && !isTextInputFocused) {
        e.preventDefault();
        if (selectedIds.size >= 10) {
          if (!confirm(`${selectedIds.size}개의 글리프를 열까요?`)) return;
        }
        const firstId = Array.from(selectedIds)[0];
        openTab(firstId);
      }

      // Delete/Backspace: 선택된 글리프 삭제
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeTab === null && selectedIds.size > 0 && !isTextInputFocused) {
        e.preventDefault();
        handleDeleteGlyph();
      }

      // Cmd/Ctrl + A: 전체 선택 (텍스트 필드에서는 기본 동작 허용)
      if (cmdOrCtrl && e.key.toLowerCase() === 'a') {
        if (activeTab === null && !isTextInputFocused) {
          e.preventDefault();
          setSelectedIds(new Set(glyphData.map(g => g.glyphUuid)));
        }
        // 텍스트 필드에서는 기본 동작(전체 선택) 허용
      }

      // Cmd/Ctrl + E: 현재 위치 뒤에 글리프 추가
      if (cmdOrCtrl && e.key.toLowerCase() === 'e' && activeTab === null && !isTextInputFocused) {
        e.preventDefault();
        handleAddGlyph();
      }

      // Cmd/Ctrl + Option + E: 글리프 추가 다이얼로그
      if (cmdOrCtrl && e.altKey && e.key === 'e' && activeTab === null) {
        e.preventDefault();
        // TODO: 다이얼로그 구현
        handleAddGlyph();
      }

      // Cmd/Ctrl + X: 잘라내기
      if (cmdOrCtrl && e.key.toLowerCase() === 'x') {
        if (activeTab === null && !isTextInputFocused) {
          e.preventDefault();
          handleCutGlyph();
        }
        // 텍스트 필드에서는 기본 동작 허용
      }

      // Cmd/Ctrl + C: 복사
      if (cmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (activeTab === null && !isTextInputFocused) {
          e.preventDefault();
          handleCopyGlyph();
        }
        // 텍스트 필드에서는 기본 동작 허용
      }

      // Cmd/Ctrl + V: 붙여넣기
      if (cmdOrCtrl && e.key.toLowerCase() === 'v' && !e.shiftKey) {
        if (activeTab === null && !isTextInputFocused) {
          e.preventDefault();
          handlePasteGlyph(false);
        }
        // 텍스트 필드에서는 기본 동작 허용
      }

      // Cmd/Ctrl + Shift + V: 새 슬롯에 붙여넣기
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'v' && activeTab === null && !isTextInputFocused) {
        e.preventDefault();
        handlePasteGlyph(true);
      }

      // Cmd/Ctrl + Shift + F: 글꼴 기능 편집 모달
      if (cmdOrCtrl && e.shiftKey && e.key === 'F' && activeTab === null) {
        e.preventDefault();
        setShowFeatureModal(true);
      }

      // Z: 글꼴 크기 필드에 포커스
      if (e.key.toLowerCase() === 'z' && activeTab === null && !cmdOrCtrl && !e.shiftKey && !e.altKey) {
        const activeElement = document.activeElement;
        const input = document.getElementById('glyph-size-input') as HTMLInputElement;
        if (!(activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) && input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
      }

      // - 또는 _: 글꼴 표시 크기 감소
      if ((e.key === '-' || e.key === '_') && activeTab === null && !cmdOrCtrl && !e.shiftKey && !e.altKey) {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          setGlyphSize(prev => Math.max(4, prev - 1));
        }
      }

      // = 또는 +: 글꼴 표시 크기 증가
      if ((e.key === '=' || e.key === '+') && activeTab === null && !cmdOrCtrl && !e.shiftKey && !e.altKey) {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          setGlyphSize(prev => Math.min(512, prev + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectedIds, sampleFontData.glyphs, handleAddGlyph, handleDeleteGlyph, handleCutGlyph, handleCopyGlyph, handlePasteGlyph, openTab]);

  if (fontData === null) {
    return (
      <div className="p-4 text-lg text-center justify-center align-center h-screen grow">데이터 로드 중...</div>
    )
  }
  // if (fontData === null) {
  //   setFontData({
  //     createdAt: new Date(),
  //     features: '',
  //     fontInfo: '{}',
  //     groups: '',
  //     isShared: false,
  //     kerning: '',
  //     layerConfig: '',
  //     metaInfo: '',
  //     ownerId: 1,
  //     ownerNickname: 'Nickname',
  //     projectId: 2,
  //     role: 'OWNER',
  //     title: 'Sample data',
  //     updatedAt: new Date()
  //   });
  // }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <Group orientation="horizontal" className="flex-1 w-full bg-slate-50 relative p-2 rounded gap-2">
        {/* Left Sidebar */}
        {false && !isLeftCollapsed && activeTab === null && (
          <Panel defaultSize={240} minSize={180} maxSize={360} className="relative bg-gray-50 dark:bg-zinc-900">
            <Topbar>
              <TopbarButton
                onClick={handleExit}
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </TopbarButton>
              <Spacer />
              <TopbarButton onClick={() => setIsLeftCollapsed(true)}>
                <PanelLeftClose size={18} strokeWidth={1.5} />
              </TopbarButton>
            </Topbar>
            <div className="absolute mt-12 w-full h-full flex flex-col">
              {/* 필터 */}
              <div className="flex-1 overflow-y-auto">
                <FilterSidebar
                  fontData={sampleFontData}
                  filterCategory={filterCategory}
                  filterValue={filterValue}
                  onFilterChange={(cat, val) => {
                    setFilterCategory(cat);
                    setFilterValue(val || '');
                  }}
                />
              </div>
            </div>
          </Panel>
        )}

        {/* Main Panel */}
        <Panel className="relative flex flex-col">
          <Topbar>
            {(true || isLeftCollapsed || activeTab !== null) && (
              <TopbarButton
                onClick={handleExit}
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </TopbarButton>
            )}
            {(isLeftCollapsed && activeTab === null) && (
              <TopbarButton onClick={() => setIsLeftCollapsed(false)}>
                <PanelLeftOpen size={18} strokeWidth={1.5} />
              </TopbarButton>
            )}
            <div className="p-1 select-none flex flex-col justify-start gap-1">
              <p className="font-bold truncate">{fontData.title}</p>
              {currentUserCount > 1 &&
                <p className="text-xs truncate text-gray-500 dark:text-zinc-500">{currentUserCount}명 접속 중</p>
              }
            </div>

            <Spacer />

            {/* Debug */}
            <TopbarButton
              onClick={() => setIsDebugDialogShown(true)}
            >
              <Info size={18} strokeWidth={1.5} />
            </TopbarButton>

            {/* Glyph operations (only in main view) */}
            {activeTab === null && (
              <>
                <TopbarButtonGroup>
                  <TopbarGroupedButton
                    onClick={handleAddGlyph}
                    title="글리프 추가 (Cmd+E)"
                  >
                    <SquarePlus size={18} strokeWidth={1.5} />
                  </TopbarGroupedButton>
                  <TopbarGroupedButton
                    onClick={handleDeleteGlyph}
                    disabled={selectedIds.size === 0}
                    title="글리프 삭제 (Delete)"
                  >
                    <Trash2 size={18} strokeWidth={1.5} />
                  </TopbarGroupedButton>
                </TopbarButtonGroup>

                {/* Sort dropdown */}
                <TopbarDropdownButton
                  onClick={() => {
                    try {
                      sortOptionRef.current?.showPicker();
                    } catch (err) {
                      sortOptionRef.current?.focus();
                      sortOptionRef.current?.click();
                    }
                  }}
                >
                  <ArrowDownWideNarrow size={18} strokeWidth={1.5} />
                  <select
                    ref={sortOptionRef}
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="text-sm outline-none appearance-none"
                  >
                    <option value="index">글리프 인덱스</option>
                    <option value="name">글리프 이름</option>
                    <option value="codepoint">코드 포인트</option>
                    <option value="user-friendly">사용자 친화적</option>
                    <option value="script-order">문자 순서</option>
                  </select>
                </TopbarDropdownButton>

                <TopbarButtonGroup>
                  <TopbarGroupedButton onClick={() => setGlyphSize(prev => Math.max(4, prev - 1))}>
                    <Minus size={18} strokeWidth={1.5}></Minus>
                  </TopbarGroupedButton>
                  <input
                    type="number"
                    min="4"
                    max="512"
                    value={glyphSize}
                    onChange={(e) => setGlyphSize(Number(e.target.value))}
                    className="w-12 border border-transparent text-center bg-transparent text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none rounded"
                    id="glyph-size-input"
                  />
                  <TopbarGroupedButton onClick={() => setGlyphSize(prev => Math.max(4, prev + 1))}>
                    <Plus size={18} strokeWidth={1.5}></Plus>
                  </TopbarGroupedButton>
                </TopbarButtonGroup>
              </>
            )}

            {/* Glyph editor tools (only in glyph editor) */}
            {activeTab !== null && (<>
              {/* Editor toolbar */}
              <TopbarButtonGroup>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  selected={activeTab !== null && selectedTool === "pen"}
                  onClick={() => setSelectedTool("pen")}
                >
                  <PenTool size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  selected={activeTab !== null && selectedTool === "pointer"}
                  onClick={() => setSelectedTool("pointer")}
                >
                  <MousePointer2 size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  selected={activeTab !== null && selectedTool === "curve"}
                  onClick={() => setSelectedTool("curve")}
                >
                  <SplinePointer size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  selected={activeTab !== null && selectedTool === "rectangle"}
                  onClick={() => setSelectedTool("rectangle")}
                >
                  <RectangleHorizontal size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  selected={activeTab !== null && selectedTool === "circle"}
                  onClick={() => setSelectedTool("circle")}
                >
                  <Circle size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  selected={activeTab !== null && selectedTool === "hand"}
                  onClick={() => setSelectedTool("hand")}
                >
                  <Hand size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  selected={activeTab !== null && selectedTool === "zoom"}
                  onClick={() => setSelectedTool("zoom")}
                >
                  <Search size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  selected={activeTab !== null && selectedTool === "ruler"}
                  onClick={() => setSelectedTool("ruler")}
                >
                  <RulerDimensionLine size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
              </TopbarButtonGroup>

              {/* Zoom control */}
              <TopbarButtonGroup>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  onClick={() => setZoomAction({ type: 'OUT', timestamp: Date.now() })}
                >
                  <ZoomOut size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  onClick={() => setZoomAction({ type: 'RESET', timestamp: Date.now() })}
                >
                  <span className="text-xs">100%</span>
                </TopbarGroupedButton>
                <TopbarGroupedButton
                  disabled={activeTab === null}
                  onClick={() => setZoomAction({ type: 'IN', timestamp: Date.now() })}
                >
                  <ZoomIn size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
              </TopbarButtonGroup>
            </>)}

            <TopbarButton
              onClick={() => setShowFeatureModal(true)}
            >
              <Ligature size={18} strokeWidth={1.5} />
            </TopbarButton>

            {isRightCollapsed && (
              <TopbarButton onClick={() => setIsRightCollapsed(false)}>
                <PanelRightOpen size={18} strokeWidth={1.5} />
              </TopbarButton>
            )}
          </Topbar>

          {/* Tab bar */}
          {openedTabs.length > 1 ? (
            <div className="mt-13 mx-1 px-1 py-[2px] flex flex-row bg-gray-100 dark:bg-zinc-900 rounded-full text-xs select-none overflow-x-auto">
              {openedTabs.map((glyphId) => {
                const glyph = glyphData.find(g => g.glyphUuid === glyphId);
                const tabName = glyphId === null 
                  ? "Glyphs" 
                  // : `${glyph?.glyphName || 'Unknown'} — Glyph ${glyphId}`;
                  : glyph?.glyphName
                return (
                  <div key={glyphId} onMouseDown={() => switchTab(glyphId)} className={`relative px-4 py-2 ${activeTab === null ? '' : 'pl-8'} flex flex-row flex-1 rounded-full justify-center ${glyphId === activeTab ? "bg-white dark:bg-zinc-700 shadow" : "hover:bg-gray-200 dark:hover:bg-zinc-800"}`}>
                    {glyphId !== null && glyphId === activeTab && (
                      <button
                        onClick={() => closeTab(glyphId)}
                        className="absolute left-2 w-3 h-3 hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-zinc-600 dark:active:bg-zinc-500 rounded-full"
                      >×</button>
                    )}
                    <p className="truncate">{tabName}</p>
                  </div>
                );
              })}
            </div>
          ) : <></>}

          {/* Glyphs view / Glyph editor view */}
          {activeTab === null ? (
            <div className={`flex-1 flex flex-col overflow-hidden ${(openedTabs.length <= 1) ? "mt-12" : ""}`}>
              <div className="flex-1 overflow-hidden">
                {glyphData.length > 0 || (
                  <div className="text-md w-full h-full p-4 text-center">글리프 데이터 로드 중...</div>
                )}
                {glyphData.length > 0 && (
                  <GlyphGrid
                    glyphs={glyphData}
                    updatedTime={updatedTime}
                    selectedIds={selectedIds}
                    onSelectionChange={handleSelectionChange}
                    onDoubleClick={openTab}
                    glyphSize={glyphSize}
                    sortOption={sortOption}
                    filterCategory={filterCategory}
                    filterValue={filterValue}
                    onGlyphReorder={sortOption === 'index' ? handleGlyphReorder : undefined}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <DynamicGlyphCanvas
                  glyphData={glyphData.find(g => g.glyphUuid === activeTab)!!}
                  updatedTime={updatedTime}
                  onGlyphDataChange={updateGlyphData}
                  key={`canvas-${activeTab}`}
                  zoomAction={zoomAction} 
                  onZoomComplete={() => setZoomAction(null)} 
                  selectedTool={selectedTool}
                  onToolChange={setSelectedTool}
                />
              </div>
            </div>
          )}
          <PreviewPanel fontData={fontData} glyphData={glyphData} />
        </Panel>

        {/* Right Sidebar */}
        {!isRightCollapsed && (
          <Panel defaultSize={240} minSize={180} maxSize={360} className="relative bg-gray-50 dark:bg-zinc-900 select-none">
            <Topbar>
              <TopbarButton onClick={() => setIsRightCollapsed(true)}>
                <PanelRightClose size={18} strokeWidth={1.5} />
              </TopbarButton>
              <Spacer />
            </Topbar>
            <div className="pt-12 h-full flex flex-col">
              {/* Segmented Control */}
              <div className="p-1 flex bg-gray-100 dark:bg-zinc-800 rounded-full mx-1">
                <button
                  onClick={() => setRightPanel('font')}
                  className={`flex-1 px-2 py-1 rounded-full text-xs ${rightPanel === 'font' ? 'bg-white dark:bg-zinc-700 shadow' : ''}`}
                >
                  폰트
                </button>
                <button
                  onClick={() => setRightPanel('glyph')}
                  className={`flex-1 px-2 py-1 rounded-full text-xs ${rightPanel === 'glyph' ? 'bg-white dark:bg-zinc-700 shadow' : ''}`}
                >
                  글리프
                </button>
                <button
                  onClick={() => setRightPanel('collaborate')}
                  className={`flex-1 px-2 py-1 rounded-full text-xs ${rightPanel === 'collaborate' ? 'bg-white dark:bg-zinc-700 shadow' : ''}`}
                >
                  협업
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-hidden">
                {rightPanel === 'font' && (
                  <FontPropertiesPanel
                    fontInfo={fontInfo}
                    onFontInfoChange={updateFontInfoHandler}
                  />
                )}
                {rightPanel === 'glyph' && (
                  <GlyphPropertiesPanel
                    glyphs={activeTab !== null
                      ? glyphData.filter(g => g.glyphUuid === activeTab)
                      : Array.from(selectedIds).map(id => glyphData.find(g => g.glyphUuid === id)).filter((g): g is GlyphData => g !== undefined)
                    }
                    fontData={sampleFontData}
                    onGlyphsChange={(newGlyphs) => {
                      // argument: subject to update data
                      const renamedGlyphs = newGlyphs.filter(ng => {
                        const matchingGlyph = glyphData.find(g => g.glyphUuid === ng.glyphUuid);
                        if (matchingGlyph === undefined)
                          return false;
                        return matchingGlyph.glyphName !== ng.glyphName;
                      });
                      renamedGlyphs.forEach(g => {
                        const matchingNewGlyph = newGlyphs.find(ng => g.glyphUuid === ng.glyphUuid)
                        if (matchingNewGlyph === undefined)
                          return;

                        const newName = matchingNewGlyph.glyphName;
                        if (stompClient && stompClient.connected) {
                          stompClient.publish({
                            destination: '/app/glyph/action',
                            body: JSON.stringify({
                              projectId: 1,
                              action: 'RENAME',
                              glyphName: g.glyphName,
                              newName: newName
                            })
                          });
                        }
                      });

                      setGlyphData(prev => prev.map(g => {
                        const updated = newGlyphs.find(ng => ng.glyphUuid === g.glyphUuid);

                        if (updated !== undefined && updated.glyphName !== g.glyphName) {
                          if (stompClient && stompClient.connected) {
                            stompClient.publish({
                              destination: '/app/glyph/action',
                              body: JSON.stringify({
                                projectId: 1,
                                action: 'RENAME',
                                glyphName: g.glyphName,
                                newName: updated.glyphName
                              })
                            });
                          }
                        }

                        return updated || g;
                      }));

                      newGlyphs.forEach(g => updateGlyphData(g));
                    }}
                  />
                )}
                {rightPanel === 'collaborate' && (
                  <CollaboratePanel isOwner={user.id === fontData.ownerId} userId={user?.id} projectId={projectId} />
                )}
              </div>
            </div>
          </Panel>
        )}

        {isDebugDialogShown && (
          <DebugPanel
            fontData={fontData}
            onClose={() => setIsDebugDialogShown(false)}
          />
        )}
        {/* OpenType Feature Modal */}
        {showFeatureModal && (
          <OpenTypeFeaturePanel
            fontData={sampleFontData}
            onClose={() => setShowFeatureModal(false)}
            onFontDataChange={setSampleFontData}
          />
        )}
      </Group>
    </div>
  );
}
