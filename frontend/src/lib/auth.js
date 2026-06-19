import { createContext, useContext, useState, useEffect } from 'react';
import { requestNotificationPermission } from '@/lib/firebase';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const sendSwConfig = () => {
  if (!('serviceWorker' in navigator) || !firebaseConfig.apiKey) return;
  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
  }).catch(() => {});
};

const registerFcmToken = async (jwt) => {
  try {
    const token = await requestNotificationPermission();
    if (!token) return;
    await fetch(`${API}/notifications/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ token }),
    });
    sendSwConfig();
  } catch {}
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  // On startup: refresh user profile from backend to pick up premium/vip changes
  // made by admin while user was already logged in
  useEffect(() => {
    const jwt = localStorage.getItem('token');
    if (!jwt) return;
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const merged = { ...JSON.parse(localStorage.getItem('user') || '{}'), ...data };
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
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
    const merged = { ...user, ...updatedUser };
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
