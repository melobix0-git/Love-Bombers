import { useState } from 'react';
import {
  COLOR_OPTIONS,
  LOCALE_OPTIONS,
  SOUND_OPTIONS,
  TONE_OPTIONS,
} from '../config';
import EmojiBackground from './EmojiBackground';
import WhatsAppShare from './WhatsAppShare';

const INITIAL_FORM = {
  myName: '',
  crushName: '',
  senderPhone: '',
  senderEmail: '',
  color: '#800020',
  meal: 'Jollof Rice',
  place: 'Lekki, Lagos',
  sound: 'romantic_chime',
  locale: 'en',
  tone: 'romantic',
  customMessage: '',
  playfulNo: false,
  imageData: '',
  imageUrl: '',
  recipientEmail: '',
};

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose a valid image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('The image could not be processed.'));
      image.onload = () => {
        const maxDimension = 1200;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function GeneratorPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [generatedLink, setGeneratedLink] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [error, setError] = useState('');

  const selectedColor = COLOR_OPTIONS.find((color) => color.hex === form.color) || {
    name: 'Custom color',
    hex: form.color,
    foreground: '#ffffff',
  };

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (error) setError('');
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await compressImage(file);
      setForm((previous) => ({ ...previous, imageData, imageUrl: '' }));
      setImagePreview(imageData);
      setError('');
    } catch (uploadError) {
      setError(uploadError.message);
      event.target.value = '';
    }
  };

  const createInvitation = async () => {
    if (!form.myName.trim() || !form.crushName.trim()) {
      setError('Please add both names before creating the invitation.');
      return '';
    }

    setError('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          senderName: form.myName,
          crushName: form.crushName,
          senderPhone: form.senderPhone,
          senderEmail: form.senderEmail,
          meal: form.meal,
          place: form.place,
          sound: form.sound,
          themeColor: form.color,
          locale: form.locale,
          tone: form.tone,
          customMessage: form.customMessage,
          playfulNo: form.playfulNo,
          imageData: form.imageData,
          imageUrl: form.imageUrl,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.id) {
        throw new Error(data.error || 'We could not create the invitation. Please try again.');
      }

      const link = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(data.id)}`;
      setGeneratedLink(link);
      return link;
    } catch (createError) {
      setError(createError.message);
      return '';
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await createInvitation();
  };

  const sendViaEmailApp = async () => {
    const link = generatedLink || await createInvitation();
    if (!link) return;

    const recipient = form.recipientEmail.trim();
    const subject = encodeURIComponent(`Hey ${form.crushName || 'there'}! You have a special invitation 💖`);
    const body = encodeURIComponent(
      `Hey ${form.crushName || 'there'}!\n\n` +
      `${form.myName || 'Someone special'} created a customized invitation for you.\n\n` +
      `Open it here: ${link}\n\n` +
      'I hope you say yes! 💕',
    );
    window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="container generator-container">
      <EmojiBackground themeColor={form.color} />

      <section className="card generator-card">
        <p className="eyebrow">CREATE · INVITE · CONNECT</p>
        <h1 className="form-title" style={{ color: form.color }}>Create a date invitation 💖</h1>
        <p className="intro-text">Make something personal, send it with love, and let them choose what works for them.</p>

        <form className="date-form" onSubmit={handleSubmit}>
          <div className="form-section-heading">The essentials</div>

          <label htmlFor="sender-name">Your name</label>
          <input
            id="sender-name"
            type="text"
            placeholder="e.g. Chidi"
            value={form.myName}
            onChange={(event) => updateField('myName', event.target.value)}
            maxLength={80}
            required
          />

          <label htmlFor="recipient-name">Their name</label>
          <input
            id="recipient-name"
            type="text"
            placeholder="e.g. Ifeoma"
            value={form.crushName}
            onChange={(event) => updateField('crushName', event.target.value)}
            maxLength={80}
            required
          />

          <label htmlFor="custom-message">Add a personal message <span className="optional">(optional)</span></label>
          <textarea
            id="custom-message"
            placeholder="Tell them why you would love to spend time together…"
            value={form.customMessage}
            onChange={(event) => updateField('customMessage', event.target.value)}
            maxLength={500}
            rows={3}
          />

          <div className="form-section-heading">Make it yours</div>

          <label htmlFor="invitation-language">Invitation language</label>
          <select id="invitation-language" value={form.locale} onChange={(event) => updateField('locale', event.target.value)}>
            {LOCALE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>

          <label htmlFor="invitation-tone">Tone</label>
          <select id="invitation-tone" value={form.tone} onChange={(event) => updateField('tone', event.target.value)}>
            {TONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>

          <div className="form-group color-picker-collapsible">
            <label id="color-label">Theme color</label>
            <button
              type="button"
              className="color-toggle-btn"
              aria-expanded={isColorPickerOpen}
              aria-controls="color-options"
              onClick={() => setIsColorPickerOpen((open) => !open)}
            >
              <span className="selected-color-preview">
                <span className="color-dot" style={{ backgroundColor: form.color }} aria-hidden="true" />
                {selectedColor.name}
              </span>
              <span>{isColorPickerOpen ? 'Hide colors ▲' : 'Choose a color ▼'}</span>
            </button>

            {isColorPickerOpen && (
              <div className="color-swatch-grid" id="color-options" role="group" aria-labelledby="color-label">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.hex}
                    type="button"
                    className={`color-swatch-btn ${form.color === option.hex ? 'selected' : ''}`}
                    style={{ backgroundColor: option.hex, color: option.foreground }}
                    aria-label={`Use ${option.name}`}
                    aria-pressed={form.color === option.hex}
                    onClick={() => {
                      updateField('color', option.hex);
                      setIsColorPickerOpen(false);
                    }}
                  >
                    <span className="color-label">{option.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label htmlFor="meal-choice">Meal <span className="optional">(you can customize later)</span></label>
          <input id="meal-choice" type="text" value={form.meal} onChange={(event) => updateField('meal', event.target.value)} maxLength={100} />

          <label htmlFor="place-choice">Location</label>
          <input id="place-choice" type="text" value={form.place} onChange={(event) => updateField('place', event.target.value)} maxLength={160} />

          <label htmlFor="sound-choice">Celebration sound</label>
          <select id="sound-choice" value={form.sound} onChange={(event) => updateField('sound', event.target.value)}>
            {SOUND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>

          <label htmlFor="image-file">Add a photo <span className="optional">(optional)</span></label>
          <input id="image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
          <p className="field-help">Your image is resized in your browser before it is uploaded. Maximum 1,200 pixels.</p>
          {imagePreview && <img className="image-preview" src={imagePreview} alt="Selected invitation preview" />}

          <label htmlFor="image-url">Or use a secure image URL <span className="optional">(optional)</span></label>
          <input
            id="image-url"
            type="url"
            placeholder="https://…"
            value={form.imageUrl}
            onChange={(event) => {
              updateField('imageUrl', event.target.value);
              if (event.target.value) {
                setForm((previous) => ({ ...previous, imageUrl: event.target.value, imageData: '' }));
                setImagePreview('');
              }
            }}
          />

          <label className="checkbox-row">
            <input type="checkbox" checked={form.playfulNo} onChange={(event) => updateField('playfulNo', event.target.checked)} />
            <span>Use a playful evasive “No” button <span className="optional">(optional)</span></span>
          </label>
          <p className="field-help">Even in playful mode, the recipient can decline after a few fun prompts.</p>

          <div className="form-section-heading">How should they reach you?</div>

          <label htmlFor="sender-phone">Your WhatsApp number <span className="optional">(optional)</span></label>
          <input id="sender-phone" type="tel" placeholder="Use country code, e.g. +2348012345678" value={form.senderPhone} onChange={(event) => updateField('senderPhone', event.target.value)} />

          <label htmlFor="sender-email">Your email <span className="optional">(optional)</span></label>
          <input id="sender-email" type="email" placeholder="you@example.com" value={form.senderEmail} onChange={(event) => updateField('senderEmail', event.target.value)} />
          <p className="field-help">The recipient can use either option to tell you their response. We do not send unsolicited email.</p>

          <div className="form-section-heading">Share it</div>

          <label htmlFor="recipient-email">Recipient email <span className="optional">(optional)</span></label>
          <input id="recipient-email" type="email" placeholder="recipient@example.com" value={form.recipientEmail} onChange={(event) => updateField('recipientEmail', event.target.value)} />
          <p className="field-help">The email button opens your own email app with the invitation ready to send.</p>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="action-buttons">
            <button className="btn submit-btn" style={{ background: form.color, color: selectedColor.foreground }} type="submit" disabled={isGenerating}>
              {isGenerating ? 'Creating your invitation…' : 'Create invitation 📋'}
            </button>
            <button type="button" className="btn email-btn" onClick={sendViaEmailApp} disabled={isGenerating}>
              Open email app ✉️
            </button>
          </div>
        </form>

        {generatedLink && (
          <>
            <div className="link-output-box" role="status">
              <p><strong>Your invitation is ready</strong></p>
              <a href={generatedLink} target="_blank" rel="noopener noreferrer">{generatedLink}</a>
            </div>
            <WhatsAppShare generatedUrl={generatedLink} crushName={form.crushName} myName={form.myName} />
          </>
        )}
      </section>
    </div>
  );
}
