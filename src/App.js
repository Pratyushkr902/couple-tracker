import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase'; 
import { ref, push, set, onValue, remove } from "firebase/database";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [coupleCode, setCoupleCode] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // --- ALL APP STATES ---
  const [pro, setPro] = useState("");
  const [con, setCon] = useState("");
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState([]);
  const [songLink, setSongLink] = useState("");
  const [playlist, setPlaylist] = useState([]);
  const [bucketItem, setBucketItem] = useState("");
  const [bucketList, setBucketList] = useState([]);
  const [myMood, setMyMood] = useState("🤍");
  const [partnerMood, setPartnerMood] = useState("🤍");
  const [note, setNote] = useState("");
  const [displayNote, setDisplayNote] = useState("");
  const [capsuleMessage, setCapsuleMessage] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [capsules, setCapsules] = useState([]);

  const ANNIVERSARY_DATE = "2024-01-01"; 
  const dailyQuestions = [
    "What was your first impression of me?",
    "What is one thing I did this week that made you smile?",
    "Where should our next dream date be?",
    "What song reminds you of us?",
    "What is your favorite quality about me?"
  ];

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
            // Real-time Listeners
            onValue(ref(db, `couples/${code}/logs`), (s) => setHistory(s.val() ? Object.values(s.val()).reverse() : []));
            onValue(ref(db, `couples/${code}/playlist`), (s) => setPlaylist(s.val() ? Object.values(s.val()).reverse() : []));
            onValue(ref(db, `couples/${code}/bucketList`), (s) => setBucketList(s.val() ? Object.values(s.val()) : []));
            onValue(ref(db, `couples/${code}/capsules`), (s) => setCapsules(s.val() ? Object.values(s.val()) : []));
            
            onValue(ref(db, `couples/${code}/moods`), (s) => {
              const moods = s.val();
              if (moods) {
                const pId = Object.keys(moods).find(id => id !== currentUser.uid);
                if (pId) setPartnerMood(moods[pId]);
                setMyMood(moods[currentUser.uid] || "🤍");
              }
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

  const handleAuth = async () => {
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { alert(err.message); }
  };

  const handleAddLog = async () => {
    if (!answer) return;
    await push(ref(db, `couples/${coupleCode}/logs`), {
      user: user.email.split('@')[0],
      date: new Date().toLocaleDateString(),
      question: currentQuestion,
      answer, pro, con,
      timestamp: Date.now()
    });
    setAnswer(""); setPro(""); setCon("");
  };

  const sealCapsule = async () => {
    if (!capsuleMessage || !unlockDate) return alert("Pick date and message!");
    await push(ref(db, `couples/${coupleCode}/capsules`), {
      message: capsuleMessage,
      unlockDate,
      sender: user.email.split('@')[0],
      timestamp: Date.now()
    });
    setCapsuleMessage(""); setUnlockDate("");
    alert("Sealed in the Time Capsule! 🔒");
  };

  if (!user) {
    return (
      <div className="container">
        <h1>{isLogin ? "Welcome Back 💖" : "Start Your Journey"}</h1>
        <div className="card shadow-glass">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button onClick={handleAuth}>{isLogin ? "Login" : "Sign Up"}</button>
          <p onClick={() => setIsLogin(!isLogin)} style={{cursor: 'pointer', color: 'white'}}>{isLogin ? "Need an account? Sign up" : "Already have an account? Login"}</p>
        </div>
      </div>
    );
  }

  if (!coupleCode) {
    return (
      <div className="container">
        <h1>Connect Hearts 🔗</h1>
        <div className="card">
          <p>Enter your secret shared code:</p>
          <input placeholder="Secret Code" onChange={(e) => setTempCode(e.target.value)} />
          <button onClick={() => set(ref(db, `users/${user.uid}/coupleCode`), tempCode.toLowerCase().trim())}>Link with Partner</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="user-bar">
        <span>🔒 {coupleCode}</span>
        <button className="logout-btn" onClick={() => signOut(auth)}>Logout</button>
      </div>

      <div className="stats-badge">Day {diffInDays} of Us ✨</div>
      
      <h1>Together Forever ♾️</h1>

      {/* MOOD SECTION */}
      <div className="card mood-card">
        <div className="mood-display">
          <div className="mood-box">
            <span>My Mood</span>
            <div className="emoji-picker">
              {["❤️", "💖", "💙", "😴", "😊"].map(e => (
                <button key={e} onClick={() => set(ref(db, `couples/${coupleCode}/moods/${user.uid}`), e)} className={myMood === e ? "active-mood" : ""}>{e}</button>
              ))}
            </div>
          </div>
          <div className="mood-divider"></div>
          <div className="mood-box"><span>Partner's</span><div className="partner-emoji">{partnerMood}</div></div>
        </div>
      </div>

      {/* SECRET NOTE */}
      {displayNote && (
        <div className="card note-card-display">
          <small>A note from your partner: 💌</small>
          <p>"{displayNote}"</p>
          <button className="clear-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/notes`))}>Read & Clear</button>
        </div>
      )}

      {/* DAILY MEMORY */}
      <div className="card">
        <p className="actual-q">"{currentQuestion}"</p>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer..." />
        <div className="flex-row">
          <input value={pro} onChange={(e) => setPro(e.target.value)} placeholder="Pro (+)" />
          <input value={con} onChange={(e) => setCon(e.target.value)} placeholder="Con (-)" />
        </div>
        <button onClick={handleAddLog}>Save Today's Memory</button>
      </div>

      {/* TIME CAPSULE */}
      <div className="card capsule-card">
        <h3>Time Capsule ⏳</h3>
        <textarea value={capsuleMessage} onChange={(e) => setCapsuleMessage(e.target.value)} placeholder="A message for the future..." />
        <div className="flex-row">
          <input type="date" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} />
          <button onClick={sealCapsule}>Seal 🔒</button>
        </div>
        <div className="capsule-container">
          {capsules.map((cap, i) => {
            const isLocked = new Date().toISOString().split('T')[0] < cap.unlockDate;
            return (
              <div key={i} className={`capsule-item ${isLocked ? "locked" : "unlocked"}`}>
                {isLocked ? <div className="blurred-text">Locked until {cap.unlockDate} 🔒</div> : <div><small>{cap.sender} wrote:</small><p>{cap.message}</p></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* PLAYLIST & BUCKET LIST */}
      <div className="card">
        <h3>Our Vibes 🎵</h3>
        <div className="flex-row">
          <input value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="Song link..." />
          <button onClick={() => { push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink, user: user.email.split('@')[0], timestamp: Date.now() }); setSongLink(""); }}>+</button>
        </div>
        <div className="playlist-list">
          {playlist.slice(0, 3).map((s, i) => <div key={i} className="song-item"><a href={s.link} target="_blank" rel="noreferrer">▶ {s.user}'s Pick</a></div>)}
        </div>
      </div>

      <div className="history-section">
        <h2>Our Journey 📖</h2>
        {history.map((item, i) => (
          <div key={i} className="history-card">
            <div className="h-card-header"><span>{item.date}</span><span>by {item.user}</span></div>
            <p className="h-question">Q: {item.question}</p>
            <p className="h-answer">"{item.answer}"</p>
            <div className="pro-con-tags"><span className="pro-tag">❤ {item.pro}</span><span className="con-tag">☁ {item.con}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default App;