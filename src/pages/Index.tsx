import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

interface Message {
  id: number;
  text: string;
  time: string;
  isOut: boolean;
  author?: string;
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
  isGroup: boolean;
  members?: number;
  messages: Message[];
}

interface Profile {
  name: string;
  status: string;
  photo: string | null;
}

type CallState = "idle" | "calling" | "active";
type CallType = "audio" | "video";

interface User {
  id: number;
  name: string;
  nick: string;
  avatar: string;
  color: string;
  isOnline: boolean;
  status: string;
}

const USERS: User[] = [
  { id: 101, name: "Алексей Громов", nick: "@alexgrom", avatar: "АГ", color: "from-blue-500 to-cyan-400", isOnline: true, status: "Пишу код ☕" },
  { id: 102, name: "Мария Светлова", nick: "@masha_s", avatar: "МС", color: "from-pink-500 to-rose-400", isOnline: true, status: "В сети" },
  { id: 103, name: "Никита Орлов", nick: "@nikita_o", avatar: "НО", color: "from-violet-500 to-purple-400", isOnline: false, status: "Не беспокоить" },
  { id: 104, name: "Дарья Зимина", nick: "@dasha_z", avatar: "ДЗ", color: "from-emerald-500 to-teal-400", isOnline: true, status: "На встрече" },
  { id: 105, name: "Роман Белов", nick: "@roman_b", avatar: "РБ", color: "from-amber-500 to-orange-400", isOnline: false, status: "Отошёл" },
  { id: 106, name: "Екатерина Лис", nick: "@katya_lis", avatar: "ЕЛ", color: "from-indigo-500 to-blue-400", isOnline: true, status: "В сети" },
  { id: 107, name: "Сергей Волков", nick: "@s_volkov", avatar: "СВ", color: "from-red-500 to-pink-400", isOnline: false, status: "Занят" },
  { id: 108, name: "Юлия Небо", nick: "@yulya_sky", avatar: "ЮН", color: "from-sky-500 to-blue-400", isOnline: true, status: "🎵 Слушаю музыку" },
];

const CHATS: Chat[] = [];

const AVATAR_COLORS: Record<string, string> = {
  АС: "from-pink-500 to-rose-400",
  КР: "from-violet-500 to-purple-400",
  ДК: "from-blue-500 to-cyan-400",
  МП: "from-amber-500 to-orange-400",
  ИН: "from-emerald-500 to-teal-400",
  ОЧ: "from-indigo-500 to-blue-400",
};

