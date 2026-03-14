"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, MessageSquare, Edit2 } from "lucide-react";
import NewCollaboratorModal from "./newCollaboratorModal";

type Permission = 'owner' | 'co-owner' | 'editor' | 'viewer';

interface Note {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

interface CollaboratorProps {
  isOwner: boolean;
  projectId: number;
  userId: number;
}

interface RawCollaborator {
  userId: number;
  nickname: string;
  email: string;
  role: string;
  joinedAt: string;
}
interface Collaborator {
  userId: number;
  nickname: string;
  email: string;
  role: string;
  joinedAt: Date;
}

export default function CollaboratePanel({ isOwner, userId, projectId }: CollaboratorProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isNewCollaboratorModalShown, setIsNewCollaboratorModalShown] = useState(false);

  // Useless (dummy data)
  // const [notes, setNotes] = useState<Note[]>([]);
  // const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'collaborators' | 'notes' | 'chat'>('collaborators');
  // const [newMessage, setNewMessage] = useState('');


  // Get collaborator Info
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${projectId}/collaborators`)
      .then(response => response.json())
      .then((collaboratorData: RawCollaborator[]) => {
        const collaborators = collaboratorData.map(c => { return {
          ...c,
          joinedAt: new Date(c.joinedAt)
        }});
        setCollaborators(collaborators);
      });
  }, [isNewCollaboratorModalShown, collaborators]);

  const removeCollaborator = (id: number) => {
    fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${projectId}/collaborators/${id}?requesterId=${userId}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (!response.ok) {
          alert("권한 회수가 제대로 되지 않았습니다. 다시 시도해 주세요.");
          return;
        }

        setCollaborators(collaborators.filter(c => c.userId !== id));
      })
  };

  const updatePermission = (id: number, role: 'EDITOR' | 'VIEWER') => {
    fetch(process.env.NEXT_PUBLIC_SERVER_URI + `/api/projects/${projectId}/collaborators/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesterId: userId,
        role
      })
    })
      .then(response => {
        if (!response.ok) {
          alert("권한 변경이 제대로 되지 않았습니다. 다시 시도해 주세요.");
          return;
        }

        setCollaborators(collaborators.map(c => c.userId === id ? { ...c, role } : c));
      })
  };

  // const addNote = () => {
  //   const content = prompt('메모를 입력하세요:');
  //   if (content) {
  //     setNotes([...notes, {
  //       id: Date.now().toString(),
  //       author: '현재 사용자',
  //       content,
  //       timestamp: new Date(),
  //     }]);
  //   }
  // };

  // const sendMessage = () => {
  //   if (newMessage.trim()) {
  //     setMessages([...messages, {
  //       id: Date.now().toString(),
  //       author: '현재 사용자',
  //       content: newMessage,
  //       timestamp: new Date(),
  //     }]);
  //     setNewMessage('');
  //   }
  // };

  return (
    <div className="h-full flex flex-col">
      {/* Segmented Control */}
      {/* <div className="p-1 flex bg-gray-100 dark:bg-zinc-800 rounded-full mx-1 mt-1">
        <button
          onClick={() => setActiveTab('collaborators')}
          className={`flex-1 px-2 py-1 rounded-full text-xs ${activeTab === 'collaborators' ? 'bg-white dark:bg-zinc-700 shadow' : ''}`}
        >
          협업자
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 px-2 py-1 rounded-full text-xs ${activeTab === 'notes' ? 'bg-white dark:bg-zinc-700 shadow' : ''}`}
        >
          메모
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-2 py-1 rounded-full text-xs ${activeTab === 'chat' ? 'bg-white dark:bg-zinc-700 shadow' : ''}`}
        >
          채팅
        </button>
      </div> */}

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'collaborators' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">협업 인원</h3>
              {isOwner && (
                <button
                  onClick={() => setIsNewCollaboratorModalShown(true)}
                  className="p-1 text-gray-700 dark:text-zinc-300 rounded text-xs hover:bg-gray-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                >
                  <Plus size={12} />
                </button>
              )}
            </div>
            <div className="space-y-2">
              {collaborators.map(collab => (
                <div key={collab.userId} className="p-3 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium truncate">{collab.nickname}</p>
                      <p className="text-xs text-gray-500 truncate">{collab.email}</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => removeCollaborator(collab.userId)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <select
                    value={collab.role}
                    onChange={(e) => updatePermission(collab.userId, e.target.value as 'VIEWER' | 'EDITOR')}
                    disabled={!isOwner}
                    className="w-full p-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-xs disabled:bg-gray-200 dark:disabled:bg-zinc-800 disabled:appearance-none"
                  >
                    <option value="EDITOR">편집자</option>
                    <option value="VIEWER">뷰어</option>
                  </select>
                </div>
              ))}
              {isOwner || (
                <p className="mt-4 text-center text-gray-500 dark:text-zinc-500 text-xs !leading-normal">협업 인원 추가·변경·삭제는<br />소유자만 할 수 있습니다.</p>
              )}
              {collaborators.length < 1 && (
                <div className="text-center text-sm text-gray-500 dark:text-zinc-500">협업 인원이 없습니다.</div>
              )}
            </div>

            {isNewCollaboratorModalShown && (
              <NewCollaboratorModal
                ownerId={userId}
                projectId={projectId}
                onClose={() => {
                  setIsNewCollaboratorModalShown(false);
                }}
              />
            )}
          </div>
        )}

        {/* {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">메모</h3>
              <button
                onClick={addNote}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                <Edit2 size={14} />
                추가
              </button>
            </div>
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="p-3 border border-gray-200 dark:border-zinc-700 rounded">
                  <p className="text-xs text-gray-500 mb-1">{note.author} • {note.timestamp.toLocaleString()}</p>
                  <p className="text-sm">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {messages.map(msg => (
                <div key={msg.id} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded">
                  <p className="text-xs text-gray-500 mb-1">{msg.author} • {msg.timestamp.toLocaleTimeString()}</p>
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="메시지 입력..."
                className="flex-1 min-w-0 px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-sm"
              />
              <button
                onClick={sendMessage}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex-shrink-0"
              >
                <MessageSquare size={16} />
              </button>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
