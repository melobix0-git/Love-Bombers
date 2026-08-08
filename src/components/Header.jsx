export default function Header({ onRefresh }) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="app-header">
      <button 
        type="button" 
        className="header-refresh-btn" 
        onClick={handleRefresh}
        title="Click to reset generator"
      >
        <span className="logo-title">💣 Love Bomber 💖</span>
        <span className="refresh-hint"> </span>
      </button>
    </header>
  );
}