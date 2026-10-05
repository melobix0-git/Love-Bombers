import { useState } from 'react';
import {
  COLOR_OPTIONS,
  LOCALE_OPTIONS,
  SOUND_OPTIONS,
  TEMPLATE_OPTIONS,
  TONE_OPTIONS,
  getForegroundForColor,
} from '../config';
import { trackEvent } from '../analytics';
import { clearRecentInvitations, getRecentInvitations, saveRecentInvitation } from '../history';
import EmojiBackground from './EmojiBackground';
import InvitationPreview from './InvitationPreview';
import WhatsAppShare from './WhatsAppShare';

const TODAY = new Date().toISOString().slice(0, 10);
const STEP_LABELS = ['Essentials', 'Personalize', 'Review and share'];

const INITIAL_FORM = {
  myName: '',
  crushName: '',
  senderPhone: '',
  senderEmail: '',
  color: '#800020',
  meal: 'Jollof Rice',
  place: 'Lekki, Lagos',
  sound: 'romantic_chime',
  template: 'classic',
  locale: 'en',
  tone: 'romantic',
  customMessage: '',
  playfulNo: false,
  imageData: '',
  imageUrl: '',
  recipientEmail: '',
  dateMode: 'recipient',
  dateOptions: [
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' },
  ],
};

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose a valid image file.'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Please choose an image smaller than 10 MB.'));
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

function hasDateOption(option) {
  return Boolean(option.date && option.time);
}

function formFromInvitation(invitation) {
  return {
    ...INITIAL_FORM,
    myName: invitation.myName || '',
    crushName: invitation.crushName || '',
    senderPhone: invitation.senderPhone || '',
    senderEmail: invitation.senderEmail || '',
    color: invitation.color || INITIAL_FORM.color,
    meal: invitation.meal || INITIAL_FORM.meal,
    place: invitation.place || INITIAL_FORM.place,
    sound: invitation.sound || INITIAL_FORM.sound,
    template: invitation.template || INITIAL_FORM.template,
    locale: invitation.locale || INITIAL_FORM.locale,
    tone: invitation.tone || INITIAL_FORM.tone,
    customMessage: invitation.customMessage || '',
    playfulNo: Boolean(invitation.playfulNo),
    imageUrl: invitation.img || '',
    dateMode: invitation.dateMode || INITIAL_FORM.dateMode,
    dateOptions: invitation.dateOptions?.length ? invitation.dateOptions.map((option) => ({ ...option })) : INITIAL_FORM.dateOptions.map((option) => ({ ...option })),
  };
}

