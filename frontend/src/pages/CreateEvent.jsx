import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, User, Calendar, Image, Video, 
  MessageSquare, Mic, Music, Palette, Check, Loader2, Upload,
  X, Sparkles, QrCode, Copy, Download, ExternalLink, Heart, Wand2,
  Play, Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getThemesByCategory } from '@/lib/themes';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

import { useAuth } from '@/lib/auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const steps = [
  { id: 1, title: 'Basic Info', icon: User },
  { id: 2, title: 'Date & Time', icon: Calendar },
  { id: 3, title: 'Photos', icon: Image },
  { id: 4, title: 'Video', icon: Video },
  { id: 5, title: 'Message', icon: MessageSquare },
  { id: 6, title: 'Flip Cards', icon: Heart },
  { id: 7, title: 'Music', icon: Music },
  { id: 8, title: 'Theme', icon: Palette },
];

const occasionTypes = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💑' },
  { id: 'custom', label: 'Custom', emoji: '✨' },
];

const APP_URL = process.env.REACT_APP_FRONTEND_URL || window.location.origin;

// Fast canvas-based song clip picker
const SongClipper = ({ songUrl, songStart, songDuration, onChange }) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartSec = useRef(0);
  const currentStartRef = useRef(songStart);
  const rafRef = useRef(null);
  const CLIP = 60;

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Draw canvas waveform + clip window
  const draw = useCallback((start, total, playing, currentTime) => {
    const canvas = canvasRef.current;
    if (!canvas || !total) return;
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const BAR_COUNT = 80;
    const BAR_W = W / BAR_COUNT - 1;
    const startPx = (start / total) * W;
    const endPx = ((start + CLIP) / total) * W;

    for (let i = 0; i < BAR_COUNT; i++) {
      const x = i * (W / BAR_COUNT);
      const barSec = (i / BAR_COUNT) * total;
      const inClip = barSec >= start && barSec < start + CLIP;
      const h = (0.2 + Math.abs(Math.sin(i * 0.9)) * 0.8) * H * 0.85;
      ctx.fillStyle = inClip ? '#D4AF37' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(x, (H - h) / 2, BAR_W, h, 2);
      ctx.fill();
    }

    // Clip window border
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(startPx, 1, endPx - startPx, H - 2, 6);
    ctx.stroke();

    // Handles
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath(); ctx.roundRect(startPx, 0, 12, H, [6, 0, 0, 6]); ctx.fill();
    ctx.beginPath(); ctx.roundRect(endPx - 12, 0, 12, H, [0, 6, 6, 0]); ctx.fill();

    // Playhead
    if (playing && currentTime >= start && currentTime <= start + CLIP) {
      const px = ((currentTime - start) / CLIP) * (endPx - startPx) + startPx;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.roundRect(px - 1, 0, 2, H, 1); ctx.fill();
    }
  }, []);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw(currentStartRef.current, totalDuration, isPlaying, audioRef.current?.currentTime || 0);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [totalDuration, isPlaying, draw]);

  // Load audio metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setTotalDuration(audio.duration);
    audio.addEventListener('loadedmetadata', onLoaded);
    if (audio.readyState >= 1) onLoaded();
    return () => audio.removeEventListener('loadedmetadata', onLoaded);
  }, [songUrl]);

  // Animation loop for playhead
  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    const loop = () => {
      const audio = audioRef.current;
      if (audio) {
        if (audio.currentTime >= currentStartRef.current + CLIP) audio.currentTime = currentStartRef.current;
        draw(currentStartRef.current, totalDuration, true, audio.currentTime);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, totalDuration, draw]);

  // Redraw when start changes (from outside drag)
  useEffect(() => {
    currentStartRef.current = songStart;
    if (!isPlaying) draw(songStart, totalDuration, false, 0);
  }, [songStart, totalDuration, isPlaying, draw]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.currentTime = currentStartRef.current; audio.play().catch(() => {}); setIsPlaying(true); }
  };

  const getSecFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return ((clientX - rect.left) / rect.width) * totalDuration;
  };

  const onPointerDown = (e) => {
    if (!totalDuration) return;
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartSec.current = currentStartRef.current;
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current || !totalDuration) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const canvas = canvasRef.current;
      const dPx = clientX - dragStartX.current;
      const dSec = (dPx / canvas.offsetWidth) * totalDuration;
      const newStart = clamp(dragStartSec.current + dSec, 0, totalDuration - CLIP);
      currentStartRef.current = newStart;
      draw(newStart, totalDuration, isPlaying, audioRef.current?.currentTime || 0);
      if (audioRef.current) audioRef.current.currentTime = newStart;
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      onChange(Math.round(currentStartRef.current), CLIP);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [totalDuration, isPlaying, onChange, draw]);

  if (!totalDuration) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin mr-2" />
      <span className="text-[#94A3B8] text-sm">Loading audio...</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={songUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        <button onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#D4AF37', color: '#0A0F1F' }}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div>
          <p className="text-white text-sm font-medium">
            {fmt(songStart)} → {fmt(Math.min(songStart + CLIP, totalDuration))}
          </p>
          <p className="text-[#94A3B8] text-xs">Total: {fmt(totalDuration)}</p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full rounded-xl cursor-grab active:cursor-grabbing"
        style={{ height: 64, touchAction: 'none', userSelect: 'none' }}
        onMouseDown={onPointerDown}
        onTouchStart={onPointerDown}
      />

      <p className="text-[#94A3B8] text-xs text-center">Drag the golden window to pick your 60s clip</p>
    </div>
  );
};

