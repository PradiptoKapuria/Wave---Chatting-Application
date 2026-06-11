/**
 * Wave — WhatsApp-style chat app
 *
 * SETUP (one-time, ~5 minutes):
 * 1. Go to https://supabase.com → create a free project
 * 2. In the SQL Editor, run the schema below
 * 3. Go to Project Settings → API → copy your Project URL and anon key
 * 4. Paste them into SUPABASE_URL and SUPABASE_ANON_KEY below
 *
 * SQL SCHEMA (run in Supabase SQL Editor):
 * ─────────────────────────────────────────
 * create table users (
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null,
 *   email text unique not null,
 *   password text not null,
 *   avatar text not null,
 *   color text not null,
 *   created_at timestamptz default now()
 * );
 *
 * create table messages (
 *   id uuid primary key default gen_random_uuid(),
 *   from_id uuid references users(id),
 *   to_id uuid references users(id),
 *   text text not null,
 *   created_at timestamptz default now()
 * );
 *
 * -- Allow public read/write (for demo; lock down in production)
 * alter table users enable row level security;
 * alter table messages enable row level security;
 * create policy "public access" on users for all using (true) with check (true);
 * create policy "public access" on messages for all using (true) with check (true);
 * ─────────────────────────────────────────
 */

import { useState, useRef, useEffect } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── 🔧 CONFIGURE THESE ───────────────────────────────────────────────────────
const SUPABASE_URL  = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const C = {
  bg: "#0D0F1A", surface: "#13162B", card: "#1A1E35",
  border: "#ffffff12", accent: "#7C6FFF", rose: "#FF6B9D",
  text: "#E8EAF6", muted: "#6B7280", online: "#34D399", danger: "#FF6B9D",
};

const PALETTE = ["#7C6FFF","#FF6B9D","#34D399","#FBBF24","#60A5FA","#F472B6","#FB923C","#A78BFA"];

const LS = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

function getTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.getHours().toString().padStart(2,"0") + ":" + d.getMinutes().toString().padStart(2,"0");
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 40, ring = false }) {
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
    </div>
  );
}

// ── Config warning banner ─────────────────────────────────────────────────────
function NotConfigured() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{
        maxWidth: 520, background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "36px 32px", color: C.text,
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚙️</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Supabase not configured</div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
          Wave needs a Supabase backend so all users share the same database.
          Follow these steps to get started:
        </div>
        {[
          ["1", "Go to supabase.com and create a free project"],
          ["2", "Open the SQL Editor and run the schema from the comments at the top of ChatApp.jsx"],
          ["3", "Go to Project Settings → API and copy your Project URL and anon key"],
          ["4", "Paste them into SUPABASE_URL and SUPABASE_ANON_KEY in ChatApp.jsx"],
        ].map(([n, text]) => (
          <div key={n} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1,
              background: `${C.accent}33`, color: C.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
            }}>{n}</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{text}</div>
          </div>
        ))}
        <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{
          display: "inline-block", marginTop: 8, padding: "11px 22px", borderRadius: 10,
          background: `linear-gradient(135deg, ${C.accent}, #9C6FFF)`,
          color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
        }}>Open Supabase →</a>
      </div>
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const { data, error: err } = await supabase
          .from("users").select("*")
          .eq("email", email.toLowerCase()).eq("password", password).single();
        if (err || !data) { setError("Incorrect email or password."); return; }
        LS.set("wave_session", data.id);
        onAuth(data);
      } else {
        if (!name.trim() || !email.trim() || !password.trim()) { setError("All fields are required."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        const { data: existing } = await supabase.from("users").select("id").eq("email", email.toLowerCase()).single();
        if (existing) { setError("An account with that email already exists."); return; }
        const initials = name.trim().split(" ").map(w => w[0].toUpperCase()).join("").slice(0, 2);
        const { data: allUsers } = await supabase.from("users").select("id");
        const color = PALETTE[(allUsers?.length || 0) % PALETTE.length];
        const { data, error: err } = await supabase.from("users")
          .insert({ name: name.trim(), email: email.toLowerCase(), password, avatar: initials, color })
          .select().single();
        if (err || !data) { setError("Sign up failed. Try again."); return; }
        LS.set("wave_session", data.id);
        onAuth(data);
      }
    } finally { setLoading(false); }
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
        boxShadow: "0 32px 64px #00000055",
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
          {["login","signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              background: mode === m ? C.accent : "transparent",
              color: mode === m ? "#fff" : C.muted,
              fontSize: 13, fontWeight: 500, transition: "all 0.2s",
            }}>{m === "login" ? "Log in" : "Sign up"}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input style={inp} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
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

        <button onClick={handle} disabled={loading} style={{
          marginTop: 20, width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: loading ? "#ffffff18" : `linear-gradient(135deg, ${C.accent}, #9C6FFF)`,
          color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "default" : "pointer",
          boxShadow: loading ? "none" : `0 8px 24px ${C.accent}44`,
        }}>
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </div>
    </div>
  );
}

