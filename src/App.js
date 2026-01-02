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
  const [milestone, setMilestone] = useState("");
  const [milestones, setMilestones] = useState([]);
  const [photoUrl, setPhotoUrl] = useState(""); // Photo feature
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [hearts, setHearts] = useState([]); 
  
  const chatEndRef = useRef(null);
  const ANNIVERSARY_DATE = "2024-01-01"; 
  
  const getAnniversaryStats = () => {
    const today = new Date();
    const start = new Date(ANNIVERSARY_DATE);
    const diffTime = Math.abs(today - start);
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const nextAnniversary = new Date(today.getFullYear(), start.getMonth(), start.getDate());
    if (today > nextAnniversary) nextAnniversary.setFullYear(today.getFullYear() + 1);
    const daysUntil = Math.ceil((nextAnniversary - today) / (1000 * 60 * 60 * 24));
    const isAnniversaryToday = today.getMonth() === start.getMonth() && today.getDate() === start.getDate();
    return { totalDays, daysUntil, isAnniversaryToday };
  };

  const { totalDays, daysUntil, isAnniversaryToday } = getAnniversaryStats();
  const dailyQuestions = ["What was your first impression of me?", "What is one thing I did this week that made you smile?", "Where should our next dream date be?", "What is your favorite quality about me?"];
  const currentQuestion = dailyQuestions[Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000) % dailyQuestions.length];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        onValue(ref(db, `users/${currentUser.uid}/coupleCode`), (snapshot) => {
          const code = snapshot.val();
          setCoupleCode(code);
          if (code) {
            onValue(ref(db, `couples/${code}/logs`), (s) => setHistory(s.val() ? Object.values(s.val()).reverse() : []));
            onValue(ref(db, `couples/${code}/playlist`), (s) => setPlaylist(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/milestones`), (s) => setMilestones(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/moods`), (s) => {
              if (s.val()) {
                const pId = Object.keys(s.val()).find(id => id !== currentUser.uid);
                if (pId) setPartnerMood(s.val()[pId]);
                setMyMood(s.val()[currentUser.uid] || "🤍");
              }
            });
            onValue(ref(db, `couples/${code}/typing`), (s) => {
              const typingData = s.val();
              if (typingData) {
                const pId = Object.keys(typingData).find(id => id !== currentUser.uid);
                setIsPartnerTyping(typingData[pId] || false);
              }
            });
            onValue(ref(db, `couples/${code}/reactions`), (s) => { if(s.val()) triggerLocalHearts(); });
            const chatQuery = query(ref(db, `couples/${code}/chats`), limitToLast(30));
            onValue(chatQuery, (s) => {
              setMessages(s.val() ? Object.values(s.val()) : []);
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            });
            onValue(ref(db, `couples/${code}/notes`), (s) => {
              if (s.val()) {
                const pId = Object.keys(s.val()).find(id => id !== currentUser.uid);
                if (pId) setDisplayNote(s.val()[pId]);
              }
            });
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const triggerLocalHearts = () => {
    const newHeart = { id: Date.now(), left: Math.random() * 80 + 10 };
    setHearts(prev => [...prev, newHeart]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== newHeart.id)), 3000);
  };

  const handleTyping = (val) => {
    setChatMsg(val);
    set(ref(db, `couples/${coupleCode}/typing/${user.uid}`), val.length > 0);
    setTimeout(() => set(ref(db, `couples/${coupleCode}/typing/${user.uid}`), false), 3000);
  };

  const handleAuth = async () => {
    if (!email || !password) return alert("Fill all fields");
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { alert(err.message); }
  };

  if (!user) {
    return (
      <div className="container auth-bg">
        <h1 className="logo-text main-logo">Bondify</h1>
        <div className="card shadow-glass login-card">
          <h2 className="auth-title">{isLogin ? "Welcome Back" : "Join the Love"}</h2>
          <input className="modern-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input className="modern-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button className="primary-btn" onClick={handleAuth}>{isLogin ? "Login" : "Create Account ✨"}</button>
          <p className="toggle-auth" onClick={() => setIsLogin(!isLogin)}>{isLogin ? "New user? Create Our Account" : "Back to Login"}</p>
        </div>
      </div>
    );
  }

  if (!coupleCode) {
    return (
      <div className="container center">
        <div className="card shadow-glass">
          <h3 className="connect-title">Connect Hearts 🔗</h3>
          <input className="modern-input center-text" value={tempCode} placeholder="Secret Code" onChange={(e) => setTempCode(e.target.value)} />
          <button className="primary-btn" onClick={() => set(ref(db, `users/${user.uid}/coupleCode`), tempCode.toLowerCase().trim())}>Link Now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {hearts.map(h => <div key={h.id} className="floating-heart" style={{ left: `${h.left}%` }}>❤️</div>)}
      
      <div className="user-bar">
        <span className="code-tag">🔒 {coupleCode}</span>
        <button className="minimal-logout" onClick={() => signOut(auth)}>Logout</button>
      </div>

      <div className="stats-row">
        <div className="stat-pill">Day {totalDays}</div>
        <div className="stat-pill">{daysUntil} days to Anniversary 🎂</div>
      </div>

      {isAnniversaryToday && <div className="anniversary-banner card-glow"><h2>🎉 Happy Anniversary! 🎉</h2></div>}

      <div className="mood-chat-grid">
        <div className="card mood-section">
          <div className="mood-header">
             <div className="mood-item">
               <p className="label">My Mood</p>
               <div className="emoji-picker">
                {["❤️", "💖", "😴", "😊"].map(e => (
                  <button key={e} onClick={() => set(ref(db, `couples/${coupleCode}/moods/${user.uid}`), e)} className={myMood === e ? "active-mood" : ""}>{e}</button>
                ))}
              </div>
             </div>
             <div className="mood-divider"></div>
             <div className="mood-item">
               <p className="label">Partner</p>
               <div className="partner-emoji-display" onClick={() => set(ref(db, `couples/${coupleCode}/reactions`), Date.now())}>{partnerMood}</div>
             </div>
          </div>
        </div>

        <div className="card chat-section">
          <div className="chat-window">
            {messages.map((m, i) => (<div key={i} className={`msg-bubble ${m.sender === user.uid ? "msg-me" : "msg-partner"}`}>{m.text}</div>))}
            {isPartnerTyping && <div className="typing-bubble">...</div>}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-bar" onSubmit={async (e) => { e.preventDefault(); if(!chatMsg.trim()) return; await push(ref(db, `couples/${coupleCode}/chats`), { text: chatMsg, sender: user.uid, timestamp: serverTimestamp() }); setChatMsg(""); }}>
            <input value={chatMsg} onChange={(e) => handleTyping(e.target.value)} placeholder="Type..." />
            <button type="submit">🕊️</button>
          </form>
        </div>
      </div>

      <div className="card bucket-list">
        <h3>Our Bucket List 📸</h3>
        <div className="progress-container"><div className="progress-bar" style={{width: `${(milestones.filter(m => m.completed).length / (milestones.length || 1)) * 100}%`}}></div></div>
        <input className="modern-input" value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Dream date name..." />
        <input className="modern-input" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Photo URL (Optional)" />
        <button className="primary-btn" onClick={() => { if(!milestone) return; push(ref(db, `couples/${coupleCode}/milestones`), { text: milestone, completed: false, photo: photoUrl }); setMilestone(""); setPhotoUrl(""); }}>Add to List</button>
        <div className="milestone-gallery">
          {milestones.map(m => (
            <div key={m.id} className={`milestone-card ${m.completed ? 'completed' : ''}`} onClick={() => update(ref(db, `couples/${coupleCode}/milestones/${m.id}`), { completed: !m.completed })}>
              {m.photo && <img src={m.photo} alt="memory" className="milestone-img" />}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card vibe-card">
        <h3>Our Vibes 🎵</h3>
        <input className="modern-input" value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="Spotify Link..." />
        <button className="primary-btn" onClick={() => { if(!songLink) return; push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink.trim(), user: user.email.split('@')[0] }); setSongLink(""); }}>Share Vibe</button>
        <div className="playlist-list">
          {playlist.map((s) => {
            const isSpotify = s.link.includes("spotify.com/track/");
            const spotifyId = isSpotify ? s.link.split("track/")[1].split("?")[0] : null;
            return (
              <div key={s.id} className="song-container">
                <small>{s.user}'s Pick</small>
                {isSpotify ? (
                  <iframe src={`https://open.spotify.com/embed/track/${spotifyId}`} width="100%" height="80" frameBorder="0" allow="encrypted-media"></iframe>
                ) : <a href={s.link} target="_blank" rel="noreferrer">Open Link ▶</a>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <p className="daily-q">"{currentQuestion}"</p>
        <textarea className="modern-textarea" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer..." />
        <button className="primary-btn" onClick={() => { if(!answer) return; push(ref(db, `couples/${coupleCode}/logs`), { user: user.email.split('@')[0], date: new Date().toLocaleDateString(), question: currentQuestion, answer, timestamp: serverTimestamp() }); setAnswer(""); }}>Log Memory</button>
      </div>
    </div>
  );
}
export default App;