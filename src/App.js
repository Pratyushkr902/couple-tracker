import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase'; 
import { ref, push, set, onValue, remove, update, limitToLast, query, serverTimestamp } from "firebase/database";
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
  
  // New States: Milestones & Typing
  const [milestone, setMilestone] = useState("");
  const [milestones, setMilestones] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  // Chat States
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
            
            // Sync Moods
            onValue(ref(db, `couples/${code}/moods`), (s) => {
              const moods = s.val();
              if (moods) {
                const pId = Object.keys(moods).find(id => id !== currentUser.uid);
                if (pId) setPartnerMood(moods[pId]);
                setMyMood(moods[currentUser.uid] || "🤍");
              }
            });

            // Sync Typing Status
            onValue(ref(db, `couples/${code}/typing`), (s) => {
              const typingData = s.val();
              if (typingData) {
                const pId = Object.keys(typingData).find(id => id !== currentUser.uid);
                setIsPartnerTyping(typingData[pId] || false);
              }
            });

            // Sync Chat
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

  // Update Typing Status
  const handleTyping = (val) => {
    setChatMsg(val);
    set(ref(db, `couples/${coupleCode}/typing/${user.uid}`), val.length > 0);
    // Auto-clear typing after 3 seconds of no input
    setTimeout(() => {
        set(ref(db, `couples/${coupleCode}/typing/${user.uid}`), false);
    }, 3000);
  };

  const sendNudge = () => {
    push(ref(db, `couples/${coupleCode}/chats`), {
      text: "👋 I'm thinking of you right now!",
      sender: user.uid,
      timestamp: serverTimestamp()
    });
    alert("Nudge sent! 💓");
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    set(ref(db, `couples/${coupleCode}/typing/${user.uid}`), false);
    await push(ref(db, `couples/${coupleCode}/chats`), {
      text: chatMsg,
      sender: user.uid,
      timestamp: serverTimestamp()
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

  if (!user) {
    return (
      <div className="container">
        <div className="logo-container"><div className="heart-link"><div className="heart heart-1"></div><div className="heart heart-2"></div></div><h1 className="logo-text">Bondify</h1></div>
        <div className="card shadow-glass login-card">
          <h2 style={{color: 'white', marginBottom: '20px'}}>{isLogin ? "Welcome Back" : "Join the Love"}</h2>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={{marginTop:'10px'}} />
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
        <div className="card"><h3>Connect Hearts 🔗</h3><input value={tempCode} placeholder="Secret Code" onChange={(e) => setTempCode(e.target.value)} /><button onClick={() => set(ref(db, `users/${user.uid}/coupleCode`), tempCode.toLowerCase().trim())}>Link with Partner</button></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="user-bar"><span>🔒 {coupleCode}</span><button className="logout-btn" onClick={() => signOut(auth)}>Logout</button></div>
      
      <div className="stats-badge">Day {diffInDays} of Us ✨</div>
      
      <div className="quick-actions">
        <button className="nudge-btn" onClick={sendNudge}>Send Nudge 💓</button>
      </div>

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
          {isPartnerTyping && <div className="typing-indicator">Your partner is typing... ✍️</div>}
          <div className="chat-window">
            {messages.map((m, i) => (
              <div key={i} className={`msg-bubble ${m.sender === user.uid ? "msg-me" : "msg-partner"}`}>
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-area" onSubmit={sendChatMessage}>
            <input value={chatMsg} onChange={(e) => handleTyping(e.target.value)} placeholder="Type a message..." />
            <button type="submit">🕊️</button>
          </form>
        </div>
      </div>

      <div className="card goal-tracker">
        <h3>Shared Milestones 🏆</h3>
        <div className="progress-bar-container">
            <div className="progress-bar" style={{width: `${(milestones.filter(m => m.completed).length / milestones.length) * 100 || 0}%`}}></div>
        </div>
        <div className="flex-row"><input value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Add a new goal..." /><button onClick={() => { if(!milestone) return; push(ref(db, `couples/${coupleCode}/milestones`), { text: milestone, completed: false }); setMilestone(""); }} style={{width: '60px'}}>+</button></div>
        <div className="milestone-list">
          {milestones.map((m) => (
            <div key={m.id} className={`milestone-item ${m.completed ? 'is-done' : ''}`} onClick={() => update(ref(db, `couples/${coupleCode}/milestones/${m.id}`), { completed: !m.completed })}>
              <span>{m.completed ? "✅" : "⏳"}</span> {m.text}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="actual-q">"{currentQuestion}"</p>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Today's thought..." />
        <div className="flex-row"><input value={pro} onChange={(e) => setPro(e.target.value)} placeholder="Pro (+)" /><input value={con} onChange={(e) => setCon(e.target.value)} placeholder="Con (-)" /></div>
        <button onClick={() => { if(!answer) return; push(ref(db, `couples/${coupleCode}/logs`), { user: user.email.split('@')[0], date: new Date().toLocaleDateString(), question: currentQuestion, answer, pro, con, timestamp: serverTimestamp() }); setAnswer(""); setPro(""); setCon(""); }}>Save Memory</button>
      </div>

      <div className="card vibe-card">
        <h3>Our Vibes 🎵</h3>
        <div className="flex-row"><input value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="Spotify Link" /><button onClick={() => { if(!songLink) return; push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink.trim(), user: user.email.split('@')[0], timestamp: serverTimestamp() }); setSongLink(""); }}>+</button></div>
        <div className="playlist-list">
          {playlist.map((s) => (
            <div key={s.id} className="song-item">
                <span>{s.user}'s Pick</span>
                <a href={s.link} target="_blank" rel="noreferrer">Listen ▶</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default App;