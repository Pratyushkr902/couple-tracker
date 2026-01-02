import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase'; 
import { 
  ref, 
  push, 
  set, 
  onValue, 
  remove, 
  update, 
  limitToLast, 
  query, 
  serverTimestamp 
} from "firebase/database";
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

  const [history, setHistory] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const [answer, setAnswer] = useState("");
  const [pro, setPro] = useState("");
  const [con, setCon] = useState("");
  
  const [songLink, setSongLink] = useState("");
  const [note, setNote] = useState(""); 
  const [displayNote, setDisplayNote] = useState(""); 
  const [milestone, setMilestone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [chatImage, setChatImage] = useState(""); // New: Chat Photo Feature

  const [myMood, setMyMood] = useState("🤍");
  const [partnerMood, setPartnerMood] = useState("🤍");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [hearts, setHearts] = useState([]); 

  // --- New: Dynamic Date Settings ---
  const [anniversaryDate, setAnniversaryDate] = useState("2024-01-01");
  const [birthdayDate, setBirthdayDate] = useState("2024-06-15");

  const chatEndRef = useRef(null);

  const getCountdown = (targetDate) => {
    const today = new Date();
    const target = new Date(today.getFullYear(), new Date(targetDate).getMonth(), new Date(targetDate).getDate());
    if (today > target) target.setFullYear(today.getFullYear() + 1);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff === 365 || diff === 0 ? "Today! 🎉" : `${diff} Days`;
  };

  const getDaysOfUs = () => {
    const start = new Date(anniversaryDate);
    const today = new Date();
    return Math.floor((today - start) / (1000 * 60 * 60 * 24));
  };

  const dailyQuestions = [
    "What was your first impression of me?", 
    "What is one thing I did this week that made you smile?", 
    "Where should our next dream date be?", 
    "What is your favorite quality about me?",
    "If we could go anywhere tomorrow, where would it be?"
  ];
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const currentQuestion = dailyQuestions[dayOfYear % dailyQuestions.length];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        onValue(ref(db, `users/${currentUser.uid}/coupleCode`), (snapshot) => {
          const code = snapshot.val();
          setCoupleCode(code);
          if (code) {
            // Load dates from Firebase if user has set them
            onValue(ref(db, `couples/${code}/settings`), (s) => {
              const data = s.val();
              if (data) {
                if (data.anniversary) setAnniversaryDate(data.anniversary);
                if (data.birthday) setBirthdayDate(data.birthday);
              }
            });

            onValue(ref(db, `couples/${code}/logs`), (s) => setHistory(s.val() ? Object.values(s.val()).reverse() : []));
            onValue(ref(db, `couples/${code}/playlist`), (s) => setPlaylist(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/milestones`), (s) => setMilestones(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/moods`), (s) => {
              const moods = s.val();
              if (moods) {
                const pId = Object.keys(moods).find(id => id !== currentUser.uid);
                if (pId) setPartnerMood(moods[pId]);
                setMyMood(moods[currentUser.uid] || "🤍");
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
              const notes = s.val();
              if (notes) {
                const pId = Object.keys(notes).find(id => id !== currentUser.uid);
                if (pId) setDisplayNote(notes[pId]);
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

  const handleTyping = (val) => {
    setChatMsg(val);
    set(ref(db, `couples/${coupleCode}/typing/${user.uid}`), val.length > 0);
    setTimeout(() => { set(ref(db, `couples/${coupleCode}/typing/${user.uid}`), false); }, 3000);
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim() && !chatImage.trim()) return;
    set(ref(db, `couples/${coupleCode}/typing/${user.uid}`), false);
    await push(ref(db, `couples/${coupleCode}/chats`), {
      text: chatMsg,
      image: chatImage, // Photo in chat
      sender: user.uid,
      timestamp: serverTimestamp()
    });
    setChatMsg("");
    setChatImage("");
  };

  const updateDates = () => {
    update(ref(db, `couples/${coupleCode}/settings`), {
      anniversary: anniversaryDate,
      birthday: birthdayDate
    });
    alert("Countdown updated! ❤️");
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
      <div className="container auth-bg">
        <div className="logo-container"><h1 className="logo-text main-logo">Bondify</h1></div>
        <div className="card shadow-glass login-card">
          <h2 className="auth-title">{isLogin ? "Welcome Back" : "Join the Love"}</h2>
          <input className="modern-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" />
          <input className="modern-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button className="primary-btn" onClick={handleAuth}>{isLogin ? "Login" : "Create Our Account ✨"}</button>
          <p className="toggle-auth" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "New user? Create Our Account" : "Back to Login"}
          </p>
        </div>
      </div>
    );
  }

  if (!coupleCode) {
    return (
      <div className="container center">
        <div className="card shadow-glass">
          <h3 className="connect-title">Connect Hearts 🔗</h3>
          <p className="connect-sub">Enter your secret shared code</p>
          <input className="modern-input center-text" value={tempCode} placeholder="e.g. love2024" onChange={(e) => setTempCode(e.target.value)} />
          <button className="primary-btn" onClick={() => set(ref(db, `users/${user.uid}/coupleCode`), tempCode.toLowerCase().trim())}>Link Now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {hearts.map(h => ( <div key={h.id} className="floating-heart" style={{ left: `${h.left}%` }}>❤️</div> ))}

      <div className="user-bar">
        <span className="code-tag">🔒 {coupleCode}</span>
        <button className="minimal-logout" onClick={() => signOut(auth)}>Logout</button>
      </div>

      {/* Settings: User sets their Anniversary/Birthday */}
      <div className="card settings-card">
        <h4 className="cursive-text">Set Your Special Dates 📅</h4>
        <div className="flex-row">
          <div style={{flex:1}}>
            <small>Anniversary</small>
            <input type="date" className="modern-input" value={anniversaryDate} onChange={(e)=>setAnniversaryDate(e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <small>Partner Birthday</small>
            <input type="date" className="modern-input" value={birthdayDate} onChange={(e)=>setBirthdayDate(e.target.value)}/>
          </div>
        </div>
        <button className="primary-btn small-btn" onClick={updateDates}>Set Countdown</button>
      </div>

      <div className="countdown-grid">
        <div className="date-pill">
          <h4>Days of Us</h4>
          <p>{getDaysOfUs()} Days ✨</p>
        </div>
        <div className="date-pill">
          <h4>Anniversary</h4>
          <p>{getCountdown(anniversaryDate)} 🥂</p>
        </div>
        <div className="date-pill">
          <h4>Partner B-Day</h4>
          <p>{getCountdown(birthdayDate)} 🎂</p>
        </div>
      </div>

      {/* Large Chat Box & Mood Section */}
      <div className="card mood-chat-grid large-chat-container">
        <div className="mood-header">
           <div className="mood-item">
             <p className="label">My Mood</p>
             <div className="emoji-picker">
              {["❤️", "💖", "😴", "😊", "🔥"].map(e => (
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

        <div className="chat-area">
          <div className="chat-window large-window cursive-chat">
            {messages.map((m, i) => (
              <div key={i} className={`msg-bubble ${m.sender === user.uid ? "msg-me" : "msg-partner"}`}>
                {m.image && <img src={m.image} alt="chat" className="chat-img-preview" />}
                {m.text && <span>{m.text}</span>}
              </div>
            ))}
            {isPartnerTyping && <div className="typing-bubble">...</div>}
            <div ref={chatEndRef} />
          </div>
          <form className="chat-input-bar" onSubmit={sendChatMessage}>
            <div className="chat-input-stack">
               <input value={chatImage} onChange={(e) => setChatImage(e.target.value)} placeholder="Paste Photo URL..." className="photo-input" />
               <div className="flex-row">
                 <input value={chatMsg} onChange={(e) => handleTyping(e.target.value)} placeholder="Type a romantic message..." />
                 <button type="submit">🕊️</button>
               </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <h3 className="cursive-text">Send Love Note 💌</h3>
        <input className="modern-input cursive-text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write something sweet..." />
        <button className="primary-btn" onClick={() => { 
            if(!note) return; 
            set(ref(db, `couples/${coupleCode}/notes/${user.uid}`), note); 
            setNote(""); 
            alert("Love Note Sent!"); 
          }}>Post Note</button>
      </div>

      {displayNote && (
        <div className="sticky-note-card animate-pop cursive-text">
          <p>"{displayNote}"</p>
          <button className="clear-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/notes`))}>Read & Clear 📌</button>
        </div>
      )}

      <div className="card bucket-list">
        <h3>Bucket List 📸</h3>
        <div className="progress-container">
            <div className="progress-bar" style={{width: `${(milestones.filter(m => m.completed).length / (milestones.length || 1)) * 100}%`}}></div>
        </div>
        <input className="modern-input" value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Dream date name..." />
        <input className="modern-input" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Photo URL (Optional)" />
        <button className="primary-btn" onClick={() => { 
            if(!milestone) return; 
            push(ref(db, `couples/${coupleCode}/milestones`), { text: milestone, completed: false, photo: photoUrl }); 
            setMilestone(""); setPhotoUrl(""); 
          }}>Add to List</button>
        <div className="milestone-gallery">
          {milestones.map(m => (
            <div key={m.id} className={`milestone-card ${m.completed ? 'completed' : ''}`} onClick={() => update(ref(db, `couples/${coupleCode}/milestones/${m.id}`), { completed: !m.completed })}>
              {m.photo && <img src={m.photo} alt="memory" className="milestone-img" />}
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card journey-input">
        <p className="daily-q">"{currentQuestion}"</p>
        <textarea className="modern-textarea" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your thoughts today..." />
        <div className="flex-row">
            <input className="modern-input" value={pro} onChange={(e) => setPro(e.target.value)} placeholder="High (+)" />
            <input className="modern-input" value={con} onChange={(e) => setCon(e.target.value)} placeholder="Low (-)" />
        </div>
        <button className="primary-btn" onClick={() => { 
            if(!answer) return; 
            push(ref(db, `couples/${coupleCode}/logs`), { 
              user: user.email.split('@')[0], 
              date: new Date().toLocaleDateString(), 
              question: currentQuestion, 
              answer, pro, con, 
              timestamp: serverTimestamp() 
            }); 
            setAnswer(""); setPro(""); setCon(""); 
          }}>Save Memory</button>
      </div>

      <div className="journey-history">
        <h2 className="history-title">Our Journey 📖</h2>
        {history.map((item, i) => (
          <div key={i} className="sticky-note">
            <span className="sticky-date">{item.date} by {item.user}</span>
            <p className="sticky-q cursive-text">"{item.question}"</p>
            <p className="sticky-a cursive-text">{item.answer}</p>
            <div className="pro-con-tags">
                <span className="pro-tag">❤ {item.pro}</span>
                <span className="con-tag">☁ {item.con}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card vibe-card">
        <h3>Our Vibes 🎵</h3>
        <input className="modern-input" value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="Spotify Track Link" />
        <button className="primary-btn" onClick={() => { 
            if(!songLink) return; 
            push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink.trim(), user: user.email.split('@')[0] }); 
            setSongLink(""); 
          }}>Share Music</button>
        <div className="playlist-list">
          {playlist.map((s) => {
            const isSpotify = s.link.includes("spotify.com");
            const spotifyId = isSpotify ? s.link.split("track/")[1]?.split("?")[0] : null;
            return (
              <div key={s.id} className="song-container">
                <small>{s.user}'s Pick</small>
                {spotifyId ? (
                  <iframe src={`https://open.spotify.com/embed/track/${spotifyId}`} width="100%" height="80" frameBorder="0" allow="encrypted-media" style={{borderRadius: '12px', marginTop: '5px'}}></iframe>
                ) : <a href={s.link} target="_blank" rel="noreferrer" className="link-btn">Open Link ▶</a>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;