export default function GeneratorPage({ initialData = null, editId = '', editToken = '' }) {
  const editMode = Boolean(editId && editToken);
  const [form, setForm] = useState(() => (initialData ? formFromInvitation(initialData) : { ...INITIAL_FORM, dateOptions: INITIAL_FORM.dateOptions.map((option) => ({ ...option })) }));
  const [step, setStep] = useState(1);
  const [generatedLink, setGeneratedLink] = useState('');
  const [statusLink, setStatusLink] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [recentInvitations, setRecentInvitations] = useState(() => getRecentInvitations());

  const selectedColor = COLOR_OPTIONS.find((color) => color.hex === form.color) || {
    name: 'Custom color',
    hex: form.color,
    foreground: '#ffffff',
  };
  const foregroundColor = getForegroundForColor(form.color);

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (error) setError('');
  };

  const updateDateOption = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      dateOptions: previous.dateOptions.map((option, optionIndex) => (
        optionIndex === index ? { ...option, [field]: value } : option
      )),
    }));
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

  const validateStep = (stepToValidate) => {
    if (stepToValidate === 1 && (!form.myName.trim() || !form.crushName.trim())) {
      setError('Please add both names before continuing.');
      return false;
    }
    if (stepToValidate === 2 && form.dateMode === 'suggestions' && !form.dateOptions.some(hasDateOption)) {
      setError('Add at least one suggested date, or choose “Let them choose any date”.');
      return false;
    }
    if (stepToValidate === 2 && form.imageUrl) {
      try {
        if (new URL(form.imageUrl).protocol !== 'https:') throw new Error('bad protocol');
      } catch {
        setError('Photo URLs must use https://, or choose a photo file instead.');
        return false;
      }
    }
    return true;
  };

  const goToNextStep = () => {
    if (!validateStep(step)) return;
    trackEvent('invitation_step_completed', { step });
    setStep((currentStep) => Math.min(currentStep + 1, STEP_LABELS.length));
  };

  const goToPreviousStep = () => {
    setError('');
    setStep((currentStep) => Math.max(currentStep - 1, 1));
  };

  const createInvitation = async () => {
    if (!validateStep(1) || !validateStep(2)) return '';

    setError('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editMode ? 'update' : 'create',
          ...(editMode ? { id: editId, token: editToken } : {}),
          senderName: form.myName,
          crushName: form.crushName,
          senderPhone: form.senderPhone,
          senderEmail: form.senderEmail,
          meal: form.meal,
          place: form.place,
          sound: form.sound,
          template: form.template,
          themeColor: form.color,
          locale: form.locale,
          tone: form.tone,
          customMessage: form.customMessage,
          playfulNo: form.playfulNo,
          imageData: form.imageData,
          imageUrl: form.imageUrl,
          dateMode: form.dateMode,
          dateOptions: form.dateOptions,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.id) {
        throw new Error(data.error || 'We could not create the invitation. Please try again.');
      }

      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const invitationId = data.id || editId;
      const link = `${baseUrl}?id=${encodeURIComponent(invitationId)}`;
      const statusToken = data.manageToken || editToken;
      const privateStatusLink = statusToken
        ? `${baseUrl}?mode=status&id=${encodeURIComponent(invitationId)}&token=${encodeURIComponent(statusToken)}`
        : '';
      setGeneratedLink(link);
      setStatusLink(privateStatusLink);
      if (privateStatusLink) {
        setRecentInvitations(saveRecentInvitation({
          id: invitationId,
          myName: form.myName,
          crushName: form.crushName,
          invitationLink: link,
          statusLink: privateStatusLink,
          updatedAt: new Date().toISOString(),
        }));
      }
      trackEvent(editMode ? 'invitation_updated' : 'invitation_created', {
        locale: form.locale,
        tone: form.tone,
        template: form.template,
        dateMode: form.dateMode,
        hasPhoto: Boolean(form.imageData || form.imageUrl),
      });
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
    if (step < STEP_LABELS.length) {
      goToNextStep();
      return;
    }
    await createInvitation();
  };

  const sendViaEmailApp = async () => {
    const link = generatedLink || await createInvitation();
    if (!link) return;

    const recipient = form.recipientEmail.trim();
    if (recipient && !/^\S+@\S+\.\S+$/.test(recipient)) {
      setError('Please enter a valid recipient email address.');
      return;
    }
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

      {!editMode && recentInvitations.length > 0 && (
        <section className="card recent-invitations-card">
          <div className="recent-heading">
            <div><p className="eyebrow">ON THIS DEVICE</p><h2>Recent invitations</h2></div>
            <button type="button" className="text-button" onClick={() => { clearRecentInvitations(); setRecentInvitations([]); }}>Clear history</button>
          </div>
          <div className="recent-list">
            {recentInvitations.map((invitation) => (
              <div className="recent-item" key={invitation.id}>
                <span><strong>{invitation.crushName || 'Your date'}</strong><small>from {invitation.myName || 'you'}</small></span>
                <span className="recent-links"><a href={invitation.invitationLink}>Open</a><a href={invitation.statusLink}>Status</a></span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="generator-shell">
        <section className="card generator-card">
          <p className="eyebrow">CREATE · INVITE · CONNECT</p>
          <h1 className="form-title" style={{ color: form.color }}>{editMode ? 'Edit your invitation ✏️' : 'Create a date invitation 💖'}</h1>
          <p className="intro-text">{editMode ? 'Update the details below and keep the same private status link.' : 'Make something personal, send it with love, and let them choose what works for them.'}</p>

          <nav className="wizard-progress" aria-label="Invitation creation steps">
            {STEP_LABELS.map((label, index) => {
              const stepNumber = index + 1;
              return (
                <button
                  key={label}
                  type="button"
                  className={`wizard-step ${step === stepNumber ? 'active' : ''} ${step > stepNumber ? 'complete' : ''}`}
                  onClick={() => stepNumber < step && setStep(stepNumber)}
                  disabled={stepNumber > step}
                  aria-current={step === stepNumber ? 'step' : undefined}
                >
                  <span>{stepNumber}</span>{label}
                </button>
              );
            })}
          </nav>

          <form className="date-form" onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="step-panel">
                <div className="form-section-heading">The essentials</div>

                <label htmlFor="sender-name">Your name</label>
                <input id="sender-name" type="text" placeholder="e.g. Chidi" value={form.myName} onChange={(event) => updateField('myName', event.target.value)} maxLength={80} required />

                <label htmlFor="recipient-name">Their name</label>
                <input id="recipient-name" type="text" placeholder="e.g. Ifeoma" value={form.crushName} onChange={(event) => updateField('crushName', event.target.value)} maxLength={80} required />

                <label htmlFor="custom-message">Add a personal message <span className="optional">(optional)</span></label>
                <textarea id="custom-message" placeholder="Tell them why you would love to spend time together…" value={form.customMessage} onChange={(event) => updateField('customMessage', event.target.value)} maxLength={500} rows={3} />

                <label htmlFor="invitation-language">Invitation language</label>
                <select id="invitation-language" value={form.locale} onChange={(event) => updateField('locale', event.target.value)}>
                  {LOCALE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>

                <label htmlFor="invitation-tone">Tone</label>
                <select id="invitation-tone" value={form.tone} onChange={(event) => updateField('tone', event.target.value)}>
                  {TONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            )}

            {step === 2 && (
              <div className="step-panel">
                <div className="form-section-heading">Make it yours</div>

                <label htmlFor="template-choice">Invitation style</label>
                <select id="template-choice" value={form.template} onChange={(event) => updateField('template', event.target.value)}>
                  {TEMPLATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>

                <div className="form-group color-picker-collapsible">
                  <label id="color-label">Theme color</label>
                  <button type="button" className="color-toggle-btn" aria-expanded={isColorPickerOpen} aria-controls="color-options" onClick={() => setIsColorPickerOpen((open) => !open)}>
                    <span className="selected-color-preview"><span className="color-dot" style={{ backgroundColor: form.color }} aria-hidden="true" />{selectedColor.name}</span>
                    <span>{isColorPickerOpen ? 'Hide colors ▲' : 'Choose a color ▼'}</span>
                  </button>

                  {isColorPickerOpen && (
                    <div className="color-swatch-grid" id="color-options" role="group" aria-labelledby="color-label">
                      {COLOR_OPTIONS.map((option) => (
                        <button key={option.hex} type="button" className={`color-swatch-btn ${form.color === option.hex ? 'selected' : ''}`} style={{ backgroundColor: option.hex, color: option.foreground }} aria-label={`Use ${option.name}`} aria-pressed={form.color === option.hex} onClick={() => { updateField('color', option.hex); setIsColorPickerOpen(false); }}>
                          <span className="color-label">{option.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label htmlFor="meal-choice">Meal</label>
                <input id="meal-choice" type="text" value={form.meal} onChange={(event) => updateField('meal', event.target.value)} maxLength={100} />

                <label htmlFor="place-choice">Location</label>
                <input id="place-choice" type="text" value={form.place} onChange={(event) => updateField('place', event.target.value)} maxLength={160} />

                <label htmlFor="date-mode">Date planning</label>
                <select id="date-mode" value={form.dateMode} onChange={(event) => updateField('dateMode', event.target.value)}>
                  <option value="recipient">Let them choose any date</option>
                  <option value="suggestions">Suggest up to three dates</option>
                </select>

                {form.dateMode === 'suggestions' && (
                  <div className="date-options-editor">
                    <p className="field-help">Give them a few options so agreeing is easy.</p>
                    {form.dateOptions.map((option, index) => (
                      <div className="date-option-row" key={`date-option-${index}`}>
                        <label htmlFor={`suggested-date-${index}`}>Option {index + 1}</label>
                        <input id={`suggested-date-${index}`} type="date" min={TODAY} value={option.date} onChange={(event) => updateDateOption(index, 'date', event.target.value)} />
                        <input aria-label={`Time for option ${index + 1}`} type="time" value={option.time} onChange={(event) => updateDateOption(index, 'time', event.target.value)} />
                      </div>
                    ))}
                  </div>
                )}

                <label htmlFor="sound-choice">Celebration sound</label>
                <select id="sound-choice" value={form.sound} onChange={(event) => updateField('sound', event.target.value)}>
                  {SOUND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>

                <label htmlFor="image-file">Add a photo <span className="optional">(optional)</span></label>
                <input id="image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                <p className="field-help">Your image is resized in your browser before it is uploaded.</p>
                {imagePreview && (
                  <div className="image-preview-row">
                    <img className="image-preview" src={imagePreview} alt="Selected invitation preview" />
                    <button type="button" className="text-button" onClick={() => { setImagePreview(''); setForm((previous) => ({ ...previous, imageData: '' })); }}>Remove photo</button>
                  </div>
                )}

                <label htmlFor="image-url">Or use a secure image URL <span className="optional">(optional)</span></label>
                <input id="image-url" type="url" placeholder="https://…" value={form.imageUrl} onChange={(event) => { updateField('imageUrl', event.target.value); if (event.target.value) { setForm((previous) => ({ ...previous, imageUrl: event.target.value, imageData: '' })); setImagePreview(''); } }} />

                <label className="checkbox-row">
                  <input type="checkbox" checked={form.playfulNo} onChange={(event) => updateField('playfulNo', event.target.checked)} />
                  <span>Use a playful evasive “No” button <span className="optional">(optional)</span></span>
                </label>
                <p className="field-help">Even in playful mode, the recipient can decline after a few fun prompts.</p>
              </div>
            )}

            {step === 3 && (
              <div className="step-panel">
                <div className="form-section-heading">How should they reach you?</div>

                <label htmlFor="sender-phone">Your WhatsApp number <span className="optional">(optional)</span></label>
                <input id="sender-phone" type="tel" placeholder="Use country code, e.g. +2348012345678" value={form.senderPhone} onChange={(event) => updateField('senderPhone', event.target.value)} />

                <label htmlFor="sender-email">Your email <span className="optional">(optional)</span></label>
                <input id="sender-email" type="email" placeholder="you@example.com" value={form.senderEmail} onChange={(event) => updateField('senderEmail', event.target.value)} />
                <p className="field-help">The recipient can use either option to tell you their response.</p>

                <div className="form-section-heading">Optional direct sending</div>
                <label htmlFor="recipient-email">Recipient email <span className="optional">(optional)</span></label>
                <input id="recipient-email" type="email" placeholder="recipient@example.com" value={form.recipientEmail} onChange={(event) => updateField('recipientEmail', event.target.value)} />
                <p className="field-help">The email button opens your own email app with the invitation ready to send.</p>

                <div className="review-summary">
                  <strong>Ready to send?</strong>
                  <span>{form.myName || 'You'} → {form.crushName || 'Your date'}</span>
                  <span>{form.dateMode === 'suggestions' ? `${form.dateOptions.filter(hasDateOption).length} suggested date option(s)` : 'They choose the date'}</span>
                </div>

                {error && <p className="form-error" role="alert">{error}</p>}

                <div className="action-buttons">
                  <button className="btn submit-btn" style={{ background: form.color, color: foregroundColor }} type="submit" disabled={isGenerating}>
                    {isGenerating ? (editMode ? 'Saving changes…' : 'Creating your invitation…') : (editMode ? 'Save changes 💾' : 'Create invitation 📋')}
                  </button>
                  <button type="button" className="btn email-btn" onClick={sendViaEmailApp} disabled={isGenerating}>
                    Open email app ✉️
                  </button>
                </div>
              </div>
            )}

            {error && step !== 3 && <p className="form-error" role="alert">{error}</p>}

            <div className="step-navigation">
              {step > 1 ? <button type="button" className="btn secondary-btn" onClick={goToPreviousStep}>Back</button> : <span />}
              {step < STEP_LABELS.length && <button type="button" className="btn next-btn" style={{ background: form.color, color: foregroundColor }} onClick={goToNextStep}>Continue</button>}
            </div>
          </form>

          {generatedLink && (
            <>
              <div className="link-output-box" role="status">
                <p><strong>Your invitation is ready</strong></p>
                <a href={generatedLink} target="_blank" rel="noopener noreferrer">{generatedLink}</a>
              </div>
              {statusLink && (
                <div className="status-link-box">
                  <strong>Your private status link</strong>
                  <p>Save this link to check whether they have opened, accepted, or chosen a date.</p>
                  <a href={statusLink} target="_blank" rel="noopener noreferrer">Open status page</a>
                </div>
              )}
              <WhatsAppShare generatedUrl={generatedLink} crushName={form.crushName} myName={form.myName} />
            </>
          )}
        </section>

        <InvitationPreview form={form} imagePreview={imagePreview} />
      </div>
    </div>
  );
}