const CreateEvent = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [createdEventId, setCreatedEventId] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingFlipAI, setIsGeneratingFlipAI] = useState(false);
  const [aiTone, setAiTone] = useState('heartfelt');
  
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const voiceInputRef = useRef(null);
  const songInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    person_name: '',
    occasion_type: 'birthday',
    custom_occasion: '',
    event_date: new Date(),
    theme: 'royal_gold',
    photos: [],
    video_url: '',
    special_note: '',
    voice_message_url: '',
    song_url: '',
    song_start: 0,
    song_duration: 60,
    easter_egg_message: '',
    timeline: [],
    flip_cards: ['', '', '', '', '', ''],
    lock_pin: '',
    lock_hint: '',
  });

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData(prev => ({ ...prev, lock_pin: pin }));
    toast.success(`PIN generated: ${pin} — Save this!`);
  };

  const generateAIMessage = async () => {
    if (!formData.person_name) { toast.error('Enter the person\'s name first'); return; }
    setIsGeneratingAI(true);
    try {
      const res = await axios.post(`${API}/ai/generate-message`, {
        person_name: formData.person_name,
        occasion_type: formData.occasion_type,
        custom_occasion: formData.custom_occasion,
        tone: aiTone,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setFormData(prev => ({ ...prev, special_note: res.data.message }));
      toast.success('Message generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'AI generation failed');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateAIFlipCards = async () => {
    if (!formData.person_name) { toast.error('Enter the person\'s name first'); return; }
    setIsGeneratingFlipAI(true);
    try {
      const res = await axios.post(`${API}/ai/generate-message`, {
        person_name: formData.person_name,
        occasion_type: formData.occasion_type,
        custom_occasion: formData.custom_occasion,
        tone: 'flipcards',
      }, { headers: { Authorization: `Bearer ${token}` } });
      const lines = res.data.message.split('\n').map(l => l.replace(/^\d+[\.\)\-]\s*/, '').trim()).filter(Boolean).slice(0, 6);
      while (lines.length < 6) lines.push('');
      setFormData(prev => ({ ...prev, flip_cards: lines }));
      toast.success('Flip cards generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'AI generation failed');
    } finally {
      setIsGeneratingFlipAI(false);
    }
  };

  const ALLOWED_FOLDERS = ['photos', 'videos', 'voice', 'songs'];

  const uploadFile = useCallback(async (file, folder) => {
    if (!ALLOWED_FOLDERS.includes(folder)) throw new Error('Invalid upload folder');

    // Get signed signature from backend
    const { data: sig } = await axios.get(`${API}/upload/signature`, {
      params: { folder },
      headers: { Authorization: `Bearer ${token}` }
    });

    // Upload directly to Cloudinary — no backend hop
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', sig.api_key);
    fd.append('timestamp', sig.timestamp);
    fd.append('signature', sig.signature);
    fd.append('folder', sig.folder);

    const resourceType = file.type.startsWith('video') || file.type.startsWith('audio') ? 'video' : 'image';
    const { data } = await axios.post(
      `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resourceType}/upload`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.secure_url;
  }, [token]);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const remaining = 10 - formData.photos.length;
    if (remaining <= 0) { toast.error('Maximum 10 photos allowed'); return; }
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) toast.warning(`Only ${remaining} more photo(s) allowed. Uploading first ${remaining}.`);
    
    setUploadProgress(prev => ({ ...prev, photos: 'uploading' }));
    
    try {
      const uploadPromises = toUpload.map(async (file) => {
        const url = await uploadFile(file, 'photos');
        return { url, caption: '' };
      });
      
      const uploadedPhotos = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedPhotos]
      }));
      
      toast.success(`${toUpload.length} photo(s) uploaded!`);
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadProgress(prev => ({ ...prev, photos: null }));
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadProgress(prev => ({ ...prev, video: 'uploading' }));
    
    try {
      const url = await uploadFile(file, 'videos');
      setFormData(prev => ({ ...prev, video_url: url }));
      toast.success('Video uploaded!');
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploadProgress(prev => ({ ...prev, video: null }));
    }
  };

  const handleVoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadProgress(prev => ({ ...prev, voice: 'uploading' }));
    
    try {
      const url = await uploadFile(file, 'voice');
      setFormData(prev => ({ ...prev, voice_message_url: url }));
      toast.success('Voice message uploaded!');
    } catch (error) {
      console.error('Voice upload error:', error);
      toast.error('Failed to upload voice message');
    } finally {
      setUploadProgress(prev => ({ ...prev, voice: null }));
    }
  };

  const handleSongUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadProgress(prev => ({ ...prev, song: 'uploading' }));
    
    try {
      const url = await uploadFile(file, 'songs');
      setFormData(prev => ({ ...prev, song_url: url }));
      toast.success('Song uploaded!');
    } catch (error) {
      console.error('Song upload error:', error);
      toast.error('Failed to upload song');
    } finally {
      setUploadProgress(prev => ({ ...prev, song: null }));
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.person_name) {
      toast.error('Please enter the person\'s name');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      const eventData = {
        ...formData,
        event_date: formData.event_date.toISOString(),
        lock_pin: formData.lock_pin || null,
        lock_hint: formData.lock_hint || null,
        flip_cards: formData.flip_cards.filter(c => c.trim() !== ''),
        song_start: formData.song_start || 0,
        song_duration: formData.song_duration || 60,
      };

      const response = await axios.post(`${API}/events`, eventData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Celebration created!');
      setCreatedEventId(response.data.id);
    } catch (error) {
      console.error('Error creating event:', error);
      if (error.response?.status === 503 && error.response?.data?.detail === 'maintenance') {
        setMaintenanceMode(true);
      } else {
        toast.error('Failed to create celebration');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-2 block">Person's Name</Label>
              <Input
                data-testid="person-name-input"
                value={formData.person_name}
                onChange={(e) => setFormData(prev => ({ ...prev, person_name: e.target.value }))}
                placeholder="Enter name..."
                className="bg-white/5 border-white/10 text-white h-12"
              />
            </div>
            
            <div>
              <Label className="text-white mb-3 block">Occasion Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {occasionTypes.map((type) => (
                  <button
                    key={type.id}
                    data-testid={`occasion-${type.id}`}
                    onClick={() => setFormData(prev => ({ ...prev, occasion_type: type.id }))}
                    className={`p-4 rounded-xl text-center transition-all duration-300 ${
                      formData.occasion_type === type.id
                        ? 'bg-[#D4AF37] text-[#0A0F1F]'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{type.emoji}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {formData.occasion_type === 'custom' && (
              <div>
                <Label className="text-white mb-2 block">Custom Occasion Name</Label>
                <Input
                  data-testid="custom-occasion-input"
                  value={formData.custom_occasion}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_occasion: e.target.value }))}
                  placeholder="e.g., Graduation, Promotion..."
                  className="bg-white/5 border-white/10 text-white h-12"
                />
              </div>
            )}
          </div>
        );

      case 2: {
        const d = formData.event_date || new Date();
        const selYear = d.getFullYear();
        const selMonth = d.getMonth();
        const selDay = d.getDate();
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: currentYear - 1900 + 2 }, (_, i) => currentYear + 1 - i);
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const updateDate = (year, month, day) => {
          const maxDay = new Date(year, month + 1, 0).getDate();
          const safeDay = Math.min(day, maxDay);
          setFormData(prev => ({ ...prev, event_date: new Date(year, month, safeDay) }));
        };

        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-3 block">Event Date</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[#94A3B8] text-xs mb-1 block">Day</Label>
                  <Select value={String(selDay)} onValueChange={v => updateDate(selYear, selMonth, Number(v))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131B2F] border-white/10 text-white max-h-60">
                      {days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#94A3B8] text-xs mb-1 block">Month</Label>
                  <Select value={String(selMonth)} onValueChange={v => updateDate(selYear, Number(v), selDay)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131B2F] border-white/10 text-white max-h-60">
                      {months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#94A3B8] text-xs mb-1 block">Year</Label>
                  <Select value={String(selYear)} onValueChange={v => updateDate(Number(v), selMonth, selDay)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#131B2F] border-white/10 text-white max-h-60">
                      {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[#94A3B8] text-sm mt-3">
                Selected: <span className="text-white">{format(formData.event_date, 'PPP')}</span>
              </p>
            </div>
          </div>
        );
      }

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-white">Upload Photos</Label>
                <span className={`text-sm font-medium ${formData.photos.length >= 10 ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                  {formData.photos.length}/10
                </span>
              </div>
              <div
                onClick={() => formData.photos.length < 10 && photoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  formData.photos.length >= 10
                    ? 'border-red-500/30 cursor-not-allowed opacity-50'
                    : 'border-white/20 cursor-pointer hover:border-[#D4AF37]/50'
                }`}
              >
                {uploadProgress.photos === 'uploading' ? (
                  <Loader2 className="w-12 h-12 text-[#D4AF37] mx-auto animate-spin" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                    <p className="text-white mb-1">
                      {formData.photos.length >= 10 ? 'Maximum photos reached' : 'Click to upload photos'}
                    </p>
                    <p className="text-[#94A3B8] text-sm">PNG, JPG up to 10MB each · Max 10 photos</p>
                  </>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                data-testid="photo-upload-input"
              />
            </div>

            {formData.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-3 block">Upload Video (Optional)</Label>
              <div
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
              >
                {uploadProgress.video === 'uploading' ? (
                  <Loader2 className="w-12 h-12 text-[#D4AF37] mx-auto animate-spin" />
                ) : formData.video_url ? (
                  <div className="text-[#D4AF37]">
                    <Check className="w-12 h-12 mx-auto mb-2" />
                    <p>Video uploaded!</p>
                  </div>
                ) : (
                  <>
                    <Video className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                    <p className="text-white mb-1">Click to upload video</p>
                    <p className="text-[#94A3B8] text-sm">MP4, MOV up to 100MB</p>
                  </>
                )}
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                data-testid="video-upload-input"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-3 block">Special Note</Label>
              
              {/* AI Generator */}
              <div className="flex gap-2 mb-3">
                <Select value={aiTone} onValueChange={setAiTone}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131B2F] border-white/10 text-white">
                    <SelectItem value="heartfelt">💝 Heartfelt</SelectItem>
                    <SelectItem value="funny">😄 Funny</SelectItem>
                    <SelectItem value="poetic">🌸 Poetic</SelectItem>
                    <SelectItem value="short">⚡ Short & Sweet</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={generateAIMessage}
                  disabled={isGeneratingAI}
                  className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/30 shrink-0"
                >
                  {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-1" /> AI Write</>}
                </Button>
              </div>

              <Textarea
                data-testid="special-note-input"
                value={formData.special_note}
                onChange={(e) => setFormData(prev => ({ ...prev, special_note: e.target.value }))}
                placeholder="Write your heartfelt message here, or use AI to generate one..."
                className="bg-white/5 border-white/10 text-white min-h-[150px] resize-none"
              />
            </div>

            <div>
              <Label className="text-white mb-3 block">Easter Egg Message (Secret surprise!)</Label>
              <Input
                data-testid="easter-egg-input"
                value={formData.easter_egg_message}
                onChange={(e) => setFormData(prev => ({ ...prev, easter_egg_message: e.target.value }))}
                placeholder="Hidden message revealed on 3 taps..."
                className="bg-white/5 border-white/10 text-white h-12"
              />
            </div>

            {/* Lock Screen */}
            <div className="border border-white/10 rounded-xl p-4 space-y-4">
              <Label className="text-white block">🔒 Lock Screen (Optional)</Label>
              <p className="text-[#94A3B8] text-xs">Protect the celebration with a 4-digit PIN. Only you know it.</p>
              
              <div className="flex gap-2">
                <Input
                  value={formData.lock_pin}
                  onChange={(e) => setFormData(prev => ({ ...prev, lock_pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="4-digit PIN"
                  maxLength={4}
                  className="bg-white/5 border-white/10 text-white h-12 text-center text-xl tracking-widest"
                />
                <Button onClick={generatePin} variant="outline" className="border-white/10 text-white hover:bg-white/5 shrink-0">
                  Generate
                </Button>
              </div>

              {formData.lock_pin && (
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-3">
                  <p className="text-[#D4AF37] text-sm font-bold">Your PIN: {formData.lock_pin}</p>
                  <p className="text-[#94A3B8] text-xs mt-1">Save this PIN — you'll need to share it verbally with the person.</p>
                </div>
              )}

              <div>
                <Label className="text-white mb-2 block text-sm">Hint shown on lock screen</Label>
                <Input
                  value={formData.lock_hint}
                  onChange={(e) => setFormData(prev => ({ ...prev, lock_hint: e.target.value }))}
                  placeholder="e.g., Ask your brother, Ask Papa..."
                  className="bg-white/5 border-white/10 text-white h-12"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[#94A3B8] text-sm">Write 6 reasons — receiver flips each card 💝</p>
              <Button
                onClick={generateAIFlipCards}
                disabled={isGeneratingFlipAI}
                size="sm"
                className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/30"
              >
                {isGeneratingFlipAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Wand2 className="w-3 h-3 mr-1" /> AI Fill</>}
              </Button>
            </div>
            {formData.flip_cards.map((card, i) => (
              <div key={i}>
                <Label className="text-white mb-2 block text-sm">Card {i + 1}</Label>
                <Input
                  value={card}
                  onChange={(e) => {
                    const updated = [...formData.flip_cards];
                    updated[i] = e.target.value;
                    setFormData(prev => ({ ...prev, flip_cards: updated }));
                  }}
                  placeholder={`e.g., You make every day special ✨`}
                  className="bg-white/5 border-white/10 text-white h-12"
                />
              </div>
            ))}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-3 block">Upload Song</Label>
              <div
                onClick={() => songInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
              >
                {uploadProgress.song === 'uploading' ? (
                  <Loader2 className="w-12 h-12 text-[#D4AF37] mx-auto animate-spin" />
                ) : formData.song_url ? (
                  <div className="text-[#D4AF37]">
                    <Check className="w-12 h-12 mx-auto mb-2" />
                    <p>Song uploaded! <span className="text-[#94A3B8] text-sm">Click to replace</span></p>
                  </div>
                ) : (
                  <>
                    <Music className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                    <p className="text-white mb-1">Click to upload a song</p>
                    <p className="text-[#94A3B8] text-sm">MP3, WAV up to 50MB</p>
                  </>
                )}
              </div>
              <input
                ref={songInputRef}
                type="file"
                accept="audio/*"
                onChange={handleSongUpload}
                className="hidden"
                data-testid="song-upload-input"
              />
            </div>

            {formData.song_url && (
              <div className="border border-white/10 rounded-xl p-4">
                <Label className="text-white block mb-4">🎵 Pick your clip</Label>
                <p className="text-[#94A3B8] text-xs mb-4">Drag the golden window to choose which 60 seconds plays on repeat.</p>
                <SongClipper
                  songUrl={formData.song_url}
                  songStart={formData.song_start}
                  songDuration={formData.song_duration}
                  onChange={(start, duration) => setFormData(prev => ({ ...prev, song_start: start, song_duration: duration }))}
                />
              </div>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-4 block">Select Theme</Label>
              
              {['boys', 'girls', 'anniversary'].map((category) => (
                <div key={category} className="mb-6">
                  <p className="text-[#94A3B8] text-sm uppercase tracking-wider mb-3">
                    {category === 'boys' ? 'For Boys' : category === 'girls' ? 'For Girls' : 'Anniversary'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {getThemesByCategory(category).map((theme) => (
                      <button
                        key={theme.id}
                        data-testid={`theme-${theme.id}`}
                        onClick={() => setFormData(prev => ({ ...prev, theme: theme.id }))}
                        className={`relative rounded-xl overflow-hidden aspect-video transition-all duration-300 ${
                          formData.theme === theme.id
                            ? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-[#0A0F1F]'
                            : 'hover:scale-105'
                        }`}
                      >
                        <div 
                          className="absolute inset-0"
                          style={{ backgroundColor: theme.colors.background }}
                        >
                          <div 
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ 
                              background: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.secondary}20)` 
                            }}
                          >
                            <span 
                              className="font-bold text-sm"
                              style={{ color: theme.colors.primary }}
                            >
                              {theme.name}
                            </span>
                          </div>
                        </div>
                        {formData.theme === theme.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-[#D4AF37] rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-[#0A0F1F]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const celebrationUrl = createdEventId ? `${APP_URL}/celebrate/${createdEventId}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(celebrationUrl);
    toast.success('Link copied!');
  };

  if (maintenanceMode) return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-10 max-w-sm w-full text-center">
        <div className="text-6xl mb-6">🔧</div>
        <h2 className="font-heading text-2xl text-white mb-3">We'll be back soon</h2>
        <p className="text-[#94A3B8] text-sm mb-6">The app is currently under maintenance. Your uploads are safe — please try again in a little while.</p>
        <Button onClick={() => { setMaintenanceMode(false); setCurrentStep(8); }} variant="outline" className="border-white/10 text-white hover:bg-white/5 w-full">
          Go Back
        </Button>
      </motion.div>
    </div>
  );

  if (createdEventId) return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-8 max-w-sm w-full text-center">
        <Sparkles className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
        <h2 className="font-heading text-2xl text-white mb-2">Celebration Ready! 🎉</h2>
        <p className="text-[#94A3B8] mb-6 text-sm">Share this QR code or link</p>
        <div className="bg-white p-4 rounded-xl inline-block mb-6">
          <QRCodeSVG value={celebrationUrl} size={200} level="H" includeMargin />
        </div>
        <div className="flex gap-2 mb-4">
          <Button onClick={copyLink} className="flex-1 bg-white/10 hover:bg-white/20 text-white">
            <Copy className="w-4 h-4 mr-2" /> Copy Link
          </Button>
          <Button onClick={() => navigate(`/celebrate/${createdEventId}`)} className="flex-1 btn-gold">
            <ExternalLink className="w-4 h-4 mr-2" /> Open
          </Button>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-[#94A3B8] text-sm hover:text-white">
          Go to Dashboard
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F1F] py-8 px-4">
      <div className="max-w-2xl mx-auto">
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
            <span className="font-heading text-white text-lg">Create Celebration</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8 overflow-x-auto pb-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex flex-col items-center min-w-[60px] ${
                step.id === currentStep
                  ? 'text-[#D4AF37]'
                  : step.id < currentStep
                  ? 'text-green-500'
                  : 'text-[#94A3B8]'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                step.id === currentStep
                  ? 'bg-[#D4AF37] text-[#0A0F1F]'
                  : step.id < currentStep
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-white/5'
              }`}>
                {step.id < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs hidden sm:block">{step.title}</span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="glass rounded-2xl p-6 mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="font-heading text-2xl text-white mb-6">
                {steps[currentStep - 1].title}
              </h2>
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 disabled:opacity-50"
            data-testid="prev-step-btn"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>
          
          {currentStep === steps.length ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-gold px-8"
              data-testid="create-event-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Celebration
                  <Sparkles className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              className="btn-gold px-8"
              data-testid="next-step-btn"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
