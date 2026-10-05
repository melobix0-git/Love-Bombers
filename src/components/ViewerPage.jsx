import { useState } from 'react';
import confetti from 'canvas-confetti';
import { getForegroundForColor, SOUND_OPTIONS } from '../config';
import { trackEvent } from '../analytics';
import { getInvitationCopy } from '../copy';
import { playRomanticChime } from '../sounds';
import EmojiBackground from './EmojiBackground';

function localDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#800020';
}

function formatLocalDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalizePhone(value) {
  return (value || '').replace(/\D/g, '');
}

function calendarDateValue(date, time) {
  return `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;
}

export default function ViewerPage({
  id = '',
  crushName = 'My Crush',
  myName = 'Someone special',
  senderPhone = '',
  senderEmail = '',
  status = 'pending',
  selectedDate = '',
  selectedTime = '',
  dateMode = 'recipient',
  dateOptions = [],
  color = '#800020',
  meal = 'A meal together',
  place = 'Somewhere special',
  img = '',
  sound = 'romantic_chime',
  template = 'classic',
  locale = 'en',
  tone = 'romantic',
  customMessage = '',
  playfulNo = false,
}) {
  const themeColor = safeColor(color);
  const foregroundColor = getForegroundForColor(themeColor);
  const copy = getInvitationCopy(locale, tone, crushName);
  const imageUrl = typeof img === 'string' && img.trim() ? img : '';
  const hasSound = SOUND_OPTIONS.some((option) => option.value === sound) && sound !== 'none';
  const [accepted, setAccepted] = useState(status === 'accepted');
  const [declined, setDeclined] = useState(status === 'declined');
  const [noCount, setNoCount] = useState(0);
  const [noPosition, setNoPosition] = useState(null);
  const [hearts, setHearts] = useState([]);
  const [form, setForm] = useState({ date: selectedDate, time: selectedTime });
  const [selectedOption, setSelectedOption] = useState(selectedDate && selectedTime ? `${selectedDate}|${selectedTime}` : '');
  const [isSaving, setIsSaving] = useState(false);
  const [responseError, setResponseError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  const createHeart = () => {
    const heart = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      left: Math.random() * 80 + 10,
      emoji: ['❤️', '💕', '💖', '💘', '💝'][Math.floor(Math.random() * 5)],
    };
    setHearts((previous) => [...previous, heart]);
    window.setTimeout(() => setHearts((previous) => previous.filter((item) => item.id !== heart.id)), 1500);
  };

  const moveNoButton = () => {
      setNoPosition({
        position: 'absolute',
        left: `${Math.random() * 62 + 19}%`,
        top: `${Math.random() * 55 + 22}%`,
      });
  };

  const saveResponse = async ({ status, date = '', time = '' }) => {
    if (!id) return true;
    setIsSaving(true);
    setResponseError('');

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', id, status, date, time }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Your response could not be saved.');
      trackEvent('invitation_response', { status, hasDate: Boolean(date && time), dateMode });
      return true;
    } catch (error) {
      setResponseError(error.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleYesClick = async () => {
    const saved = await saveResponse({ status: 'accepted' });
    if (!saved) return;

    const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    if (!reducedMotion) {
      createHeart();
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      window.setTimeout(() => confetti({ particleCount: 100, spread: 100 }), 400);
    }
    setAccepted(true);
    if (hasSound && sound === 'romantic_chime' && !reducedMotion) playRomanticChime();
  };

  const handleNoClick = async () => {
    if (playfulNo && noCount < 2) {
      setNoCount((count) => count + 1);
      moveNoButton();
      return;
    }

    const saved = await saveResponse({ status: 'declined' });
    if (saved) setDeclined(true);
  };

  const handleDateSubmit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let date = data.get('date');
    let time = data.get('time');

    if (dateMode === 'suggestions') {
      const [suggestedDate, suggestedTime] = String(data.get('suggestedOption') || '').split('|');
      date = suggestedDate;
      time = suggestedTime;
      if (!date || !time) {
        setResponseError('Please choose one of the suggested dates.');
        return;
      }
    }

    const saved = await saveResponse({ status: 'accepted', date, time });
    if (saved) setForm({ date, time });
  };

  const getCalendarLink = () => {
    if (!form.date || !form.time) return '#';
    const start = calendarDateValue(form.date, form.time);
    const [year, month, day] = form.date.split('-').map(Number);
    const [hours, minutes] = form.time.split(':').map(Number);
    const endDate = new Date(year, month - 1, day, hours, minutes);
    endDate.setHours(endDate.getHours() + 2);
    const endDateString = [
      endDate.getFullYear(),
      String(endDate.getMonth() + 1).padStart(2, '0'),
      String(endDate.getDate()).padStart(2, '0'),
    ].join('-');
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    const end = calendarDateValue(endDateString, endTime);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const text = encodeURIComponent(`Date with ${myName} ❤️`);
    const details = encodeURIComponent(customMessage || `We are having ${meal} at ${place}. Can't wait!`);
    const location = encodeURIComponent(place);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&ctz=${encodeURIComponent(timezone)}&details=${details}&location=${location}`;
  };

  const responseText = encodeURIComponent(
    `Hi ${myName}! ${crushName} accepted the invitation 💖${form.date ? `\n\nDate: ${formatLocalDate(form.date)} at ${form.time}` : ''}${place ? `\nLocation: ${place}` : ''}`,
  );
  const phone = normalizePhone(senderPhone);
  const whatsappLink = phone ? `https://wa.me/${phone}?text=${responseText}` : '';
  const emailLink = senderEmail
    ? `mailto:${encodeURIComponent(senderEmail)}?subject=${encodeURIComponent(`${crushName} accepted your invitation 💖`)}&body=${responseText}`
    : '';

  return (
    <div className={`container viewer-container template-${template}`}>
      <EmojiBackground themeColor={themeColor} />

      <div className="hearts-container" aria-hidden="true">
        {hearts.map((heart) => (
          <span key={heart.id} className="floating-heart" style={{ left: `${heart.left}%` }}>{heart.emoji}</span>
        ))}
      </div>

      {responseError && <p className="floating-error" role="alert">{responseError}</p>}

      {declined && (
        <section className="card state-card decline-card">
          <div className="state-icon" aria-hidden="true">💛</div>
          <h1 className="title" style={{ color: themeColor }}>{copy.declineTitle}</h1>
          <p className="state-message">{copy.declineText}</p>
        </section>
      )}

      {!declined && !accepted && (
        <section className="card invitation-card">
          <div className="heart-frame-container">
            <div className="heart-frame" style={{ backgroundColor: themeColor }}>
              {imageUrl && !imageFailed ? <img src={imageUrl} onError={() => setImageFailed(true)} alt={`A photo shared by ${myName}`} className="crush-img" /> : <span className="heart-placeholder" aria-hidden="true">💖</span>}
            </div>
          </div>

          <p className="eyebrow">A PERSONAL INVITATION FOR YOU</p>
          <h1 className="title" style={{ color: themeColor }}>{copy.question}</h1>
          {customMessage && <p className="custom-message">“{customMessage}”</p>}

          <div className="button-wrapper" style={{ position: 'relative' }}>
            <button className="btn yes-btn" style={{ background: themeColor, color: foregroundColor }} onClick={handleYesClick} disabled={isSaving}>
              {isSaving ? 'Saving your answer…' : copy.yes}
            </button>
            <button
              className="btn no-btn"
              onClick={handleNoClick}
              onMouseEnter={() => {
                if (playfulNo && noCount < 2) moveNoButton();
              }}
              style={noPosition || undefined}
              disabled={isSaving}
            >
              {playfulNo && noCount < copy.noMessages.length ? copy.noMessages[noCount] : copy.no}
            </button>
          </div>
          <p className="sub-text">No pressure. Choose what feels right for you.</p>
        </section>
      )}

      {!declined && accepted && !form.date && (
        <section className="card">
          <p className="eyebrow">STEP TWO</p>
          <h2 className="form-title" style={{ color: themeColor }}>{copy.planTitle}</h2>
          <p className="summary-preview" style={{ borderLeftColor: themeColor }}>
            {copy.planSummary}<br />
            🍛 <strong>Meal:</strong> {meal}<br />
            📍 <strong>Place:</strong> {place}
          </p>

          <form className="date-form" onSubmit={handleDateSubmit}>
            {dateMode === 'suggestions' && dateOptions.length > 0 ? (
              <div className="date-option-choices" role="radiogroup" aria-label="Suggested date options">
                <p className="field-help">Choose the option that works best for you.</p>
                {dateOptions.map((option, index) => {
                  const optionValue = `${option.date}|${option.time}`;
                  return (
                    <label className={`date-option-card ${selectedOption === optionValue ? 'selected' : ''}`} key={optionValue}>
                      <input
                        type="radio"
                        name="suggestedOption"
                        value={optionValue}
                        checked={selectedOption === optionValue}
                        onChange={(event) => setSelectedOption(event.target.value)}
                        required={index === 0}
                      />
                      <span><strong>Option {index + 1}</strong>{formatLocalDate(option.date)} at {option.time}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <>
                <label htmlFor="date-input">{copy.dateLabel}</label>
                <input id="date-input" type="date" name="date" min={localDateString()} required />
                <label htmlFor="time-input">{copy.timeLabel}</label>
                <input id="time-input" type="time" name="time" required />
              </>
            )}
            <button type="submit" className="btn submit-btn" style={{ background: themeColor, color: foregroundColor }} disabled={isSaving}>
              {isSaving ? 'Saving…' : copy.submit}
            </button>
          </form>
        </section>
      )}

      {!declined && accepted && form.date && (
        <section className="card success-card">
          <div className="celebration-badge" style={{ backgroundColor: themeColor, color: foregroundColor }}>🎉 {copy.successTitle} 🎉</div>
          <h1 className="title success-title" style={{ color: themeColor }}>{copy.successTitle}</h1>
          <p className="success-text">{copy.successText}</p>

          <div className="details-grid">
            <div className="detail-chip"><span className="chip-icon">🍛</span><div><span className="chip-label">Meal</span><strong className="chip-value">{meal}</strong></div></div>
            <div className="detail-chip"><span className="chip-icon">📍</span><div><span className="chip-label">Place</span><strong className="chip-value">{place}</strong></div></div>
            <div className="detail-chip"><span className="chip-icon">📅</span><div><span className="chip-label">Date</span><strong className="chip-value">{formatLocalDate(form.date)}</strong></div></div>
            <div className="detail-chip"><span className="chip-icon">⏰</span><div><span className="chip-label">Time</span><strong className="chip-value">{form.time}</strong></div></div>
          </div>

          <a href={getCalendarLink()} onClick={() => trackEvent('calendar_added', { dateMode })} target="_blank" rel="noopener noreferrer" className="btn calendar-btn" style={{ backgroundColor: themeColor, color: foregroundColor }}>
            📅 Add to Google Calendar
          </a>

          {(whatsappLink || emailLink) && (
            <div className="notify-card">
              <h3>Tell {myName} the good news</h3>
              <p className="field-help">Your response has been saved. You can also send it directly.</p>
              <div className="notification-actions">
                {whatsappLink && <a className="btn whatsapp-btn" href={whatsappLink} target="_blank" rel="noopener noreferrer">📲 WhatsApp</a>}
                {emailLink && <a className="btn email-btn" href={emailLink}>✉️ Email</a>}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex-pill-box">{copy.footer}</div>
    </div>
  );
}
