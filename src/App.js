import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase'; 
import { 
  ref, push, set, onValue, remove, update, limitToLast, query, serverTimestamp 
} from "firebase/database";
import { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "firebase/auth";
import './App.css';

function App() {
  // 1. AUTH & CONNECTION
  const [user, setUser] = useState(null);
  const [coupleCode, setCoupleCode] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // 2. DATA LISTS (EVERYTHING RESTORED)
  const [history, setHistory] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [messages, setMessages] = useState([]);
  const [shayaris, setShayaris] = useState([]); 
  const [game, setGame] = useState({ type: '', task: '', sender: '' });
  
  // 3. INPUT FIELDS
  const [answer, setAnswer] = useState("");
  const [pro, setPro] = useState("");
  const [con, setCon] = useState("");
  const [songLink, setSongLink] = useState("");
  const [shayariText, setShayariText] = useState("");
  const [note, setNote] = useState(""); 
  const [displayNote, setDisplayNote] = useState(""); 
  const [milestone, setMilestone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [chatImage, setChatImage] = useState(""); 
  const [dreamDate, setDreamDate] = useState(""); 
  const [partnerDate, setPartnerDate] = useState("");

  // 4. STATUS & UI
  const [myMood, setMyMood] = useState("🤍");
  const [partnerMood, setPartnerMood] = useState("🤍");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [hearts, setHearts] = useState([]); 
  const [nudgeShake, setNudgeShake] = useState(false); 
  const [anniversaryDate, setAnniversaryDate] = useState("2024-01-01");
  const [birthdayDate, setBirthdayDate] = useState("2024-06-15");

  const chatEndRef = useRef(null);
  const cameraInputRef = useRef(null);

  // LOGIC: DATE CALCULATIONS
  const getCountdown = (targetDate) => {
    const today = new Date();
    const target = new Date(today.getFullYear(), new Date(targetDate).getMonth(), new Date(targetDate).getDate());
    if (today > target) target.setFullYear(today.getFullYear() + 1);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff === 365 || diff === 0 ? "Today! 🎉" : `${diff} Days`;
  };

  const getDaysOfUs = () => {
    const start = new Date(anniversaryDate);
    return Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
  };

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
            // ALL LISTENERS RESTORED
            onValue(ref(db, `couples/${code}/game`), (s) => setGame(s.val() || { type: '', task: '', sender: '' }));
            onValue(ref(db, `couples/${code}/settings`), (s) => {
              if (s.val()) {
                setAnniversaryDate(s.val().anniversary || "2024-01-01");
                setBirthdayDate(s.val().birthday || "2024-06-15");
              }
            });
            onValue(ref(db, `couples/${code}/dreamDates`), (s) => {
              if (s.val()) {
                const pId = Object.keys(s.val()).find(id => id !== currentUser.uid);
                if (pId) setPartnerDate(s.val()[pId]);
                setDreamDate(s.val()[currentUser.uid] || "");
              }
            });
            onValue(ref(db, `couples/${code}/shayaris`), (s) => setShayaris(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/nudge/${currentUser.uid}`), (s) => {
              if (s.val()) {
                setNudgeShake(true);
                setTimeout(() => { setNudgeShake(false); remove(ref(db, `couples/${code}/nudge/${currentUser.uid}`)); }, 1000);
              }
            });
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
            onValue(query(ref(db, `couples/${code}/chats`), limitToLast(30)), (s) => {
              setMessages(s.val() ? Object.values(s.val()) : []);
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            });
            onValue(ref(db, `couples/${code}/notes`), (s) => {
              if (s.val()) {
                const pId = Object.keys(s.val()).find(id => id !== currentUser.uid);
                if (pId) setDisplayNote(s.val()[pId]);
              } else { setDisplayNote(""); }
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

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setChatImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  if (!user) {
    return (
      <div className="container auth-bg">
        <h1 className="logo-text">Bondify</h1>
        <div className="card shadow-glass login-card">
          <input className="modern-input" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input className="modern-input" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
          <button className="primary-btn" onClick={() => (isLogin ? signInWithEmailAndPassword(auth, email, password) : createUserWithEmailAndPassword(auth, email, password))}>Login ✨</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${nudgeShake ? 'nudge-shake' : ''}`}>
      {hearts.map(h => <div key={h.id} className="floating-heart" style={{ left: `${Math.random() * 90}%` }}>❤️</div>)}
      
      <div className="user-bar"><span>🔒 {coupleCode}</span> <button className="minimal-logout" onClick={() => signOut(auth)}>Logout</button></div>

      <div className="countdown-grid">
        <div className="date-pill"><h4>Days Together</h4><p>{getDaysOfUs()} ✨</p></div>
        <div className="date-pill"><h4>Anniversary</h4><p>{getCountdown(anniversaryDate)} 🥂</p></div>
        <div className="date-pill"><h4>Partner B-Day</h4><p>{getCountdown(birthdayDate)} 🎂</p></div>
      </div>

      <div className="card game-card">
        <h3 className="cursive-text">Truth or Dare? 🎲</h3>
        <div className="flex-row">
          <button className="truth-btn" onClick={() => { const t = prompt("Truth:"); if(t) set(ref(db, `couples/${coupleCode}/game`), { type: 'Truth', task: t, sender: user.uid }); }}>Truth</button>
          <button className="dare-btn" onClick={() => { const d = prompt("Dare:"); if(d) set(ref(db, `couples/${coupleCode}/game`), { type: 'Dare', task: d, sender: user.uid }); }}>Dare</button>
        </div>
        {game.task && <div className="game-box animate-pop"><p><strong>{game.type}:</strong> {game.task}</p>{game.sender !== user.uid && <button className="small-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/game`))}>Done ✅</button>}</div>}
      </div>

      <div className="card mood-chat-grid large-chat-container">
        <div className="mood-header">
           <div className="mood-item">
             <div className="emoji-picker">{["❤️", "💖", "😴", "😊", "🔥", "😭", "😤", "🥰"].map(e => <button key={e} onClick={() => set(ref(db, `couples/${coupleCode}/moods/${user.uid}`), e)} className={myMood === e ? "active-mood" : ""}>{e}</button>)}</div>
           </div>
           <div className="mood-divider"></div>
           <div className="mood-item">
             <div className="partner-emoji-display" onClick={() => set(ref(db, `couples/${coupleCode}/nudge/${user.uid === 'user1' ? 'user2' : 'user1'}`), true)}>{partnerMood}</div>
             <button className="nudge-btn" onClick={() => {
                onValue(ref(db, `couples/${coupleCode}/moods`), (s) => {
                  const pId = Object.keys(s.val()).find(id => id !== user.uid);
                  if (pId) set(ref(db, `couples/${coupleCode}/nudge/${pId}`), true);
                }, { onlyOnce: true });
             }}>Nudge ⚡</button>
           </div>
        </div>

        <div className="chat-window large-window">
          {messages.map((m, i) => (
            <div key={i} className={`msg-bubble ${m.sender === user.uid ? "msg-me original-font" : "msg-partner partner-style"}`}>
              {m.image && <img src={m.image} alt="chat" className="chat-img-preview" />}
              {m.text && <span>{m.text}</span>}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form className="chat-input-bar" onSubmit={async (e) => { e.preventDefault(); if(!chatMsg && !chatImage) return; await push(ref(db, `couples/${coupleCode}/chats`), { text: chatMsg, image: chatImage, sender: user.uid, timestamp: serverTimestamp() }); setChatMsg(""); setChatImage(""); }}>
          <div className="chat-input-stack">
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{display:'none'}} onChange={handleCameraCapture} />
            <textarea className="chat-textarea original-font" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Type a message..." />
            <div className="chat-actions-row">
              <button type="button" className="camera-trigger" onClick={() => cameraInputRef.current.click()}>📸</button>
              <button type="submit" className="send-btn">🕊️</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="cursive-text">Send Love Note 💌</h3>
        <input className="modern-input cursive-text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type something sweet..." />
        <button className="primary-btn" onClick={() => { if(!note) return; set(ref(db, `couples/${coupleCode}/notes/${user.uid}`), note); setNote(""); alert("Sent!"); }}>Post Note</button>
      </div>
      {displayNote && <div className="sticky-note-card animate-pop cursive-text"><p>"{displayNote}"</p><button onClick={() => remove(ref(db, `couples/${coupleCode}/notes`))}>Read & Clear 📌</button></div>}

      <div className="card vibe-card">
        <h3>Vibes & Shayaries 🎵✍️</h3>
        <div className="input-group"><input className="modern-input" value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="Spotify Link..." /><button className="plus-btn" onClick={() => { if(!songLink) return; push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink, user: user.email.split('@')[0] }); setSongLink(""); }}>+</button></div>
        <div className="input-group"><textarea className="modern-textarea cursive-text" value={shayariText} onChange={(e) => setShayariText(e.target.value)} placeholder="Write Shayari..." /><button className="plus-btn" onClick={() => { if(!shayariText) return; push(ref(db, `couples/${coupleCode}/shayaris`), { text: shayariText, user: user.email.split('@')[0] }); setShayariText(""); }}>+</button></div>
        <div className="vibe-scroller">
          {playlist.map(s => {
            const spotifyId = s.link.includes("track/") ? s.link.split("track/")[1]?.split("?")[0] : null;
            return (
              <div key={s.id} className="vibe-item">
                <div style={{flex:1}}>
                  <small>{s.user}'s Song</small>
                  {spotifyId ? <iframe src={`https://open.spotify.com/embed/track/${spotifyId}`} width="100%" height="80" frameBorder="0" allow="encrypted-media"></iframe> : <a href={s.link} target="_blank">Open Link</a>}
                </div>
                <button className="rm-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/playlist/${s.id}`))}>×</button>
              </div>
            );
          })}
          {shayaris.map(sh => <div key={sh.id} className="shayari-item cursive-text">"{sh.text}"<button className="rm-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/shayaris/${sh.id}`))}>×</button></div>)}
        </div>
      </div>

      <div className="card bucket-list">
        <h3>Bucket List 📸</h3>
        <div className="progress-container"><div className="progress-bar" style={{width: `${(milestones.filter(m => m.completed).length / (milestones.length || 1)) * 100}%`}}></div></div>
        <div className="milestone-gallery">
          {milestones.map(m => (
            <div key={m.id} className={`milestone-card ${m.completed ? 'completed' : ''}`} onClick={() => update(ref(db, `couples/${coupleCode}/milestones/${m.id}`), { completed: !m.completed })}>
              {m.photo && <img src={m.photo} alt="memory" className="milestone-img" />}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="journey-history">
        <h2>Our Journey Scrapbook 📖</h2>
        {history.map((item, i) => (
          <div key={i} className="sticky-note">
            <span className="sticky-date">{item.date}</span>
            <p className="sticky-q cursive-text">"{item.question}"</p>
            <p className="sticky-a cursive-text">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
export default App;