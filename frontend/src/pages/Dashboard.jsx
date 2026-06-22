import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Plus, Trash2, Eye, QrCode, Share2, Copy,
  ChevronLeft, Calendar, ExternalLink, Download, LogOut, User, Bell, X, Check, Crown, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { getTheme } from '@/lib/themes';
import { useAuth } from '@/lib/auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const APP_URL = process.env.REACT_APP_FRONTEND_URL || window.location.origin;

// ─── Badges ───────────────────────────────────────────────────────────────────
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

// ─── NotificationDrawer ───────────────────────────────────────────────────────
const NotificationDrawer = ({ open, onClose, token }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setNotifications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, token]);

  const markRead = async (id) => {
    await axios.post(`${API}/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await axios.post(`${API}/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#131B2F] border-white/10 text-white max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading text-lg">Notifications</DialogTitle>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#D4AF37] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <DialogDescription className="text-[#94A3B8] text-xs">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-8"><Sparkles className="w-6 h-6 text-[#D4AF37] animate-pulse" /></div>
          ) : notifications.length === 0 ? (
            <p className="text-[#94A3B8] text-center py-8 text-sm">No notifications yet</p>
          ) : notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`rounded-xl p-3 cursor-pointer transition-colors ${n.is_read ? 'bg-white/3' : 'bg-[#D4AF37]/10 border border-[#D4AF37]/20'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-sm font-medium ${n.is_read ? 'text-[#94A3B8]' : 'text-white'}`}>{n.title}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{n.message}</p>
                  <p className="text-xs text-[#94A3B8]/60 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0 mt-1" />}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { token, logout, user, isPremium, isVip, updateUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchEvents();
    fetchUnreadCount();
    // Refresh premium/vip status on mount so admin-approved subscriptions are reflected
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.data && updateUser(r.data))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const r = await axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      setUnreadCount(r.data.filter(n => !n.is_read).length);
    } catch {}
  };

  const deleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await axios.delete(`${API}/events/${eventToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      toast.success('Event deleted');
      setShowDeleteModal(false);
      setEventToDelete(null);
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const getCelebrationUrl = (eventId) => `${APP_URL}/celebrate/${eventId}`;

  const copyLink = (eventId) => {
    navigator.clipboard.writeText(getCelebrationUrl(eventId));
    toast.success('Link copied to clipboard!');
  };

  const shareWhatsApp = (event) => {
    const url = getCelebrationUrl(event.id);
    const text = `Check out this special celebration for ${event.person_name}! 🎉`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
  };

  const downloadQR = () => {
    if (!selectedEvent) return;
    const svg = document.getElementById('qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `celebration-qr-${selectedEvent.person_name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const getOccasionLabel = (type, custom) => {
    switch (type) {
      case 'birthday': return 'Birthday';
      case 'anniversary': return 'Anniversary';
      case 'custom': return custom || 'Custom';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] px-4 safe-top" style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 32px)`, paddingBottom: 32 }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-2">
          {/* Left: Back */}
          <button
            onClick={() => navigate('/')}
            className="text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Center: Title */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-heading text-white text-sm sm:text-lg">My Celebrations</span>
          </div>

          {/* Right: icon buttons only */}
          <div className="flex gap-1 items-center shrink-0">
            <button
              onClick={() => { setShowNotifications(true); setUnreadCount(0); }}
              className="relative w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Bell className="w-4 h-4 text-[#94A3B8]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-[#0A0F1F] text-xs font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/support')}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-[#94A3B8]" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full overflow-hidden border border-[#D4AF37]/40 bg-white/5 flex items-center justify-center hover:border-[#D4AF37] transition-colors"
            >
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User className="w-4 h-4 text-[#94A3B8]" />}
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4 text-[#94A3B8]" />
            </button>
            <button
              onClick={() => navigate('/create')}
              className="w-8 h-8 rounded-full btn-gold flex items-center justify-center"
              data-testid="create-new-btn"
              title="Create New"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User badges + Upgrade banner */}
        {(isPremium || isVip) ? (
          <div className="flex items-center gap-2 mb-6">
            {isPremium && <PremiumBadge />}
            {isVip && <VIPBadge />}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6 glass rounded-xl px-4 py-3 border border-[#D4AF37]/20"
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-[#D4AF37] shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Upgrade to Premium</p>
                <p className="text-[#94A3B8] text-xs">25 photos · videos · all themes · all games</p>
              </div>
            </div>
            <Button onClick={() => navigate('/premium')} size="sm" className="btn-gold shrink-0">
              Upgrade
            </Button>
          </motion.div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Sparkles className="w-12 h-12 text-[#D4AF37] animate-pulse" />
          </div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <Sparkles className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
            <h2 className="font-heading text-2xl text-white mb-2">No Celebrations Yet</h2>
            <p className="text-[#94A3B8] mb-6">Create your first magical celebration experience!</p>
            <Button onClick={() => navigate('/create')} className="btn-gold" data-testid="empty-create-btn">
              <Plus className="w-5 h-5 mr-2" />
              Create Celebration
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => {
              const theme = getTheme(event.theme);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass rounded-2xl overflow-hidden"
                >
                  <div
                    className="h-24 relative"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}30, ${theme.colors.secondary}30)`,
                      backgroundColor: theme.colors.background
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-heading text-2xl" style={{ color: theme.colors.primary }}>
                        {event.person_name}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 text-[#94A3B8] text-sm mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(event.event_date), 'PPP')}</span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full text-xs bg-[#D4AF37]/20 text-[#D4AF37]">
                        {getOccasionLabel(event.occasion_type, event.custom_occasion)}
                      </span>
                      <span className="text-[#94A3B8] text-xs flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {event.view_count || 0} views
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/celebrate/${event.id}`)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white"
                        size="sm"
                        data-testid={`view-event-${event.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => { setSelectedEvent(event); setShowQRModal(true); }}
                        className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37]"
                        size="sm"
                        data-testid={`qr-event-${event.id}`}
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => shareWhatsApp(event)}
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-500"
                        size="sm"
                        data-testid={`share-event-${event.id}`}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => { setEventToDelete(event); setShowDeleteModal(true); }}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-500"
                        size="sm"
                        data-testid={`delete-event-${event.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* QR Code Modal */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="bg-[#131B2F] border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl text-center">Share Celebration</DialogTitle>
              <DialogDescription className="text-center text-[#94A3B8]">
                Scan this QR code or share the link
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="flex flex-col items-center py-6">
                <div className="bg-white p-4 rounded-xl mb-6">
                  <QRCodeSVG id="qr-code" value={getCelebrationUrl(selectedEvent.id)} size={200} level="H" includeMargin />
                </div>
                <p className="text-white font-medium mb-4">{selectedEvent.person_name}'s Celebration</p>
                {selectedEvent.lock_pin && (
                  <div className="w-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-3 mb-4 text-center">
                    <p className="text-[#94A3B8] text-xs mb-1">🔒 Celebration PIN</p>
                    <p className="text-[#D4AF37] text-2xl font-bold tracking-widest">{selectedEvent.lock_pin}</p>
                    {selectedEvent.lock_hint && (
                      <p className="text-[#94A3B8] text-xs mt-1">Hint: {selectedEvent.lock_hint}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2 w-full">
                  <Button onClick={() => copyLink(selectedEvent.id)} className="flex-1 bg-white/10 hover:bg-white/20 text-white" data-testid="copy-link-btn">
                    <Copy className="w-4 h-4 mr-2" /> Copy Link
                  </Button>
                  <Button onClick={downloadQR} className="flex-1 btn-gold" data-testid="download-qr-btn">
                    <Download className="w-4 h-4 mr-2" /> Download QR
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="bg-[#131B2F] border-white/10 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">Delete Celebration?</DialogTitle>
              <DialogDescription className="text-[#94A3B8]">
                This action cannot be undone. The celebration for {eventToDelete?.person_name} will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => setShowDeleteModal(false)} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button onClick={deleteEvent} className="flex-1 bg-red-500 hover:bg-red-600 text-white" data-testid="confirm-delete-btn">
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Notification Drawer */}
        <NotificationDrawer
          open={showNotifications}
          onClose={() => setShowNotifications(false)}
          token={token}
        />
      </div>
    </div>
  );
};

export default Dashboard;
