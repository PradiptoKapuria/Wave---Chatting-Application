import { useState, useRef, useEffect } from "react";

const C = {
  bg: "#0D0F1A", surface: "#13162B", card: "#1A1E35",
  border: "#ffffff12", accent: "#7C6FFF", rose: "#FF6B9D",
  text: "#E8EAF6", muted: "#6B7280", online: "#34D399",
};

const LS = {
  get: (k, fallback = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

const REPLIES = [
  "Got it, thanks!", "Sure, sounds good to me.",
  "Let me check and get back to you.", "Interesting! Tell me more.",
  "On it! 👍", "Makes sense.", "I'll handle it.", "Will do!",
];

function threadKey(a, b) { return [a, b].sort().join("_"); }
function getTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

function Avatar({ user, size = 40, online = false, ring = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${user.color}55, ${user.color}cc)`,
        border: ring ? `2px solid ${user.color}` : `1.5px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 600, color: "#fff",
        boxShadow: ring ? `0 0 12px ${user.color}55` : "none",
      }}>
        {user.avatar}
      </div>
      {online && (
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: size * 0.28, height: size * 0.28,
          borderRadius: "50%", background: C.online,
          border: `2px solid ${C.surface}`,
        }} />
      )}
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handle() {
    setError("");
    const users = LS.get("wave_users", []);
    if (mode === "login") {
      const u = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!u) { setError("Incorrect email or password."); return; }
      LS.set("wave_session", u.id);
      onAuth(u, users);
    } else {
      if (!name.trim() || !email.trim() || !password.trim()) { setError("All fields are required."); return; }
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) { setError("An account with that email already exists."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      const initials = name.trim().split(" ").map(w => w[0].toUpperCase()).join("").slice(0, 2);
      const palette = ["#7C6FFF", "#FF6B9D", "#34D399", "#FBBF24", "#60A5FA", "#F472B6", "#FB923C", "#A78BFA"];
      const color = palette[users.length % palette.length];
      const newUser = { id: `u${Date.now()}`, name: name.trim(), email: email.toLowerCase(), password, avatar: initials, color };
      const updated = [...users, newUser];
      LS.set("wave_users", updated);
      LS.set("wave_session", newUser.id);
      onAuth(newUser, updated);
    }
  }

  const inp = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${C.border}`, background: "#ffffff08",
    color: C.text, fontSize: 14, outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", padding: 16,
    }}>
      <div style={{ position: "fixed", top: "15%", left: "20%", width: 320, height: 320,
        borderRadius: "50%", background: `${C.accent}18`, filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "20%", right: "15%", width: 240, height: 240,
        borderRadius: "50%", background: `${C.rose}14`, filter: "blur(60px)", pointerEvents: "none" }} />

      <div style={{
        width: "100%", maxWidth: 400, background: C.card,
        border: `1px solid ${C.border}`, borderRadius: 20, padding: "36px 32px",
        boxShadow: "0 32px 64px #00000055", position: "relative",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`,
            fontSize: 22, marginBottom: 14,
          }}>💬</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: "-0.5px" }}>Wave</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            {mode === "login" ? "Sign in to continue" : "Create your account"}
          </div>
        </div>

        <div style={{ display: "flex", background: "#ffffff08", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              background: mode === m ? C.accent : "transparent",
              color: mode === m ? "#fff" : C.muted,
              fontSize: 13, fontWeight: 500, transition: "all 0.2s",
            }}>
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input style={inp} placeholder="Full name" value={name}
              onChange={e => setName(e.target.value)} />
          )}
          <input style={inp} type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
          <input style={inp} type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8,
            background: `${C.rose}18`, color: "#FF9DB5", fontSize: 13, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button onClick={handle} style={{
          marginTop: 20, width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: `linear-gradient(135deg, ${C.accent}, #9C6FFF)`,
          color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
          boxShadow: `0 8px 24px ${C.accent}44`, transition: "opacity 0.15s",
        }}>
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </div>
    </div>
  );
}

