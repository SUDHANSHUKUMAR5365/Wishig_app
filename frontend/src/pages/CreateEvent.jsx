import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, User, Calendar, Image, Video, 
  MessageSquare, Mic, Music, Palette, Check, Loader2, Upload,
  X, Sparkles, QrCode, Copy, Download, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getThemesByCategory } from '@/lib/themes';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const steps = [
  { id: 1, title: 'Basic Info', icon: User },
  { id: 2, title: 'Date & Time', icon: Calendar },
  { id: 3, title: 'Photos', icon: Image },
  { id: 4, title: 'Video', icon: Video },
  { id: 5, title: 'Message', icon: MessageSquare },
  { id: 6, title: 'Voice', icon: Mic },
  { id: 7, title: 'Music', icon: Music },
  { id: 8, title: 'Theme', icon: Palette },
];

const occasionTypes = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💑' },
  { id: 'custom', label: 'Custom', emoji: '✨' },
];

const APP_URL = process.env.REACT_APP_FRONTEND_URL || window.location.origin;

const CreateEvent = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [createdEventId, setCreatedEventId] = useState(null);
  
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
    easter_egg_message: '',
    timeline: [],
  });

  // Upload file to backend storage
  const uploadFile = async (file, folder) => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    const response = await axios.post(`${API}/upload?folder=${folder}`, formDataUpload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    // Return full URL - Cloudinary returns direct URL
    return response.data.url;
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadProgress(prev => ({ ...prev, photos: 'uploading' }));
    
    try {
      const uploadPromises = files.map(async (file) => {
        const url = await uploadFile(file, 'photos');
        return { url, caption: '' };
      });
      
      const uploadedPhotos = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedPhotos]
      }));
      
      toast.success(`${files.length} photo(s) uploaded!`);
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
      };

      const response = await axios.post(`${API}/events`, eventData);
      toast.success('Celebration created!');
      setCreatedEventId(response.data.id);
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create celebration');
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

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-3 block">Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    data-testid="date-picker-trigger"
                    variant="outline"
                    className="w-full h-12 bg-white/5 border-white/10 text-white justify-start"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.event_date ? format(formData.event_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#131B2F] border-white/10">
                  <CalendarComponent
                    mode="single"
                    selected={formData.event_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, event_date: date || new Date() }))}
                    className="text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-3 block">Upload Photos</Label>
              <div
                onClick={() => photoInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
              >
                {uploadProgress.photos === 'uploading' ? (
                  <Loader2 className="w-12 h-12 text-[#D4AF37] mx-auto animate-spin" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                    <p className="text-white mb-1">Click to upload photos</p>
                    <p className="text-[#94A3B8] text-sm">PNG, JPG up to 10MB each</p>
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
              <Textarea
                data-testid="special-note-input"
                value={formData.special_note}
                onChange={(e) => setFormData(prev => ({ ...prev, special_note: e.target.value }))}
                placeholder="Write your heartfelt message here..."
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
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-white mb-3 block">Voice Message (Optional)</Label>
              <div
                onClick={() => voiceInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
              >
                {uploadProgress.voice === 'uploading' ? (
                  <Loader2 className="w-12 h-12 text-[#D4AF37] mx-auto animate-spin" />
                ) : formData.voice_message_url ? (
                  <div className="text-[#D4AF37]">
                    <Check className="w-12 h-12 mx-auto mb-2" />
                    <p>Voice message uploaded!</p>
                  </div>
                ) : (
                  <>
                    <Mic className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                    <p className="text-white mb-1">Click to upload voice message</p>
                    <p className="text-[#94A3B8] text-sm">MP3, WAV up to 20MB</p>
                  </>
                )}
              </div>
              <input
                ref={voiceInputRef}
                type="file"
                accept="audio/*"
                onChange={handleVoiceUpload}
                className="hidden"
                data-testid="voice-upload-input"
              />
            </div>
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
                    <p>Song uploaded!</p>
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