// ── Chat App ──────────────────────────────────────────────────────────────────
function ChatApp({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef(null);

  // Load all other users
  useEffect(() => {
    supabase.from("users").select("*").neq("id", currentUser.id)
      .then(({ data }) => {
        if (data) setUsers(data);
      });
  }, [currentUser.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeId) return;
    supabase.from("messages").select("*")
      .or(`and(from_id.eq.${currentUser.id},to_id.eq.${activeId}),and(from_id.eq.${activeId},to_id.eq.${currentUser.id})`)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    // Real-time subscription
    const channel = supabase.channel(`chat_${[currentUser.id, activeId].sort().join("_")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new;
        if ((msg.from_id === currentUser.id && msg.to_id === activeId) ||
            (msg.from_id === activeId && msg.to_id === currentUser.id)) {
          setMessages(prev => [...prev, msg]);
        }
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeId, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || !activeId) return;
    const text = input.trim();
    setInput("");
    await supabase.from("messages").insert({ from_id: currentUser.id, to_id: activeId, text });
  }

  const activeUser = users.find(u => u.id === activeId);
  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  function lastMsg(uid) {
    // We don't cache per-contact here for simplicity; show name only
    return null;
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
        <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12 }}>
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
          {users.length === 0 && (
            <div style={{ padding: "32px 20px", color: C.muted, fontSize: 13, textAlign: "center", lineHeight: 1.7 }}>
              No other users yet.<br />Others will appear here once they sign up.
            </div>
          )}
          {filtered.map(u => (
            <div key={u.id} onClick={() => setActiveId(u.id)} style={{
              display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", cursor: "pointer",
              background: activeId === u.id ? `${C.accent}18` : "transparent",
              borderLeft: activeId === u.id ? `3px solid ${C.accent}` : "3px solid transparent",
              transition: "background 0.15s",
            }}>
              <Avatar user={u} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{u.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {activeUser ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 14, background: C.surface }}>
            <Avatar user={activeUser} size={44} ring />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>{activeUser.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{activeUser.email}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {["📞","📹","ℹ️"].map((icon, i) => (
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
              const isMine = msg.from_id === currentUser.id;
              const prev = messages[i - 1];
              const showAvatar = !isMine && (!prev || prev.from_id !== msg.from_id);
              return (
                <div key={msg.id} style={{
                  display: "flex", flexDirection: isMine ? "row-reverse" : "row",
                  alignItems: "flex-end", gap: 8, marginTop: showAvatar ? 10 : 2,
                }}>
                  {!isMine && (
                    <div style={{ width: 30, flexShrink: 0 }}>
                      {showAvatar && <Avatar user={activeUser} size={30} />}
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
                      fontFamily: "monospace", padding: "0 4px" }}>{getTime(msg.created_at)}</div>
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
            {users.length === 0 ? "You're the first one here" : "Select a conversation"}
          </div>
          <div style={{ fontSize: 13, textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
            {users.length === 0
              ? "Share this app with others so they can sign up and appear here."
              : "Pick someone from the sidebar to start chatting"}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const isConfigured = SUPABASE_URL !== "YOUR_SUPABASE_URL";

  const [currentUser, setCurrentUser] = useState(() => {
    if (!isConfigured) return null;
    const savedId = LS.get("wave_session");
    // We restore the full user object from a separate key
    return savedId ? LS.get(`wave_user_${savedId}`) : null;
  });

  if (!isConfigured) return <NotConfigured />;

  function handleAuth(user) {
    LS.set(`wave_user_${user.id}`, user);
    setCurrentUser(user);
  }

  function handleLogout() {
    LS.del("wave_session");
    setCurrentUser(null);
  }

  if (!currentUser) return <AuthScreen onAuth={handleAuth} />;
  return <ChatApp currentUser={currentUser} onLogout={handleLogout} />;
}