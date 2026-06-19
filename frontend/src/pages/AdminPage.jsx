import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Users, Eye, Gift, Trash2, LogOut, ExternalLink, Lock,
  ChevronDown, ChevronUp, UserX, ChevronLeft, Star, MessageSquare, Check,
  Crown, Bell, Megaphone, CreditCard, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '@/lib/auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

const SUBSCRIPTION_OPTIONS = [
  { value: '1month', label: '1 Month' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
  { value: '5years', label: '5 Years' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'custom', label: 'Custom Date' },
];

// ─── PremiumModal ─────────────────────────────────────────────────────────────
const PremiumModal = ({ user, mode, onClose, token, onDone }) => {
  const [subType, setSubType] = useState('1month');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const endpoint = mode === 'gift' ? '/admin/premium/gift' : '/admin/premium/grant';
      await axios.post(`${API}${endpoint}`, {
        user_id: user.id,
        subscription_type: subType,
        custom_expiry: subType === 'custom' ? customDate : undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(mode === 'gift' ? 'Premium gifted!' : 'Premium granted!');
      onDone();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <p className="text-white font-heading text-lg mb-1">
          {mode === 'gift' ? '🎁 Gift Premium' : '✓ Grant Premium'}
        </p>
        <p className="text-[#94A3B8] text-sm mb-4">to {user.name}</p>
        <Label className="text-[#94A3B8] text-xs mb-2 block">Subscription Type</Label>
        <Select value={subType} onValueChange={setSubType}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 mb-3"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#131B2F] border-white/10 text-white">
            {SUBSCRIPTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {subType === 'custom' && (
          <Input
            type="date"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
            className="bg-white/5 border-white/10 text-white h-10 mb-3"
          />
        )}
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 border-white/10 text-white">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 btn-gold">
            {loading ? 'Processing...' : mode === 'gift' ? 'Gift' : 'Grant'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── BroadcastPanel ───────────────────────────────────────────────────────────
const BroadcastPanel = ({ token, users }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message required'); return; }
    setSending(true);
    try {
      const res = await axios.post(`${API}/admin/broadcast`, {
        title, message, target,
        target_user_id: target === 'specific' ? targetUserId : undefined,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data.message);
      setTitle(''); setMessage(''); setTarget('all'); setTargetUserId('');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="w-5 h-5 text-[#D4AF37]" />
        <h3 className="font-heading text-white text-lg">Broadcast Announcement</h3>
      </div>
      <div className="space-y-3">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="bg-white/5 border-white/10 text-white h-10"
        />
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message"
          className="bg-white/5 border-white/10 text-white resize-none min-h-[80px]"
        />
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#131B2F] border-white/10 text-white">
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="premium">Premium Users</SelectItem>
            <SelectItem value="free">Free Users</SelectItem>
            <SelectItem value="vip">VIP Users</SelectItem>
            <SelectItem value="specific">Specific User</SelectItem>
          </SelectContent>
        </Select>
        {target === 'specific' && (
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
              <SelectValue placeholder="Select user..." />
            </SelectTrigger>
            <SelectContent className="bg-[#131B2F] border-white/10 text-white">
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name} — {u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={send} disabled={sending} className="btn-gold w-full">
          {sending ? 'Sending...' : '📣 Send Notification'}
        </Button>
      </div>
    </div>
  );
};

// ─── AdminPage ────────────────────────────────────────────────────────────────
const AdminPage = () => {
  const navigate = useNavigate();
  const { token, logout, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedUser, setExpandedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [premiumModal, setPremiumModal] = useState(null);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [savingQr, setSavingQr] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [ticketReply, setTicketReply] = useState({});

  useEffect(() => {
    if (!isAdmin) { navigate('/login'); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/admin/stats`, { headers }),
      axios.get(`${API}/events`, { headers }),
      axios.get(`${API}/admin/users`, { headers }),
      axios.get(`${API}/admin/maintenance`, { headers }),
      axios.get(`${API}/admin/feedback`, { headers }),
      axios.get(`${API}/admin/payment-requests`, { headers }),
      axios.get(`${API}/settings/payment-qr`),
      axios.get(`${API}/admin/support/tickets`, { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(([s, e, u, m, f, pr, qr, st]) => {
      setStats(s.data);
      setEvents(e.data);
      setUsers(u.data);
      setMaintenance(m.data.maintenance);
      setFeedbacks(f.data);
      setPaymentRequests(pr.data);
      setQrUrlInput(qr.data.url || '');
      setSupportTickets(st.data);
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, [token, isAdmin, navigate]);

  const reloadUsers = async () => {
    const r = await axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    setUsers(r.data);
  };

  const reloadPaymentRequests = async () => {
    const r = await axios.get(`${API}/admin/payment-requests`, { headers: { Authorization: `Bearer ${token}` } });
    setPaymentRequests(r.data);
  };

  const approvePayment = async (reqId, userId) => {
    try {
      await axios.post(`${API}/admin/payment-requests/${reqId}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Payment approved & Premium activated!');
      reloadPaymentRequests();
      reloadUsers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const rejectPayment = async (reqId) => {
    try {
      await axios.post(`${API}/admin/payment-requests/${reqId}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Payment rejected');
      reloadPaymentRequests();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const saveQrUrl = async () => {
    setSavingQr(true);
    try {
      await axios.post(`${API}/admin/settings/payment-qr`, { url: qrUrlInput }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Payment QR URL saved!');
    } catch { toast.error('Failed to save QR URL'); }
    finally { setSavingQr(false); }
  };

  const toggleMaintenance = async () => {
    setTogglingMaintenance(true);
    try {
      const res = await axios.post(`${API}/admin/maintenance`, { maintenance: !maintenance }, { headers: { Authorization: `Bearer ${token}` } });
      setMaintenance(res.data.maintenance);
      toast.success(res.data.maintenance ? '🔧 Maintenance ON' : '✅ Maintenance OFF');
    } catch { toast.error('Failed to toggle maintenance'); }
    finally { setTogglingMaintenance(false); }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user and ALL their celebrations?')) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const deleteEvent = async (id) => {
    try {
      await axios.delete(`${API}/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const removePremium = async (userId) => {
    try {
      await axios.post(`${API}/admin/premium/remove`, { user_id: userId }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Premium removed');
      reloadUsers();
    } catch { toast.error('Failed'); }
  };

  const toggleVip = async (userId, currentVip) => {
    try {
      await axios.post(`${API}/admin/vip`, { user_id: userId, vip: !currentVip }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(currentVip ? 'VIP removed' : 'VIP granted');
      reloadUsers();
    } catch { toast.error('Failed'); }
  };

  const replyTicket = async (ticketId) => {
    const reply = ticketReply[ticketId]?.trim();
    if (!reply) return;
    try {
      await axios.post(`${API}/admin/support/tickets/${ticketId}/reply`, { admin_reply: reply }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Reply sent');
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, admin_reply: reply, status: 'in_progress' } : t));
      setTicketReply(prev => ({ ...prev, [ticketId]: '' }));
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      await axios.post(`${API}/admin/support/tickets/${ticketId}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      toast.success('Status updated');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) return (
    <div className="fixed inset-0 bg-[#0A0F1F] flex items-center justify-center">
      <Sparkles className="w-12 h-12 text-[#D4AF37] animate-pulse" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F1F] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="text-[#94A3B8] hover:text-white flex items-center gap-1 mr-3">
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <Sparkles className="w-6 h-6 text-[#D4AF37]" />
            <span className="font-heading text-white text-xl">Admin Dashboard</span>
          </div>
          <Button onClick={handleLogout} variant="outline" className="border-white/10 text-white hover:bg-white/5">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: Gift, label: 'Total Celebrations', value: stats.total_events },
              { icon: Users, label: 'Total Users', value: stats.total_users },
              { icon: Eye, label: 'Total Views', value: stats.total_views },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 text-center">
                <s.icon className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-[#94A3B8] text-sm mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Broadcast Panel */}
        <BroadcastPanel token={token} users={users} />

        {/* Users Table */}
        <div className="glass rounded-2xl overflow-hidden mb-8">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-heading text-white text-lg">All Users</h3>
          </div>
          <div className="divide-y divide-white/5">
            {users.length === 0 ? (
              <p className="text-[#94A3B8] text-center py-8">No users yet</p>
            ) : users.map((user, i) => (
              <div key={i}>
                <div
                  className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer"
                  onClick={() => setExpandedUser(expandedUser === i ? null : i)}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white font-medium">{user.name}</p>
                      {user.premium_active && <PremiumBadge />}
                      {user.vip_friend && <VIPBadge />}
                    </div>
                    <p className="text-[#94A3B8] text-sm">{user.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[#94A3B8] text-xs">{user.events.length} celebration(s)</p>
                      {user.premium_active && (
                        <p className="text-[#D4AF37] text-xs">
                          {user.premium_type === 'lifetime' ? 'Lifetime' : user.premium_expiry_date ? `Expires: ${user.premium_expiry_date.slice(0, 10)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Premium controls */}
                    {!user.premium_active ? (
                      <>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setPremiumModal({ user, mode: 'grant' }); }}
                          className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] text-xs h-7 px-2">
                          Grant Premium
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setPremiumModal({ user, mode: 'gift' }); }}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs h-7 px-2">
                          Gift Premium
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setPremiumModal({ user, mode: 'grant' }); }}
                          className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] text-xs h-7 px-2">
                          Extend
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); removePremium(user.id); }}
                          className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs h-7 px-2">
                          Remove Premium
                        </Button>
                      </>
                    )}
                    {/* VIP controls */}
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); toggleVip(user.id, user.vip_friend); }}
                      className={`text-xs h-7 px-2 ${user.vip_friend ? 'bg-purple-500/30 hover:bg-purple-500/40 text-purple-300' : 'bg-white/10 hover:bg-white/20 text-[#94A3B8]'}`}>
                      {user.vip_friend ? 'Remove VIP' : 'Grant VIP'}
                    </Button>
                    {/* Delete */}
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); deleteUser(user.id); }}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 h-7 px-2">
                      <UserX className="w-4 h-4" />
                    </Button>
                    {user.events.length > 0 && (
                      expandedUser === i
                        ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                        : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                    )}
                  </div>
                </div>
                {expandedUser === i && user.events.length > 0 && (
                  <div className="bg-white/5 px-4 pb-4 space-y-2">
                    {user.events.map((ev, j) => (
                      <div key={j} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-white text-sm font-medium">{ev.person_name}</p>
                          <p className="text-[#94A3B8] text-xs">{ev.occasion_type} · {ev.view_count || 0} views</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {ev.lock_pin && (
                            <div className="flex items-center gap-1">
                              <Lock className="w-3 h-3 text-[#94A3B8]" />
                              <span className="text-[#D4AF37] font-mono text-xs tracking-widest">{ev.lock_pin}</span>
                            </div>
                          )}
                          <Button size="sm" onClick={() => navigate(`/celebrate/${ev.id}`)}
                            className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] h-7 px-2">
                            <ExternalLink className="w-3 h-3 mr-1" /> Open
                          </Button>
                          <Button size="sm" onClick={() => {
                            deleteEvent(ev.id);
                            setUsers(prev => prev.map((u, ui) => ui === i ? { ...u, events: u.events.filter(e => e.id !== ev.id) } : u));
                          }}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 h-7 px-2">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Requests */}
        <div className="glass rounded-2xl overflow-hidden mb-8">
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-heading text-white text-lg">Payment Requests</h3>
            {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 font-bold">
                {paymentRequests.filter(r => r.status === 'pending').length} pending
              </span>
            )}
          </div>
          {paymentRequests.length === 0 ? (
            <p className="text-[#94A3B8] text-center py-8 text-sm">No payment requests yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {paymentRequests.map((req, i) => (                <div key={i} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-medium text-sm">{req.user_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                          req.status === 'pending'  ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' :
                          req.status === 'approved' ? 'bg-green-400/10 text-green-400 border-green-400/30' :
                          'bg-red-400/10 text-red-400 border-red-400/30'
                        }`}>
                          {req.status === 'pending' ? '⏳ Pending' : req.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                        </span>
                      </div>
                      <p className="text-[#94A3B8] text-xs">{req.user_email}</p>
                      <p className="text-[#94A3B8] text-xs mt-0.5">
                        Plan: <span className="text-white">{req.plan_type}</span>
                        {' · '}{req.created_at ? new Date(req.created_at).toLocaleString() : ''}
                      </p>
                      {req.screenshot_url && (
                        <a href={req.screenshot_url} target="_blank" rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-[#D4AF37] hover:underline">
                          <Image className="w-3 h-3" /> View Screenshot
                        </a>
                      )}
                    </div>
                    {/* Screenshot thumbnail */}
                    {req.screenshot_url && (
                      <a href={req.screenshot_url} target="_blank" rel="noreferrer" className="shrink-0">
                        <img
                          src={req.screenshot_url}
                          alt="proof"
                          className="w-16 h-16 object-cover rounded-lg border border-white/10 hover:border-[#D4AF37]/50 transition-colors"
                        />
                      </a>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm"
                        onClick={() => approvePayment(req.id, req.user_id)}
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs h-8 px-3">
                        ✅ Approve
                      </Button>
                      <Button size="sm"
                        onClick={() => rejectPayment(req.id)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs h-8 px-3">
                        ❌ Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment QR URL Setting */}
        <div className="glass rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-heading text-white text-base">Payment QR Image URL</h3>
          </div>
          <p className="text-[#94A3B8] text-xs mb-3">
            Set the UPI QR image URL shown on the Premium upgrade page.
            Upload to Cloudinary and paste the URL here, or place the file at{' '}
            <code className="text-[#D4AF37]">frontend/public/qrcode_upi.jpeg</code>.
          </p>
          <div className="flex gap-2">
            <Input
              value={qrUrlInput}
              onChange={e => setQrUrlInput(e.target.value)}
              placeholder="https://res.cloudinary.com/... or /qrcode_upi.jpeg"
              className="bg-white/5 border-white/10 text-white h-10 flex-1 text-xs"
            />
            <Button onClick={saveQrUrl} disabled={savingQr} className="btn-gold shrink-0">
              {savingQr ? 'Saving...' : 'Save'}
            </Button>
          </div>
          {qrUrlInput && (
            <div className="mt-3 flex justify-center">
              <img src={qrUrlInput} alt="QR preview" className="w-32 h-32 object-contain bg-white rounded-xl p-2"
                onError={e => { e.target.style.display = 'none'; }} />
            </div>
          )}
        </div>

        {/* Maintenance Toggle Card */}
        <div className="glass rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <p className="text-white font-medium text-sm">Maintenance Mode</p>
              <p className="text-[#94A3B8] text-xs">
                {maintenance ? 'Users cannot create new celebrations right now.' : 'Everything is live and running normally.'}
              </p>
            </div>
          </div>
          <Button
            onClick={toggleMaintenance}
            disabled={togglingMaintenance}
            className={maintenance ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400'}
          >
            {togglingMaintenance ? 'Updating...' : maintenance ? '✅ Turn Off' : '🔧 Enable'}
          </Button>
        </div>

        {/* Feedback */}
        {feedbacks.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden mb-8">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-heading text-white text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#D4AF37]" /> Feedback
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {feedbacks.map((fb, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium">{fb.event_name}</p>
                    <span className="text-[#D4AF37] text-sm">{'⭐'.repeat(fb.stars)}</span>
                  </div>
                  {fb.message && <p className="text-[#94A3B8] text-xs">{fb.message}</p>}
                  <p className="text-[#94A3B8]/50 text-xs mt-1">{fb.occasion_type}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support Tickets */}
        <div className="glass rounded-2xl overflow-hidden mb-8">
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-heading text-white text-lg">Support Tickets</h3>
            {supportTickets.filter(t => t.status === 'open').length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-400 border border-blue-400/30 font-bold">
                {supportTickets.filter(t => t.status === 'open').length} open
              </span>
            )}
          </div>
          {supportTickets.length === 0 ? (
            <p className="text-[#94A3B8] text-center py-8 text-sm">No support tickets yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {supportTickets.map((ticket) => (
                <div key={ticket.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{ticket.subject}</p>
                      <p className="text-[#94A3B8] text-xs">{ticket.user_name} · {ticket.user_email}</p>
                      <p className="text-[#94A3B8] text-xs mt-0.5">{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                        ticket.status === 'open'        ? 'bg-blue-400/10 text-blue-400 border-blue-400/30' :
                        ticket.status === 'in_progress' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' :
                        'bg-green-400/10 text-green-400 border-green-400/30'
                      }`}>
                        {ticket.status === 'open' ? '🔵 Open' : ticket.status === 'in_progress' ? '⏳ In Progress' : '✅ Resolved'}
                      </span>
                      {ticket.status !== 'resolved' && (
                        <Button size="sm" onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs h-7 px-2">
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 mb-3">
                    <p className="text-white text-sm whitespace-pre-wrap">{ticket.message}</p>
                  </div>
                  {ticket.admin_reply && (
                    <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-3 mb-3">
                      <p className="text-[#94A3B8] text-xs mb-1">Your Reply</p>
                      <p className="text-white text-sm whitespace-pre-wrap">{ticket.admin_reply}</p>
                    </div>
                  )}
                  {ticket.status !== 'resolved' && (
                    <div className="flex gap-2">
                      <Input
                        value={ticketReply[ticket.id] || ''}
                        onChange={e => setTicketReply(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="Write a reply..."
                        className="bg-white/5 border-white/10 text-white h-9 text-sm flex-1"
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && replyTicket(ticket.id)}
                      />
                      <Button size="sm" onClick={() => replyTicket(ticket.id)}
                        className="btn-gold h-9 px-3 shrink-0">
                        Reply
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Premium Modal */}
      {premiumModal && (
        <PremiumModal
          user={premiumModal.user}
          mode={premiumModal.mode}
          token={token}
          onClose={() => setPremiumModal(null)}
          onDone={reloadUsers}
        />
      )}
    </div>
  );
};

export default AdminPage;
