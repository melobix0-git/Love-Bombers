import React from 'react';
import Header from './components/Header';
import GeneratorPage from './components/GeneratorPage';
import ViewerPage from './components/ViewerPage';
import './App.css';

const useQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get('mode') || 'generate',
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

  return (
    <div className="app-root">
      <Header />
      <main className="main-content">
        {queryProps.mode === 'view' ? (
          <ViewerPage {...queryProps} />
        ) : (
          <GeneratorPage />
        )}
      </main>
    </div>
  );
}