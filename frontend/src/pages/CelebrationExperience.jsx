import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight,
  X, Gift, Sparkles, Heart, Music, MessageSquare, Camera,
  Cake, Award, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { getTheme } from '@/lib/themes';
import confetti from 'canvas-confetti';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Preloader Component
const Preloader = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 bg-[#0A0F1F] flex items-center justify-center z-50"
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-8"
        >
          <Sparkles className="w-16 h-16 text-[#D4AF37] mx-auto" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-heading text-2xl text-white"
        >
          Something special is waiting for you...
        </motion.p>
      </div>
    </motion.div>
  );
};

// Countdown Component
const Countdown = ({ onComplete }) => {
  const [count, setCount] = useState(5);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 bg-[#0A0F1F] flex items-center justify-center z-50"
      exit={{ opacity: 0 }}
    >
      <motion.div
        key={count}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        className="pulse-number"
      >
        <span className="font-heading text-9xl text-[#D4AF37]">{count}</span>
      </motion.div>
    </motion.div>
  );
};

// Curtain Animation Component
const CurtainAnimation = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div className="fixed inset-0 z-50 flex" exit={{ opacity: 0 }}>
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: '-100%' }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        className="w-1/2 h-full bg-gradient-to-r from-[#8B0000] to-[#DC143C]"
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
        }}
      />
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: '100%' }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        className="w-1/2 h-full bg-gradient-to-l from-[#8B0000] to-[#DC143C]"
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
        }}
      />
    </motion.div>
  );
};

