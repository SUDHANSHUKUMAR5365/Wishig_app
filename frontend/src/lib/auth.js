import { createContext, useContext, useState, useEffect } from 'react';
import { getNativeFCMToken, onNativeForegroundMessage, onNotificationTap } from '@/lib/fcm';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

const registerFcmToken = async (jwt) => {
  try {
    const token = await getNativeFCMToken();
    if (!token) return;
    await fetch(`${API}/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ token }),
    });
  } catch {}
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  // On startup: refresh user profile from backend to pick up premium/vip changes
  useEffect(() => {
    const jwt = localStorage.getItem('token');
    if (!jwt) return;
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // Use functional setUser so we always merge into the latest state
        setUser(prev => {
          const merged = { ...(prev || {}), ...data };
          localStorage.setItem('user', JSON.stringify(merged));
          return merged;
        });
      })
      .catch(() => {});
    registerFcmToken(jwt);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    registerFcmToken(newToken);
  };

  const updateUser = (updatedUser) => {
    // Always read current stored user to avoid merging into stale state
    const current = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
    const merged = { ...current, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      updateUser,
      isAdmin: user?.role === 'admin',
      isPremium: user?.premium_active === true,
      isVip: user?.vip_friend === true,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
