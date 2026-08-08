import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GeneratorPage from './components/GeneratorPage';
import ViewerPage from './components/ViewerPage';
import './App.css';

const useQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  
  const inviteId = params.get('id');
  const explicitMode = params.get('mode');
  const isViewMode = explicitMode === 'view' || Boolean(inviteId);

  // Clean raw color value: if passed as 'e91e63' or '%23e91e63', ensure leading '#'
  let rawColor = params.get('color') || 'e91e63';
  if (!rawColor.startsWith('#')) {
    rawColor = `#${rawColor}`;
  }

  // Safely decode image URL parameter
  let rawImg = params.get('img') || '';
  if (rawImg) {
    try {
      rawImg = decodeURIComponent(rawImg);
    } catch (e) {
      console.warn('Could not decode image parameter:', e);
    }
  }

  return {
    id: inviteId || '',
    mode: isViewMode ? 'view' : 'generate',
    crushName: params.get('crushName') || 'My Crush',
    myName: params.get('myName') || 'Your Name',
    color: rawColor,
    meal: params.get('meal') || 'Jollof Rice',
    place: params.get('place') || 'Lekki, Lagos',
    img: rawImg,
    song: params.get('song') || 'none',
  };
};

export default function App() {
  const queryProps = useQueryParams();
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(Boolean(queryProps.id));

  useEffect(() => {
    if (queryProps.id) {
      fetch(`/api/invitations?id=${queryProps.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setInviteData(data);
          }
        })
        .catch((err) => console.error('Error fetching invitation:', err))
        .finally(() => setLoading(false));
    }
  }, [queryProps.id]);

  if (loading) {
    return (
      <div className="app-root">
        <Header />
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <p style={{ color: '#fff', fontSize: '1.2rem' }}>Loading your invitation... 💖</p>
        </main>
      </div>
    );
  }

  // Combine query props with any fetched database invitation properties
  const mergedProps = {
    ...queryProps,
    ...(inviteData || {}),
    // Ensure image and color prioritize loaded invitation values if available
    color: inviteData?.color || queryProps.color,
    img: inviteData?.img || queryProps.img,
  };

  return (
    <div className="app-root">
      <Header />
      <main className="main-content">
        {mergedProps.mode === 'view' ? (
          <ViewerPage {...mergedProps} />
        ) : (
          <GeneratorPage />
        )}
      </main>
    </div>
  );
}
