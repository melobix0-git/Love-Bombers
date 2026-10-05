import { useState } from 'react';
import EmojiBackground from './EmojiBackground';
import WhatsAppShare from './WhatsAppShare';

function formatDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusDetails(status, selectedDate, selectedTime) {
  if (status === 'accepted' && selectedDate && selectedTime) {
    return {
      icon: '🎉',
      title: 'It’s a date!',
      message: `${formatDate(selectedDate)} at ${selectedTime}`,
      className: 'accepted',
    };
  }
  if (status === 'accepted') {
    return {
      icon: '💖',
      title: 'They said yes!',
      message: 'They accepted and are choosing a date and time.',
      className: 'accepted',
    };
  }
  if (status === 'declined') {
    return {
      icon: '💛',
      title: 'They declined this invitation',
      message: 'No hard feelings. Thanks for putting yourself out there.',
      className: 'declined',
    };
  }
  return {
    icon: '⏳',
    title: 'Waiting for a response',
    message: 'Share the invitation and check back here later.',
    className: 'pending',
  };
}

export default function CreatorStatusPage({
  id,
  myName = 'Someone special',
  crushName = 'Your date',
  color = '#800020',
  meal = 'A meal together',
  place = 'Somewhere special',
  status = 'pending',
  selectedDate = '',
  selectedTime = '',
  dateMode = 'recipient',
  dateOptions = [],
  expiresAt,
}) {
  const [copied, setCopied] = useState(false);
  const themeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#800020';
  const details = statusDetails(status, selectedDate, selectedTime);
  const invitationUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(id)}`;

  const copyStatusLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="container status-container">
      <EmojiBackground themeColor={themeColor} />
      <section className="card creator-status-card">
        <p className="eyebrow">PRIVATE CREATOR STATUS</p>
        <h1 className="form-title" style={{ color: themeColor }}>{myName} → {crushName}</h1>
        <div className={`status-hero ${details.className}`}>
          <span className="status-hero-icon" aria-hidden="true">{details.icon}</span>
          <h2>{details.title}</h2>
          <p>{details.message}</p>
        </div>

        <div className="status-details">
          <div><span>🍛 Meal</span><strong>{meal}</strong></div>
          <div><span>📍 Location</span><strong>{place}</strong></div>
          {dateMode === 'suggestions' && <div><span>🗓️ Options</span><strong>{dateOptions.length} suggested</strong></div>}
          {expiresAt && <div><span>⌛ Link expires</span><strong>{new Date(expiresAt).toLocaleDateString()}</strong></div>}
        </div>

        <div className="status-actions">
          <button type="button" className="btn secondary-btn" onClick={() => window.location.reload()}>Refresh status</button>
          <button type="button" className="btn copy-btn" onClick={copyStatusLink}>{copied ? 'Status link copied' : 'Copy status link'}</button>
        </div>

        <WhatsAppShare generatedUrl={invitationUrl} crushName={crushName} myName={myName} />
      </section>
    </div>
  );
}
