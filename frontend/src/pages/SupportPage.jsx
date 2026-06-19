import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles, Plus, MessageCircle, Check, Clock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '@/lib/auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',   icon: '🔵' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', icon: '⏳' },
  resolved:    { label: 'Resolved',    color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  icon: '✅' },
};

const SupportPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ subject: '', message: '' });

  useEffect(() => {
    axios.get(`${API}/support/tickets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setTickets(r.data))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/support/tickets`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(prev => [res.data, ...prev]);
      setForm({ subject: '', message: '' });
      setShowForm(false);
      toast.success('Ticket submitted! We\'ll get back to you soon.');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate(-1)} className="text-[#94A3B8] hover:text-white flex items-center gap-1">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#D4AF37]" />
            <span className="font-heading text-white text-lg">Help & Support</span>
          </div>
          <Button
            onClick={() => setShowForm(v => !v)}
            size="sm"
            className="btn-gold"
          >
            <Plus className="w-4 h-4 mr-1" /> New Ticket
          </Button>
        </div>

        {/* New Ticket Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass rounded-2xl p-5 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-white font-medium">New Support Request</p>
                <button onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4 text-[#94A3B8] hover:text-white" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-[#94A3B8] text-xs mb-2 block">Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    className="bg-white/5 border-white/10 text-white h-10"
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label className="text-[#94A3B8] text-xs mb-2 block">Message</Label>
                  <Textarea
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Describe your issue in detail..."
                    className="bg-white/5 border-white/10 text-white resize-none min-h-[120px]"
                    maxLength={2000}
                  />
                  <p className="text-[#94A3B8] text-xs mt-1 text-right">{form.message.length}/2000</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1 border-white/10 text-white">
                    Cancel
                  </Button>
                  <Button onClick={submit} disabled={submitting} className="flex-1 btn-gold">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</> : 'Submit Ticket'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tickets List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Sparkles className="w-10 h-10 text-[#D4AF37] animate-pulse" />
          </div>
        ) : tickets.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-2xl p-12 text-center">
            <MessageCircle className="w-14 h-14 text-[#94A3B8] mx-auto mb-4" />
            <h2 className="font-heading text-xl text-white mb-2">No Tickets Yet</h2>
            <p className="text-[#94A3B8] text-sm mb-6">Have an issue or question? Create a support ticket and we'll help you out.</p>
            <Button onClick={() => setShowForm(true)} className="btn-gold">
              <Plus className="w-4 h-4 mr-2" /> Create Ticket
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket, i) => {
              const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
              const isOpen = expanded === i;
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl overflow-hidden"
                >
                  <button
                    className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : i)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{ticket.subject}</p>
                        <p className="text-[#94A3B8] text-xs mt-0.5">
                          {format(new Date(ticket.created_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {/* Original message */}
                          <div>
                            <p className="text-[#94A3B8] text-xs mb-1">Your Message</p>
                            <div className="bg-white/5 rounded-xl p-3">
                              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
                            </div>
                          </div>

                          {/* Admin reply */}
                          {ticket.admin_reply && (
                            <div>
                              <p className="text-[#94A3B8] text-xs mb-1 flex items-center gap-1">
                                <Check className="w-3 h-3 text-[#D4AF37]" /> Support Reply
                              </p>
                              <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-3">
                                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{ticket.admin_reply}</p>
                              </div>
                            </div>
                          )}

                          {!ticket.admin_reply && (
                            <p className="text-[#94A3B8] text-xs text-center py-2">
                              ⏳ Awaiting support response...
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage;
