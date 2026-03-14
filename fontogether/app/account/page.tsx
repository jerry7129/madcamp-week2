"use client";

import { koreanFullDate } from "@/components/dateFormatter";
import Spacer from "@/components/spacer";
import Topbar from "@/components/topbar";
import TopbarButton from "@/components/topbarButton";

import { useUserStore } from "@/store/userStore";

import { ChevronLeft, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Group, Panel } from "react-resizable-panels";

// ----- Types ---------------------------------------------------------------
interface Collaborator {
  userId: number;
  nickname: string;
  email: string;
  role: string;
}

interface SharedProject {
  projectId: number;
  title: string;
  collaborators: Collaborator[];
}

// ----- Component -----------------------------------------------------------
export default function AccountPage() {
  const router = useRouter();

  const accountMenuCategory = [
    { label: "계정 정보", value: "account_info" },
    { label: "정보 수정", value: "change_info" },
    { label: "회원 탈퇴", value: "delete_account" },
  ];

  let [selectedCategory, setSelectedCategory] = useState(accountMenuCategory[0].value);

  let user = useUserStore((s) => s.user);
  let setUser = useUserStore((s) => s.setUser);
  let clearUser = useUserStore((s) => s.clearUser);

  const [newNickname, setNewNickname] = useState(user?.nickname || "");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const oldPasswordFieldRef = useRef<HTMLInputElement>(null);
  const newPasswordFieldRef = useRef<HTMLInputElement>(null);
  const newPasswordConfirmFieldRef = useRef<HTMLInputElement>(null);

  // Delete-account flow state
  const [deleteStep, setDeleteStep] = useState<"idle" | "checking" | "blocker" | "confirm">("idle");
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState<Record<number, number>>({}); // projectId → newOwnerId
  const [deleteAccountConformField, setDeleteAccountConformField] = useState("");

  const serverUri = process.env.NEXT_PUBLIC_SERVER_URI || "";

  const logoutHandler = () => {
    clearUser();
    router.push("/");
  };

  // ---- Nickname change ----
  const nicknameChangeHandler = () => {
    fetch(serverUri + `/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: newNickname }),
    }).then((res) => {
      if (!res.ok) { alert("닉네임 변경을 실패했습니다. 다시 시도해 주세요."); return; }
      alert("닉네임이 변경되었습니다.");
      setUser({ ...user, nickname: newNickname });
    });
  };

  // ---- Password change ----
  const passwordChangeHandler = () => {
    setPasswordErrorMessage("");
    if (oldPassword.length < 1) { setPasswordErrorMessage("기존 암호를 입력해 주세요."); oldPasswordFieldRef.current?.focus(); return; }
    if (newPassword.length < 1) { setPasswordErrorMessage("새 암호를 입력해 주세요."); newPasswordFieldRef.current?.focus(); return; }
    if (newPasswordConfirm.length < 1) { setPasswordErrorMessage("암호 확인을 입력해 주세요."); newPasswordConfirmFieldRef.current?.focus(); return; }
    if (newPassword !== newPasswordConfirm) { newPasswordConfirmFieldRef.current?.focus(); setPasswordErrorMessage("새 암호와 암호 확인이 일치하지 않습니다."); return; }

    fetch(serverUri + `/api/users/${user.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    })
      .then((res) => {
        if (!res.ok) { setPasswordErrorMessage("기존 암호를 다시 확인해 주세요."); return; }
        alert("암호가 변경되었습니다. 다시 로그인해 주세요.");
        clearUser();
        router.push("/");
      })
      .catch(() => alert("네트워크 연결이 원활하지 않습니다."));
  };

  // ---- Delete account flow ----
  // Step 1: Check for shared projects
  const startDeleteFlow = async () => {
    setDeleteStep("checking");
    try {
      const res = await fetch(serverUri + `/api/projects/user/${user.id}/owned-shared`);
      const projects: SharedProject[] = await res.json();
      if (projects.length > 0) {
        setSharedProjects(projects);
        // Default: first collaborator pre-selected for each project
        const defaults: Record<number, number> = {};
        for (const p of projects) {
          if (p.collaborators.length > 0) defaults[p.projectId] = p.collaborators[0].userId;
        }
        setSelectedNewOwner(defaults);
        setDeleteStep("blocker");
      } else {
        setDeleteStep("confirm");
      }
    } catch {
      alert("오류가 발생했습니다. 다시 시도해주세요.");
      setDeleteStep("idle");
    }
  };

  // Step 2a: Transfer ownership of a single project
  const transferOwner = async (projectId: number) => {
    const newOwnerId = selectedNewOwner[projectId];
    if (!newOwnerId) { alert("오너권을 위임받을 협업자를 선택해주세요."); return; }
    try {
      const res = await fetch(serverUri + `/api/projects/${projectId}/transfer-owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentOwnerId: user.id, newOwnerId }),
      });
      if (!res.ok) { alert("오너권 위임에 실패했습니다."); return; }
      setSharedProjects((prev) => prev.filter((p) => p.projectId !== projectId));
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  // Step 2b: Delete a shared project
  const deleteSharedProject = async (projectId: number) => {
    if (!confirm("이 프로젝트를 삭제하시겠습니까? 이 작업은 복구할 수 없습니다.")) return;
    try {
      const res = await fetch(serverUri + `/api/projects/${projectId}?userId=${user.id}`, { method: "DELETE" });
      if (!res.ok) { alert("프로젝트 삭제에 실패했습니다."); return; }
      setSharedProjects((prev) => prev.filter((p) => p.projectId !== projectId));
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  // When all shared projects are resolved, move to confirm step
  useEffect(() => {
    if (deleteStep === "blocker" && sharedProjects.length === 0) {
      setDeleteStep("confirm");
    }
  }, [sharedProjects, deleteStep]);

  // Step 3: Final confirmation
  const finalDeleteHandler = async () => {
    if (deleteAccountConformField !== user.email) { alert("입력한 문자열이 정확하지 않습니다."); return; }
    try {
      const res = await fetch(serverUri + `/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        alert("계정 삭제 실패: " + msg);
        return;
      }
      alert("계정이 삭제되었습니다.");
      clearUser();
      router.push("/");
    } catch {
      alert("계정 삭제에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <Group orientation="horizontal">
        <Panel defaultSize={240} minSize={240} maxSize={240} className="relative bg-gray-50 dark:bg-zinc-900">
          <Topbar>
            <TopbarButton onClick={() => router.back()}><ChevronLeft size={18} strokeWidth={1.5} /></TopbarButton>
            <Spacer />
          </Topbar>
          <div className="absolute mt-12 p-2 h-full flex flex-col w-full overflow-y-auto">
            {accountMenuCategory.map((category) => (
              <div
                key={category.value}
                className={`p-3 rounded-lg select-none ${selectedCategory === category.value ? "bg-gray-200 dark:bg-zinc-800 text-blue-500" : ""}`}
                onClick={() => { setSelectedCategory(category.value); setDeleteStep("idle"); }}
              >
                {category.label}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="relative">
          <Topbar>
            <p className="p-2 font-bold">계정 정보</p>
            <Spacer />
            <TopbarButton onClick={logoutHandler}><LogOut size={18} strokeWidth={1.5} /></TopbarButton>
          </Topbar>
          <div className="absolute mt-12 h-full overflow-y-auto">

            {/* ─── 계정 정보 ─── */}
            {selectedCategory === "account_info" && (
              <div className="p-6">
                <p className="font-bold text-2xl mb-4">{user.nickname}</p>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">이메일: {user.email}</p>
                <p className="text-sm text-gray-500 dark:text-zinc-400">가입일: {koreanFullDate(new Date(user.createdAt))}</p>
              </div>
            )}

            {/* ─── 정보 수정 ─── */}
            {selectedCategory === "change_info" && (
              <div className="p-6">
                <div className="pb-8 flex flex-col gap-2">
                  <h2 className="text-lg font-semibold mb-2">닉네임 변경</h2>
                  <div className="flex flex-col gap-2">
                    <p className="font-medium">새 닉네임</p>
                    <input value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className="p-1 border border-gray-300 dark:border-zinc-700 rounded-md outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-row"><Spacer /><button onClick={nicknameChangeHandler} className="px-6 py-1 bg-gray-100 dark:bg-zinc-900 rounded active:bg-gray-200 dark:active:bg-zinc-800">변경</button></div>
                </div>
                <div className="pb-8 flex flex-col gap-2">
                  <h2 className="text-lg font-semibold mb-2">암호 변경</h2>
                  <div className="flex flex-col gap-2">
                    <p className="font-medium">기존 암호</p>
                    <input type="password" ref={oldPasswordFieldRef} value={oldPassword} onChange={(e) => { setPasswordErrorMessage(""); setOldPassword(e.target.value); }} className="p-1 border border-gray-300 dark:border-zinc-700 rounded-md outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-medium">새 암호</p>
                    <input type="password" ref={newPasswordFieldRef} value={newPassword} onChange={(e) => { setPasswordErrorMessage(""); setNewPassword(e.target.value); }} className="p-1 border border-gray-300 dark:border-zinc-700 rounded-md outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-medium">암호 확인</p>
                    <input type="password" ref={newPasswordConfirmFieldRef} value={newPasswordConfirm} onChange={(e) => { setPasswordErrorMessage(""); setNewPasswordConfirm(e.target.value); }} className="p-1 border border-gray-300 dark:border-zinc-700 rounded-md outline-none focus:border-blue-500" />
                  </div>
                  {passwordErrorMessage.length > 0 && <p className="text-red-500">{passwordErrorMessage}</p>}
                  <div className="flex flex-row"><Spacer /><button onClick={passwordChangeHandler} className="px-6 py-1 bg-gray-100 dark:bg-zinc-900 rounded active:bg-gray-200 dark:active:bg-zinc-800">변경</button></div>
                </div>
              </div>
            )}

            {/* ─── 회원 탈퇴 ─── */}
            {selectedCategory === "delete_account" && (
              <div className="p-6 max-w-lg">

                {/* idle: 탈퇴 시작 버튼 */}
                {deleteStep === "idle" && (
                  <>
                    <p className="mb-2 font-medium">회원을 탈퇴하시겠습니까?</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                      회원님께서 작성하신 모든 프로젝트가 삭제되며, 이는 복구할 수 없습니다.
                    </p>
                    <button
                      onClick={startDeleteFlow}
                      className="mt-2 px-4 py-1 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded"
                    >회원 탈퇴</button>
                  </>
                )}

                {/* checking */}
                {deleteStep === "checking" && (
                  <p className="text-gray-400">확인 중...</p>
                )}

                {/* blocker: 소유한 공유 프로젝트가 있는 경우 */}
                {deleteStep === "blocker" && (
                  <>
                    <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-sm">
                      <p className="font-semibold mb-1">⚠️ 탈퇴 전 처리가 필요한 프로젝트가 있습니다.</p>
                      <p>아래 프로젝트는 본인이 오너이며 다른 협업자가 있습니다. 각 프로젝트에 대해 <strong>오너 권한 위임</strong> 또는 <strong>프로젝트 삭제</strong>를 선택해주세요.</p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {sharedProjects.map((proj) => (
                        <div key={proj.projectId} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                          <p className="font-semibold mb-2 truncate">{proj.title}</p>
                          <p className="text-xs text-gray-400 mb-3">협업자 {proj.collaborators.length}명</p>

                          {/* Transfer ownership */}
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">오너 권한 위임:</p>
                            <div className="flex gap-2 items-center">
                              <select
                                value={selectedNewOwner[proj.projectId] ?? ""}
                                onChange={(e) => setSelectedNewOwner((prev) => ({ ...prev, [proj.projectId]: Number(e.target.value) }))}
                                className="flex-1 text-sm p-1 border border-gray-300 dark:border-zinc-600 rounded outline-none bg-white dark:bg-zinc-800"
                              >
                                {proj.collaborators.map((c) => (
                                  <option key={c.userId} value={c.userId}>{c.nickname} ({c.email})</option>
                                ))}
                              </select>
                              <button
                                onClick={() => transferOwner(proj.projectId)}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700 whitespace-nowrap"
                              >위임</button>
                            </div>
                          </div>

                          {/* Delete project */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => deleteSharedProject(proj.projectId)}
                              className="text-xs px-3 py-1 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded hover:bg-red-200"
                            >프로젝트 삭제</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setDeleteStep("idle")}
                      className="mt-6 text-sm text-gray-400 hover:text-gray-600"
                    >← 취소</button>
                  </>
                )}

                {/* confirm: 최종 확인 */}
                {deleteStep === "confirm" && (
                  <>
                    <p className="mb-2 font-medium">정말로 회원 탈퇴를 진행하시겠습니까?</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                      회원님께서 작성하신 모든 프로젝트가 삭제되며, 이는 복구할 수 없습니다.
                    </p>
                    <p className="text-sm mb-2">탈퇴를 진행하시려면 아래에 <span className="font-mono font-semibold">{user.email}</span>을 입력해주세요.</p>
                    <input
                      type="text"
                      value={deleteAccountConformField}
                      onChange={(e) => setDeleteAccountConformField(e.target.value)}
                      className="w-full p-1 font-mono border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:border-blue-500 mb-4"
                    />
                    <div className="flex gap-2 justify-end text-sm">
                      <button onClick={() => setDeleteStep("idle")} className="px-4 py-1 bg-gray-100 active:bg-gray-200 text-black dark:text-white rounded dark:bg-zinc-800 dark:active:bg-zinc-900">취소</button>
                      <button onClick={finalDeleteHandler} className="px-4 py-1 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded">탈퇴</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Panel>
      </Group>
    </div>
  );
}
