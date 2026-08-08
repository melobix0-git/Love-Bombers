import { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { SONG_MAP } from '../config';
import EmojiBackground from './EmojiBackground';

export default function ViewerPage({ crushName, myName, color, meal, place, img, song }) {
  // Safe color formatting: Ensure leading '#' hex symbol exists
  const themeColor = color ? (color.startsWith('#') ? color : `#${color}`) : '#800020';

  // Safe image decoding fallback
  let imageUrl = img || '';
  if (imageUrl) {
    try {
      imageUrl = decodeURIComponent(imageUrl);
    } catch (e) {
      console.warn('Could not decode image URL:', e);
    }
  }

  const [accepted, setAccepted] = useState(false);
  const [noCount, setNoCount] = useState(0);
  const [yesCount, setYesCount] = useState(0);
  const [hearts, setHearts] = useState([]);
  const [form, setForm] = useState({ date: '', time: '' });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const noMessages = [
    "No o", 
    "Abeg nau, wahala", 
    "Ehn, ahh don mad",
    "Na so?", 
    "God abeg!", 
    "Oya, try again o!",
    "Don't be stubborn 🥺", 
    "Ah! My heart!"
  ];

  const yesMessages = [
    "Yes, Gbam! 💖", 
    "Wait you mean am 🥺", 
    "Are you sure 🥺 ", 
    "Oh she's serious 🥺🥺", 
    "My heart don skip 💖", 
    "You're too sweet 🥺🥺", 
    "Thank you 🥺🥺🥺", 
    "Let's gooo 💖"
  ];

  const getNoMessage = () => noMessages[Math.min(noCount, noMessages.length - 1)];

  const getNoButtonStyle = () => {
    if (noCount === 0) return {};
    const x = Math.random() * 70 + 10;
    const y = Math.random() * 70 + 10;
    return { 
      position: 'absolute', 
      left: `${x}%`, 
      top: `${y}%`, 
      transition: 'all 0.2s ease-in-out' 
    };
  };

  const getYesButtonStyle = () => {
    if (yesCount === 0) return { transform: 'scale(1)' };
    return {
      transform: `scale(1.08) translate(${Math.sin(yesCount) * 4}px, ${Math.cos(yesCount) * 3}px)`,
      transition: 'all 0.3s cubic-bezier(0.175, 0.225, 0.132, 0.275)'
    };
  };

  const createHeart = () => {
    const id = Date.now();
    setHearts((prev) => [
      ...prev,
      {
        id,
        left: Math.random() * 80 + 10,
        emoji: ["❤️", "💕", "💖", "💘", "💝"][Math.floor(Math.random() * 5)],
      },
    ]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((heart) => heart.id !== id));
    }, 1500);
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn("Audio play blocked:", e));
    }
  };

  const handleYesClick = () => {
    createHeart();

    if (yesCount < yesMessages.length - 1) {
      setYesCount((prev) => prev + 1);
    } else {
      setAccepted(true);

      // Trigger multi-stage confetti explosion
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 100 }), 400);

      // Play chosen background song if selected
      if (audioRef.current && song !== 'none') {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.warn("Autoplay blocked:", e));
      }
    }
  };

  const getCalendarLink = () => {
    if (!form.date || !form.time) return '#';
    const start = new Date(`${form.date}T${form.time}`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    const fmt = (d) => d.toISOString().replace(/-|:|\.\d{3}/g, '');
    const text = encodeURIComponent(`Date with ${myName} ❤️`);
    const details = encodeURIComponent(`We are eating ${meal} at ${place}! Can't wait! 😘`);
    const location = encodeURIComponent(place);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  };

  const formatLocalDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toDateString();
  };

  const hasValidImage = Boolean(imageUrl && imageUrl.trim() !== '');

  return (
    <div className="container viewer-container">
      {/* Dynamic WhatsApp/Telegram style background wallpaper */}
      <EmojiBackground themeColor={themeColor} />

      {/* Background Audio Source */}
      {song !== 'none' && SONG_MAP[song] && (
        <audio ref={audioRef} src={SONG_MAP[song]} loop />
      )}

      {/* Music Control Toggle Button */}
      {song !== 'none' && SONG_MAP[song] && (
        <button 
          type="button" 
          className="audio-toggle-btn" 
          onClick={toggleAudio}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 100,
            background: 'rgba(17, 17, 17, 0.85)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '30px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
          }}
        >
          {isPlaying ? '🎵 Pause Music' : '🎶 Play Song'}
        </button>
      )}

      {/* Floating Hearts */}
      <div className="hearts-container">
        {hearts.map((heart) => (
          <span 
            key={heart.id} 
            className="floating-heart" 
            style={{ left: `${heart.left}%` }}
          >
            {heart.emoji}
          </span>
        ))}
      </div>

      {/* STAGE 1: QUESTION */}
      {!accepted && !form.date && (
        <div className="card invitation-card">
          {hasValidImage ? (
            <div className="heart-frame-container">
              <div className="heart-frame" style={{ backgroundColor: themeColor }}>
                <img src={imageUrl} alt={crushName} className="crush-img" />
              </div>
            </div>
          ) : (
            <div className="heart-frame-container">
              <div className="heart-frame" style={{ backgroundColor: themeColor }}>
                <span style={{ fontSize: '3rem', color: '#fff' }}>💖</span>
              </div>
            </div>
          )}
          
          <h1 className="title" style={{ color: themeColor }}>
            {crushName}, will you be my date? 🥺
          </h1>

          <div className="button-wrapper" style={{ position: 'relative', minHeight: '120px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button 
              className="btn yes-btn" 
              style={{ background: themeColor, ...getYesButtonStyle() }} 
              onClick={handleYesClick}
            >
              {yesMessages[yesCount]}
            </button>

            <button 
              className="btn no-btn" 
              onClick={() => setNoCount((prev) => prev + 1)} 
              onMouseEnter={() => {
                if (noCount > 0) setNoCount((prev) => prev + 1);
              }}
              style={getNoButtonStyle()}
            >
              {getNoMessage()}
            </button>
          </div>
          <p className="sub-text">(No wahala, just click yes! 😄)</p>
        </div>
      )}

      {/* STAGE 2: DATE & TIME FORM */}
      {accepted && !form.date && (
        <div className="card">
          <h2 className="form-title" style={{ color: themeColor }}>Arewà, make we plan this date! 😍</h2>
          <form 
            className="date-form" 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              setForm({ date: formData.get('date'), time: formData.get('time') });
            }}
          >
            <p className="summary-preview" style={{ borderLeftColor: themeColor }}>
              🍛 <strong>Meal:</strong> {meal} <br/>
              📍 <strong>Place:</strong> {place}
            </p>

            <label htmlFor="date-input">Which day? 📅</label>
            <input id="date-input" type="date" name="date" required />
            
            <label htmlFor="time-input">What time? ⏰</label>
            <input id="time-input" type="time" name="time" required />
            
            <button type="submit" className="btn submit-btn" style={{ background: themeColor }}>
              Oya, make we go! 💃
            </button>
          </form>
        </div>
      )}

      {/* STAGE 3: SUCCESS & GOOGLE CALENDAR */}
      {accepted && form.date && (
        <div className="card success-card">
          <div className="celebration-badge" style={{ backgroundColor: themeColor }}>
            🎉 IT'S A DATE! 🎉
          </div>

          <h1 className="title success-title" style={{ color: themeColor }}>
            No Worry, I go Flex you die! ❤️
          </h1>
          <p className="success-text">Omo, I can't wait to see you! 😘</p>

          {/* Styled Details Grid */}
          <div className="details-grid">
            <div className="detail-chip">
              <span className="chip-icon">🍛</span>
              <div>
                <span className="chip-label">Meal</span>
                <strong className="chip-value">{meal}</strong>
              </div>
            </div>

            <div className="detail-chip">
              <span className="chip-icon">📍</span>
              <div>
                <span className="chip-label">Place</span>
                <strong className="chip-value">{place}</strong>
              </div>
            </div>

            <div className="detail-chip">
              <span className="chip-icon">📅</span>
              <div>
                <span className="chip-label">Date</span>
                <strong className="chip-value">{formatLocalDate(form.date)}</strong>
              </div>
            </div>

            <div className="detail-chip">
              <span className="chip-icon">⏰</span>
              <div>
                <span className="chip-label">Time</span>
                <strong className="chip-value">{form.time}</strong>
              </div>
            </div>
          </div>

          {/* Primary Calendar Action */}
          <a
            href={getCalendarLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn calendar-btn"
            style={{ backgroundColor: themeColor }}
          >
            📅 Add to Google Calendar
          </a>
        </div>
      )}

      {/* Playful Flex Subtext */}
      <p className="guy-flex-text">
        Normal guys send texts, but I built you a whole website. I'm not like other guys 😉
      </p>
    </div>
  );
}
