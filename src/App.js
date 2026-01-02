import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase'; 
import { ref, push, set, onValue, remove, update, limitToLast, query, serverTimestamp } from "firebase/database";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [coupleCode, setCoupleCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // Data States
  const [history, setHistory] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [messages, setMessages] = useState([]);
  const [shayaris, setShayaris] = useState([]); 
  const [game, setGame] = useState({ type: '', task: '', sender: '' });
  
  // Inputs
  const [answer, setAnswer] = useState("");
  const [songLink, setSongLink] = useState("");
  const [shayariText, setShayariText] = useState("");
  const [shayariFont, setShayariFont] = useState("'Poppins', sans-serif");
  const [note, setNote] = useState(""); 
  const [displayNote, setDisplayNote] = useState(""); 
  const [milestone, setMilestone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [chatImage, setChatImage] = useState(""); 

  // UI & Dates
  const [myMood, setMyMood] = useState("🤍");
  const [partnerMood, setPartnerMood] = useState("🤍");
  const [nudgeShake, setNudgeShake] = useState(false); 
  const [anniversaryDate, setAnniversaryDate] = useState("2024-01-01");
  const [birthdayDate, setBirthdayDate] = useState("2024-06-15");

  const chatEndRef = useRef(null);
  const mediaInputRef = useRef(null);

  // --- LOGIC: TIMER & HOURLY QUESTIONS ---
  const calculateCountdown = (targetDate) => {
    const today = new Date();
    const target = new Date(today.getFullYear(), new Date(targetDate).getMonth(), new Date(targetDate).getDate());
    if (today > target) target.setFullYear(today.getFullYear() + 1);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return (diff === 365 || diff === 0) ? "Today! 🎉" : `${diff} Days Left`;
  };

  const getDaysTogether = () => {
    const start = new Date(anniversaryDate);
    return Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
  };

  const hourlyQuestions = [
    "What is your favourite quality about me?", 
    "What was your first impression of me?", 
    "Where should our next dream date be?", 
    "If we had 24 hours with no phones, what would we do?",
    "What is the most romantic thing I've said to you?"
  ];
  const hourIndex = Math.floor(new Date().getTime() / (1000 * 60 * 60)); 
  const currentQuestion = hourlyQuestions[hourIndex % hourlyQuestions.length];

  // --- FIREBASE SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        onValue(ref(db, `users/${currentUser.uid}/coupleCode`), (snapshot) => {
          const code = snapshot.val();
          setCoupleCode(code);
          if (code) {
            onValue(ref(db, `couples/${code}/settings`), (s) => {
              if (s.val()) {
                setAnniversaryDate(s.val().anniversary || "2024-01-01");
                setBirthdayDate(s.val().birthday || "2024-06-15");
              }
            });
            onValue(ref(db, `couples/${code}/nudge/${currentUser.uid}`), (s) => {
              if (s.val()) {
                setNudgeShake(true);
                setTimeout(() => { setNudgeShake(false); remove(ref(db, `couples/${code}/nudge/${currentUser.uid}`)); }, 1000);
              }
            });
            onValue(ref(db, `couples/${code}/moods`), (s) => {
              if (s.val()) {
                const pId = Object.keys(s.val()).find(id => id !== currentUser.uid);
                if (pId) setPartnerMood(s.val()[pId]);
                setMyMood(s.val()[currentUser.uid] || "🤍");
              }
            });
            onValue(ref(db, `couples/${code}/notes`), (s) => {
              if (s.val()) {
                const pId = Object.keys(s.val()).find(id => id !== currentUser.uid);
                if (pId) setDisplayNote(s.val()[pId]);
              } else { setDisplayNote(""); }
            });
            onValue(query(ref(db, `couples/${code}/chats`), limitToLast(30)), (s) => {
              setMessages(s.val() ? Object.values(s.val()) : []);
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            });
            onValue(ref(db, `couples/${code}/playlist`), (s) => setPlaylist(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/shayaris`), (s) => setShayaris(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/milestones`), (s) => setMilestones(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/logs`), (s) => setHistory(s.val() ? Object.values(s.val()).reverse() : []));
            onValue(ref(db, `couples/${code}/game`), (s) => setGame(s.val() || { type: '', task: '' }));
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const triggerNudge = () => {
    onValue(ref(db, `couples/${coupleCode}/moods`), (s) => {
      const pId = Object.keys(s.val()).find(id => id !== user.uid);
      if (pId) set(ref(db, `couples/${coupleCode}/nudge/${pId}`), true);
    }, { onlyOnce: true });
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatMsg && !chatImage) return;
    await push(ref(db, `couples/${coupleCode}/chats`), {
      text: chatMsg, image: chatImage, sender: user.uid, timestamp: serverTimestamp()
    });
    setChatMsg(""); setChatImage("");
  };

  if (!user) return (
    <div className="container auth-bg">
      <h1 className="logo-text">Bondify</h1>
      <div className="card shadow-glass login-card">
        <input className="modern-input" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input className="modern-input" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button className="primary-btn" onClick={() => (isLogin ? signInWithEmailAndPassword(auth, email, password) : createUserWithEmailAndPassword(auth, email, password))}>{isLogin ? "Login" : "Register"}</button>
      </div>
    </div>
  );

  return (
    <div className={`container ${nudgeShake ? 'nudge-shake' : ''}`}>
      <div className="user-bar"><span>🔒 {coupleCode}</span><button className="minimal-logout" onClick={() => signOut(auth)}>Logout</button></div>

      {/* --- 1. COUNTDOWN SECTION --- */}
      <div className="countdown-grid">
        <div className="date-pill"><h4>Anniversary</h4><p>{calculateCountdown(anniversaryDate)}</p></div>
        <div className="date-pill"><h4>Partner B-Day</h4><p>{calculateCountdown(birthdayDate)}</p></div>
        <div className="date-pill"><h4>Days Together</h4><p>{getDaysTogether()} ✨</p></div>
      </div>

      {/* --- 2. MOOD & CHAT SECTION --- */}
      <div className="card large-chat-container">
        <div className="mood-header">
           <div className="emoji-picker large-emoji-mood">
              {["❤️", "💖", "😴", "😊", "🔥"].map(e => (
                <button key={e} onClick={() => set(ref(db, `couples/${coupleCode}/moods/${user.uid}`), e)} className={myMood === e ? "active-mood" : ""}>{e}</button>
              ))}
           </div>
           <div className="partner-side">
              <div className="partner-emoji-display" onClick={triggerNudge}>{partnerMood}</div>
              <button className="nudge-btn" onClick={triggerNudge}>Nudge ⚡</button>
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
        
        <form className="chat-input-bar" onSubmit={sendChat}>
           <div className="media-buttons">
             <button type="button" onClick={() => mediaInputRef.current.click()}>📸</button>
             <input type="file" accept="image/*" ref={mediaInputRef} style={{display:'none'}} onChange={(e) => {
               const reader = new FileReader();
               reader.onloadend = () => setChatImage(reader.result);
               reader.readAsDataURL(e.target.files[0]);
             }} />
           </div>
           <textarea className="chat-textarea original-font" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Type..." />
           <button type="submit" className="send-btn-icon">🕊️</button>
        </form>
      </div>

      {/* --- 3. LOVE NOTE --- */}
      <div className="card">
        <h3 className="cursive-text">Write a Love Note 💌</h3>
        <input className="modern-input cursive-text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Say something sweet..." />
        <button className="primary-btn" onClick={() => { if(!note) return; set(ref(db, `couples/${coupleCode}/notes/${user.uid}`), note); setNote(""); }}>Post Note</button>
      </div>
      {displayNote && <div className="sticky-note-card animate-pop cursive-text"><p>"{displayNote}"</p><button onClick={() => remove(ref(db, `couples/${coupleCode}/notes`))}>Read & Clear 📌</button></div>}

      {/* --- 4. TRUTH OR DARE --- */}
      <div className="card game-card">
        <h3 className="cursive-text">Wanna play Truth or Dare? 🎲</h3>
        <div className="flex-row">
          <button className="truth-btn" onClick={() => { const t = prompt("Truth for partner:"); if(t) set(ref(db, `couples/${coupleCode}/game`), { type: 'Truth', task: t, sender: user.uid }); }}>Truth</button>
          <button className="dare-btn" onClick={() => { const d = prompt("Dare for partner:"); if(d) set(ref(db, `couples/${coupleCode}/game`), { type: 'Dare', task: d, sender: user.uid }); }}>Dare</button>
        </div>
        {game.task && <div className="game-box animate-pop"><p><strong>{game.type}:</strong> {game.task}</p>{game.sender !== user.uid && <button onClick={() => remove(ref(db, `couples/${coupleCode}/game`))}>Done ✅</button>}</div>}
      </div>

      {/* --- 5. VIBES & SHAYARIES --- */}
      <div className="card vibe-card">
        <h3>Vibes & Shayaries 🎵✍️</h3>
        <input className="modern-input" value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="Link..." />
        <button onClick={() => { push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink }); setSongLink(""); }}>+</button>
        <textarea className="modern-textarea" style={{fontFamily: shayariFont}} value={shayariText} onChange={(e) => setShayariText(e.target.value)} placeholder="Shayari..." />
        <div className="shayari-controls">
          <button onClick={() => setShayariFont("'Dancing Script', cursive")}>Cursive</button>
          <button onClick={() => setShayariFont("'Poppins', sans-serif")}>Normal</button>
          <button onClick={() => { push(ref(db, `couples/${coupleCode}/shayaris`), { text: shayariText, font: shayariFont }); setShayariText(""); }}>Add</button>
        </div>
        <div className="vibe-scroller">
          {playlist.map(s => <div key={s.id} className="vibe-item"><span>🎵 {s.link.substring(0,30)}</span><button className="rm-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/playlist/${s.id}`))}>×</button></div>)}
          {shayaris.map(sh => <div key={sh.id} className="shayari-item" style={{fontFamily: sh.font}}>{sh.text} <button className="rm-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/shayaris/${sh.id}`))}>×</button></div>)}
        </div>
      </div>

      {/* --- 6. BUCKET LIST --- */}
      <div className="card">
        <h3>Bucket List 📸</h3>
        <input className="modern-input" value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Goal..." />
        <input className="modern-input" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Photo URL..." />
        <button className="primary-btn" onClick={() => { push(ref(db, `couples/${coupleCode}/milestones`), { text: milestone, photo: photoUrl, completed: false }); setMilestone(""); setPhotoUrl(""); }}>Add</button>
        <div className="milestone-gallery">
          {milestones.map(m => (
            <div key={m.id} className={`milestone-card ${m.completed ? 'completed' : ''}`} onClick={() => update(ref(db, `couples/${coupleCode}/milestones/${m.id}`), { completed: !m.completed })}>
              {m.photo && <img src={m.photo} alt="goal" className="milestone-img" />}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- 7. JOURNEY --- */}
      <div className="card journey-input">
        <p className="daily-q cursive-text">Today's Q: "{currentQuestion}"</p>
        <textarea className="modern-textarea" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Memory..." />
        <button className="primary-btn" onClick={() => { push(ref(db, `couples/${coupleCode}/logs`), { date: new Date().toLocaleDateString(), question: currentQuestion, answer }); setAnswer(""); }}>Save Memory</button>
      </div>

      <div className="journey-history">
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