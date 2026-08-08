import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GeneratorPage from './components/GeneratorPage';
import ViewerPage from './components/ViewerPage';
import './App.css';

const useQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  
  // Check if an invitation ID or explicit view mode exists in the URL
  const inviteId = params.get('id');
  const explicitMode = params.get('mode');
  
  // If 'id' exists or 'mode=view', default the mode to 'view'
  const isViewMode = explicitMode === 'view' || Boolean(inviteId);

  return {
    id: inviteId || '',
    mode: isViewMode ? 'view' : 'generate',
    crushName: params.get('crushName') || 'My Crush',
    myName: params.get('myName') || 'Your Name',
    color: params.get('color') || '#e91e63',
    meal: params.get('meal') || 'Jollof Rice',
    place: params.get('place') || 'Lekki, Lagos',
    img: params.get('img') || '',
    song: params.get('song') || 'none',
  };
};

export default function App() {
  const queryProps = useQueryParams();
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(Boolean(queryProps.id));

  useEffect(() => {
    // If a short link contains an invitation ID, fetch the invitation data from Vercel API
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

  return (
    <div className="app-root">
      <Header />
      <main className="main-content">
        {queryProps.mode === 'view' ? (
          <ViewerPage {...queryProps} {...inviteData} />
        ) : (
          <GeneratorPage />
        )}
      </main>
    </div>
  );
}
