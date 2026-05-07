import { Button } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ size = 'sm' }) => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      variant={isDark ? 'outline-light' : 'outline-secondary'}
      size={size}
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label="Toggle color theme"
      className="d-inline-flex align-items-center"
    >
      <i className={`bi bi-${isDark ? 'sun-fill' : 'moon-fill'}`}></i>
    </Button>
  );
};

export default ThemeToggle;
