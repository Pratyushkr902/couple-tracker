import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase'; 
import { ref, push, set, onValue, remove, update, limitToLast, query } from "firebase/database";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail 
} from "firebase/auth";
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [coupleCode, setCoupleCode] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // App States
  const [pro, setPro] = useState("");
  const [con, setCon] = useState("");
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState([]);
  const [songLink, setSongLink] = useState("");
  const [playlist, setPlaylist] = useState([]);
  const [myMood, setMyMood] = useState("🤍");
  const [partnerMood, setPartnerMood] = useState("🤍");
  const [note, setNote] = useState(""); 
  const [displayNote, setDisplayNote] = useState(""); 
  const [capsuleMessage, setCapsuleMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [capsules, setCapsules] = useState([]);
  const [milestone, setMilestone] = useState("");
  const [milestones, setMilestones] = useState([]);

  // NEW: Chat States
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  const ANNIVERSARY_DATE = "2024-01-01"; 
  const dailyQuestions = ["What was your first impression of me?", "What is one thing I did this week that made you smile?", "Where should our next dream date be?", "What song reminds you of us?", "What is your favorite quality about me?"];

  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const currentQuestion = dailyQuestions[dayOfYear % dailyQuestions.length];
  const diffInDays = Math.floor((new Date().getTime() - new Date(ANNIVERSARY_DATE).getTime()) / (1000 * 3600 * 24));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        onValue(ref(db, `users/${currentUser.uid}/coupleCode`), (snapshot) => {
          const code = snapshot.val();
          setCoupleCode(code);
          if (code) {
            onValue(ref(db, `couples/${code}/logs`), (s) => setHistory(s.val() ? Object.values(s.val()).reverse() : []));
            onValue(ref(db, `couples/${code}/playlist`), (s) => {
              const data = s.val();
              setPlaylist(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse() : []);
            });
            onValue(ref(db, `couples/${code}/milestones`), (s) => {
              const data = s.val();
              setMilestones(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse() : []);
            });
            onValue(ref(db, `couples/${code}/capsules`), (s) => setCapsules(s.val() ? Object.values(s.val()) : []));
            
            // Sync Moods
            onValue(ref(db, `couples/${code}/moods`), (s) => {
              const moods = s.val();
              if (moods) {
                const pId = Object.keys(moods).find(id => id !== currentUser.uid);
                if (pId) setPartnerMood(moods[pId]);
                setMyMood(moods[currentUser.uid] || "🤍");
              }
            });

            // Sync Chat Messages (Limit to last 50 for speed)
            const chatQuery = query(ref(db, `couples/${code}/chats`), limitToLast(50));
            onValue(chatQuery, (s) => {
              const data = s.val();
              setMessages(data ? Object.values(data) : []);
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            });

            onValue(ref(db, `couples/${code}/notes`), (s) => {
              const notes = s.val();
              if (notes) {
                const pId = Object.keys(notes).find(id => id !== currentUser.uid);
                if (pId) setDisplayNote(notes[pId]);
              }
            });
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    await push(ref(db, `couples/${coupleCode}/chats`), {
      text: chatMsg,
      sender: user.uid,
      timestamp: Date.now()
    });
    setChatMsg("");
  };

  const handleAuth = async () => {
    if (!email || !password) return alert("Please fill in all fields");
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { alert(err.message); }
  };

  const handleResetPassword = async () => {
    if (!email) return alert("Please enter your email address first!");
    try { await sendPasswordResetEmail(auth, email); alert("Password reset email sent! 📧"); } catch (err) { alert(err.message); }
  };

  const addMilestone = async () => {
    if (!milestone) return;
    await push(ref(db, `couples/${coupleCode}/milestones`), { text: milestone, completed: false, timestamp: Date.now() });
    setMilestone("");
  };

  if (!user) {
    return (
      <div className="container">
        <div className="logo-container"><div className="heart-link"><div className="heart heart-1"></div><div className="heart heart-2"></div></div><h1 className="logo-text">Bondify</h1></div>
        <div className="card shadow-glass login-card">
          <h2 style={{color: 'white', marginBottom: '20px'}}>{isLogin ? "Welcome Back" : "Join the Love"}</h2>
          <input type="email" value={email || ""} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" />
          <input type="password" value={password || ""} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={{marginTop:'10px'}} />
          <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <button onClick={handleAuth} style={{background: isLogin ? 'linear-gradient(45deg, #ff758c, #ff7eb3)' : '#2ecc71', fontWeight: 'bold', color: 'white'}}>{isLogin ? "Login" : "Create Our Account ✨"}</button>
            <button onClick={() => setIsLogin(!isLogin)} style={{background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: '0.8rem', borderRadius: '25px', backdropFilter: 'blur(10px)'}}>{isLogin ? "New user? Create Our Account" : "Back to Login"}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!coupleCode) {
    return (
      <div className="container">
        <div className="logo-container"><div className="heart-link"><div className="heart heart-1"></div><div className="heart heart-2"></div></div><h1 className="logo-text">Bondify</h1></div>
        <div className="card"><h3>Connect Hearts 🔗</h3><input value={tempCode || ""} placeholder="Secret Code" onChange={(e) => setTempCode(e.target.value)} /><button onClick={() => set(ref(db, `users/${user.uid}/coupleCode`), tempCode.toLowerCase().trim())}>Link with Partner</button></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="user-bar"><span>🔒 {coupleCode}</span><button className="logout-btn" onClick={() => signOut(auth)}>Logout</button></div>
      <div className="stats-badge">Day {diffInDays} of Us ✨</div>
      <div className="logo-container"><div className="heart-link"><div className="heart heart-1"></div><div className="heart heart-2"></div></div><h1 className="logo-text">Bondify</h1></div>

      {/* MOOD & CHAT BOX COMBINED */}
      <div className="card mood-card">
        <div className="mood-display">
          <div className="mood-box">
            <span>My Mood</span>
            <div className="emoji-picker">{["❤️", "💖", "💙", "😴", "😊"].map(e => (<button key={e} onClick={() => set(ref(db, `couples/${coupleCode}/moods/${user.uid}`), e)} className={myMood === e ? "active-mood" : ""}>{e}</button>))}</div>
          </div>
          <div className="mood-divider"></div>
          <div className="mood-box"><span>Partner's</span><div className="partner-emoji">{partnerMood}</div></div>
        </div>

        <div className="chat-container">
          <div className="chat-window">
            {messages.map((m, i) => (
              <div key={i} className={`msg-bubble ${m.sender === user.uid ? "msg-me" : "msg-partner"}`}>
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-area" onSubmit={sendChatMessage}>
            <input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Type a message..." />
            <button type="submit">🕊️</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3>Relationship Milestones 🏆</h3>
        <div className="flex-row"><input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Next date idea?" /><button onClick={addMilestone} style={{width: '60px'}}>+</button></div>
        <div style={{marginTop: '15px', textAlign: 'left'}}>
          {milestones.map((m) => (
            <div key={m.id} style={{padding: '10px', background: m.completed ? 'rgba(46, 204, 113, 0.1)' : 'white', borderRadius: '10px', marginBottom: '8px', borderLeft: m.completed ? '4px solid #2ecc71' : '4px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div onClick={() => update(ref(db, `couples/${coupleCode}/milestones/${m.id}`), { completed: !m.completed })} style={{cursor: 'pointer', flexGrow: 1, textDecoration: m.completed ? 'line-through' : 'none'}}>
                <span>{m.completed ? "✅ " : "⏳ "}</span>{m.text}
              </div>
              <button onClick={() => remove(ref(db, `couples/${coupleCode}/milestones/${m.id}`))} style={{width: 'auto', background: 'transparent', color: '#ff758c', boxShadow: 'none'}}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Send a Love Note 💌</h3>
        <input value={note || ""} onChange={(e) => setNote(e.target.value)} placeholder="Type something sweet..." />
        <button onClick={() => { if(!note) return; set(ref(db, `couples/${coupleCode}/notes/${user.uid}`), note); setNote(""); alert("Sent!"); }}>Send Note</button>
      </div>

      {displayNote && (
        <div className="card note-card-display">
          <small>A note from your partner: 💌</small><p>"{displayNote}"</p>
          <button className="clear-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/notes`))}>Read & Clear</button>
        </div>
      )}

      <div className="card">
        <p className="actual-q">"{currentQuestion}"</p>
        <textarea value={answer || ""} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer..." />
        <div className="flex-row"><input value={pro || ""} onChange={(e) => setPro(e.target.value)} placeholder="Pro (+)" /><input value={con || ""} onChange={(e) => setCon(e.target.value)} placeholder="Con (-)" /></div>
        <button onClick={() => { if(!answer) return; push(ref(db, `couples/${coupleCode}/logs`), { user: user.email.split('@')[0], date: new Date().toLocaleDateString(), question: currentQuestion, answer, pro, con, timestamp: Date.now() }); setAnswer(""); setPro(""); setCon(""); }}>Save Memory</button>
      </div>

      <div className="card">
        <h3>Our Vibes 🎵</h3>
        <div className="flex-row"><input value={songLink || ""} onChange={(e) => setSongLink(e.target.value)} placeholder="Spotify link..." /><button onClick={() => { if(!songLink) return; push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink.trim(), user: user.email.split('@')[0], timestamp: Date.now() }); setSongLink(""); }}>+</button></div>
        <div className="playlist-list" style={{marginTop:'15px'}}>
          {playlist.map((s) => (
            <div key={s.id} className="song-item" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '8px', padding: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '12px'}}>
              <div style={{textAlign: 'left'}}><small>{s.user}'s Pick:</small><div>Shared Vibe</div></div>
              <a href={s.link} target="_blank" rel="noreferrer" style={{textDecoration:'none', background:'var(--primary-pink)', color:'white', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem'}}>▶ Play</a>
            </div>
          ))}
        </div>
      </div>

      <div className="history-section"><h2>Our Journey 📖</h2>{history.map((item, i) => (<div key={i} className="history-card"><div className="h-card-header"><span>{item.date}</span><span>by {item.user}</span></div><p className="h-question">Q: {item.question}</p><p className="h-answer">"{item.answer}"</p></div>))}</div>
    </div>
  );
}
export default App;