// Interactive Cake Component
const InteractiveCake = ({ theme, onBlowComplete }) => {
  const [candlesLit, setCandlesLit] = useState(true);
  const [showSmoke, setShowSmoke] = useState(false);

  const blowCandles = () => {
    if (!candlesLit) return;
    setCandlesLit(false);
    setShowSmoke(true);
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [theme.colors.primary, theme.colors.secondary, '#FFD700']
    });
    
    setTimeout(() => {
      setShowSmoke(false);
      onBlowComplete();
    }, 2000);
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Cake */}
      <div className="relative">
        <svg width="200" height="180" viewBox="0 0 200 180">
          {/* Cake base */}
          <ellipse cx="100" cy="160" rx="80" ry="15" fill={theme.colors.secondary} opacity="0.5" />
          <rect x="30" y="100" width="140" height="60" rx="10" fill="#D2691E" />
          <rect x="20" y="140" width="160" height="25" rx="8" fill="#8B4513" />
          
          {/* Frosting */}
          <path d="M30 100 Q50 80 100 85 Q150 80 170 100" fill="#FFF8DC" />
          
          {/* Decorations */}
          {[40, 70, 100, 130, 160].map((x, i) => (
            <circle key={i} cx={x} cy="130" r="5" fill={theme.colors.primary} />
          ))}
          
          {/* Candles */}
          {[60, 100, 140].map((x, i) => (
            <g key={i}>
              <rect x={x-3} y="60" width="6" height="40" fill="#FFE4C4" />
              {candlesLit && (
                <g className="flame">
                  <ellipse cx={x} cy="55" rx="8" ry="12" fill="#FF6B00" />
                  <ellipse cx={x} cy="52" rx="4" ry="8" fill="#FFD700" />
                </g>
              )}
              {showSmoke && (
                <g className="smoke">
                  <circle cx={x} cy="45" r="6" fill="#888" opacity="0.6" />
                  <circle cx={x-5} cy="35" r="4" fill="#888" opacity="0.4" />
                  <circle cx={x+5} cy="30" r="3" fill="#888" opacity="0.2" />
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
      
      {/* Blow button */}
      {candlesLit && (
        <Button
          data-testid="blow-candles-btn"
          onClick={blowCandles}
          className="mt-6 btn-gold px-8 py-4 rounded-full text-lg"
        >
          <span className="mr-2">🎂</span>
          Blow Candles
        </Button>
      )}
      
      {!candlesLit && !showSmoke && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-[#D4AF37] font-heading text-xl"
        >
          Make a wish! ✨
        </motion.p>
      )}
    </div>
  );
};

// Balloon Pop Game
const BalloonPopGame = ({ theme, onComplete }) => {
  const [balloons, setBalloons] = useState([]);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(true);

  useEffect(() => {
    const colors = [theme.colors.primary, theme.colors.secondary, '#FF6B6B', '#4ECDC4', '#FFD700'];
    const initialBalloons = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      popped: false
    }));
    setBalloons(initialBalloons);
  }, [theme]);

  const popBalloon = (id) => {
    setBalloons(prev => prev.map(b => b.id === id ? { ...b, popped: true } : b));
    setScore(prev => prev + 1);
    
    if (score + 1 >= 15) {
      setGameActive(false);
      confetti({
        particleCount: 200,
        spread: 160,
        origin: { y: 0.5 }
      });
      setTimeout(onComplete, 2000);
    }
  };

  return (
    <div className="relative w-full h-[400px] overflow-hidden rounded-xl bg-gradient-to-b from-sky-400/20 to-sky-600/20">
      <div className="absolute top-4 left-4 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
        <span className="text-white font-bold">Score: {score}/15</span>
      </div>
      
      {balloons.map((balloon) => !balloon.popped && (
        <motion.div
          key={balloon.id}
          initial={{ y: '120%' }}
          animate={{ y: '-20%' }}
          transition={{
            duration: 4 + Math.random() * 2,
            delay: balloon.delay,
            repeat: gameActive ? Infinity : 0,
            repeatDelay: Math.random() * 2
          }}
          className="absolute cursor-pointer balloon-float"
          style={{ left: `${balloon.x}%` }}
          onClick={() => popBalloon(balloon.id)}
          data-testid={`balloon-${balloon.id}`}
        >
          <svg width="50" height="60" viewBox="0 0 50 60">
            <ellipse cx="25" cy="25" rx="20" ry="25" fill={balloon.color} />
            <path d="M25 50 L25 60" stroke={balloon.color} strokeWidth="2" />
            <ellipse cx="18" cy="18" rx="5" ry="8" fill="white" opacity="0.3" />
          </svg>
        </motion.div>
      ))}
      
      {!gameActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/50"
        >
          <div className="text-center">
            <Award className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
            <p className="font-heading text-3xl text-white">You Won!</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Gift Box Game
const GiftBoxGame = ({ theme, onComplete }) => {
  const messages = [
    'You are amazing! 🌟',
    'Best wishes! 🎉',
    'Keep shining! ✨',
    'You rock! 🎸',
    'Stay awesome! 💫',
    'Happiness always! 🌈'
  ];
  
  const [boxes, setBoxes] = useState(
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      opened: false,
      message: messages[i]
    }))
  );
  const [openedCount, setOpenedCount] = useState(0);

  const openBox = (id) => {
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, opened: true } : b));
    setOpenedCount(prev => prev + 1);
    
    if (openedCount + 1 >= 6) {
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.5 }
      });
      setTimeout(onComplete, 2000);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {boxes.map((box) => (
        <motion.div
          key={box.id}
          className={`aspect-square rounded-xl cursor-pointer ${
            box.opened ? 'bg-white/5' : 'gift-shake'
          }`}
          style={{ backgroundColor: box.opened ? 'transparent' : theme.colors.primary + '30' }}
          onClick={() => !box.opened && openBox(box.id)}
          data-testid={`gift-box-${box.id}`}
        >
          {box.opened ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-full h-full flex items-center justify-center p-2"
            >
              <p className="text-white text-center text-sm">{box.message}</p>
            </motion.div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gift className="w-12 h-12" style={{ color: theme.colors.primary }} />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

// Photo Gallery Component
const PhotoGallery = ({ photos, theme }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nextPhoto = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);

  useEffect(() => {
    const interval = setInterval(nextPhoto, 5000);
    return () => clearInterval(interval);
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="relative aspect-video rounded-xl overflow-hidden"
        >
          <img
            src={photos[currentIndex].url}
            alt=""
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      <button
        onClick={prevPhoto}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
        data-testid="photo-prev-btn"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      
      <button
        onClick={nextPhoto}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
        data-testid="photo-next-btn"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex ? 'bg-white w-4' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Music Player Component
const MusicPlayer = ({ songUrl, autoPlay = false }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [autoPlay]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(progress || 0);
    }
  };

  const handleSeek = (value) => {
    if (audioRef.current) {
      const time = (value[0] / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setProgress(value[0]);
    }
  };

  if (!songUrl) return null;

  return (
    <div className="glass rounded-xl p-4">
      <audio
        ref={audioRef}
        src={songUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0A0F1F]"
          data-testid="music-play-btn"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>
        
        <div className="flex-1">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="cursor-pointer"
          />
        </div>
        
        <button
          onClick={toggleMute}
          className="text-white"
          data-testid="music-mute-btn"
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

// Voice Message Component
const VoiceMessage = ({ voiceUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!voiceUrl) return null;

  return (
    <div className="glass rounded-xl p-6">
      <audio ref={audioRef} src={voiceUrl} onEnded={() => setIsPlaying(false)} />
      
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0A0F1F]"
          data-testid="voice-play-btn"
        >
          {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
        </button>
        
        <div className="flex-1">
          <p className="text-white font-medium mb-2">Voice Message</p>
          <div className="flex gap-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-[#D4AF37] rounded-full ${isPlaying ? 'waveform-bar' : ''}`}
                style={{
                  height: `${20 + Math.random() * 30}px`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Special Note Component
const SpecialNote = ({ note, theme }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!note) return;
    
    let index = 0;
    const timer = setInterval(() => {
      if (index <= note.length) {
        setDisplayedText(note.slice(0, index));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [note]);

  if (!note) return null;

  return (
    <div 
      className="glass rounded-xl p-6 relative overflow-hidden"
      style={{ borderColor: theme.colors.primary + '30' }}
    >
      <MessageSquare className="w-8 h-8 mb-4" style={{ color: theme.colors.primary }} />
      <p className="text-white text-lg leading-relaxed">
        {displayedText}
        {isTyping && <span className="animate-pulse">|</span>}
      </p>
    </div>
  );
};

// Main Celebration Experience
const CelebrationExperience = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('preloader'); // preloader, countdown, curtain, main
  const [activeSection, setActiveSection] = useState('greeting');
  const [tapCount, setTapCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const tapTimeoutRef = useRef(null);

  const theme = event ? getTheme(event.theme) : getTheme('royal_gold');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${API}/events/${eventId}`);
        setEvent(response.data);
      } catch (error) {
        toast.error('Event not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate]);

  const handleTitleTap = useCallback(() => {
    setTapCount(prev => {
      const newCount = prev + 1;
      
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      
      tapTimeoutRef.current = setTimeout(() => setTapCount(0), 1000);
      
      if (newCount >= 3 && event?.easter_egg_message) {
        setShowEasterEgg(true);
        confetti({
          particleCount: 200,
          spread: 180,
          colors: ['#D4AF37', '#FFD700', '#FFF8DC']
        });
        return 0;
      }
      
      return newCount;
    });
  }, [event]);

  const getGreeting = () => {
    if (!event) return '';
    
    switch (event.occasion_type) {
      case 'birthday':
        return 'Happy Birthday';
      case 'anniversary':
        return 'Happy Anniversary';
      case 'custom':
        return event.custom_occasion || 'Congratulations';
      default:
        return 'Congratulations';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0A0F1F] flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-[#D4AF37] animate-pulse" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Phase Animations */}
      <AnimatePresence>
        {phase === 'preloader' && (
          <Preloader onComplete={() => setPhase('countdown')} />
        )}
        {phase === 'countdown' && (
          <Countdown onComplete={() => setPhase('curtain')} />
        )}
        {phase === 'curtain' && (
          <CurtainAnimation onComplete={() => setPhase('main')} />
        )}
      </AnimatePresence>

      {/* Main Content */}
      {phase === 'main' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="min-h-screen"
        >
          {/* Floating particles background */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  opacity: 0.3
                }}
                animate={{
                  y: [null, Math.random() * -300],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 5 + Math.random() * 5,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
              />
            ))}
          </div>

          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-40 p-4 flex justify-between items-center">
            <button
              onClick={() => navigate('/')}
              className="text-white/70 hover:text-white transition-colors"
              data-testid="back-home-btn"
            >
              <Home className="w-6 h-6" />
            </button>
            
            {event?.song_url && (
              <div className="flex-1 max-w-xs mx-4">
                <MusicPlayer songUrl={event.song_url} autoPlay />
              </div>
            )}
          </div>

          {/* Main Greeting */}
          <div className="pt-24 pb-12 px-4 text-center">
            <motion.div
              onClick={handleTitleTap}
              className="cursor-pointer"
              whileTap={{ scale: 0.98 }}
            >
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-heading text-4xl sm:text-5xl lg:text-6xl mb-4"
                style={{ 
                  color: theme.colors.primary,
                  fontFamily: theme.font
                }}
                data-testid="celebration-greeting"
              >
                {getGreeting()}
              </motion.h1>
              
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="font-heading text-3xl sm:text-4xl"
                style={{ color: theme.colors.text }}
              >
                {event?.person_name}!
              </motion.h2>
            </motion.div>
          </div>

          {/* Section Navigation */}
          <div className="flex justify-center gap-2 mb-8 px-4 flex-wrap">
            {[
              { id: 'greeting', icon: Sparkles, label: 'Home' },
              { id: 'cake', icon: Cake, label: 'Cake' },
              { id: 'games', icon: Gift, label: 'Games' },
              { id: 'gallery', icon: Camera, label: 'Gallery' },
              { id: 'message', icon: MessageSquare, label: 'Message' },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                  activeSection === section.id
                    ? 'text-[#0A0F1F]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                style={{
                  backgroundColor: activeSection === section.id ? theme.colors.primary : undefined
                }}
                data-testid={`section-${section.id}-btn`}
              >
                <section.icon className="w-4 h-4" />
                <span className="text-sm">{section.label}</span>
              </button>
            ))}
          </div>

          {/* Content Sections */}
          <div className="max-w-2xl mx-auto px-4 pb-24">
            <AnimatePresence mode="wait">
              {activeSection === 'greeting' && (
                <motion.div
                  key="greeting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {event?.special_note && (
                    <SpecialNote note={event.special_note} theme={theme} />
                  )}
                  
                  {event?.voice_message_url && (
                    <VoiceMessage voiceUrl={event.voice_message_url} />
                  )}
                </motion.div>
              )}

              {activeSection === 'cake' && (
                <motion.div
                  key="cake"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex justify-center py-8"
                >
                  <InteractiveCake 
                    theme={theme} 
                    onBlowComplete={() => toast.success('Wish made! ✨')} 
                  />
                </motion.div>
              )}

              {activeSection === 'games' && (
                <motion.div
                  key="games"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="font-heading text-xl text-white mb-4 text-center">
                      Pop the Balloons!
                    </h3>
                    <BalloonPopGame 
                      theme={theme} 
                      onComplete={() => toast.success('Amazing! 🎈')} 
                    />
                  </div>
                  
                  <div>
                    <h3 className="font-heading text-xl text-white mb-4 text-center">
                      Open the Gifts!
                    </h3>
                    <GiftBoxGame 
                      theme={theme} 
                      onComplete={() => toast.success('All gifts opened! 🎁')} 
                    />
                  </div>
                </motion.div>
              )}

              {activeSection === 'gallery' && (
                <motion.div
                  key="gallery"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {event?.photos?.length > 0 ? (
                    <PhotoGallery photos={event.photos} theme={theme} />
                  ) : (
                    <div className="glass rounded-xl p-12 text-center">
                      <Camera className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
                      <p className="text-[#94A3B8]">No photos added</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeSection === 'message' && (
                <motion.div
                  key="message"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {event?.special_note ? (
                    <SpecialNote note={event.special_note} theme={theme} />
                  ) : (
                    <div className="glass rounded-xl p-12 text-center">
                      <MessageSquare className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
                      <p className="text-[#94A3B8]">No message added</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Easter Egg Modal */}
          <AnimatePresence>
            {showEasterEgg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                onClick={() => setShowEasterEgg(false)}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="glass rounded-2xl p-8 max-w-md text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Sparkles className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                  <h3 className="font-heading text-2xl text-white mb-4">
                    Secret Message!
                  </h3>
                  <p className="text-white text-lg">
                    {event?.easter_egg_message || 'You found the secret! 🎉'}
                  </p>
                  <Button
                    onClick={() => setShowEasterEgg(false)}
                    className="mt-6 btn-gold"
                    data-testid="close-easter-egg-btn"
                  >
                    Close
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default CelebrationExperience;
