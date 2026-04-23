"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { 
  IoChatbubblesOutline, 
  IoClose, 
  IoSearchOutline, 
  IoAttachOutline, 
  IoSend,
  IoChevronBack,
  IoCloseCircle,
  IoCheckmarkOutline,
  IoCheckmarkDoneOutline
} from "react-icons/io5";

type User = {
  _id: string;
  email: string;
  name?: string;
  role: string;
  lastActive?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount?: number;
};

type Message = {
  _id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  fileUrl?: string;
  status: 'sent' | 'delivered' | 'read';
};

const ChatWidget = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser || !session) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.url) {
        // Send a message with the file
        await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: selectedUser._id,
            content: `Sent a file: ${file.name}`,
            fileUrl: data.url
          }),
        });
        fetchUsers();
        // Force refresh local message list immediately
        const histRes = await fetch(`/api/chat/history?partner=${selectedUser._id}`);
        const histData = await histRes.json();
        if (Array.isArray(histData)) setMessages(histData);
      }
    } catch (err) {
      console.error("File upload failed", err);
    }
  };

  const fetchUsers = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/chat/users?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  }, [session, search]);

  // Heartbeat to update online status
  useEffect(() => {
    if (!session) return;
    const sendHeartbeat = () => fetch("/api/users/heartbeat", { method: "POST" });
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000); 
    return () => clearInterval(interval);
  }, [session]);

  // Initial fetch and polling for sidebar (unreads, status)
  useEffect(() => {
    if (!isOpen || !session) return;
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000); // refresh list every 10s
    return () => clearInterval(interval);
  }, [isOpen, fetchUsers, session]);

  // Fetch messages when a user is selected
  useEffect(() => {
    if (!selectedUser || !session) return;
    
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/history?partner=${selectedUser._id}`);
        const data = await res.json();
        if (Array.isArray(data)) setMessages(data);
        
        // Mark as read if there are unreads
        if (selectedUser.unreadCount && selectedUser.unreadCount > 0) {
          await fetch("/api/chat/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partnerId: selectedUser._id }),
          });
          // Refresh only the users list to clear the badge in sidebar
          fetchUsers();
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    
    fetchMessages();
  }, [selectedUser?._id, session, fetchUsers]); // Dependency on ID instead of object

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser || !session) return;

    const newMessage = {
      content: input,
      receiverId: selectedUser._id,
    };

    // Optimistic UI update
    const optimisticMsg = {
      _id: Date.now().toString(),
      senderId: (session.user as any).id,
      receiverId: selectedUser._id,
      content: input,
      createdAt: new Date().toISOString(),
      status: 'sent'
    } as Message;
    setMessages(prev => [...prev, optimisticMsg]);
    setInput("");

    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      });
      fetchUsers(); // Refresh sidebar with last message
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const isOnline = (lastActive?: string) => {
    if (!lastActive) return false;
    const last = new Date(lastActive).getTime();
    const now = new Date().getTime();
    return now - last < 5 * 60 * 1000;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastMsgTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return formatTime(dateStr);
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Hide chat widget for guests, during loading, or on auth pages
  const isAuthPage = ['/login', '/signup', '/'].includes(pathname);
  if (status !== 'authenticated' || isAuthPage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans antialiased text-zinc-100">
      <style jsx global>{`
        .chat-scrollbar::-webkit-scrollbar { width: 5px; }
        .chat-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .chat-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .chat-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
        .bubble-tail-sender::before {
          content: ""; position: absolute; bottom: 0; right: -8px;
          border-width: 8px 0 0 8px; border-color: #4f46e5 transparent transparent transparent;
          transform: scaleY(-1);
        }
        .bubble-tail-receiver::before {
          content: ""; position: absolute; bottom: 0; left: -8px;
          border-width: 8px 8px 0 0; border-color: #27272a transparent transparent transparent;
          transform: scaleY(-1);
        }
      `}</style>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 group"
        >
          <IoChatbubblesOutline size={22} className="group-hover:rotate-12 transition-transform" />
          <span className="font-semibold">Chat</span>
          {users.some(u => (u.unreadCount || 0) > 0) && (
             <span className="absolute -top-1 -right-1 flex h-5 w-5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] items-center justify-center font-bold">
                 {users.reduce((acc, u) => acc + (u.unreadCount || 0), 0)}
               </span>
             </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="w-[85vw] sm:w-[500px] h-[600px] max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col sm:flex-row backdrop-blur-xl bg-opacity-95 transition-all duration-500 ease-in-out">
          
          <div className={`${selectedUser ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-64 border-r border-zinc-800 bg-zinc-900/50`}>
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-lg tracking-tight">Team Chat</h3>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                  title="Close Chat"
                >
                  <IoClose size={24} />
                </button>
              </div>
              <div className="relative">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-9 pr-8 py-2 bg-zinc-800 border-none rounded-lg text-sm text-zinc-200 placeholder:text-zinc-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    <IoCloseCircle size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1 chat-scrollbar">
              {users.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm italic">No users found</div>
              ) : (
                users.map(u => {
                  const isSelected = selectedUser?._id === u._id;
                  const online = isOnline(u.lastActive);
                  return (
                    <button
                      key={u._id}
                      onClick={() => setSelectedUser(u)}
                      className={`relative w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected ? 'bg-blue-600/10' : 'hover:bg-zinc-800/50 text-zinc-400'}`}
                    >
                      {isSelected && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}

                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white uppercase shadow-inner overflow-hidden">
                          {u.name?.slice(0, 2) || u.email.slice(0, 2)}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-zinc-900 rounded-full ${online ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-zinc-500'}`} />
                      </div>

                      <div className="text-left flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className={`font-semibold text-sm truncate ${isSelected ? 'text-blue-400' : 'text-zinc-100'}`}>{u.name || "Anonymous"}</p>
                          <span className="text-[10px] text-zinc-500 whitespace-nowrap">{formatLastMsgTime(u.lastMessage?.createdAt)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                           <p className="text-xs text-zinc-500 truncate italic flex-1">
                              {u.lastMessage ? u.lastMessage.content : u.role}
                           </p>
                           {(u.unreadCount || 0) > 0 && (
                              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg">
                                {u.unreadCount}
                              </span>
                           )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={`${!selectedUser ? 'hidden sm:flex' : 'flex'} flex-1 flex-col bg-zinc-950`}>
            {selectedUser ? (
              <>
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between shadow-sm bg-zinc-900/30">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedUser(null)} 
                      className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1 group"
                      title="Back to List"
                    >
                      <IoChevronBack size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                      <span className="text-xs font-semibold hidden sm:inline">Back</span>
                    </button>
                    <div className="relative">
                       <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 uppercase">
                           {selectedUser.name?.slice(0, 2) || selectedUser.email.slice(0, 2)}
                       </div>
                       <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-zinc-950 rounded-full ${isOnline(selectedUser.lastActive) ? 'bg-green-500' : 'bg-zinc-500'}`} />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">{selectedUser.name || "Anonymous"}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-tight">{selectedUser.role}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><IoClose size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1 chat-scrollbar flex flex-col">
                   {messages.map((m, idx) => {
                      const currentUserId = String((session.user as any)?.id);
                      const isMe = String(m.senderId) === currentUserId || m.senderId === 'me';
                      
                      // Date divider logic
                      const currentMsgDate = new Date(m.createdAt).toDateString();
                      const prevMsgDate = idx > 0 ? new Date(messages[idx-1].createdAt).toDateString() : null;
                      const showDateHeader = currentMsgDate !== prevMsgDate;

                      // Grouping logic (MT-1 inside, MT-4 outside)
                      const isLastInGroup = idx === messages.length - 1 || String(messages[idx+1].senderId) !== String(m.senderId);
                      const isFirstInGroup = idx === 0 || String(messages[idx-1].senderId) !== String(m.senderId);
                      const mtClass = isFirstInGroup ? 'mt-4' : 'mt-1';
                      
                      return (
                        <React.Fragment key={m._id || idx}>
                          {showDateHeader && (
                            <div className="flex justify-center my-4">
                              <span className="bg-white/10 text-[10px] text-zinc-300 px-3 py-1 rounded-full backdrop-blur-sm uppercase font-bold tracking-widest">
                                {new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          <div key={m._id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${mtClass} w-full`}>
                            <div className={`
                              relative max-w-[85%] px-4 py-2 text-sm shadow-sm
                              ${isMe 
                                ? `bg-indigo-600 text-white rounded-2xl ${isLastInGroup ? 'rounded-br-none bubble-tail-sender' : ''}` 
                                : `bg-zinc-800 text-zinc-100 rounded-2xl ${isLastInGroup ? 'rounded-bl-none bubble-tail-receiver' : ''}`
                              }
                            `}>
                              <div className="break-words leading-relaxed mb-1 flex flex-col gap-2">
                                {m.fileUrl && (
                                  <div className="rounded-lg overflow-hidden bg-black/20 p-1 mb-1 shadow-inner">
                                    {m.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                      <img src={m.fileUrl} alt="attachment" className="max-h-60 w-auto rounded-md object-cover transition-transform hover:scale-[1.02]" />
                                    ) : (
                                      <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 text-blue-300 hover:text-blue-100 transition-colors">
                                        <IoAttachOutline size={20} />
                                        <span className="text-xs font-medium truncate max-w-[150px]">View Document</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                                <span>{m.content}</span>
                              </div>
                              <div className="flex items-center justify-end gap-1.5 mt-1 select-none pointer-events-none">

                                <span className={`text-[9px] opacity-70 font-medium whitespace-nowrap ${isMe ? 'text-indigo-100' : 'text-zinc-400'}`}>
                                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                                {isMe && (
                                  <span className="flex opacity-80">
                                    {m.status === 'read' ? (
                                      <IoCheckmarkDoneOutline className="text-white" size={14} />
                                    ) : (
                                      <IoCheckmarkOutline className="text-white" size={14} />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                   })}
                   <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900/50 border-t border-zinc-800">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                  <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-4 py-2 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-inner">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg"
                    >
                      <IoAttachOutline size={20} />
                    </button>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-zinc-200 placeholder:text-zinc-500"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <button type="submit" disabled={!input.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:opacity-50 text-white p-2 rounded-lg shadow-lg transition-all transform active:scale-95">
                      <IoSend size={16} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-zinc-950">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                  <IoChatbubblesOutline size={32} className="text-zinc-600 relative z-10" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Team Hub</h3>
                <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">Connect with your team members to coordinate and share insights in real-time.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
