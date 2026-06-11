import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
//   🔧 PASTE YOUR SUPABASE CREDENTIALS HERE
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://qsvnvjmuiowtfmwkdkod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HZDcBfWpWKVWxFqT8GJdPg_0Smq6m8r";

const isConfigured = () =>
  SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabase = isConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ── Design tokens ─────────────────────────────────────────────────────────────
const G = "#00FF41";
const G_DIM = "#00cc33";
const BLACK = "#000000";
const SURFACE = "#0a0a0a";
const SURFACE2 = "#111111";
const BORDER = "#1c1c1c";
const TEXT = "#e8e8e8";
const MUTED = "#444";
const FONT = "'Space Mono', 'Courier New', monospace";

const AVATAR_PALETTE = ["#00FF41", "#00e87a", "#00ffb3", "#39ff14", "#ccff00"];
const avatarColor = (id = "") => AVATAR_PALETTE[id.charCodeAt(0) % AVATAR_PALETTE.length];
const initials = (name = "") => (name.trim().slice(0, 2) || "??").toUpperCase();
const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const chatId = (a, b) => [a, b].sort().join("__");

// ── Global style injection ─────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; color: ${TEXT}; font-family: ${FONT}; overflow: hidden; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #333; }
  input::placeholder { color: #2e2e2e; letter-spacing: 1px; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 ${G}44} 50%{box-shadow:0 0 0 6px ${G}00} }
  .msg-in  { animation: fadeIn 0.18s ease; }
  .msg-out { animation: fadeIn 0.18s ease; }
  .user-row:hover { background: #0c0c0c !important; }
  .send-btn:hover { opacity: 1 !important; }
  .back-btn:hover { color: #fff !important; border-color: #444 !important; }
  .logout-btn:hover { color: #ff4444 !important; border-color: #ff4444 !important; }
  .tab-btn.active { color: ${G}; border-bottom: 1px solid ${G}; }
`;

function GlobalStyle() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

// ── Setup banner ───────────────────────────────────────────────────────────────
function SetupBanner() {
  return (
    <div style={{ minHeight:"100vh", background:BLACK, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT, padding:24 }}>
      <div style={{ maxWidth:480, border:`1px solid #ff8800`, background:"#0f0800", padding:"32px 28px", lineHeight:1.9 }}>
        <div style={{ color:G, fontWeight:700, fontSize:16, letterSpacing:4, marginBottom:16 }}>⚙ SETUP REQUIRED</div>
        <div style={{ color:"#cc8800", fontSize:12, letterSpacing:1 }}>
          NeonChat runs on <b style={{color:"#ffaa33"}}>Supabase</b> — free for small groups.
        </div>
        <pre style={{ marginTop:12, background:"#0d0d0d", border:`1px solid #222`, padding:"14px 12px", fontSize:10, color:"#aaffaa", overflowX:"auto", lineHeight:1.7 }}>{`-- Run SQL commands in your Supabase Editor`}</pre>
      </div>
    </div>
  );
}

// ── Reusable input ────────────────────────────────────────────────────────────
function Field({ label, type="text", value, onChange, onEnter, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      {label && <div style={{ fontSize:10, letterSpacing:3, color:MUTED, marginBottom:6, textTransform:"uppercase" }}>{label}</div>}
      <input
        autoFocus={autoFocus}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onEnter?.()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width:"100%", background:SURFACE2, border:`1px solid ${focused ? G : BORDER}`,
          color:TEXT, padding:"10px 12px", fontSize:13, fontFamily:FONT,
          outline:"none", letterSpacing:0.5, caretColor:G,
          transition:"border-color 0.15s",
        }}
      />
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onUser }) {
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email || !pass || (tab === "signup" && !username)) { setErr("All fields required."); return; }
    if (tab === "signup" && username.length < 3) { setErr("Username must be at least 3 characters."); return; }
    setBusy(true);
    try {
      if (tab === "signup") {
        const { data: existing } = await supabase
          .from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle();
        if (existing) { setErr("Username already taken."); setBusy(false); return; }

        const { data, error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
        const uid = data.user?.id;
        if (uid) {
          const { error: pe } = await supabase.from("profiles").insert({ id: uid, username: username.toLowerCase() });
          if (pe) throw pe;
        }
        if (data.session) onUser({ ...data.user, username: username.toLowerCase() });
        else setErr("Check your email to confirm your account, then sign in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", data.user.id).single();
        onUser({ ...data.user, username: profile?.username });
      }
    } catch (e) {
      const msgs = {
        "Invalid login credentials": "Wrong email or password.",
        "User already registered": "Email already in use.",
        "Password should be at least 6 characters": "Password must be 6+ characters.",
      };
      setErr(msgs[e.message] || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:BLACK, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT }}>
      <div style={{ width:360, padding:"36px 32px", border:`1px solid ${BORDER}`, background:SURFACE, boxShadow:`0 0 60px ${G}0d` }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ color:G, fontSize:22, fontWeight:700, letterSpacing:5 }}>
            NEON<span style={{ color:"#fff" }}>CHAT</span>
            <span style={{ display:"inline-block", width:10, height:16, background:G, marginLeft:3, verticalAlign:"middle", animation:"blink 1.1s step-end infinite" }} />
          </div>
          <div style={{ color:"#2a2a2a", fontSize:10, letterSpacing:4, marginTop:4 }}>PRIVATE MESSENGER</div>
        </div>

        <div style={{ display:"flex", borderBottom:`1px solid ${BORDER}`, marginBottom:24 }}>
          {["login","signup"].map(t => (
            <button key={t} className={`tab-btn ${tab===t?"active":""}`} onClick={() => { setTab(t); setErr(""); }}
              style={{ flex:1, background:"none", border:"none", borderBottom:`1px solid transparent`, color:tab===t?G:MUTED,
                padding:"8px 0", fontSize:10, letterSpacing:3, cursor:"pointer", fontFamily:FONT, textTransform:"uppercase" }}>
              {t === "login" ? "SIGN IN" : "SIGN UP"}
            </button>
          ))}
        </div>

        {err && <div style={{ background:"#1a0000", border:`1px solid #440000`, color:"#ff5555", fontSize:11, padding:"9px 12px", marginBottom:16 }}>{err}</div>}

        {tab === "signup" && <Field label="Username" value={username} onChange={setUsername} onEnter={submit} placeholder="lowercase, no spaces" autoFocus />}
        <Field label="Email" type="email" value={email} onChange={setEmail} onEnter={submit} placeholder="you@email.com" autoFocus={tab==="login"} />
        <Field label="Password" type="password" value={pass} onChange={setPass} onEnter={submit} placeholder="min 6 characters" />

        <button onClick={submit} disabled={busy}
          style={{ width:"100%", background:G, color:BLACK, border:"none", padding:"12px", fontSize:11, fontWeight:700, letterSpacing:3, cursor:"pointer", fontFamily:FONT, textTransform:"uppercase", opacity:busy?0.5:1 }}>
          {busy ? "..." : tab === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ uid, name, size=32 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:avatarColor(uid), display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, fontWeight:700, color:BLACK, flexShrink:0, fontFamily:FONT }}>
      {initials(name)}
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────
function ChatPane({ me, peer, onBack, isMobile }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef();
  const cid = peer ? chatId(me.id, peer.id) : null;

  useEffect(() => {
    if (!cid) return;
    supabase.from("messages").select("*").eq("chat_id", cid)
      .order("created_at", { ascending: true }).limit(200)
      .then(({ data }) => setMsgs(data || []));

    const channel = supabase.channel(`chat:${cid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${cid}` }, payload => {
        setMsgs(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [cid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    const body = text.trim();
    if (!body || !cid) return;
    setText("");
    await supabase.from("messages").insert({ chat_id: cid, sender_id: me.id, body });
  };

  if (!peer) {
    return (
      <div style={{ flex:1, display: isMobile ? "none" : "flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:BLACK, color:"#1c1c1c", fontFamily:FONT }}>
        <div style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>⬡</div>
        <div style={{ fontSize:10, letterSpacing:4, textTransform:"uppercase" }}>Select a contact</div>
      </div>
    );
  }

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:BLACK, minWidth:0, height: "100%" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:`1px solid ${BORDER}`, background:SURFACE, flexShrink:0 }}>
        {isMobile && (
          <button className="back-btn" onClick={onBack}
            style={{ background: "none", border: `1px solid #222`, color: MUTED, fontSize: 11, padding: "6px 10px", marginRight: 4, cursor: "pointer", fontFamily: FONT, transition: "color 0.15s" }}>
            ⇽ BACK
          </button>
        )}
        <Avatar uid={peer.id} name={peer.username} size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color:"#fff", fontSize:13, fontWeight:700, letterSpacing:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>@{peer.username}</div>
          <div style={{ color:G, fontSize:9, letterSpacing:3, animation:"pulse 2s infinite" }}>● ONLINE</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 18px", display:"flex", flexDirection:"column", gap:8 }}>
        {msgs.length === 0 && (
          <div style={{ color:"#1a1a1a", fontSize:10, letterSpacing:3, textAlign:"center", marginTop:40 }}>
            NO MESSAGES YET — SAY HELLO
          </div>
        )}
        {msgs.map(m => {
          const mine = m.sender_id === me.id;
          return (
            <div key={m.id} className={mine?"msg-out":"msg-in"} style={{ display:"flex", justifyContent:mine?"flex-end":"flex-start" }}>
              <div style={{ maxWidth: isMobile ? "80%" : "62%" }}>
                <div style={{ background: mine ? G : SURFACE2, color: mine ? BLACK : TEXT, padding:"10px 14px", fontSize:13, lineHeight:1.55, border: mine ? "none" : `1px solid ${BORDER}`, wordBreak:"break-word" }}>{m.body}</div>
                <div style={{ fontSize:9, color:mine?G_DIM:MUTED, marginTop:3, letterSpacing:1, textAlign:mine?"right":"left" }}>{fmtTime(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display:"flex", gap:8, padding:"14px 18px", borderTop:`1px solid ${BORDER}`, background:SURFACE, flexShrink:0 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="type a message..."
          maxLength={2000}
          style={{ flex:1, background:SURFACE2, border:`1px solid ${focused?G:BORDER}`, color:TEXT, padding:"11px 14px", fontSize:13, fontFamily:FONT, outline:"none", caretColor:G, transition:"border-color 0.15s" }}
        />
        <button className="send-btn" onClick={send} style={{ background:G, border:"none", color:BLACK, padding:"11px 16px", fontSize:15, cursor:"pointer", opacity:text.trim()?1:0.35, flexShrink:0 }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ me, activePeer, onPick, isMobile, showSidebarMobile }) {
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState([]);

  useEffect(() => {
    supabase.from("profiles").select("*").neq("id", me.id)
      .then(({ data }) => setRecents(data || []));
  }, [me.id]);

  const filtered = search.trim()
    ? recents.filter(u => u.username.includes(search.toLowerCase().trim()))
    : recents;

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ 
      width: isMobile ? "100%" : "240px", 
      minWidth: isMobile ? "100%" : "200px",
      display: (isMobile && !showSidebarMobile) ? "none" : "flex",
      background:SURFACE, borderRight:`1px solid ${BORDER}`, flexDirection:"column", fontFamily:FONT, height: "100%" 
    }}>
      {/* Header */}
      <div style={{ padding:"18px 16px 14px", borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ color:G, fontSize:13, fontWeight:700, letterSpacing:4 }}>NEONCHAT</span>
        <button className="logout-btn" onClick={logout} style={{ background:"none", border:`1px solid #222`, color:MUTED, fontSize:9, letterSpacing:1, padding:"3px 7px", cursor:"pointer", fontFamily:FONT, textTransform:"uppercase" }}>
          EXIT
        </button>
      </div>

      {/* Me */}
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${BORDER}`, display:"flex", alignItems:"center", gap:10 }}>
        <Avatar uid={me.id} name={me.username} size={30} />
        <div style={{ minWidth:0, flex: 1 }}>
          <div style={{ color:"#ccc", fontSize:11, fontWeight:700, letterSpacing:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>@{me.username}</div>
          <div style={{ color:G_DIM, fontSize:9, letterSpacing:2 }}>YOU</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding:"10px 12px", borderBottom:`1px solid ${BORDER}` }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="FIND SOMEONE..." style={{ width:"100%", background:SURFACE2, border:`1px solid ${BORDER}`, color:TEXT, padding:"7px 10px", fontSize:11, fontFamily:FONT, outline:"none", letterSpacing:2, caretColor:G }} />
      </div>

      {/* User list */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {filtered.map(u => (
          <div key={u.id} className="user-row" onClick={() => onPick(u)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", cursor:"pointer", background: activePeer?.id===u.id ? "#0d1a0d" : "transparent", borderLeft: activePeer?.id===u.id ? `2px solid ${G}` : "2px solid transparent" }}>
            <Avatar uid={u.id} name={u.username} size={28} />
            <div style={{ minWidth:0 }}>
              <div style={{ color: activePeer?.id===u.id ? G : "#ccc", fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                @{u.username}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function NeonChat() {
  const [user, setUser] = useState(undefined);
  const [activePeer, setActivePeer] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 680;
      setIsMobile(mobile);
      if (!mobile) setShowSidebarMobile(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isConfigured()) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
        setUser({ ...session.user, username: profile?.username });
      } else {
        setUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", session.user.id).single();
        setUser({ ...session.user, username: profile?.username });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const selectPeer = (peer) => {
    setActivePeer(peer);
    if (isMobile) {
      setShowSidebarMobile(false);
    }
  };

  const handleBack = () => {
    setShowSidebarMobile(true);
    setActivePeer(null);
  };

  if (!isConfigured()) return <><GlobalStyle /><SetupBanner /></>;
  
  // ── FIX: Keep showing loading state while session recovers, instead of dropping to Auth Screen
  if (user === undefined) return <><GlobalStyle /><div style={{ minHeight:"100vh", background:BLACK, display:"flex", alignItems:"center", justifyContent:"center", color:G, fontFamily:FONT, fontSize:11, letterSpacing:4 }}>LOADING<span style={{ animation:"blink 1s step-end infinite", marginLeft:2 }}>_</span></div></>;
  if (user === null) return <><GlobalStyle /><AuthScreen onUser={setUser} /></>;

  return (
    <>
      <GlobalStyle />
      <div style={{ display:"flex", height:"100vh", width:"100vw", overflow:"hidden", background:BLACK, fontFamily:FONT }}>
        {/* Render Sidebar on Desktop, or conditionally on Mobile */}
        {(!isMobile || showSidebarMobile) && (
          <Sidebar me={user} activePeer={activePeer} onPick={selectPeer} isMobile={isMobile} showSidebarMobile={showSidebarMobile} />
        )}
        
        {/* Render ChatPane on Desktop, or when a user is selected on Mobile */}
        {(!isMobile || !showSidebarMobile) && (
          <ChatPane me={user} peer={activePeer} onBack={handleBack} isMobile={isMobile} />
        )}
      </div>
    </>
  );
}