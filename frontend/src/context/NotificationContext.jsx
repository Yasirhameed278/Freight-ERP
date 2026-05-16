import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  // Initial fetch when token changes (login / logout)
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    api.get('/notifications', { params: { limit: 30 } })
      .then(({ data }) => {
        setNotifications(data.items || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }, [token]);

  // SSE — live push
  useEffect(() => {
    if (!token) return;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const src  = new EventSource(`${base}/notifications/stream?token=${encodeURIComponent(token)}`);

    src.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'notification') {
          setNotifications((prev) => [data.notification, ...prev].slice(0, 50));
          setUnreadCount((c) => c + 1);
        }
      } catch { /* ignore malformed frame */ }
    };

    return () => src.close();
  }, [token]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const remove = async (id) => {
    const target = notifications.find((n) => n._id === id);
    await api.delete(`/notifications/${id}`).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, remove }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
