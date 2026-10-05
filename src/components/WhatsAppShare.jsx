import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function WhatsAppShare({ generatedUrl, crushName, myName }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [shareError, setShareError] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [qrForUrl, setQrForUrl] = useState('');

  const shareMessage = `Hey ${crushName || 'there'}! ${myName || 'Someone special'} created a special date invitation for you 💖`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareMessage}\n\nOpen it here: ${generatedUrl}`)}`;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    let cancelled = false;
    if (!showQr || !generatedUrl) return undefined;

    QRCode.toDataURL(generatedUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#800020', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrCode(dataUrl);
          setQrForUrl(generatedUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setShareError('The QR code could not be generated.');
      });

    return () => { cancelled = true; };
  }, [generatedUrl, showQr]);

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: 'Love Bomber invitation', text: shareMessage, url: generatedUrl });
      setShareError('');
    } catch (error) {
      if (error.name !== 'AbortError') setShareError('Sharing was not completed. You can still copy the link.');
    }
  };

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
      <p className="share-subtext">Send it directly, copy the link, or let someone scan it.</p>

      <div className="share-buttons-wrapper">
        {canNativeShare && <button type="button" onClick={handleNativeShare} className="btn native-share-btn"><span aria-hidden="true">📤</span> Share</button>}
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn whatsapp-btn"><span aria-hidden="true">📲</span> WhatsApp</a>
        <button type="button" onClick={handleCopy} className="btn copy-btn"><span aria-hidden="true">📋</span> {copied ? 'Copied!' : 'Copy link'}</button>
        <button type="button" onClick={() => { setShowQr((visible) => !visible); setShareError(''); }} className="btn qr-btn"><span aria-hidden="true">🔳</span> {showQr ? 'Hide QR' : 'Show QR'}</button>
      </div>

      {showQr && (
        <div className="qr-panel">
          {qrCode && qrForUrl === generatedUrl ? <img className="qr-image" src={qrCode} alt="QR code for this Love Bomber invitation" /> : <p className="field-help">Generating your QR code…</p>}
          {qrCode && qrForUrl === generatedUrl && <a className="text-button" href={qrCode} download="love-bomber-invitation-qr.png">Download QR code</a>}
        </div>
      )}

      {copied && <div className="toast-notification" role="status">Copied to clipboard! Go drop the bomb 💣</div>}
      {copyError && <p className="field-help form-error" role="alert">{copyError}</p>}
      {shareError && <p className="field-help form-error" role="alert">{shareError}</p>}
    </div>
  );
}
