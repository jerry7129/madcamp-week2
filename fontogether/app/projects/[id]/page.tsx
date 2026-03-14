"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Panel, Group } from "react-resizable-panels";
import { SelectionArea, SelectionEvent } from "@viselect/react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, List, LayoutGrid, SquarePlus, Copy, Trash2, CircleUserRound, ArrowDownWideNarrow, Download, TextCursorInput } from "lucide-react";

import Topbar from "@/components/topbar";
import Spacer from "@/components/spacer";
import TopbarButton, { TopbarButtonGroup, TopbarDropdownButton, TopbarGroupedButton } from "@/components/topbarButton";
import NewProjectModal from "./newProjectModal";
import AccountModal from "@/components/AccountModal";

import { useUserStore } from "@/store/userStore";
import ExportProjectModal from "./exportProjectModal";
import DeleteProjectModal from "./deleteProjectModal";
import { koreanFullDateTime } from "@/components/dateFormatter";
import RenameProjectModal from "./renameProjectModal";
import { FontData, ProjectData } from "@/types/font";


export default function GlyphsView() {
  let user = useUserStore((s) => s.user);

  /* for test */
  if (user === null) {
    user = { id: 0, name: "Test User", email: "applemincho@example.com"};
  }

  const filters = [
    { name: 'all', text: '내 프로젝트', iconName: 'LayoutGrid' },
    { name: 'sharedToMe', text: '내게 공유된 프로젝트', iconName: 'Download' },
    { name: 'sharedFromMe', text: '내가 공유한 프로젝트', iconName: 'Upload' }
  ];
  const [ currentFilter, setCurrentFilter ] = useState('all');

  const [ currentSort, setCurrentSort ] = useState('recentlyEdited');
  const sortSelectRef = useRef<HTMLSelectElement>(null);

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isRenameProjectModalOpen, setIsRenameProjectModalOpen] = useState(false);
  const [isExportProjectModalOpen, setIsExportProjectModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const toggleLeftSidebar = () => {
    setIsLeftCollapsed(!isLeftCollapsed)
  }
  const toggleRightSidebar = () => {
    setIsRightCollapsed(!isRightCollapsed)
  }

  const [viewType, setViewType] = useState<"grid" | "list">("list");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const router = useRouter();
  const handleMove = ({ store: { changed: { added, removed } } }: SelectionEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      added.forEach((el) => next.add(Number(el.getAttribute("data-id"))))
      removed.forEach((el) => next.delete(Number(el.getAttribute("data-id"))));
      return next;
    })
  }

  let [ projects, setProjects ] = useState<ProjectData[] | null>(null);
  const filteredFonts = useMemo(() => {
    let filtered: ProjectData[] = [];
    if (projects !== null) {
      if (currentFilter === 'all') {
        filtered = projects?.filter(proj => proj.ownerId === user?.id) || [];
      } else if (currentFilter === 'sharedToMe') {
        filtered = projects?.filter(proj => proj.ownerId !== user?.id) || [];
      } else if (currentFilter === 'sharedFromMe') {
        filtered = projects?.filter(proj => proj.ownerId === user?.id && proj.isShared) || [];
      }
    }
    return filtered.sort((a, b) => {
      if (currentSort === 'recentlyEdited') {
        const dateA = new Date(a.updatedAt);
        const dateB = new Date(b.updatedAt);
        return dateA.getTime() - dateB.getTime();
      } else if (currentSort === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      return 1;
    })
  }, [currentFilter, currentSort, projects]);

  const handleDoubleClick = (id: number) => {
    router.push(`/editor/${id}`)
  }

  useEffect(() => {
    // 1. 유저 정보가 없거나, 기본값(0)인 찰나의 순간에는 서버에 요청하지 않고 기다립니다.
    if (!user || user.id === 0) return;

    // 2. 유저 정보가 확실히 세팅되었을 때 요청을 보냅니다.
    fetch((process.env.NEXT_PUBLIC_SERVER_URI || "") + `/api/projects/user/${user?.id}`)
    .then(async res => {
      if (!res.ok) {
        // 4xx → no projects or user not found → treat as empty (no alert)
        if (res.status < 500) { setProjects([]); return; }
        // 5xx → real server error → let catch handle it
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
      console.log(data);
    })
    .catch(err => {
      console.error("Failed to fetch projects:", err);
      setProjects([]);
      alert("프로젝트를 불러오는 데 실패했습니다.");
    });
  }, [user?.id]);

  return (
    <>
      <div className="h-screen w-full flex item-stretch bg-background">
        <Group orientation="horizontal" className="flex-1 w-full relative">
          {isLeftCollapsed || (
            <Panel
              id="left"
              defaultSize={240}
              minSize={180}
              maxSize={360}
              className="relative bg-gray-50 dark:bg-zinc-900"
            >
              <Topbar>
                <p className="p-1 font-light select-none">FONTOGETHER</p>
                <Spacer />
                <TopbarButton onClick={toggleLeftSidebar}>
                  <PanelLeftClose size={18} strokeWidth={1.5} />
                </TopbarButton>
              </Topbar>
              <div className="absolute mt-12 p-2 flex flex-col w-full overflow-y-auto">
                {filters.map((item) => (
                  <div
                    key={item.name}
                    className={`p-3 rounded-lg select-none ${currentFilter === item.name ? 'bg-gray-200 dark:bg-zinc-800 text-blue-500' : ''} text-sm`}
                    onClick={() => setCurrentFilter(item.name)}
                  >{item.text}</div>
                ))}
              </div>
            </Panel>
          )}

          <Panel className="relative flex flex-col">
            <Topbar>
              {!isLeftCollapsed || (
                <TopbarButton onClick={toggleLeftSidebar}>
                  <PanelLeftOpen size={18} strokeWidth={1.5} />
                </TopbarButton>
              )}

              <p className="p-1 font-bold truncate">프로젝트</p>
              <Spacer />

              {/* Change view mode */}
              <TopbarButtonGroup>
                <TopbarGroupedButton selected={viewType === "list"} onClick={() => setViewType("list")}>
                  <List size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton selected={viewType === "grid"} onClick={() => setViewType("grid")}>
                  <LayoutGrid size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
              </TopbarButtonGroup>

              {/* Sorting */}
              <TopbarDropdownButton onClick={() => {sortSelectRef?.current?.showPicker()}}>
                <ArrowDownWideNarrow size={18} strokeWidth={1.5} />
                <select ref={sortSelectRef} value={currentSort} onChange={(e) => setCurrentSort(e.target.value)} className="text-sm outline-none appearance-none">
                  <option value="recentlyEdited">최근 수정</option>
                  <option value="alphabetical">프로젝트 이름</option>
                </select>
              </TopbarDropdownButton>

              {/* File actions */}
              <TopbarButtonGroup>
                <TopbarGroupedButton onClick={() => {setIsNewProjectModalOpen(true)}}>
                  <SquarePlus size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                {/* <TopbarGroupedButton disabled={selectedIds.size < 1} >
                  <Copy size={18} strokeWidth={1.5} />
                </TopbarGroupedButton> */}
                <TopbarGroupedButton onClick={() => {setIsRenameProjectModalOpen(true)}} disabled={selectedIds.size !== 1}>
                  <TextCursorInput size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton onClick={() => {setIsExportProjectModalOpen(true)}} disabled={selectedIds.size < 1}>
                  <Download size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
                <TopbarGroupedButton onClick={() => {setIsDeleteProjectModalOpen(true)}} disabled={selectedIds.size < 1}>
                  <Trash2 size={18} strokeWidth={1.5} />
                </TopbarGroupedButton>
              </TopbarButtonGroup>
              
              <TopbarButton
                onClick={() => {setIsAccountModalOpen(true)}}
              >
                <CircleUserRound size={18} strokeWidth={1.5} />
              </TopbarButton>

              {!isRightCollapsed || (
                <TopbarButton onClick={toggleRightSidebar}>
                  <PanelRightOpen size={18} strokeWidth={1.5} />
                </TopbarButton>
              )}
            </Topbar>

            {/* Project list */}
            <div className="mt-12 flex flex-grow">
              {projects === null && (
                <div className="flex-grow flex flex-col items-center justify-center select-none">
                  <p className="text-gray-500 dark:text-gray-400">프로젝트 로드 중...</p>
                </div>
              )}

              {projects !== null && filteredFonts.length === 0 && currentFilter !== "sharedToMe" && (
                <div className="flex-grow flex flex-col items-center justify-center select-none">
                  <p className="text-2xl">프로젝트가 없습니다.</p>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => setIsNewProjectModalOpen(true)}
                      className="text-blue-500 cursor-pointer"
                    >
                      새 프로젝트
                    </button>
                    를 만들어 시작하세요!</p>
                </div>
              )}
              {projects !== null && filteredFonts.length === 0 && currentFilter === "sharedToMe" && (
                <div className="flex-grow flex flex-col items-center justify-center select-none">
                  <p className="text-2xl">내게 공유된 프로젝트가 없습니다.</p>
                </div>
              )}

              {projects !== null && filteredFonts.length > 0 && (
                <SelectionArea
                  onMove={handleMove}
                  selectables=".selectable-item"
                  features={{ singleTap: { allow: true } }}
                  className="flex-grow selection-container h-full overflow-y-auto"
                >
                  <div className={`p-2
                    ${viewType === "grid"
                      ? "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2"
                      : "flex flex-col"}
                  `}>
                    {viewType === "list" && (
                      <div className="sticky top-0 flex justify-between items-center p-2 pb-1 mb-1 border-b border-gray-300 dark:border-zinc-700 select-none font-semibold text-sm text-gray-400 dark:text-zinc-600">
                        <span className="basis-64 grow-[3]">프로젝트 이름</span>
                        <span className="basis-20 grow">소유자</span>
                        <span className="basis-20 grow">최근 수정</span>
                      </div>
                    )}
                    {filteredFonts.map((data, index) => (
                      <div
                        key={data.projectId}
                        data-id={data.projectId}
                        onDoubleClick={() => handleDoubleClick(data.projectId)}
                        className={`selectable-item rounded-lg
                          ${viewType === "list" ? `px-2 py-1 flex justify-between items-center ${(index & 1) ? "bg-gray-100 dark:bg-zinc-800" : ""}` : "px-4 py-2 flex flex-col items-center justify-center"}
                          ${selectedIds.has(data.projectId) ? "!bg-blue-500 text-white" : ""}
                          select-none`
                        }
                      >
                        {viewType === "grid" && (<>
                          <div className="pt-4 pb-2 mb-2 overflow-hidden">
                            <span className="text-4xl">Abg</span>
                          </div>
                          <span className="text-sm">{data.title}</span>
                        </>)}
                        {viewType === "list" && (<>
                          <span className="basis-64 grow-[3] text-sm">{data.title}</span>
                          <span className="basis-20 grow text-xs">{data.ownerId === user?.id ? "나" : data.ownerNickname}</span>
                          <span className="basis-20 grow text-xs opacity-50">{koreanFullDateTime(new Date(data.updatedAt))}</span>
                        </>)}
                      </div>
                    ))}
                  </div>
                </SelectionArea>
              )}
            </div>
          </Panel>

          {true || isRightCollapsed || (
            <Panel
              id="right"
              defaultSize={240}
              minSize={180}
              maxSize={360}
              className="relative bg-gray-50 dark:bg-zinc-900"
            >
              <Topbar>
                <TopbarButton onClick={toggleRightSidebar}>
                  <PanelRightClose size={18} strokeWidth={1.5} />
                </TopbarButton>
                <Spacer />
              </Topbar>
              <div className="pt-12 overflow-y-auto">
                
              </div>
            </Panel>
          )}

          {isNewProjectModalOpen && (
            <NewProjectModal
              onClose={() => {
                setIsNewProjectModalOpen(false);
                fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/user/${user?.id}`)
                  .then(res => res.json())
                  .then((data: ProjectData[]) => {
                    console.log(data)
                    setProjects(data)
                  });
              }}
            />
          )}
          {isAccountModalOpen && (
            <AccountModal onClose={() => {setIsAccountModalOpen(false)}} />
          )}
          {isRenameProjectModalOpen && (
            <RenameProjectModal
              userId={user.id}
              projectId={[...selectedIds][0]}
              onClose={(newTitle) => {
                if (newTitle !== null) {
                  setProjects((prev: ProjectData[] | null) => {
                    const refArray = prev || [];
                    const projectIndex = refArray?.findIndex(p => p.projectId === [...selectedIds][0]);
                    if (projectIndex >= 0) {
                      const newProjects = [...refArray];
                      newProjects[projectIndex].title = newTitle;
                      return newProjects;
                    } else {
                      return [];
                    }
                  })
                }
                setIsRenameProjectModalOpen(false);
              }}
            />
          )}
          {isDeleteProjectModalOpen && (
            <DeleteProjectModal
              userId={user?.id}
              ids={selectedIds}
              onClose={() => {
                setIsDeleteProjectModalOpen(false)
                fetch((process.env.NEXT_PUBLIC_SERVER_URI || "") + `/api/projects/user/${user?.id}`)
                  .then(res => res.json())
                  .then((data: ProjectData[]) => {
                    console.log(data)
                    setProjects(data)
                  });
              }}
            />
          )}
          {isExportProjectModalOpen && (
            <ExportProjectModal projectIds={selectedIds} onClose={() => {setIsExportProjectModalOpen(false)}}></ExportProjectModal>
          )}
        </Group>
      </div>
    </>
  );
}
