import React, { useState } from 'react';

export default function WhatsAppShare({ generatedUrl, crushName, myName }) {
  const [copied, setCopied] = useState(false);

  // Craft a playful custom message with Nigerian Pidgin flair
  const shareMessage = `Hey ${crushName || 'Arewà'}! ${myName || 'Someone'} created a special date invitation for you 💖\n\nCheck it out here: ${generatedUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!generatedUrl) return null;

  return (
    <div className="share-card-container">
      <h3 className="share-title">Your Date Bomb is Ready! 💣✨</h3>
      <p className="share-subtext">Send it directly on WhatsApp or copy the link to share anywhere.</p>

      <div className="share-buttons-wrapper">
        {/* Send Direct to WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn whatsapp-btn"
        >
          <span className="btn-icon">📲</span> Send on WhatsApp
        </a>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopy}
          className="btn copy-btn"
        >
          <span className="btn-icon">📋</span> {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      {/* Toast Notification */}
      {copied && (
        <div className="toast-notification">
          Copied to clipboard! Go drop the bomb 💣
        </div>
      )}
    </div>
  );
}