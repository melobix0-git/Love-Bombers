import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import CreatorStatusPage from './components/CreatorStatusPage';
import GeneratorPage from './components/GeneratorPage';
import ViewerPage from './components/ViewerPage';
import './App.css';

function useQueryParams() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    const explicitMode = params.get('mode');
    const mode = explicitMode === 'status' ? 'status' : explicitMode === 'view' || id ? 'view' : 'generate';
    const rawColor = params.get('color') || '#800020';

    return {
      id,
      mode,
      token: params.get('token') || '',
      crushName: params.get('crushName') || 'My Crush',
      myName: params.get('myName') || 'Someone special',
      color: rawColor.startsWith('#') ? rawColor : `#${rawColor}`,
      meal: params.get('meal') || 'A meal together',
      place: params.get('place') || 'Somewhere special',
      img: params.get('img') || '',
      sound: params.get('sound') || 'romantic_chime',
      locale: params.get('locale') || 'en',
      tone: params.get('tone') || 'romantic',
      customMessage: params.get('message') || '',
      playfulNo: params.get('playfulNo') === 'true',
    };
  }, []);
}

function InvitationState({ title, message, action }) {
  return (
    <div className="app-root">
      <Header />
      <main className="main-content state-main">
        <section className="card state-card" role="status">
          <div className="state-icon" aria-hidden="true">💌</div>
          <h1 className="title">{title}</h1>
          <p className="state-message">{message}</p>
          {action}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const queryProps = useQueryParams();
  const [inviteData, setInviteData] = useState(null);
  const [inviteState, setInviteState] = useState(queryProps.id ? 'loading' : 'ready');

  useEffect(() => {
    if (!queryProps.id) return undefined;

    const controller = new AbortController();

    const tokenParam = queryProps.token ? `&token=${encodeURIComponent(queryProps.token)}` : '';
    const modeParam = queryProps.mode === 'status' ? '&mode=status' : '';
    fetch(`/api/invitations?id=${encodeURIComponent(queryProps.id)}${modeParam}${tokenParam}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(data.error || 'We could not load this invitation.');
          error.code = data.code;
          error.status = response.status;
          throw error;
        }
        return data;
      })
      .then((data) => {
        setInviteData(data);
        setInviteState('ready');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setInviteState(error.status === 410 ? 'expired' : 'error');
      });

    return () => controller.abort();
  }, [queryProps.id, queryProps.mode, queryProps.token]);

  if (inviteState === 'loading') {
    return <InvitationState title="Opening your invitation…" message="One moment, there is something special here for you." />;
  }

  if (inviteState === 'expired') {
    return <InvitationState title="This invitation has expired" message="The invitation is no longer active, but the good memories can still continue." />;
  }

  if (inviteState === 'error') {
    return (
      <InvitationState
        title="We could not find that invitation"
        message="The link may be incomplete, expired, or no longer available. Ask the sender to create a new one."
        action={<a className="btn state-action" href={window.location.pathname}>Create a new invitation</a>}
      />
    );
  }

  const mergedProps = {
    ...queryProps,
    ...(inviteData || {}),
  };

  return (
    <div className="app-root">
      <Header />
      <main className="main-content">
        {mergedProps.mode === 'status' ? <CreatorStatusPage {...mergedProps} /> : mergedProps.mode === 'view' ? <ViewerPage {...mergedProps} /> : <GeneratorPage />}
      </main>
    </div>
  );
}
