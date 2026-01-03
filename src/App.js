import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase'; 
import { 
  ref, push, set, onValue, remove, update, limitToLast, query, serverTimestamp 
} from "firebase/database";
import { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser
} from "firebase/auth";
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [coupleCode, setCoupleCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);


  const [history, setHistory] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [messages, setMessages] = useState([]);
  const [shayaris, setShayaris] = useState([]); 
  const [game, setGame] = useState({ type: '', task: '', sender: '' });
  
  const [answer, setAnswer] = useState("");
  const [songLink, setSongLink] = useState("");
  const [shayariText, setShayariText] = useState("");
  const [note, setNote] = useState(""); 
  const [displayNote, setDisplayNote] = useState(""); 
  const [milestone, setMilestone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [chatImage, setChatImage] = useState(""); 

  const [myMood, setMyMood] = useState("🤍");
  const [partnerMood, setPartnerMood] = useState("🤍");
  const [nudgeShake, setNudgeShake] = useState(false); 
  const [anniversaryDate, setAnniversaryDate] = useState("2024-01-01");
  const [birthdayDate, setBirthdayDate] = useState("2024-06-15");

  const chatEndRef = useRef(null);
  const cameraInputRef = useRef(null);

 
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("⚠ WARNING: Are you sure? This will delete your account and shared memories forever!");
    if (!confirmDelete) return;
    try {
      const currentUser = auth.currentUser;
      await remove(ref(db, `users/${currentUser.uid}`));
      await deleteUser(currentUser);
      alert("Account deleted successfully.");
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        alert("Security Rule: Please Logout and Login again, then try deleting immediately.");
      }
    }
  };

  
  const getMediaEmbed = (url) => {
    if (!url) return { type: 'link', url: '' };
    if (url.includes('spotify.com')) {
      const id = url.split('track/')[1]?.split('?')[0];
      return { type: 'spotify', url: `https://open.spotify.com/embed/track/${id}` };
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let id = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('.be/')[1]?.split('?')[0];
      return { type: 'youtube', url: `https://www.youtube.com/embed/${id}` };
    }
    return { type: 'link', url: url };
  };

  const getCountdown = (targetDate) => {
    const today = new Date();
    const target = new Date(today.getFullYear(), new Date(targetDate).getMonth(), new Date(targetDate).getDate());
    if (today > target) target.setFullYear(today.getFullYear() + 1);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return (diff === 365 || diff === 0) ? "Today! 🎉" : `${diff} Days`;
  };

  const getDaysOfUs = () => {
    const start = new Date(anniversaryDate);
    const diff = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const dailyQuestions = ["Favourite quality about me?", "First impression of me?", "Dream date location?", "Our best memory?", "No phones for a day - what do we do?"];
  const currentQuestion = dailyQuestions[Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24)) % dailyQuestions.length];

  
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
            onValue(ref(db, `couples/${code}/game`), (s) => setGame(s.val() || { type: '', task: '', sender: '' }));
            onValue(ref(db, `couples/${code}/nudge/${currentUser.uid}`), (s) => {
              if (s.val()) {
                setNudgeShake(true);
                setTimeout(() => { setNudgeShake(false); remove(ref(db, `couples/${code}/nudge/${currentUser.uid}`)); }, 1000);
              }
            });
            onValue(ref(db, `couples/${code}/playlist`), (s) => setPlaylist(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/shayaris`), (s) => setShayaris(s.val() ? Object.keys(s.val()).map(k => ({ id: k, ...s.val()[k] })).reverse() : []));
            onValue(ref(db, `couples/${code}/logs`), (s) => setHistory(s.val() ? Object.values(s.val()).reverse() : []));
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

  const handleCamera = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setChatImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const sendChatMessage = async (e) => {
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
        <input className="modern-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="modern-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="primary-btn" onClick={() => (isLogin ? signInWithEmailAndPassword(auth, email, password) : createUserWithEmailAndPassword(auth, email, password))}>{isLogin ? "Login" : "Join Us"}</button>
        <p className="toggle-auth" onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Create Account" : "Back to Login"}</p>
      </div>
    </div>
  );

  return (
    <div className={`container ${nudgeShake ? 'nudge-shake' : ''}`}>
      <div className="user-bar">
        <span>🔒 {coupleCode}</span>
        <div style={{display:'flex', gap:'8px'}}>
          <button className="delete-btn-minimal" onClick={handleDeleteAccount}>Delete</button>
          <button className="logout-btn-minimal" onClick={() => signOut(auth)}>Logout</button>
        </div>
      </div>

     
      <div className="card settings-card">
        <h4 className="cursive-text">Special Dates 📅</h4>
        <div className="flex-row">
          <div><small>Anniversary</small><input type="date" value={anniversaryDate} onChange={(e) => {setAnniversaryDate(e.target.value); update(ref(db, `couples/${coupleCode}/settings`), {anniversary: e.target.value})}} /></div>
          <div><small>Partner Birthday</small><input type="date" value={birthdayDate} onChange={(e) => {setBirthdayDate(e.target.value); update(ref(db, `couples/${coupleCode}/settings`), {birthday: e.target.value})}} /></div>
        </div>
      </div>

      <div className="countdown-grid">
        <div className="date-pill"><h4>Together</h4><p>{getDaysOfUs()} Days</p></div>
        <div className="date-pill"><h4>Anniversary</h4><p>{getCountdown(anniversaryDate)}</p></div>
        <div className="date-pill"><h4>Birthday</h4><p>{getCountdown(birthdayDate)}</p></div>
      </div>

      
      <div className="card mood-chat-grid large-chat-container">
        <div className="mood-header">
           <div className="mood-item">
             <div className="emoji-picker large-emoji-mood">
              {["❤️", "💖", "😴", "😊", "🔥", "😭", "😤", "🥰", "🥳", "🥺"].map(e => (
                <button key={e} onClick={() => set(ref(db, `couples/${coupleCode}/moods/${user.uid}`), e)} className={myMood === e ? "active-mood" : ""}>{e}</button>
              ))}
            </div>
           </div>
           <div className="mood-item">
             <div className="partner-emoji-display large-emoji-display" onClick={triggerNudge}>{partnerMood}</div>
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
        
        <form className="chat-input-bar" onSubmit={sendChatMessage}>
           <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{display:'none'}} onChange={handleCamera} />
           <textarea className="chat-textarea original-font" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Type a message..." />
           <div className="chat-actions-row">
             <button type="button" className="camera-trigger" onClick={() => cameraInputRef.current.click()}>📸</button>
             <button type="submit" className="send-btn">🕊️</button>
           </div>
        </form>
      </div>

     
      <div className="card game-card">
        <h3 className="cursive-text">Wanna play Truth or Dare? 🎲</h3>
        <div className="flex-row">
          <button className="truth-btn" onClick={() => { const t = prompt("Truth for partner:"); if(t) set(ref(db, `couples/${coupleCode}/game`), { type: 'Truth', task: t, sender: user.uid }); }}>Truth</button>
          <button className="dare-btn" onClick={() => { const d = prompt("Dare for partner:"); if(d) set(ref(db, `couples/${coupleCode}/game`), { type: 'Dare', task: d, sender: user.uid }); }}>Dare</button>
        </div>
        {game.task && (
          <div className="game-box animate-pop">
            <p><strong>{game.type}:</strong> {game.task}</p>
            {game.sender !== user.uid && <button className="clear-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/game`))}>Done ✅</button>}
          </div>
        )}
      </div>

      
      <div className="card">
        <h3 className="cursive-text">Write a Love Note 💌</h3>
        <input className="modern-input cursive-text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Say something sweet..." />
        <button className="primary-btn" onClick={() => { if(!note) return; set(ref(db, `couples/${coupleCode}/notes/${user.uid}`), note); setNote(""); }}>Post Note</button>
      </div>
      {displayNote && <div className="sticky-note-card animate-pop cursive-text"><p>"{displayNote}"</p><button className="clear-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/notes`))}>Read & Clear 📌</button></div>}

      {}
      <div className="card vibe-card">
        <h3>Vibes & Shayaries 🎵✍️</h3>
        <div className="input-group">
          <input className="modern-input" value={songLink} onChange={(e) => setSongLink(e.target.value)} placeholder="Spotify Link" />
          <button className="plus-btn" onClick={() => { if(!songLink) return; push(ref(db, `couples/${coupleCode}/playlist`), { link: songLink, user: user.email.split('@')[0] }); setSongLink(""); }}>+</button>
        </div>
        <div className="vibe-scroller">
          {playlist.map(s => {
            const media = getMediaEmbed(s.link);
            return (
              <div key={s.id} className="player-card">
                <div className="player-header">
                  <small>{s.user}'s Vibe</small>
                  <button className="rm-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/playlist/${s.id}`))}>×</button>
                </div>
                
                <iframe 
                  src={media.url} 
                  width="100%" 
                 
                  height={media.type === 'youtube' ? "300" : "80"} 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  style={{ borderRadius: '15px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}
                ></iframe>
              </div>
            );
          })}
     </div>
        </div>
        <div className="input-group" style={{marginTop:'20px'}}>
          <textarea className="modern-textarea cursive-text" value={shayariText} onChange={(e) => setShayariText(e.target.value)} placeholder="Write Shayari" />
          <button className="plus-btn" onClick={() => { if(!shayariText) return; push(ref(db, `couples/${coupleCode}/shayaris`), { text: shayariText, user: user.email.split('@')[0] }); setShayariText(""); }}>+</button>
        </div>
        <div className="vibe-scroller">
          {shayaris.map(sh => <div key={sh.id} className="shayari-item cursive-text">"{sh.text}"<button className="rm-btn" onClick={() => remove(ref(db, `couples/${coupleCode}/shayaris/${sh.id}`))}>×</button></div>)}
        </div>
      <div className="card journey-input">
        <p className="daily-q cursive-text">"{currentQuestion}"</p>
        <textarea className="modern-textarea" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your memory..." />
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