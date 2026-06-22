import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/lib/auth';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token, isAdmin } = useAuth();
  const [mode, setMode] = useState(() => new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', otp: '', newPassword: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (token) navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
  }, [token, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const res = await axios.post(`${API}${endpoint}`, payload);
      // Fetch full profile to get premium/vip fields
      let fullUser = res.data.user;
      try {
        const profile = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${res.data.token}` } });
        fullUser = { ...fullUser, ...profile.data };
      } catch {}
      login(res.data.token, fullUser);
      toast.success(`Welcome${fullUser.name ? ', ' + fullUser.name : ''}!`);
      navigate(fullUser.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await axios.post(`${API}/auth/google`, { token: credentialResponse.credential });
      let fullUser = res.data.user;
      try {
        const profile = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${res.data.token}` } });
        fullUser = { ...fullUser, ...profile.data };
      } catch {}
      login(res.data.token, fullUser);
      toast.success(`Welcome, ${fullUser.name}!`);
      navigate(fullUser.role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      toast.error('Google login failed');
    }
  };

  const handleAndroidGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Initialize only once — calling initialize() repeatedly on Android causes a crash
      try {
        await GoogleAuth.initialize({
          clientId: '351806783870-veju5qv3t3sjleabu5ngnh8kpckd5gg3.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
        });
      } catch (_initErr) {
        // Already initialized — safe to ignore
      }
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken;
      if (!idToken) throw new Error('No ID token received');
      const res = await axios.post(`${API}/auth/google`, { token: idToken });
      let fullUser = res.data.user;
      try {
        const profile = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${res.data.token}` } });
        fullUser = { ...fullUser, ...profile.data };
      } catch {}
      login(res.data.token, fullUser);
      toast.success(`Welcome, ${fullUser.name}!`);
      navigate(fullUser.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      console.error('Android Google Sign-In error:', err);
      toast.error('Google login failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!form.email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: form.email });
      setOtpSent(true);
      toast.success('OTP sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { email: form.email, otp: form.otp, new_password: form.newPassword });
      toast.success('Password reset successfully!');
      setShowForgotPassword(false);
      setOtpSent(false);
      setForm({ name: '', email: '', password: '', otp: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 w-full max-w-sm"
      >
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-[#94A3B8] hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="w-8 h-8 text-[#D4AF37]" />
          <span className="font-heading text-xl text-white">Celebration QR</span>
        </div>

        <h2 className="font-heading text-2xl text-white text-center mb-6">
          {showForgotPassword ? 'Reset Password' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>

        {showForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label className="text-white mb-2 block text-sm">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@gmail.com"
                required
                disabled={otpSent}
                className="bg-white/5 border-white/10 text-white h-11"
              />
            </div>
            {!otpSent ? (
              <Button type="button" onClick={handleSendOTP} disabled={loading} className="btn-gold w-full h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
              </Button>
            ) : (
              <>
                <div>
                  <Label className="text-white mb-2 block text-sm">OTP Code</Label>
                  <Input
                    value={form.otp}
                    onChange={e => setForm(p => ({ ...p, otp: e.target.value }))}
                    placeholder="6-digit code"
                    required
                    maxLength={6}
                    className="bg-white/5 border-white/10 text-white h-11 text-center text-xl tracking-widest"
                  />
                </div>
                <div>
                  <Label className="text-white mb-2 block text-sm">New Password</Label>
                  <Input
                    type="password"
                    value={form.newPassword}
                    onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="••••••••"
                    required
                    className="bg-white/5 border-white/10 text-white h-11"
                  />
                </div>
                <Button type="submit" disabled={loading} className="btn-gold w-full h-11">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                </Button>
              </>
            )}
            <button type="button" onClick={() => { setShowForgotPassword(false); setOtpSent(false); }} className="text-[#94A3B8] text-sm hover:text-white w-full text-center">
              Back to Login
            </button>
          </form>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              {Capacitor.isNativePlatform() ? (
                <Button onClick={handleAndroidGoogleSignIn} className="w-full h-11 bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-2">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  {mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
                </Button>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google login failed')}
                  theme="filled_black"
                  shape="rectangular"
                  width="100%"
                  text={mode === 'login' ? 'signin_with' : 'signup_with'}
                />
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/40 text-sm">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <Label className="text-white mb-2 block text-sm">Full Name</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your name"
                    required
                    className="bg-white/5 border-white/10 text-white h-11"
                  />
                </div>
              )}
              <div>
                <Label className="text-white mb-2 block text-sm">Gmail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@gmail.com"
                  required
                  className="bg-white/5 border-white/10 text-white h-11"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block text-sm">Password</Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    className="bg-white/5 border-white/10 text-white h-11 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="btn-gold w-full h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            {mode === 'login' && (
              <button onClick={() => setShowForgotPassword(true)} className="text-[#D4AF37] text-sm hover:underline w-full text-center mt-3">
                Forgot Password?
              </button>
            )}

            <p className="text-center text-white/40 text-sm mt-6">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-[#D4AF37] hover:underline">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </>
        )}

        <p className="text-center text-[#94A3B8] text-xs mt-8">
          Created by <span className="text-[#D4AF37]">Sudhanshu Kumar</span>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
