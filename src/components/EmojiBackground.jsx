export default function EmojiBackground({ themeColor = '#e91e63' }) {
  return (
    <div className="whatsapp-doodle-bg" style={{ '--bg-color': themeColor }} aria-hidden="true">
      <div className="doodle-pattern-overlay" />
    </div>
  );
}
