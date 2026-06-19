import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Camera, Loader2, Check, User, Phone, FileText, Mail, Crown, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '@/lib/auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PremiumBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
    <Check className="w-3 h-3" /> Premium
  </span>
);

const VIPBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40">
    👑 VIP Friend
  </span>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const { token, user, updateUser, isPremium, isVip } = useAuth();
  const avatarInputRef = useRef(null);

  const [form, setForm] = useState({ name: '', mobile: '', bio: '', avatar_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    axios.get(`${API}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setForm({
        name: r.data.name || '',
        mobile: r.data.mobile || '',
        bio: r.data.bio || '',
        avatar_url: r.data.avatar_url || '',
      }))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/upload`, fd, {
        params: { folder: 'avatars' },
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(prev => ({ ...prev, avatar_url: res.data.url }));
      toast.success('Photo updated!');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/profile`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateUser({ name: res.data.name, avatar_url: res.data.avatar_url });
      toast.success('Profile saved!');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-[#0A0F1F] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F1F] py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/dashboard')} className="text-[#94A3B8] hover:text-white flex items-center gap-1">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
        </div>

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 mb-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37]/40 bg-white/5 flex items-center justify-center">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-[#94A3B8]" />
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#D4AF37' }}
              >
                {uploadingAvatar ? <Loader2 className="w-4 h-4 text-[#0A0F1F] animate-spin" /> : <Camera className="w-4 h-4 text-[#0A0F1F]" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <p className="text-white font-heading text-xl">{form.name || 'Your Name'}</p>
            <p className="text-[#94A3B8] text-sm">{user?.email}</p>
            {(isPremium || isVip) && (
              <div className="flex items-center gap-2 mt-2">
                {isPremium && <PremiumBadge />}
                {isVip && <VIPBadge />}
              </div>
            )}
            {!isPremium && (
              <button
                onClick={() => navigate('/premium')}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-colors"
              >
                <Crown className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[#D4AF37] text-xs font-medium">Upgrade to Premium</span>
              </button>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-5">
            <div>
              <Label className="text-[#94A3B8] text-xs mb-2 flex items-center gap-1"><User className="w-3 h-3" /> Full Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
                className="bg-white/5 border-white/10 text-white h-11"
              />
            </div>

            <div>
              <Label className="text-[#94A3B8] text-xs mb-2 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-white/5 border-white/10 text-[#94A3B8] h-11 cursor-not-allowed"
              />
            </div>

            <div>
              <Label className="text-[#94A3B8] text-xs mb-2 flex items-center gap-1"><Phone className="w-3 h-3" /> Mobile Number</Label>
              <Input
                value={form.mobile}
                onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                placeholder="+91 98765 43210"
                type="tel"
                className="bg-white/5 border-white/10 text-white h-11"
              />
            </div>

            <div>
              <Label className="text-[#94A3B8] text-xs mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Bio</Label>
              <Textarea
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="A little about yourself..."
                className="bg-white/5 border-white/10 text-white resize-none min-h-[90px]"
                maxLength={200}
              />
              <p className="text-[#94A3B8] text-xs mt-1 text-right">{form.bio.length}/200</p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="btn-gold w-full h-11">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>

            <button
              onClick={() => navigate('/support')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Help &amp; Support
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default ProfilePage;
