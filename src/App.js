import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase'; 
import { 
  ref, push, set, onValue, remove, update, limitToLast, query, serverTimestamp 
} from "firebase/database";
import { 
  onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from "firebase/auth";
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [coupleCode, setCoupleCode] = useState("");
  const [tempCode, setTempCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // States for Features
  const [messages, setMessages] = useState([]);
  const [chatMsg, setChatMsg] = useState("");
  const [chatImage, setChatImage] = useState(null);
  const [myMood, setMyMood] = useState("😊");
  const [partnerMood, setPartnerMood] = useState("😊");
  const [shayaris, setShayaris] = useState([]);
  const [shayariText, setShayariText] = useState("");
  const [isCursiveShayari, setIsCursiveShayari] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [songLink, setSongLink] = useState("");
  const [bucketList, setBucketList] = useState([]);
  const [goalText, setGoalText] = useState("");
  const [goalImg, setGoalImg] = useState("");
  const [game, setGame] = useState({ type: '', task: '', sender: '' });
  const [nudgeShake, setNudgeShake] = useState(false);
  const [history, setHistory] = useState([]);
  const [answer, setAnswer] = useState("");

  // Dates
  const [anniversaryDate, setAnniversaryDate] = useState("2024-01-01");
  const [birthdayDate, setBirthdayDate] = useState("2024-01-01");

  const chatEndRef = useRef(null);
  const cameraRef = useRef(null);

  // --- Logic: Countdown ---
  const getDaysLeft = (targetDate) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} Days Left` : "Today! 🎉";
  };

  const getTogetherDays = () => {
    const start = new Date(anniversaryDate);
    const today = new Date();
    return Math.floor((today - start) / (1000 * 60 * 60 * 24));
  };

  // --- Daily Question Logic ---
  const questions = [
    "What is your favourite quality about me?",
    "Where do you want to go on our next date?",
    "What was your first thought when you saw me?",
    "Which song reminds you of us?",
    "What is one thing you love about our journey?"
  ];
  const currentQuestion = questions[Math.floor(new Date().getDate() % questions.length)];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        onValue(ref(db, `users/${currentUser.uid}/coupleCode`), (snap) => {
          const code = snap.val();
          setCoupleCode(code);
          if (code) {
            // Sync Moods
            onValue(ref(db, `couples/${code}/moods`), (s) => {
              if (s.val()) {
                const pId = Object.keys(s.val()).find(id => id !== currentUser.uid);
                if (pId) setPartnerMood(s.val()[pId]);
                setMyMood(s.val()[currentUser.uid] || "😊");
              }
            });
            // Sync Chats
            onValue(query(ref(db, `couples/${code}/chats`), limitToLast(20)), (s) => {
              setMessages(s.val() ? Object.values(s.val()) : []);
              chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
            // Sync Nudge
            onValue(ref(db, `couples/${code}/nudge/${currentUser.uid}`), (s) => {
              if (s.val()) {
                setNudgeShake(true);
                setTimeout(() => { 
                  setNudgeShake(false); 
                  remove(ref(db, `couples/${code}/nudge/${currentUser.uid}`)); 
                }, 1000);
              }
            });
            // Sync Shayaris & Playlist
            onValue(ref(db, `couples/${code}/shayaris`), (s) => setShayaris(s.val() ? Object.values(s.val()).reverse() : []));
            onValue(ref(db, `couples/${code}/playlist`), (s) => setPlaylist(s.val() ? Object.values(s.val()).reverse() : []));
            onValue(ref(db, `couples/${code}/bucketList`), (s) => setBucketList(s.val() ? Object.values(s.val()) : []));
            onValue(ref(db, `couples/${code}/game`), (s) => setGame(s.val() || {}));
            onValue(ref(db, `couples/${code}/history`), (s) => setHistory(s.val() ? Object.values(s.val()).reverse() : []));
          }
        });
      }
    });
    return () => unsub();
  }, []);

  const sendMsg = (e) => {
    e.preventDefault();
    if (!chatMsg && !chatImage) return;
    push(ref(db, `couples/${coupleCode}/chats`), {
      text: chatMsg, image: chatImage, sender: user.uid, ts: serverTimestamp()
    });
    setChatMsg(""); setChatImage(null);
  };

  const handleNudge = () => {
    onValue(ref(db, `couples/${coupleCode}/moods`), (s) => {
      const pId = Object.keys(s.val()).find(id => id !== user.uid);
      if (pId) set(ref(db, `couples/${coupleCode}/nudge/${pId}`), true);
    }, { onlyOnce: true });
  };

  if (!user) return (
    <div className="auth-container">
      <div className="glass-card">
        <h2>{isLogin ? "Welcome Back" : "Create Bond"}</h2>
        <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
        <button onClick={() => isLogin ? signInWithEmailAndPassword(auth, email, password) : createUserWithEmailAndPassword(auth, email, password)}>
          {isLogin ? "Login" : "Register"}
        </button>
        <p onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Need an account? Register" : "Have account? Login"}</p>
      </div>
    </div>
  );

  if (!coupleCode) return (
    <div className="auth-container">
      <div className="glass-card">
        <h3>Enter Couple Code</h3>
        <input placeholder="e.g. shubham-sneha" onChange={e => setTempCode(e.target.value)} />
        <button onClick={() => set(ref(db, `users/${user.uid}/coupleCode`), tempCode.toLowerCase())}>Link Hearts</button>
      </div>
    </div>
  );

  return (
    <div className={`app-wrapper ${nudgeShake ? 'shake-ui' : ''}`}>
      <header className="main-header">
        <div className="days-counter">❤️ {getTogetherDays()} Days Together</div>
        <button className="logout-btn" onClick={() => signOut(auth)}>Logout</button>
      </header>

      {/* Countdown Section */}
      <section className="countdown-section">
        <div className="timer-box">
          <small>Anniversary</small>
          <p>{getDaysLeft(anniversaryDate)}</p>
        </div>
        <div className="timer-box">
          <small>Your B'Day</small>
          <p>{getDaysLeft(birthdayDate)}</p>
        </div>
      </section>

      {/* Mood & Nudge */}
      <section className="mood-nudge-card">
        <div className="mood-selector">
          <span>My Mood:</span>
          {["😊", "🥰", "🥺", "😤", "🔥"].map(emoji => (
            <button key={emoji} onClick={() => set(ref(db, `couples/${coupleCode}/moods/${user.uid}`), emoji)}
              className={myMood === emoji ? 'active' : ''}>{emoji}</button>
          ))}
        </div>
        <div className="partner-mood-display" onClick={handleNudge}>
          <div className="mood-circle">{partnerMood}</div>
          <small>Tap to Nudge Partner ⚡</small>
        </div>
      </section>

      {/* Chatbot Window */}
      <section className="chat-container">
        <div className="chat-window">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.sender === user.uid ? 'me' : 'partner'}`}>
              {m.image && <img src={m.image} alt="upload" />}
              {m.text && <p>{m.text}</p>}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form className="chat-controls" onSubmit={sendMsg}>
          <button type="button" onClick={() => cameraRef.current.click()}>📸</button>
          <input type="file" ref={cameraRef} hidden onChange={e => {
            const reader = new FileReader();
            reader.onload = () => setChatImage(reader.result);
            reader.readAsDataURL(e.target.files[0]);
          }} />
          <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Type message..." />
          <button type="submit">Send</button>
        </form>
      </section>

      {/* Games & Fun */}
      <div className="extra-grid">
        <section className="love-note-card">
          <h3 className="cursive">Love Note</h3>
          <p className="cursive">"You make my heart skip a beat every single day."</p>
        </section>

        <section className="game-card">
          <h3>Truth or Dare 🎲</h3>
          <div className="btn-row">
            <button onClick={() => set(ref(db, `couples/${coupleCode}/game`), { type: 'Truth', task: 'First crush name?', sender: user.uid })}>Truth</button>
            <button onClick={() => set(ref(db, `couples/${coupleCode}/game`), { type: 'Dare', task: 'Send a funny selfie!', sender: user.uid })}>Dare</button>
          </div>
          {game.task && <div className="game-task"><b>{game.type}:</b> {game.task}</div>}
        </section>
      </div>

      {/* Vibes & Shayaries */}
      <section className="vibes-section">
        <h3>Vibes & Shayaries 🎵</h3>
        <input placeholder="Spotify/YT Link" value={songLink} onChange={e => setSongLink(e.target.value)} />
        <button onClick={() => { push(ref(db, `couples/${coupleCode}/playlist`), { title: "New Song", link: songLink }); setSongLink(""); }}>Add Vibe</button>
        
        <div className="shayari-box">
          <textarea className={isCursiveShayari ? 'cursive' : ''} placeholder="Write Shayari..." value={shayariText} onChange={e => setShayariText(e.target.value)} />
          <div className="btn-row">
            <button onClick={() => setIsCursiveShayari(!isCursiveShayari)}>Change Font</button>
            <button onClick={() => { push(ref(db, `couples/${coupleCode}/shayaris`), { text: shayariText, cursive: isCursiveShayari }); setShayariText(""); }}>Post</button>
          </div>
        </div>
      </section>

      {/* Bucket List */}
      <section className="bucket-list">
        <h3>Our Bucket List 🎒</h3>
        <input placeholder="Next Goal..." onChange={e => setGoalText(e.target.value)} />
        <input placeholder="Image URL..." onChange={e => setGoalImg(e.target.value)} />
        <button onClick={() => push(ref(db, `couples/${coupleCode}/bucketList`), { text: goalText, img: goalImg })}>Add Goal</button>
        <div className="gallery">
          {bucketList.map((item, i) => (
            <div key={i} className="gallery-item">
              <img src={item.img} alt="goal" />
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Journey & Daily Q */}
      <section className="journey-section">
        <div className="daily-q-box">
          <h4>{currentQuestion}</h4>
          <textarea placeholder="Your answer..." value={answer} onChange={e => setAnswer(e.target.value)} />
          <button onClick={() => { push(ref(db, `couples/${coupleCode}/history`), { q: currentQuestion, a: answer, date: new Date().toDateString() }); setAnswer(""); }}>Save Memory</button>
        </div>
        <div className="timeline">
          {history.map((h, i) => (
            <div key={i} className="memory-card">
              <small>{h.date}</small>
              <p><b>Q:</b> {h.q}</p>
              <p><b>A:</b> {h.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;