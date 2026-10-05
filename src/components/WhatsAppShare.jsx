import { useState } from 'react';

export default function WhatsAppShare({ generatedUrl, crushName, myName }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const shareMessage = `Hey ${crushName || 'there'}! ${myName || 'Someone special'} created a special date invitation for you 💖\n\nOpen it here: ${generatedUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedUrl);
      } else {
        const helper = document.createElement('textarea');
        helper.value = generatedUrl;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
      }
      setCopyError('');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopyError('Copy was blocked. Please select the link above and copy it manually.');
    }
  };

  if (!generatedUrl) return null;

  return (
    <div className="share-card-container">
      <h2 className="share-title">Your date bomb is ready 💣✨</h2>
      <p className="share-subtext">Send it directly on WhatsApp or copy the link to share anywhere.</p>

      <div className="share-buttons-wrapper">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn whatsapp-btn">
          <span className="btn-icon" aria-hidden="true">📲</span> Send on WhatsApp
        </a>
        <button type="button" onClick={handleCopy} className="btn copy-btn">
          <span className="btn-icon" aria-hidden="true">📋</span> {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {copied && <div className="toast-notification" role="status">Copied to clipboard! Go drop the bomb 💣</div>}
      {copyError && <p className="field-help form-error" role="alert">{copyError}</p>}
    </div>
  );
}
