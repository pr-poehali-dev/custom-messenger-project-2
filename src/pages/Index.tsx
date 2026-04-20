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

type CallState = "idle" | "calling" | "active";
type CallType = "audio" | "video";

const CHATS: Chat[] = [
  {
    id: 1,
    name: "Алёна Смирнова",
    avatar: "АС",
    lastMessage: "Отправила файлы на проверку 📎",
    time: "14:32",
    unread: 3,
    isOnline: true,
    isGroup: false,
    messages: [
      { id: 1, text: "Привет! Как дела с проектом?", time: "14:20", isOut: false },
      { id: 2, text: "Всё идёт по плану, сегодня заканчиваю основной блок", time: "14:22", isOut: true },
      { id: 3, text: "Отлично! Успеваем к дедлайну?", time: "14:25", isOut: false },
      { id: 4, text: "Да, точно. Уже финальный этап", time: "14:28", isOut: true },
      { id: 5, text: "Отправила файлы на проверку 📎", time: "14:32", isOut: false },
    ],
  },
  {
    id: 2,
    name: "Команда разработки",
    avatar: "КР",
    lastMessage: "Максим: Деплой прошёл успешно 🚀",
    time: "13:15",
    unread: 7,
    isOnline: false,
    isGroup: true,
    members: 8,
    messages: [
      { id: 1, text: "Начинаем деплой на прод?", time: "12:50", isOut: false, author: "Максим" },
      { id: 2, text: "Подождите, тестирую последний фикс", time: "12:55", isOut: true },
      { id: 3, text: "Готово, всё чисто", time: "13:02", isOut: true },
      { id: 4, text: "Запускаем!", time: "13:10", isOut: false, author: "Дарья" },
      { id: 5, text: "Деплой прошёл успешно 🚀", time: "13:15", isOut: false, author: "Максим" },
    ],
  },
  {
    id: 3,
    name: "Дмитрий Козлов",
    avatar: "ДК",
    lastMessage: "Встреча в 16:00, не забудь",
    time: "11:44",
    unread: 0,
    isOnline: true,
    isGroup: false,
    messages: [
      { id: 1, text: "Дима, ты получил предложение?", time: "11:30", isOut: true },
      { id: 2, text: "Да, изучаю. Выглядит интересно", time: "11:35", isOut: false },
      { id: 3, text: "Если вопросы — звони", time: "11:40", isOut: true },
      { id: 4, text: "Встреча в 16:00, не забудь", time: "11:44", isOut: false },
    ],
  },
  {
    id: 4,
    name: "Маркетинг и продажи",
    avatar: "МП",
    lastMessage: "Юля: Новый кейс готов к публикации",
    time: "Вчера",
    unread: 0,
    isOnline: false,
    isGroup: true,
    members: 12,
    messages: [
      { id: 1, text: "Когда публикуем кейс по проекту?", time: "Вчера", isOut: false, author: "Юля" },
      { id: 2, text: "Ждём согласования от клиента", time: "Вчера", isOut: true },
      { id: 3, text: "Получила подтверждение!", time: "Вчера", isOut: false, author: "Юля" },
      { id: 4, text: "Новый кейс готов к публикации", time: "Вчера", isOut: false, author: "Юля" },
    ],
  },
  {
    id: 5,
    name: "Ирина Новикова",
    avatar: "ИН",
    lastMessage: "Спасибо большое! ❤️",
    time: "Пн",
    unread: 0,
    isOnline: false,
    isGroup: false,
    messages: [
      { id: 1, text: "Ира, можешь помочь с презентацией?", time: "Пн", isOut: true },
      { id: 2, text: "Конечно! Пришли материалы", time: "Пн", isOut: false },
      { id: 3, text: "Отправил всё на почту", time: "Пн", isOut: true },
      { id: 4, text: "Спасибо большое! ❤️", time: "Пн", isOut: false },
    ],
  },
  {
    id: 6,
    name: "Общий чат офиса",
    avatar: "ОЧ",
    lastMessage: "Сергей: Кофемашина сломалась 😭",
    time: "Пн",
    unread: 24,
    isOnline: false,
    isGroup: true,
    members: 43,
    messages: [
      { id: 1, text: "Кто взял мою кружку из холодильника?", time: "Пн", isOut: false, author: "Анна" },
      { id: 2, text: "Ребята, заказываем пиццу в пятницу?", time: "Пн", isOut: false, author: "Виктор" },
      { id: 3, text: "Я за!", time: "Пн", isOut: true },
      { id: 4, text: "Кофемашина сломалась 😭", time: "Пн", isOut: false, author: "Сергей" },
    ],
  },
];

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

