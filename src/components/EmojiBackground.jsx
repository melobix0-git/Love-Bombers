import React from 'react';

export default function EmojiBackground({ themeColor = '#e91e63' }) {
  return (
    <div 
      className="whatsapp-doodle-bg" 
      style={{ '--bg-color': themeColor }}
    >
      <div className="doodle-pattern-overlay" />
    </div>
  );
}