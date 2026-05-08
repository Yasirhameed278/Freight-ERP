import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      className="topbar-icon-btn"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <i className={`bi bi-${isDark ? 'sun-fill' : 'moon-fill'}`}></i>
    </button>
  );
};

export default ThemeToggle;
