import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Users, Eye, Gift, Trash2, LogOut, ExternalLink, Lock, ChevronDown, ChevronUp, UserX, ChevronLeft, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '@/lib/auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

  useEffect(() => {
    if (!isAdmin) { navigate('/login'); return; }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/admin/stats`, { headers }),
      axios.get(`${API}/events`, { headers }),
      axios.get(`${API}/admin/users`, { headers }),
      axios.get(`${API}/admin/maintenance`, { headers }),
      axios.get(`${API}/admin/feedback`, { headers }),
    ]).then(([s, e, u, m, f]) => {
      setStats(s.data);
      setEvents(e.data);
      setUsers(u.data);
      setMaintenance(m.data.maintenance);
      setFeedbacks(f.data);
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, [token, isAdmin, navigate]);

  const toggleMaintenance = async () => {
    setTogglingMaintenance(true);
    try {
      const res = await axios.post(`${API}/admin/maintenance`, { maintenance: !maintenance }, { headers: { Authorization: `Bearer ${token}` } });
      setMaintenance(res.data.maintenance);
      toast.success(res.data.maintenance ? '🔧 Maintenance ON — users cannot create celebrations' : '✅ Maintenance OFF — everything is live');
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
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-[#94A3B8] text-sm">{user.email}</p>
                    <p className="text-[#94A3B8] text-xs mt-1">{user.events.length} celebration(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); deleteUser(user.id); }}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400">
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

        {/* Maintenance Toggle Card */}
        <div className="glass rounded-2xl p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <p className="text-white font-medium text-sm">Maintenance Mode</p>
              <p className="text-[#94A3B8] text-xs">
                {maintenance ? 'Users cannot create new celebrations right now.' : 'Everything is live. Users can create celebrations.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={togglingMaintenance}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              maintenance
                ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                : 'bg-green-500/20 border border-green-500/50 text-green-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${maintenance ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
            {togglingMaintenance ? 'Updating...' : maintenance ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>

        {/* Feedback Section */}
        <div className="glass rounded-2xl overflow-hidden mb-8">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-heading text-white text-lg">All Feedback</h3>
            </div>
            {feedbacks.length > 0 && (
              <span className="text-[#94A3B8] text-sm">
                Avg: <span className="text-[#D4AF37] font-bold">
                  {(feedbacks.reduce((a, f) => a + f.stars, 0) / feedbacks.length).toFixed(1)}★
                </span> &nbsp;·&nbsp; {feedbacks.length} review{feedbacks.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="divide-y divide-white/5">
            {feedbacks.length === 0 ? (
              <p className="text-[#94A3B8] text-center py-8">No feedback yet</p>
            ) : feedbacks.map((fb, i) => (
              <div key={i} className="p-4 hover:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400 text-sm tracking-tight">
                        {'★'.repeat(fb.stars)}{'☆'.repeat(5 - fb.stars)}
                      </span>
                      <span className="text-[#D4AF37] font-bold text-sm">{fb.stars}/5</span>
                    </div>
                    <p className="text-white text-sm font-medium">{fb.event_name} <span className="text-[#94A3B8] font-normal">· {fb.occasion_type}</span></p>
                    {fb.message && (
                      <p className="text-[#94A3B8] text-sm mt-1 flex items-start gap-1">
                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                        {fb.message}
                      </p>
                    )}
                  </div>
                  <p className="text-[#94A3B8] text-xs shrink-0">
                    {new Date(fb.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Events */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-heading text-white text-lg">All Celebrations</h3>
          </div>
          <div className="divide-y divide-white/5">
            {events.length === 0 ? (
              <p className="text-[#94A3B8] text-center py-12">No celebrations yet</p>
            ) : events.map(event => (
              <div key={event.id} className="flex items-center justify-between p-4 hover:bg-white/5">
                <div>
                  <p className="text-white font-medium">{event.person_name}</p>
                  <p className="text-[#94A3B8] text-sm">{event.occasion_type} · {format(new Date(event.event_date), 'PP')}</p>
                  <p className="text-[#94A3B8] text-xs mt-1">{event.view_count || 0} views</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate(`/celebrate/${event.id}`)}
                    className="bg-white/10 hover:bg-white/20 text-white">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => deleteEvent(event.id)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