function formatDuration(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function generateRoomName(chatId: number, chatName: string) {
  const slug = chatName.replace(/\s+/g, "-").replace(/[^a-zA-Zа-яА-Я0-9-]/g, "");
  return `potok-chat-${chatId}-${slug}`;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Index() {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Record<number, Message[]>>(
    Object.fromEntries(CHATS.map((c) => [c.id, c.messages]))
  );
  const [unread, setUnread] = useState<Record<number, number>>(
    Object.fromEntries(CHATS.map((c) => [c.id, c.unread]))
  );
  const [search, setSearch] = useState("");

  // Profile
  const [profile, setProfile] = useState<Profile>({ name: "Мой профиль", status: "В сети", photo: null });
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global search
  const [showSearch, setShowSearch] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const globalSearchRef = useRef<HTMLInputElement>(null);
  const [chats, setChats] = useState<Chat[]>(CHATS);

  // Call state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>("audio");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  const openProfile = () => {
    setEditName(profile.name);
    setEditStatus(profile.status);
    setShowProfile(true);
  };

  const saveProfile = () => {
    setProfile((p) => ({ ...p, name: editName.trim() || p.name, status: editStatus.trim() || p.status }));
    setShowProfile(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfile((p) => ({ ...p, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const globalResults = globalQuery.trim().length >= 1
    ? USERS.filter((u) =>
        u.nick.toLowerCase().includes(globalQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(globalQuery.toLowerCase())
      )
    : [];

  const openChatWithUser = (user: User) => {
    const existing = chats.find((c) => c.id === user.id);
    if (existing) {
      handleSelectChat(existing);
    } else {
      const newChat: Chat = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        lastMessage: "",
        time: "",
        unread: 0,
        isOnline: user.isOnline,
        isGroup: false,
        messages: [],
      };
      setChats((prev) => [newChat, ...prev]);
      setMessages((prev) => ({ ...prev, [newChat.id]: [] }));
      setUnread((prev) => ({ ...prev, [newChat.id]: 0 }));
      setActiveChat(newChat);
    }
    setShowSearch(false);
    setGlobalQuery("");
  };

  const startCall = (type: CallType) => {
    setCallType(type);
    setIsMuted(false);
    setIsCamOff(false);
    setCallState("calling");
    setTimeout(() => setCallState("active"), 2000);
  };

  const endCall = () => setCallState("idle");

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectChat = (chat: Chat) => {
    if (callState !== "idle") endCall();
    setActiveChat(chat);
    setUnread((prev) => ({ ...prev, [chat.id]: 0 }));
  };

  const handleSend = () => {
    if (!inputValue.trim() || !activeChat) return;
    const newMsg: Message = {
      id: Date.now(),
      text: inputValue.trim(),
      time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      isOut: true,
    };
    setMessages((prev) => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMsg],
    }));
    setInputValue("");
  };

  const currentMessages = activeChat ? (messages[activeChat.id] || []) : [];
  const roomName = activeChat ? generateRoomName(activeChat.id, activeChat.name) : "";
  const jitsiUrl = activeChat
    ? `https://meet.jit.si/${roomName}#userInfo.displayName="Я"&config.startWithAudioMuted=${isMuted}&config.startWithVideoMuted=${callType === "audio" || isCamOff}&config.toolbarButtons=[]&config.disableDeepLinking=true&config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false`
    : "";

  return (
    <div className="h-screen w-screen flex overflow-hidden relative bg-background">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="float-orb absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full blur-[80px]" style={{ background: "rgba(124, 58, 237, 0.18)" }} />
        <div className="float-orb absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-[80px]" style={{ background: "rgba(56, 189, 248, 0.15)", animationDelay: "3s" }} />
        <div className="float-orb absolute top-[40%] right-[30%] w-64 h-64 rounded-full blur-[60px]" style={{ background: "rgba(244, 114, 182, 0.08)", animationDelay: "1.5s" }} />
      </div>

      {/* Profile modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowProfile(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm mx-4 glass-strong rounded-3xl p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-lg gradient-text">Мой профиль</h2>
              <button onClick={() => setShowProfile(false)} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
                <Icon name="X" size={16} className="text-white/60" />
              </button>
            </div>

            {/* Avatar upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white shadow-xl overflow-hidden">
                  {profile.photo
                    ? <img src={profile.photo} alt="avatar" className="w-full h-full object-cover" />
                    : <span>{getInitials(profile.name)}</span>
                  }
                </div>
                <div className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Icon name="Camera" size={22} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-white/30 mt-2">Нажмите чтобы изменить фото</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs text-white/40 mb-1.5 font-medium uppercase tracking-wider">Имя</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Введите имя..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 transition-all"
              />
            </div>

            {/* Status */}
            <div className="mb-6">
              <label className="block text-xs text-white/40 mb-1.5 font-medium uppercase tracking-wider">Статус</label>
              <input
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                placeholder="Что у вас нового?"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 transition-all"
              />
              {/* Quick statuses */}
              <div className="flex flex-wrap gap-2 mt-2">
                {["В сети", "Не беспокоить", "Занят", "Отошёл"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditStatus(s)}
                    className={`text-xs px-3 py-1 rounded-xl transition-all ${editStatus === s ? "bg-violet-500/30 border border-violet-500/50 text-violet-300" : "glass text-white/40 hover:text-white/70"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              onClick={saveProfile}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all glow-purple"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Global search modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={() => { setShowSearch(false); setGlobalQuery(""); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {/* Search input */}
            <div className="glass-strong rounded-2xl p-3 flex items-center gap-3 mb-2">
              <Icon name="Search" size={18} className="text-white/40 flex-shrink-0" />
              <input
                ref={globalSearchRef}
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Поиск по нику или имени..."
                className="flex-1 bg-transparent text-white/90 placeholder:text-white/30 text-sm focus:outline-none"
              />
              {globalQuery && (
                <button onClick={() => setGlobalQuery("")} className="text-white/30 hover:text-white/60 transition-colors">
                  <Icon name="X" size={16} />
                </button>
              )}
            </div>

            {/* Results */}
            {globalQuery.trim().length >= 1 && (
              <div className="glass-strong rounded-2xl overflow-hidden">
                {globalResults.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <Icon name="UserX" size={28} className="text-white/20" />
                    <p className="text-white/30 text-sm">Пользователь не найден</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {globalResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => openChatWithUser(user)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
                      >
                        <div className="relative flex-shrink-0">
                          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${user.color} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                            {user.avatar}
                          </div>
                          {user.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-white/90">{user.name}</p>
                          <p className="text-xs text-violet-400">{user.nick}</p>
                          <p className="text-xs text-white/30 truncate">{user.status}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                            <Icon name="MessageCircle" size={15} className="text-white" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {globalQuery.trim().length === 0 && (
              <div className="glass-strong rounded-2xl p-4">
                <p className="text-xs text-white/30 mb-3 font-medium uppercase tracking-wider">Все пользователи</p>
                <div className="space-y-1">
                  {USERS.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => openChatWithUser(user)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div className="relative flex-shrink-0">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${user.color} flex items-center justify-center text-xs font-bold text-white`}>
                          {user.avatar}
                        </div>
                        {user.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-white/85">{user.name}</p>
                        <p className="text-xs text-violet-400/70">{user.nick}</p>
                      </div>
                      <Icon name="ChevronRight" size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 flex flex-col glass border-r border-white/5 relative z-10">
        {/* Profile at top */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button className="relative group" onClick={openProfile}>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg overflow-hidden">
                {profile.photo
                  ? <img src={profile.photo} alt="avatar" className="w-full h-full object-cover" />
                  : <span>{getInitials(profile.name)}</span>
                }
              </div>
              <span className="online-dot absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
            </button>
            <button className="flex-1 min-w-0 text-left" onClick={openProfile}>
              <p className="text-sm font-semibold text-white/95 truncate">{profile.name}</p>
              <p className="text-xs text-emerald-400 truncate">● {profile.status}</p>
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={() => { setShowSearch(true); setTimeout(() => globalSearchRef.current?.focus(), 50); }}
                className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Icon name="UserSearch" size={15} className="text-white/70" />
              </button>
              <button onClick={openProfile} className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
                <Icon name="Settings" size={15} className="text-white/70" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск чатов..."
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {filteredChats.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-1">
                <Icon name="MessageSquare" size={24} className="text-white/20" />
              </div>
              <p className="text-white/30 text-sm">Чатов пока нет</p>
              <p className="text-white/20 text-xs">Нажмите + чтобы начать</p>
            </div>
          )}
          {filteredChats.map((chat, i) => (
            <button
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 animate-fade-in ${
                activeChat?.id === chat.id ? "chat-item-active" : "hover:bg-white/5"
              }`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="relative flex-shrink-0">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[chat.avatar] || "from-violet-500 to-blue-400"} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                  {chat.isGroup ? <Icon name="Users" size={20} className="text-white" /> : chat.avatar}
                </div>
                {chat.isOnline && (
                  <span className="online-dot absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold text-white/90 truncate">{chat.name}</span>
                  <span className="text-[11px] text-white/30 flex-shrink-0 ml-2">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/40 truncate">{chat.lastMessage}</p>
                  {unread[chat.id] > 0 && (
                    <span className="ml-2 flex-shrink-0 min-w-5 h-5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white px-1.5">
                      {unread[chat.id]}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center mb-2">
              <Icon name="MessageSquareDashed" size={36} className="text-white/15" />
            </div>
            <p className="text-white/30 text-lg font-medium">Выберите чат</p>
            <p className="text-white/20 text-sm">или создайте новый, нажав + в боковой панели</p>
          </div>
        ) : (<>
          {/* Chat header */}
          <div className="glass border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[activeChat.avatar] || "from-violet-500 to-blue-400"} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                  {activeChat.isGroup ? <Icon name="Users" size={18} className="text-white" /> : activeChat.avatar}
                </div>
                {activeChat.isOnline && (
                  <span className="online-dot absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-white/95">{activeChat.name}</h2>
                <p className="text-xs text-white/40">
                  {activeChat.isGroup ? `${activeChat.members} участников` : activeChat.isOnline ? "В сети" : "Не в сети"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {callState !== "idle" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 mr-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">
                    {callState === "calling" ? "Вызов..." : formatDuration(callDuration)}
                  </span>
                </div>
              )}
              <button
                onClick={() => callState === "idle" ? startCall("audio") : endCall()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${callState !== "idle" && callType === "audio" ? "bg-red-500/80 hover:bg-red-500" : "glass hover:bg-white/10"}`}
              >
                <Icon name={callState !== "idle" && callType === "audio" ? "PhoneOff" : "Phone"} size={16} className="text-white" />
              </button>
              <button
                onClick={() => callState === "idle" ? startCall("video") : endCall()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${callState !== "idle" && callType === "video" ? "bg-red-500/80 hover:bg-red-500" : "glass hover:bg-white/10"}`}
              >
                <Icon name={callState !== "idle" && callType === "video" ? "VideoOff" : "Video"} size={16} className="text-white/60" />
              </button>
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
                <Icon name="MoreVertical" size={16} className="text-white/60" />
              </button>
            </div>
          </div>

          {/* Call overlay */}
          {callState !== "idle" && (
            <div className="relative flex-shrink-0 animate-fade-in" style={{ height: callType === "video" ? "60%" : "180px" }}>
              {callState === "calling" ? (
                <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(56,189,248,0.1))" }}>
                  <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${AVATAR_COLORS[activeChat.avatar] || "from-violet-500 to-blue-400"} flex items-center justify-center text-2xl font-bold text-white shadow-2xl`} style={{ animation: "pulse-glow 1.5s infinite" }}>
                    {activeChat.isGroup ? "👥" : activeChat.avatar}
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-lg">{activeChat.name}</p>
                    <p className="text-white/50 text-sm mt-1">{callType === "video" ? "Видеозвонок..." : "Голосовой вызов..."}</p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[0, 0.2, 0.4].map((d, i) => (
                      <span key={i} className="w-2 h-2 rounded-full bg-white/40" style={{ animation: `typing 1.2s ${d}s infinite` }} />
                    ))}
                  </div>
                  <button onClick={endCall} className="mt-2 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg">
                    <Icon name="PhoneOff" size={22} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="relative h-full">
                  <iframe src={jitsiUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" className="w-full h-full border-0" title="Звонок" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                    <button onClick={() => setIsMuted((m) => !m)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg ${isMuted ? "bg-red-500" : "bg-white/20 backdrop-blur-md border border-white/20"}`}>
                      <Icon name={isMuted ? "MicOff" : "Mic"} size={18} className="text-white" />
                    </button>
                    {callType === "video" && (
                      <button onClick={() => setIsCamOff((c) => !c)} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg ${isCamOff ? "bg-red-500" : "bg-white/20 backdrop-blur-md border border-white/20"}`}>
                        <Icon name={isCamOff ? "VideoOff" : "Video"} size={18} className="text-white" />
                      </button>
                    )}
                    <button onClick={endCall} className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg">
                      <Icon name="PhoneOff" size={18} className="text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {currentMessages.map((msg, i) => (
              <div key={msg.id} className={`flex animate-fade-in ${msg.isOut ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 0.03}s` }}>
                {!msg.isOut && activeChat.isGroup && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-400 flex items-center justify-center text-[10px] font-bold text-white mr-2 flex-shrink-0 mt-auto">
                    {msg.author?.[0] || "?"}
                  </div>
                )}
                <div className="max-w-[65%]">
                  {!msg.isOut && activeChat.isGroup && msg.author && (
                    <p className="text-[11px] text-violet-400 font-medium mb-1 pl-1">{msg.author}</p>
                  )}
                  <div className={`px-4 py-2.5 ${msg.isOut ? (activeChat.isGroup ? "msg-bubble-group" : "msg-bubble-out") : "msg-bubble-in"}`}>
                    <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                  </div>
                  <p className={`text-[10px] text-white/25 mt-1 ${msg.isOut ? "text-right pr-1" : "pl-1"}`}>{msg.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="glass border-t border-white/5 px-6 py-4">
            <div className="flex items-end gap-3">
              <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0 mb-0.5">
                <Icon name="Paperclip" size={16} className="text-white/50" />
              </button>
              <div className="flex-1 relative">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Напишите сообщение..."
                  className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 transition-all pr-12"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity">
                  <Icon name="Smile" size={18} className="text-white/30" />
                </button>
              </div>
              <button
                onClick={handleSend}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${inputValue.trim() ? "bg-gradient-to-br from-violet-500 to-blue-500 glow-purple hover:scale-105 active:scale-95" : "bg-white/5 border border-white/8"}`}
              >
                <Icon name="Send" size={16} className={inputValue.trim() ? "text-white" : "text-white/25"} />
              </button>
            </div>
          </div>
        </>)}
      </main>
    </div>
  );
}