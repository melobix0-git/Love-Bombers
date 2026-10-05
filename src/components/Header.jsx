export default function Header({ onRefresh }) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.assign(window.location.pathname);
    }
  };

  return (
    <header className="app-header">
      <button
        type="button"
        className="header-refresh-btn"
        onClick={handleRefresh}
        title="Create a new invitation"
        aria-label="Love Bomber — create a new invitation"
      >
        <img src="/lover-bomb-favio.svg" alt="" className="brand-mark" aria-hidden="true" />
        <span className="logo-title">Love Bomber</span>
      </button>
    </header>
  );
}