export default function Index() {
  const [activeChat, setActiveChat] = useState<Chat>(CHATS[0]);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Record<number, Message[]>>(
    Object.fromEntries(CHATS.map((c) => [c.id, c.messages]))
  );
  const [unread, setUnread] = useState<Record<number, number>>(
    Object.fromEntries(CHATS.map((c) => [c.id, c.unread]))
  );
  const [search, setSearch] = useState("");

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

  const startCall = (type: CallType) => {
    setCallType(type);
    setIsMuted(false);
    setIsCamOff(false);
    setCallState("calling");
    // Auto-connect after 2s (simulate accept)
    setTimeout(() => setCallState("active"), 2000);
  };

  const endCall = () => {
    setCallState("idle");
  };

  const filteredChats = CHATS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectChat = (chat: Chat) => {
    if (callState !== "idle") endCall();
    setActiveChat(chat);
    setUnread((prev) => ({ ...prev, [chat.id]: 0 }));
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
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

  const currentMessages = messages[activeChat.id] || [];
  const roomName = generateRoomName(activeChat.id, activeChat.name);
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="Я"&config.startWithAudioMuted=${isMuted}&config.startWithVideoMuted=${callType === "audio" || isCamOff}&config.toolbarButtons=[]&config.disableDeepLinking=true&config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false`;

  return (
    <div className="h-screen w-screen flex overflow-hidden relative bg-background">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="float-orb absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full blur-[80px]" style={{ background: "rgba(124, 58, 237, 0.18)" }} />
        <div className="float-orb absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-[80px]" style={{ background: "rgba(56, 189, 248, 0.15)", animationDelay: "3s" }} />
        <div className="float-orb absolute top-[40%] right-[30%] w-64 h-64 rounded-full blur-[60px]" style={{ background: "rgba(244, 114, 182, 0.08)", animationDelay: "1.5s" }} />
      </div>

      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 flex flex-col glass border-r border-white/5 relative z-10">
        <div className="p-5 flex items-center justify-between">
          <h1 className="font-display font-black text-2xl gradient-text tracking-tight">Поток</h1>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
              <Icon name="Plus" size={16} className="text-white/70" />
            </button>
            <button className="w-8 h-8 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
              <Icon name="Settings" size={16} className="text-white/70" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4">
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
          {filteredChats.map((chat, i) => (
            <button
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 animate-fade-in ${
                activeChat.id === chat.id ? "chat-item-active" : "hover:bg-white/5"
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

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">ВЫ</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90">Мой профиль</p>
              <p className="text-xs text-emerald-400">● В сети</p>
            </div>
            <Icon name="ChevronRight" size={14} className="text-white/30" />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
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
            {/* Call active indicator */}
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
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                callState !== "idle" && callType === "audio"
                  ? "bg-red-500/80 hover:bg-red-500"
                  : "glass hover:bg-white/10"
              }`}
            >
              <Icon name={callState !== "idle" && callType === "audio" ? "PhoneOff" : "Phone"} size={16} className="text-white" />
            </button>
            <button
              onClick={() => callState === "idle" ? startCall("video") : endCall()}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                callState !== "idle" && callType === "video"
                  ? "bg-red-500/80 hover:bg-red-500"
                  : "glass hover:bg-white/10"
              }`}
            >
              <Icon name={callState !== "idle" && callType === "video" ? "VideoOff" : "Video"} size={16} className="text-white/60" />
            </button>
            <button className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
              <Icon name="MoreVertical" size={16} className="text-white/60" />
            </button>
          </div>
        </div>

        {/* Call overlay / Jitsi */}
        {callState !== "idle" && (
          <div className="relative flex-shrink-0 animate-fade-in" style={{ height: callType === "video" ? "60%" : "180px" }}>
            {callState === "calling" ? (
              /* Ringing screen */
              <div className="h-full flex flex-col items-center justify-center gap-4"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(56,189,248,0.1))" }}>
                <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${AVATAR_COLORS[activeChat.avatar] || "from-violet-500 to-blue-400"} flex items-center justify-center text-2xl font-bold text-white shadow-2xl`}
                  style={{ animation: "pulse-glow 1.5s infinite" }}>
                  {activeChat.isGroup ? "👥" : activeChat.avatar}
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-lg">{activeChat.name}</p>
                  <p className="text-white/50 text-sm mt-1">{callType === "video" ? "Видеозвонок..." : "Голосовой вызов..."}</p>
                </div>
                <div className="flex gap-2 mt-2">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-white/40"
                      style={{ animation: `typing 1.2s ${d}s infinite` }} />
                  ))}
                </div>
                <button onClick={endCall}
                  className="mt-2 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg">
                  <Icon name="PhoneOff" size={22} className="text-white" />
                </button>
              </div>
            ) : (
              /* Active Jitsi call */
              <div className="relative h-full">
                <iframe
                  src={jitsiUrl}
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                  className="w-full h-full border-0"
                  title="Звонок"
                />
                {/* Controls overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                  <button
                    onClick={() => setIsMuted((m) => !m)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg ${isMuted ? "bg-red-500" : "bg-white/20 backdrop-blur-md border border-white/20"}`}
                  >
                    <Icon name={isMuted ? "MicOff" : "Mic"} size={18} className="text-white" />
                  </button>
                  {callType === "video" && (
                    <button
                      onClick={() => setIsCamOff((c) => !c)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg ${isCamOff ? "bg-red-500" : "bg-white/20 backdrop-blur-md border border-white/20"}`}
                    >
                      <Icon name={isCamOff ? "VideoOff" : "Video"} size={18} className="text-white" />
                    </button>
                  )}
                  <button
                    onClick={endCall}
                    className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
                  >
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
            <div
              key={msg.id}
              className={`flex animate-fade-in ${msg.isOut ? "justify-end" : "justify-start"}`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
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
              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                inputValue.trim()
                  ? "bg-gradient-to-br from-violet-500 to-blue-500 glow-purple hover:scale-105 active:scale-95"
                  : "bg-white/5 border border-white/8"
              }`}
            >
              <Icon name="Send" size={16} className={inputValue.trim() ? "text-white" : "text-white/25"} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