function ChatApp({ currentUser, allUsers, onLogout }) {
  const others = allUsers.filter(u => u.id !== currentUser.id);
  const [activeId, setActiveId] = useState(others[0]?.id || null);
  const [threads, setThreads] = useState(() => LS.get("wave_threads", {}));
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef(null);

  const activeUser = allUsers.find(u => u.id === activeId);
  const key = activeId ? threadKey(currentUser.id, activeId) : null;
  const messages = key ? (threads[key] || []) : [];
  const filtered = others.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function saveThreads(updated) {
    setThreads(updated);
    LS.set("wave_threads", updated);
  }

  function send() {
    if (!input.trim() || !activeId) return;
    const msg = { from: currentUser.id, text: input.trim(), ts: getTime() };
    const updated = { ...threads, [key]: [...(threads[key] || []), msg] };
    saveThreads(updated);
    setInput("");
    setTimeout(() => {
      const reply = { from: activeId, text: REPLIES[Math.floor(Math.random() * REPLIES.length)], ts: getTime() };
      setThreads(t => {
        const next = { ...t, [key]: [...(t[key] || []), reply] };
        LS.set("wave_threads", next);
        return next;
      });
    }, 1000 + Math.random() * 800);
  }

  function lastMsg(uid) {
    const msgs = threads[threadKey(currentUser.id, uid)] || [];
    return msgs[msgs.length - 1];
  }

  return (
    <div style={{
      display: "flex", height: "100vh", fontFamily: "'Inter', system-ui, sans-serif",
      background: C.bg, color: C.text, overflow: "hidden",
    }}>
      {/* Sidebar */}
      <div style={{
        width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
        background: C.surface, borderRight: `1px solid ${C.border}`,
      }}>
        <div style={{
          padding: "20px 18px 16px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Avatar user={currentUser} size={42} ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{currentUser.name}</div>
            <div style={{ fontSize: 11, color: C.online, marginTop: 2 }}>● Active</div>
          </div>
          <button onClick={onLogout} title="Log out" style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, fontSize: 18, padding: 4, borderRadius: 6,
          }}>⇠</button>
        </div>

        <div style={{ padding: "14px 18px 8px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: `linear-gradient(135deg, ${C.accent}, ${C.rose})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
          }}>💬</div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", color: C.text }}>Wave</span>
        </div>

        <div style={{ padding: "0 12px 10px" }}>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…"
              style={{
                width: "100%", padding: "9px 12px 9px 34px",
                background: "#ffffff08", border: `1px solid ${C.border}`,
                borderRadius: 10, color: C.text, fontSize: 13, outline: "none",
              }} />
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              color: C.muted, fontSize: 14, pointerEvents: "none" }}>🔍</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {others.length === 0 && (
            <div style={{ padding: "32px 20px", color: C.muted, fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>
              No other users yet.<br />Share the app so others can sign up.
            </div>
          )}
          {filtered.length === 0 && others.length > 0 && (
            <div style={{ padding: "24px 18px", color: C.muted, fontSize: 13, textAlign: "center" }}>No one found</div>
          )}
          {filtered.map(u => {
            const lm = lastMsg(u.id);
            const isActive = u.id === activeId;
            return (
              <div key={u.id} onClick={() => setActiveId(u.id)} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", cursor: "pointer",
                background: isActive ? `${C.accent}18` : "transparent",
                borderLeft: isActive ? `3px solid ${C.accent}` : "3px solid transparent",
                transition: "background 0.15s",
              }}>
                <Avatar user={u} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</span>
                    {lm && <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{lm.ts}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lm ? (lm.from === currentUser.id ? `You: ${lm.text}` : lm.text) : "No messages yet"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      {activeUser ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 14, background: C.surface,
          }}>
            <Avatar user={activeUser} size={44} ring />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>{activeUser.name}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {["📞", "📹", "ℹ️"].map((icon, i) => (
                <button key={i} style={{
                  background: "#ffffff08", border: `1px solid ${C.border}`,
                  borderRadius: 10, width: 38, height: 38, cursor: "pointer", fontSize: 16,
                }}>{icon}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px",
            display: "flex", flexDirection: "column", gap: 4 }}>
            {messages.length === 0 && (
              <div style={{ margin: "auto", textAlign: "center", color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
                <div style={{ fontSize: 14 }}>Say hi to {activeUser.name}!</div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.from === currentUser.id;
              const sender = allUsers.find(u => u.id === msg.from);
              const prev = messages[i - 1];
              const showAvatar = !isMine && (!prev || prev.from !== msg.from);
              return (
                <div key={i} style={{
                  display: "flex", flexDirection: isMine ? "row-reverse" : "row",
                  alignItems: "flex-end", gap: 8, marginTop: showAvatar ? 10 : 2,
                }}>
                  {!isMine && (
                    <div style={{ width: 30, flexShrink: 0 }}>
                      {showAvatar && <Avatar user={sender} size={30} />}
                    </div>
                  )}
                  <div style={{ maxWidth: "62%", display: "flex", flexDirection: "column",
                    alignItems: isMine ? "flex-end" : "flex-start" }}>
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isMine ? `linear-gradient(135deg, ${C.accent}, #9C6FFF)` : C.card,
                      border: isMine ? "none" : `1px solid ${C.border}`,
                      fontSize: 14, lineHeight: 1.5, color: "#fff",
                      boxShadow: isMine ? `0 4px 16px ${C.accent}33` : "none",
                    }}>{msg.text}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 4,
                      fontFamily: "monospace", padding: "0 4px" }}>{msg.ts}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`,
            display: "flex", gap: 10, alignItems: "center", background: C.surface }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={`Message ${activeUser.name}…`}
              style={{
                flex: 1, padding: "11px 16px", borderRadius: 14,
                border: `1px solid ${C.border}`, background: "#ffffff08",
                color: C.text, fontSize: 14, outline: "none",
              }} />
            <button onClick={send} disabled={!input.trim()} style={{
              width: 42, height: 42, borderRadius: 12, border: "none", cursor: "pointer",
              background: input.trim() ? `linear-gradient(135deg, ${C.accent}, #9C6FFF)` : "#ffffff10",
              color: "#fff", fontSize: 18, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              boxShadow: input.trim() ? `0 4px 16px ${C.accent}44` : "none",
              transition: "all 0.2s",
            }}>➤</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12, color: C.muted }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: C.text }}>
            {others.length === 0 ? "You're the first one here" : "Select a conversation"}
          </div>
          <div style={{ fontSize: 13 }}>
            {others.length === 0 ? "Share the app so others can sign up and appear here." : "Pick someone from the sidebar to start chatting"}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    const users = LS.get("wave_users", []);
    const savedId = LS.get("wave_session");
    if (savedId) {
      const user = users.find(u => u.id === savedId);
      if (user) return { user, allUsers: users };
    }
    return null;
  });

  function handleAuth(user, allUsers) { setSession({ user, allUsers }); }
  function handleLogout() { LS.del("wave_session"); setSession(null); }

  if (!session) return <AuthScreen onAuth={handleAuth} />;
  return <ChatApp currentUser={session.user} allUsers={session.allUsers} onLogout={handleLogout} />;
}
