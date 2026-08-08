import { useState } from 'react';
import { IMGBB_API_KEY, COLOR_OPTIONS } from '../config';
import EmojiBackground from './EmojiBackground';
import WhatsAppShare from './WhatsAppShare';

export default function GeneratorPage() {
  const [form, setForm] = useState({
    myName: '',
    crushName: '',
    senderPhone: '',
    color: '#800020', // Default burgundy
    meal: 'Jollof Rice',
    place: 'Lekki, Lagos',
    song: 'none',
    imageFile: null,
    imageUrl: '',
    crushEmail: ''
  });

  const [generatedLink, setGeneratedLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  const selectedColorObj = COLOR_OPTIONS.find((c) => c.hex === form.color) || { name: 'Burgundy', hex: form.color };

  const uploadImage = async (file) => {
    if (!file) return '';
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message || 'Upload failed');
      return data.data.url;
    } catch (err) {
      alert(`Image upload error: ${err.message}`);
      return '';
    } finally {
      setIsUploading(false);
    }
  };

  const generateLink = async () => {
    let imgUrl = form.imageUrl;
    if (form.imageFile) {
      imgUrl = await uploadImage(form.imageFile);
    }

    const baseUrl = window.location.origin + window.location.pathname;

    try {
      // Save invitation to Cloudflare D1 for short link generation
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          senderName: form.myName || 'Someone Special',
          crushName: form.crushName || 'My Crush',
          senderPhone: form.senderPhone,
          meal: form.meal,
          place: form.place,
          song: form.song,
          imageUrl: imgUrl,
          themeColor: form.color
        })
      });

      const data = await res.json();

      let link = '';
      if (data.success && data.id) {
        link = `${baseUrl}?id=${data.id}`;
      } else {
        // Fallback to query string if D1 is not active
        const params = new URLSearchParams({
          mode: 'view',
          myName: form.myName || 'Your Name',
          crushName: form.crushName || 'My Crush',
          color: form.color,
          meal: form.meal,
          place: form.place,
          img: imgUrl,
          song: form.song
        });
        link = `${baseUrl}?${params.toString()}`;
      }

      setGeneratedLink(link);
      return link;
    } catch (err) {
      const params = new URLSearchParams({
        mode: 'view',
        myName: form.myName || 'Your Name',
        crushName: form.crushName || 'My Crush',
        color: form.color,
        meal: form.meal,
        place: form.place,
        img: imgUrl,
        song: form.song
      });
      const link = `${baseUrl}?${params.toString()}`;
      setGeneratedLink(link);
      return link;
    }
  };

  const sendViaEmailApp = async () => {
    // Await short link creation before triggering email client
    const link = generatedLink || (await generateLink());
    
    const emailTo = encodeURIComponent(form.crushEmail || '');
    const subject = encodeURIComponent(`Hey ${form.crushName || 'there'}! You have a special invitation 💖`);
    const body = encodeURIComponent(
      `Hey ${form.crushName || 'there'}! 😍\n\n` +
      `${form.myName || 'Someone special'} has created a customized date invitation for you!\n\n` +
      `Click here to open your invitation:\n${link}\n\n` +
      `Can't wait to hear from you! 💕`
    );

    window.location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="container generator-container">
      {/* Dynamic WhatsApp/Telegram style background layer */}
      <EmojiBackground themeColor={form.color} />

      <div className="card generator-card">
        <h2 className="form-title" style={{ color: form.color }}>💖 Create Your Date Invitation</h2>
        <form className="date-form" onSubmit={(e) => e.preventDefault()}>
          <label>Your Name</label>
          <input 
            type="text" 
            placeholder="e.g. Chidi" 
            value={form.myName} 
            onChange={(e) => setForm({...form, myName: e.target.value})} 
          />
          
          <label>Crush's Name</label>
          <input 
            type="text" 
            placeholder="e.g. Ifeoma" 
            value={form.crushName} 
            onChange={(e) => setForm({...form, crushName: e.target.value})} 
          />

          <label>Your WhatsApp Phone Number (to receive her confirmation)</label>
          <input 
            type="tel" 
            placeholder="e.g. 2348012345678" 
            value={form.senderPhone} 
            onChange={(e) => setForm({...form, senderPhone: e.target.value})} 
          />
          
          {/* Collapsible Color Picker Section */}
          <div className="form-group color-picker-collapsible">
            <label>Her Favorite Color 🎨</label>
            <button
              type="button"
              className="color-toggle-btn"
              onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
            >
              <span className="selected-color-preview">
                <span className="color-dot" style={{ backgroundColor: form.color }}></span>
                {selectedColorObj.name}
              </span>
              <span>{isColorPickerOpen ? '▲ Hide Colors' : '▼ Select Color'}</span>
            </button>

            {isColorPickerOpen && (
              <div className="color-swatch-grid">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`color-swatch-btn ${form.color === c.hex ? 'selected' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => {
                      setForm({ ...form, color: c.hex });
                      setIsColorPickerOpen(false);
                    }}
                  >
                    <span className="color-label">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <label>Meal Choice 🍛</label>
          <select value={form.meal} onChange={(e) => setForm({...form, meal: e.target.value})}>
            <option value="Jollof Rice">Jollof Rice</option>
            <option value="Fried Rice & Chicken">Fried Rice & Chicken</option>
            <option value="Suya">Suya</option>
            <option value="Amala & Egusi">Amala & Egusi</option>
            <option value="Eba & Okro">Eba & Okro</option>
            <option value="Pounded Yam & Stew">Pounded Yam & Stew</option>
          </select>
          
          <label>Location 📍</label>
          <select value={form.place} onChange={(e) => setForm({...form, place: e.target.value})}>
            <option value="Lekki, Lagos">Lekki, Lagos</option>
            <option value="VI, Lagos">VI, Lagos</option>
            <option value="Ikeja, Lagos">Ikeja, Lagos</option>
            <option value="Abuja City">Abuja City</option>
            <option value="Port Harcourt">Port Harcourt</option>
            <option value="Osu, Accra">Osu, Accra (I go travel for you! 😉)</option>
          </select>

          <label>Her Favorite Song (plays on "Yes!") 🎵</label>
          <select value={form.song} onChange={(e) => setForm({...form, song: e.target.value})}>
            <option value="none">🎶 No music</option>
            <option value="davido_fall">Davido - Fall</option>
            <option value="raindance">Dave ft. Tems - Raindance</option>
            <option value="wizkid_essence">Wizkid - Essence</option>
            <option value="pharrell_happy">Pharrell - Happy</option>
          </select>
          
          <label>Upload Crush's Picture (optional)</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setForm({...form, imageFile: e.target.files[0]})} 
          />
          <small className="hint">Hosts via ImgBB. Or paste an image URL directly:</small>
          <input 
            type="text" 
            placeholder="Or paste image URL" 
            value={form.imageUrl} 
            onChange={(e) => setForm({...form, imageUrl: e.target.value})} 
          />

          <label>Crush's Email (optional - opens email app)</label>
          <input 
            type="email" 
            placeholder="crush@email.com" 
            value={form.crushEmail} 
            onChange={(e) => setForm({...form, crushEmail: e.target.value})} 
          />

          <div className="action-buttons">
            <button 
              className="btn submit-btn" 
              style={{ background: form.color }} 
              onClick={generateLink} 
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Generate Short Link 📋'}
            </button>

            <button 
              type="button" 
              className="btn email-btn" 
              style={{ background: '#ff9800' }} 
              onClick={sendViaEmailApp} 
              disabled={isUploading}
            >
              Open Email App ✉️
            </button>
          </div>
        </form>

        {generatedLink && (
          <>
            <div className="link-output-box">
              <p><strong>Your Short Love Bomber Link:</strong></p>
              <a href={generatedLink} target="_blank" rel="noreferrer">{generatedLink}</a>
            </div>

            <WhatsAppShare 
              generatedUrl={generatedLink} 
              crushName={form.crushName} 
              myName={form.myName} 
            />
          </>
        )}
      </div>
    </div>
  );
}
