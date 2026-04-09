import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Plus, Trash2, Eye, QrCode, Share2, Copy, 
  ChevronLeft, Calendar, ExternalLink, Download, LogOut
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
import { format } from 'date-fns';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { getTheme } from '@/lib/themes';

import { useAuth } from '@/lib/auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const APP_URL = process.env.REACT_APP_FRONTEND_URL || window.location.origin;

const Dashboard = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
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
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const getCelebrationUrl = (eventId) => {
    return `${APP_URL}/celebrate/${eventId}`;
  };

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
    <div className="min-h-screen bg-[#0A0F1F] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-[#94A3B8] hover:text-white transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#D4AF37]" />
            <span className="font-heading text-white text-lg">My Celebrations</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { logout(); navigate('/login'); }} variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <LogOut className="w-4 h-4" />
            </Button>
            <Button onClick={() => navigate('/create')} className="btn-gold" data-testid="create-new-btn">
              <Plus className="w-5 h-5 mr-2" />
              Create New
            </Button>
          </div>
        </div>

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
            <Button
              onClick={() => navigate('/create')}
              className="btn-gold"
              data-testid="empty-create-btn"
            >
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
                  {/* Theme Preview */}
                  <div 
                    className="h-24 relative"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.colors.primary}30, ${theme.colors.secondary}30)`,
                      backgroundColor: theme.colors.background
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span 
                        className="font-heading text-2xl"
                        style={{ color: theme.colors.primary }}
                      >
                        {event.person_name}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-[#94A3B8] text-sm mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(event.event_date), 'PPP')}
                      </span>
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

                    {/* Actions */}
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
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowQRModal(true);
                        }}
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
                        onClick={() => {
                          setEventToDelete(event);
                          setShowDeleteModal(true);
                        }}
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
              <DialogTitle className="font-heading text-xl text-center">
                Share Celebration
              </DialogTitle>
              <DialogDescription className="text-center text-[#94A3B8]">
                Scan this QR code or share the link
              </DialogDescription>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="flex flex-col items-center py-6">
                <div className="bg-white p-4 rounded-xl mb-6">
                  <QRCodeSVG
                    id="qr-code"
                    value={getCelebrationUrl(selectedEvent.id)}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                
                <p className="text-white font-medium mb-4">
                  {selectedEvent.person_name}'s Celebration
                </p>

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
                  <Button
                    onClick={() => copyLink(selectedEvent.id)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white"
                    data-testid="copy-link-btn"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={downloadQR}
                    className="flex-1 btn-gold"
                    data-testid="download-qr-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download QR
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
              <DialogTitle className="font-heading text-xl">
                Delete Celebration?
              </DialogTitle>
              <DialogDescription className="text-[#94A3B8]">
                This action cannot be undone. The celebration for {eventToDelete?.person_name} will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => setShowDeleteModal(false)}
                variant="outline"
                className="flex-1 border-white/10 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={deleteEvent}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                data-testid="confirm-delete-btn"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
