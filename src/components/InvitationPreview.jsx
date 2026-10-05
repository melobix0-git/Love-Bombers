import { COLOR_OPTIONS, getForegroundForColor } from '../config';
import { getInvitationCopy } from '../copy';

export default function InvitationPreview({ form, imagePreview }) {
  const themeColor = form.color || '#800020';
  const foreground = getForegroundForColor(themeColor);
  const selectedColor = COLOR_OPTIONS.find((color) => color.hex === themeColor);
  const copy = getInvitationCopy(form.locale, form.tone, form.crushName || 'Their name');
  const image = imagePreview || form.imageUrl;

  return (
    <aside className="preview-card" aria-label="Live invitation preview">
      <div className="preview-heading">
        <div>
          <p className="eyebrow">LIVE PREVIEW</p>
          <h2>What they will see</h2>
        </div>
        <span className="preview-dot" style={{ backgroundColor: themeColor }} aria-hidden="true" />
      </div>

      <div className={`preview-invitation template-${form.template || 'classic'}`} id="invitation-preview-card" style={{ '--preview-color': themeColor }}>
        <div className="preview-heart">
          {image ? <img src={image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span aria-hidden="true">💖</span>}
        </div>
        <p className="eyebrow">A PERSONAL INVITATION</p>
        <h3 style={{ color: themeColor }}>{copy.question}</h3>
        {form.customMessage && <p className="preview-message">“{form.customMessage}”</p>}

        <div className="preview-details">
          <span>🍛 {form.meal || 'A meal together'}</span>
          <span>📍 {form.place || 'Somewhere special'}</span>
        </div>

        {form.dateMode === 'suggestions' && form.dateOptions.some((option) => option.date && option.time) && (
          <p className="preview-options">{form.dateOptions.filter((option) => option.date && option.time).length} date options included</p>
        )}

        <div className="preview-actions">
          <span style={{ backgroundColor: themeColor, color: foreground }}>{copy.yes}</span>
          <span>{copy.no}</span>
        </div>
        {selectedColor && <small>{selectedColor.name} theme · {form.locale === 'pidgin' ? 'Pidgin' : 'English'}</small>}
      </div>
      <button type="button" className="text-button preview-print-action" onClick={() => window.print()}>Print / save preview</button>
    </aside>
  );
}
