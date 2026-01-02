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
  // --- 1. STATES MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [coupleCode, setCoupleCode] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // Lists
  const [history, setHistory] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [messages, setMessages] = useState([]);
  const [shayaris, setShayaris] = useState([]); 
  const [game, setGame] = useState({ type: '', task: '', sender: '' });
  
  // Inputs
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

  // UI & Effects
  const [myMood, setMyMood] = useState("🤍");
  const [partnerMood, setPartnerMood] = useState("🤍");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [hearts, setHearts] = useState([]); 
  const [nudgeShake, setNudgeShake] = useState(false); 
  
  // Dates
  const [anniversaryDate, setAnniversaryDate] = useState("2024-01-01");
  const [birthdayDate, setBirthdayDate] = useState("2024-06-15");

  const chatEndRef = useRef(null);
  const cameraInputRef = useRef(null);

  // --- 2. LOGIC: COUNTDOWNS & QUESTIONS ---
  const getCountdown = (targetDate) => {
    const today = new Date();
    const target = new Date(today.getFullYear(), new Date(targetDate).getMonth(), new Date(targetDate).getDate());
    if (today > target) target.setFullYear(today.getFullYear() + 1);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return (diff === 365 || diff === 0) ? "Today! 🎉" : `${diff} Days Left`;
  };

  const getDaysOfUs = () => {
    const start = new Date(anniversaryDate);
    const today = new Date();
    const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const dailyQuestions = [
    "What was your first impression of me?", 
    "What is your favourite quality about me?", 
    "What is one thing I did this week that made you smile?", 
    "Where should our next dream date be?", 
    "What is a memory of us that you never want to forget?",
    "If we could teleport anywhere right now, where would it be?"
  ];
  const dayIndex = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
  const currentQuestion = dailyQuestions[dayIndex % dailyQuestions.length];

  // --- 3. FIREBASE SYNC ENGINE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        onValue(ref(db, `users/${currentUser.uid}/coupleCode`), (snapshot) => {
          const code = snapshot.val();
          setCoupleCode(code);
          if (code) {
            onValue(ref(db, `couples/${code}/game`), (s) => setGame(s.val() || { type: '', task: '', sender: '' }));
            onValue(ref(db, `couples/${code}/settings`), (s) => {
              if (s.val()) {
                if (s.val().anniversary) setAnniversaryDate(s.val().anniversary);
                if (s.val().birthday) setBirthdayDate(s.val().birthday);
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

  // --- 4. ACTION HANDLERS ---
  const handleAuth = async () => {
    if (!email || !password) return alert("Fill all fields");
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { alert(err.message); }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMsg && !chatImage) return;
    await push(ref(db, `couples/${coupleCode}/chats`), {
      text: chatMsg, image: chatImage, sender: user.uid, timestamp: serverTimestamp()
    });
    setChatMsg(""); setChatImage("");
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setChatImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // --- 5. RENDER UI ---
  if (!user) {
    return (
      <div className="container auth-bg">
        <h1 className="logo-text">Bondify</h1>
        <div className="card shadow-glass login-card">
          <input className="modern-input" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input className="modern-input" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
          <button className="primary-btn" onClick={handleAuth}>{isLogin ? "Login" : "Join Us ✨"}</button>
          <p className="toggle-auth" onClick={() => setIsLogin(!isLogin)}>{isLogin ? "New? Register" : "Back to Login"}</p>
        </div>
      </div>
    );
  }

  if (!coupleCode) {
    return (
      <div className="container center">
        <div className="card shadow-glass">
          <h3>Link Hearts 🔗</h3>
          <input className="modern-input" placeholder="Enter Couple Code" onChange={(e) => setTempCode(e.target.value)} />
          <button className="primary-btn" onClick={() => set(ref(db, `users/${user.uid}/coupleCode`), tempCode.toLowerCase().trim())}>Connect</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${nudgeShake ? 'nudge-shake' : ''}`}>
      <div className="user-bar"><span>🔒 {coupleCode}</span><button className="minimal-logout" onClick={() => signOut(auth)}>Logout</button></div>

      {/* Date Settings */}
      <div className="card settings-card">
        <h4 className="cursive-text">Set Your Dates 📅</h4>
        <div className="flex-row">
          <div><small>Anniversary</small><input type="date" value={anniversaryDate} onChange={(e) => {setAnniversaryDate(e.target.value); update(ref(db, `couples/${coupleCode}/settings`), {anniversary: e.target.value})}} /></div>
          <div><small>Partner B-Day</small><input type="date" value={birthdayDate} onChange={(e) => {setBirthdayDate(e.target.value); update(ref(db, `couples/${coupleCode}/settings`), {birthday: e.target.value})}} /></div>
        </div>
      </div>

      <div className="countdown-grid">
        <div className="date-pill"><h4>Together</h4><p>{getDaysOfUs()} Days</p></div>
        <div className="date-pill"><h4>Anniversary</h4><p>{getCountdown(anniversaryDate)}</p></div>
        <div className="date-pill"><h4>B-Day</h4><p>{getCountdown(birthdayDate)}</p></div>
      </div>

      {/* Truth or Dare Game */}
      <div className="card game-card">
        <h3 className="cursive-text">Truth or Dare? 🎲</h3>
        <div className="flex-row">
          <button className="truth-btn" onClick={() => { const t = prompt("Enter Truth:"); if(t) set(ref(db, `couples/${coupleCode}/game`), { type: 'Truth', task: t, sender: user.uid }); }}>Truth</button>
          <button className="dare-btn" onClick={() => { const d = prompt("Enter Dare:"); if(d) set(ref(db, `couples/${coupleCode}/game`), { type: 'Dare', task: d, sender: user.uid }); }}>Dare</button>
        </div>
        {game.task && <div className="game-box"><p><strong>{game.type}:</strong> {game.task}</p>{game.sender !== user.uid && <button onClick={() => remove(ref(db, `couples/${coupleCode}/game`))}>Done ✅</button>}</div>}
      </div>

      {/* Large Chat & Mood */}
      <div className="card large-chat-container">
        <div className="mood-header">
           <div className="mood-item">
             <div className="emoji-picker large-emoji-mood">
              {["❤️", "💖", "😴", "😊", "🔥", "😭", "😤", "🥰", "🥳", "🥺"].map(e => (
                <button key={e} onClick={() => set(ref(db, `couples/${coupleCode}/moods/${user.uid}`), e)} className={myMood === e ? "active-mood" : ""}>{e}</button>
              ))}
            </div>
           </div>
           <div className="mood-divider"></div>
           <div className="mood-item">
             <div className="partner-emoji-display large-emoji-display" onClick={() => {
                onValue(ref(db, `couples/${coupleCode}/moods`), (s) => {
                  const pId = Object.keys(s.val()).find(id => id !== user.uid);
                  if (pId) set(ref(db, `couples/${coupleCode}/nudge/${pId}`), true);
                }, { onlyOnce: true });
             }}>{partnerMood}</div>
             <button className="nudge-btn" onClick={() => {
                onValue(ref(db, `couples/${coupleCode}/moods`), (s) => {
                  const pId = Object.keys(s.val()).find(id => id !== user.uid);
                  if (pId) set(ref(db, `couples/${coupleCode}/nudge/${pId}`), true);
                }, { onlyOnce: true });
             }}>Nudge Heart ⚡</button>
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
        
        <form className="chat-input-bar" onSubmit={sendChatMessage}>
           <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{display:'none'}} onChange={handleCameraCapture} />
           <textarea className="chat-textarea original-font" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Type a message..." />
           <div className="chat-actions-row">
             <button type="button" className="camera-trigger" onClick={() => cameraInputRef.current.click()}>📸</button>
             <button type="submit" className="send-btn">🕊️</button>
           </div>
        </form>
      </div>

      {/* Love Note */}
      {displayNote && <div className="sticky-note-card animate-pop cursive-text"><p>"{displayNote}"</p><button onClick={() => remove(ref(db, `couples/${coupleCode}/notes`))}>Read & Clear 📌</button></div>}

      {/* Vibes & Shayari */}
      <div className="card vibe-card">
        <h3>Vibes & Shayaries 🎵✍️</h3>
        <div className="input-group"><input className="modern-input" value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="Spotify Link" /><button className="plus-btn" onClick={() => { push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink, user: user.email.split('@')[0] }); setSongLink(""); }}>+</button></div>
        <div className="input-group"><textarea className="modern-textarea cursive-text" value={shayariText} onChange={(e) => setShayariText(e.target.value)} placeholder="Write Shayari" /><button className="plus-btn" onClick={() => { push(ref(db, `couples/${coupleCode}/shayaris`), { text: shayariText, user: user.email.split('@')[0] }); setShayariText(""); }}>+</button></div>
        <div className="vibe-scroller">
          {playlist.map(s => <div key={s.id} className="vibe-item"><span>🎵 {s.user}'s Pick</span><button className="rm-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/playlist/${s.id}`))}>×</button></div>)}
          {shayaris.map(sh => <div key={sh.id} className="shayari-item cursive-text">"{sh.text}"<button className="rm-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/shayaris/${sh.id}`))}>×</button></div>)}
        </div>
      </div>

      {/* Bucket List */}
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

      {/* Journey */}
      <div className="card journey-input">
        <p className="daily-q cursive-text">"{currentQuestion}"</p>
        <textarea className="modern-textarea" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer..." />
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