import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, Gift, Sparkles, Music, MessageSquare, Cake, Award, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { getTheme } from '@/lib/themes';
import { useAuth } from '@/lib/auth';
import confetti from 'canvas-confetti';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Lock Screen Component
const LockScreen = ({ hint, correctPin, onUnlock, theme }) => {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const isDark = theme.colors.text === '#FFFFFF';

  const handleKey = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      setTimeout(() => {
        if (newPin === correctPin) {
          onUnlock();
        } else {
          setShake(true);
          setAttempts(a => a + 1);
          setTimeout(() => { setShake(false); setPin(''); }, 600);
        }
      }, 200);
    }
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6" style={{ backgroundColor: theme.colors.background }}>
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center w-full max-w-xs"
      >
        <Lock className="w-12 h-12 mb-4" style={{ color: theme.colors.primary }} />
        <h2 className="font-heading text-2xl mb-2" style={{ color: theme.colors.text }}>This is locked 🔒</h2>
        {hint && (
          <p className="text-center mb-6 text-sm" style={{ color: theme.colors.text + '99' }}>{hint}</p>
        )}

        {/* PIN dots */}
        <div className="flex gap-4 mb-8">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-4 h-4 rounded-full border-2 transition-all" style={{
              backgroundColor: pin.length > i ? theme.colors.primary : 'transparent',
              borderColor: pin.length > i ? theme.colors.primary : theme.colors.text + '40'
            }} />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={() => handleKey(n.toString())}
              className="h-14 rounded-xl text-xl font-bold active:scale-95 transition-all"
              style={{ backgroundColor: theme.colors.text + '15', color: theme.colors.text }}>
              {n}
            </button>
          ))}
          <div />
          <button onClick={() => handleKey('0')}
            className="h-14 rounded-xl text-xl font-bold active:scale-95 transition-all"
            style={{ backgroundColor: theme.colors.text + '15', color: theme.colors.text }}>
            0
          </button>
          <button onClick={handleDelete}
            className="h-14 rounded-xl text-xl font-bold active:scale-95 transition-all"
            style={{ backgroundColor: theme.colors.text + '15', color: theme.colors.text }}>
            ⌫
          </button>
        </div>

        {attempts > 0 && (
          <p className="text-red-400 text-sm mt-4">Wrong PIN. Try again.</p>
        )}
      </motion.div>
    </div>
  );
};

// Voice Note Timer - plays voice then shows cake
const VoiceTimer = ({ voiceUrl, onComplete, theme }) => {
  const audioRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [started, setStarted] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const t = setTimeout(finish, 30000);
    return () => clearTimeout(t);
  }, [finish]);

  useEffect(() => {
    if (!voiceUrl) { const t = setTimeout(finish, 2000); return () => clearTimeout(t); }
  }, [voiceUrl, finish]);

  const handleLoaded = () => {
    if (audioRef.current) setTimeLeft(Math.ceil(audioRef.current.duration) || 10);
  };

  const start = () => {
    setStarted(true);
    if (audioRef.current) audioRef.current.play().catch(() => finish());
  };

  useEffect(() => {
    if (!started || timeLeft === null) return;
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft, finish]);

  if (!voiceUrl) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50" style={{ backgroundColor: theme.colors.background }}>
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <Sparkles className="w-16 h-16 mb-6" style={{ color: theme.colors.primary }} />
      </motion.div>
      <p className="text-xl font-heading text-center" style={{ color: theme.colors.text }}>Something special is waiting...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6" style={{ backgroundColor: theme.colors.background }}>
      <audio ref={audioRef} src={voiceUrl} onLoadedMetadata={handleLoaded} onEnded={finish} onError={finish} />
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <Sparkles className="w-16 h-16 mb-6" style={{ color: theme.colors.primary }} />
      </motion.div>
      <p className="text-xl font-heading mb-8 text-center" style={{ color: theme.colors.text }}>A special message for you...</p>
      {!started ? (
        <Button onClick={start} className="btn-gold px-8 py-4 text-lg rounded-full">
          <Play className="w-5 h-5 mr-2" /> Play Message
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center" style={{ borderColor: theme.colors.primary }}>
            <span className="text-4xl font-bold" style={{ color: theme.colors.primary }}>{timeLeft ?? '...'}</span>
          </div>
          <p className="text-sm" style={{ color: theme.colors.text + '99' }}>Cake coming soon...</p>
          <button onClick={finish} className="text-xs underline mt-2" style={{ color: theme.colors.text + '50' }}>Skip</button>
        </div>
      )}
    </div>
  );
};

const InteractiveCake = ({ theme, candlesBlown, onBlowComplete }) => {
  const [showSmoke, setShowSmoke] = useState(false);

  const blowCandles = () => {
    if (candlesBlown) return;
    setShowSmoke(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [theme.colors.primary, theme.colors.secondary, '#FFD700'] });
    setTimeout(() => { setShowSmoke(false); onBlowComplete(); }, 2000);
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg width="200" height="180" viewBox="0 0 200 180">
        <ellipse cx="100" cy="160" rx="80" ry="15" fill={theme.colors.secondary} opacity="0.5" />
        <rect x="30" y="100" width="140" height="60" rx="10" fill="#D2691E" />
        <rect x="20" y="140" width="160" height="25" rx="8" fill="#8B4513" />
        <path d="M30 100 Q50 80 100 85 Q150 80 170 100" fill="#FFF8DC" />
        {[40, 70, 100, 130, 160].map((x, i) => <circle key={i} cx={x} cy="130" r="5" fill={theme.colors.primary} />)}
        {[60, 100, 140].map((x, i) => (
          <g key={i}>
            <rect x={x - 3} y="60" width="6" height="40" fill="#FFE4C4" />
            {!candlesBlown && !showSmoke && (
              <g>
                <ellipse cx={x} cy="55" rx="8" ry="12" fill="#FF6B00" />
                <ellipse cx={x} cy="52" rx="4" ry="8" fill="#FFD700" />
              </g>
            )}
            {showSmoke && (
              <g>
                <circle cx={x} cy="45" r="6" fill="#888" opacity="0.6" />
                <circle cx={x - 5} cy="35" r="4" fill="#888" opacity="0.4" />
                <circle cx={x + 5} cy="30" r="3" fill="#888" opacity="0.2" />
              </g>
            )}
          </g>
        ))}
      </svg>
      {!candlesBlown && !showSmoke && (
        <Button data-testid="blow-candles-btn" onClick={blowCandles} className="mt-6 btn-gold px-8 py-4 rounded-full text-lg">
          <span className="mr-2">🎂</span> Blow Candles
        </Button>
      )}
      {candlesBlown && !showSmoke && (
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 font-heading text-xl" style={{ color: theme.colors.primary }}>
          Make a wish! ✨
        </motion.p>
      )}
    </div>
  );
};

// Balloon Pop Game
const BalloonPopGame = ({ theme, onComplete }) => {
  const colors = [theme.colors.primary, theme.colors.secondary, '#FF6B6B', '#4ECDC4', '#FFD700'];
  const [balloons, setBalloons] = useState(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: 5 + (i * 6) % 85,
      size: 40 + (i % 3) * 15,
      color: colors[i % colors.length],
      duration: 4 + (i % 5) * 1.5,
      delay: i * 0.4,
      popped: false,
    }))
  );
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const pop = (id) => {
    setBalloons(prev => prev.map(b => b.id === id ? { ...b, popped: true } : b));
    const newScore = score + 1;
    setScore(newScore);
    if (newScore >= 15) {
      setDone(true);
      confetti({ particleCount: 200, spread: 160, origin: { y: 0.5 } });
      setTimeout(onComplete, 1500);
    }
  };

  return (
    <div
      className="relative w-full rounded-xl"
      style={{ height: '80vh', overflow: 'hidden', zIndex: 2, background: `linear-gradient(to bottom, ${theme.colors.primary}15, ${theme.colors.secondary}10)`, border: `1px solid ${theme.colors.primary}20` }}
    >
      <div className="absolute top-4 left-4 backdrop-blur px-4 py-2 rounded-full z-10" style={{ backgroundColor: theme.colors.primary + '25' }}>
        <span className="font-bold" style={{ color: theme.colors.text }}>🎈 {score}/15</span>
      </div>
      {balloons.map(b => !b.popped && (
        <motion.div
          key={b.id}
          className="absolute cursor-pointer"
          style={{ left: `${b.x}%` }}
          initial={{ bottom: -80 }}
          animate={{ bottom: '110%' }}
          transition={{ duration: b.duration, delay: b.delay, repeat: done ? 0 : Infinity, repeatDelay: 0.5, ease: 'linear' }}
          onClick={() => pop(b.id)}
          data-testid={`balloon-${b.id}`}
        >
          <svg width={b.size} height={b.size * 1.2} viewBox="0 0 50 60">
            <ellipse cx="25" cy="25" rx="20" ry="25" fill={b.color} />
            <path d="M25 50 L25 60" stroke={b.color} strokeWidth="2" />
            <ellipse cx="18" cy="18" rx="5" ry="8" fill="white" opacity="0.3" />
          </svg>
        </motion.div>
      ))}
      {done && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10, backgroundColor: theme.colors.background + 'CC' }}>
          <div className="text-center">
            <Award className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.primary }} />
            <p className="font-heading text-3xl" style={{ color: theme.colors.text }}>You Won! 🎉</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Polaroid Photo Gallery
const PolaroidGallery = ({ photos, theme, onComplete }) => {
  const [modalPhoto, setModalPhoto] = useState(null);
  const [modalIndex, setModalIndex] = useState(null);
  const [revealed, setRevealed] = useState([]);

  useEffect(() => {
    if (photos.length === 0) onComplete();
  }, []);

  const total = photos.length; // show ALL photos, no cap

  const reveal = (i) => {
    const newRevealed = revealed.includes(i) ? revealed : [...revealed, i];
    setRevealed(newRevealed);
    setModalPhoto(photos[i].url);
    setModalIndex(i);
    if (!revealed.includes(i) && newRevealed.length === total) {
      confetti({ particleCount: 150, spread: 120, origin: { y: 0.5 } });
      setTimeout(onComplete, 1500);
    }
  };

  const showPrev = () => {
    const newIdx = (modalIndex - 1 + total) % total;
    setModalIndex(newIdx);
    setModalPhoto(photos[newIdx].url);
  };

  const showNext = () => {
    const newIdx = (modalIndex + 1) % total;
    setModalIndex(newIdx);
    setModalPhoto(photos[newIdx].url);
  };

  const rotations = [-3, 4, -2, 3, -4, 2, -1, 3];

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-6 p-4">
        {photos.map((photo, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => reveal(i)}
            className="cursor-pointer"
            style={{ transform: `rotate(${rotations[i % rotations.length]}deg)` }}
            whileHover={{ scale: 1.08, rotate: 0, zIndex: 10 }}
          >
            <div className="bg-white p-2 pb-8 shadow-xl">
              {revealed.includes(i) ? (
                <img src={photo.url} alt="" className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.primary + '20' }}>
                  <span className="text-4xl">💝</span>
                </div>
              )}
              <p className="text-center text-gray-400 text-xs mt-2">❤️</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {modalPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
            onClick={() => setModalPhoto(null)}
          >
            {/* Counter top right */}
            {total > 1 && (
              <div className="w-full flex justify-end px-4 pt-4 shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-white/60 text-sm bg-black/40 px-3 py-1 rounded-full">{modalIndex + 1} / {total}</span>
              </div>
            )}

            {/* Image */}
            <div className="flex-1 flex items-center justify-center w-full px-4 relative" onClick={e => e.stopPropagation()}>
              {total > 1 && (
                <button onClick={showPrev} className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl">‹</button>
              )}
              <motion.img
                key={modalPhoto}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={modalPhoto}
                alt=""
                className="max-w-full max-h-[75vh] rounded-lg shadow-2xl object-contain"
              />
              {total > 1 && (
                <button onClick={showNext} className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl">›</button>
              )}
            </div>

            {/* Back button at bottom */}
            <div className="w-full flex justify-center px-4 py-5 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setModalPhoto(null)}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm"
                style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};


// Flip Cards
const FlipCards = ({ cards, theme, onComplete }) => {
  const [flipped, setFlipped] = useState([]);
  const flip = (i) => {
    if (flipped.includes(i)) return;
    const newFlipped = [...flipped, i];
    setFlipped(newFlipped);
    if (newFlipped.length === cards.length) setTimeout(onComplete, 1000);
  };
  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <div key={i} onClick={() => flip(i)} className="h-28 cursor-pointer" style={{ perspective: '1000px' }}>
          <motion.div
            animate={{ rotateY: flipped.includes(i) ? 180 : 0 }}
            transition={{ duration: 0.6 }}
            style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
          >
            {/* Front */}
            <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', position: 'absolute', inset: 0, backgroundColor: theme.colors.primary + '30', border: `1px solid ${theme.colors.primary}50`, borderRadius: '12px' }}
              className="flex items-center justify-center text-3xl">
              ❓
            </div>
            {/* Back */}
            <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0, backgroundColor: theme.colors.primary + '25', border: `1px solid ${theme.colors.primary}`, borderRadius: '12px', color: theme.colors.text }}
              className="flex items-center justify-center p-3 text-center text-sm font-medium">
              {card}
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
};

// Love Letter
const LoveLetter = ({ note, theme }) => {
  const [displayed, setDisplayed] = useState('');
  const isDark = theme.colors.text === '#FFFFFF';
  useEffect(() => {
    if (!note) return;
    let i = 0;
    const t = setInterval(() => { if (i <= note.length) { setDisplayed(note.slice(0, i)); i++; } else clearInterval(t); }, 25);
    return () => clearInterval(t);
  }, [note]);
  if (!note) return null;
  const cardBg = isDark ? theme.colors.primary + '12' : '#fffdf0';
  const textColor = isDark ? theme.colors.text : '#3a2a1a';
  return (
    <div className="relative rounded-xl p-8 shadow-2xl" style={{ transform: 'rotate(-1deg)', backgroundColor: cardBg, border: `1px solid ${theme.colors.primary}30` }}>
      <div className="absolute inset-5 rounded-xl pointer-events-none" style={{ border: `1px solid ${theme.colors.primary}20` }} />
      <p className="font-heading text-2xl mb-4" style={{ color: theme.colors.primary, fontFamily: 'Dancing Script, cursive' }}>
        💝 A message for you...
      </p>
      <p className="leading-relaxed" style={{ fontFamily: 'Dancing Script, cursive', fontSize: '1.1rem', color: textColor }}>
        {displayed}<span className="animate-pulse" style={{ color: theme.colors.primary }}>|</span>
      </p>
    </div>
  );
};

// Canvas Hearts Background
const HeartsCanvas = ({ color }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Fewer hearts on mobile for performance
    const count = window.innerWidth < 768 ? 8 : 16;
    const hearts = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: 8 + Math.random() * 10, speedY: 0.4 + Math.random() * 0.8,
      opacity: 0.08 + Math.random() * 0.2,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hearts.forEach(h => {
        h.y -= h.speedY;
        if (h.y < -30) { h.y = canvas.height + 30; h.x = Math.random() * canvas.width; }
        ctx.save(); ctx.translate(h.x, h.y); ctx.scale(h.size / 30, h.size / 30);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-15, -15, -25, 10, 0, 25);
        ctx.bezierCurveTo(25, 10, 15, -15, 0, 0);
        ctx.fillStyle = color + Math.floor(h.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill(); ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
};

const MusicPlayer = ({ songUrl, theme }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const startedRef = useRef(false);

  // Initial fade-in on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    startedRef.current = false;
    audio.volume = 0;
    const play = () => {
      audio.play().then(() => {
        setIsPlaying(true);
        startedRef.current = true;
        // Fade in volume 0 → 1 over 2s
        let v = 0;
        const t = setInterval(() => {
          v = Math.min(1, v + 0.05);
          if (audio) audio.volume = v;
          if (v >= 1) clearInterval(t);
        }, 100);
      }).catch(() => {});
    };
    // Small delay to let browser settle
    const t = setTimeout(play, 300);
    return () => clearTimeout(t);
  }, [songUrl]);

  // Handle metadata loaded and track progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    
    const onTimeUpdate = () => {
      if (!audio) return;
      if (startedRef.current && duration > 0) {
        setProgress((audio.currentTime / duration) * 100 || 0);
      }
    };
    
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (value) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = (value[0] / 100) * duration;
    setProgress(value[0]);
  };

  if (!songUrl) return null;

  return (
    <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: theme.colors.primary + '18', border: `1px solid ${theme.colors.primary}30` }}>
      <audio ref={audioRef} src={songUrl} preload="auto" />
      <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }} data-testid="music-play-btn">
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <Slider value={[Math.min(100, Math.max(0, progress))]} onValueChange={handleSeek} max={100} step={0.1} className="flex-1 cursor-pointer" />
      <button onClick={toggleMute} className="shrink-0" style={{ color: theme.colors.text }} data-testid="music-mute-btn">
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
};

// Feedback Card
const FeedbackCard = ({ eventId, theme }) => {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!stars) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/feedback`, { event_id: eventId, stars, message });
      setSubmitted(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 }, colors: ['#D4AF37', '#FFD700'] });
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  if (submitted) return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="rounded-2xl p-6 text-center"
      style={{ backgroundColor: theme.colors.primary + '15', border: `1px solid ${theme.colors.primary}30` }}>
      <div className="text-4xl mb-3">🙏</div>
      <p className="font-heading text-lg" style={{ color: theme.colors.primary }}>Thank you!</p>
      <p className="text-sm mt-1" style={{ color: theme.colors.text + '80' }}>Your feedback means a lot</p>
    </motion.div>
  );

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: theme.colors.primary + '10', border: `1px solid ${theme.colors.primary}25` }}>
      <p className="font-heading text-lg text-center mb-1" style={{ color: theme.colors.primary }}>How was this experience?</p>
      <p className="text-xs text-center mb-5" style={{ color: theme.colors.text + '60' }}>Rate out of 5 stars (required)</p>

      {/* Stars */}
      <div className="flex justify-center gap-3 mb-5">
        {[1,2,3,4,5].map(s => (
          <button
            key={s}
            onClick={() => setStars(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="text-4xl transition-transform active:scale-90"
            style={{ transform: (hovered || stars) >= s ? 'scale(1.15)' : 'scale(1)' }}
          >
            <span style={{ filter: (hovered || stars) >= s ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
          </button>
        ))}
      </div>

      {/* Optional message */}
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Share your thoughts... (optional)"
        maxLength={500}
        rows={3}
        className="w-full rounded-xl px-4 py-3 text-sm resize-none mb-4"
        style={{ backgroundColor: theme.colors.text + '10', border: `1px solid ${theme.colors.text}20`, color: theme.colors.text, outline: 'none' }}
      />

      <button
        onClick={submit}
        disabled={!stars || submitting}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
        style={{ backgroundColor: stars ? theme.colors.primary : theme.colors.text + '20', color: stars ? theme.colors.background : theme.colors.text }}
      >
        {submitting ? 'Sending...' : stars ? `Submit ${stars}★ Feedback` : 'Select stars to submit'}
      </button>
    </div>
  );
};

// Special Note with typewriter
const SpecialNote = ({ note, theme }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!note) return;
    let i = 0;
    const t = setInterval(() => { if (i <= note.length) { setDisplayed(note.slice(0, i)); i++; } else clearInterval(t); }, 30);
    return () => clearInterval(t);
  }, [note]);
  if (!note) return null;
  return (
    <div className="glass rounded-xl p-6" style={{ borderColor: theme.colors.primary + '30' }}>
      <MessageSquare className="w-8 h-8 mb-4" style={{ color: theme.colors.primary }} />
      <p className="text-white text-lg leading-relaxed">{displayed}<span className="animate-pulse">|</span></p>
    </div>
  );
};

// Main
const CelebrationExperience = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Flow phases: lock → voiceTimer → cake → scroll (game → gifts → message)
  const alreadyBlown = sessionStorage.getItem(`candles_${eventId}`) === 'true';
  const alreadyUnlocked = sessionStorage.getItem(`unlocked_${eventId}`) === 'true';
  const [unlocked, setUnlocked] = useState(alreadyUnlocked);
  const [songEnabled, setSongEnabled] = useState(alreadyUnlocked);
  const [phase, setPhase] = useState(alreadyBlown ? 'scroll' : 'envelope');
  const [candlesBlown, setCandlesBlown] = useState(alreadyBlown);
  const [gameComplete, setGameComplete] = useState(false);
  const [giftsComplete, setGiftsComplete] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggDismissed, setEasterEggDismissed] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef(null);

  // Auto-show easter egg after gifts complete (with delay for love letter to appear)
  useEffect(() => {
    if (giftsComplete && event?.easter_egg_message && !easterEggDismissed) {
      const t = setTimeout(() => {
        setShowEasterEgg(true);
        confetti({ particleCount: 200, spread: 180, colors: ['#D4AF37', '#FFD700', '#FFF8DC'] });
      }, event?.special_note ? 4000 : 1000);
      return () => clearTimeout(t);
    }
  }, [giftsComplete, event, easterEggDismissed]);

  const theme = event ? getTheme(event.theme) : getTheme('royal_gold');

  useEffect(() => {
    axios.get(`${API}/events/${eventId}`)
      .then(r => {
        setEvent(r.data);
        // Enable song immediately if no PIN (or already unlocked)
        if (!r.data.lock_pin || alreadyUnlocked) setSongEnabled(true);
      })
      .catch(() => { toast.error('Event not found'); navigate('/'); })
      .finally(() => setLoading(false));
  }, [eventId, navigate]);

  const handleBlowComplete = () => {
    sessionStorage.setItem(`candles_${eventId}`, 'true');
    setCandlesBlown(true);
    toast.success('Make a wish! ✨');
    setTimeout(() => setPhase('scroll'), 1500);
  };

  const handleTitleTap = useCallback(() => {
    setTapCount(prev => {
      const n = prev + 1;
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => setTapCount(0), 1000);
      if (n >= 3 && event?.easter_egg_message) {
        setShowEasterEgg(true);
        confetti({ particleCount: 200, spread: 180, colors: ['#D4AF37', '#FFD700', '#FFF8DC'] });
        return 0;
      }
      return n;
    });
  }, [event]);

  const getGreeting = () => {
    if (!event) return '';
    if (event.occasion_type === 'birthday') return 'Happy Birthday';
    if (event.occasion_type === 'anniversary') return 'Happy Anniversary';
    return event.custom_occasion || 'Congratulations';
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
      <Sparkles className="w-12 h-12 animate-pulse" style={{ color: theme.colors.primary }} />
    </div>
  );

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: theme.colors.background }}>

      {/* Music - starts right after PIN unlock, persists through all phases */}
      {event?.song_url && songEnabled && (
        <div className="fixed top-0 left-0 right-0 z-40 p-3 backdrop-blur" style={{ backgroundColor: theme.colors.background + 'CC' }}>
          <MusicPlayer songUrl={event.song_url} theme={theme} />
        </div>
      )}

      {/* Auth bar - top right */}
      <div className="fixed top-3 right-3 z-50">
        {token ? (
          <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-black/40 hover:bg-black/60 text-white backdrop-blur border border-white/10">
            <Sparkles className="w-3 h-3 mr-1 text-[#D4AF37]" /> {user?.name?.split(' ')[0]}
          </Button>
        ) : (
          <Button size="sm" onClick={() => navigate('/login')} className="bg-black/40 hover:bg-black/60 text-white backdrop-blur border border-white/10">
            <LogIn className="w-3 h-3 mr-1" /> Sign In
          </Button>
        )}
      </div>

      {/* Lock Screen */}
      {event?.lock_pin && !unlocked && (
        <LockScreen
          hint={event.lock_hint}
          correctPin={event.lock_pin}
          theme={theme}
          onUnlock={() => {
            sessionStorage.setItem(`unlocked_${eventId}`, 'true');
            setUnlocked(true);
            setSongEnabled(true);
          }}
        />
      )}



      {/* Phase: Envelope */}
      <AnimatePresence>
        {phase === 'envelope' && (
          <motion.div key="envelope" exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6"
            style={{ backgroundColor: theme.colors.background }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              <motion.div
                className="text-8xl mb-8 cursor-pointer select-none"
                animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}
                onClick={() => setPhase('voiceTimer')}
              >
                💌
              </motion.div>
              <h2 className="font-heading text-2xl mb-3" style={{ color: theme.colors.text }}>You have a special message</h2>
              <p className="text-sm mb-8" style={{ color: theme.colors.text + '80' }}>Tap the envelope to open</p>
              <Button onClick={() => setPhase('voiceTimer')} className="btn-gold px-8 py-4 rounded-full text-lg">
                Open ✨
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase: Voice Timer */}
      <AnimatePresence>
        {phase === 'voiceTimer' && (
          <motion.div key="voice" exit={{ opacity: 0 }}>
            <VoiceTimer
              voiceUrl={event?.voice_message_url}
              theme={theme}
              onComplete={() => setPhase('cake')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase: Cake */}
      {phase === 'cake' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 flex flex-col items-center justify-center z-40"
          style={{ backgroundColor: theme.colors.background }}
        >
          {/* Floating particles - fewer on mobile */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {[...Array(window.innerWidth < 768 ? 6 : 12)].map((_, i) => (
              <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.colors.primary, willChange: 'transform, opacity' }}
                initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0.3 }}
                animate={{ y: [null, Math.random() * -200], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 6 + Math.random() * 4, repeat: Infinity, repeatType: 'reverse' }}
              />
            ))}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="font-heading text-4xl mb-2 text-center px-4"
            style={{ color: theme.colors.primary }}
            onClick={handleTitleTap}
          >
            {getGreeting()}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="font-heading text-3xl mb-8 text-center"
            style={{ color: theme.colors.text || '#fff' }}
          >
            {event?.person_name}!
          </motion.h2>

          <InteractiveCake theme={theme} candlesBlown={candlesBlown} onBlowComplete={handleBlowComplete} />
        </motion.div>
      )}

      {phase === 'scroll' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>

          <HeartsCanvas color={theme.colors.primary} />

          {/* Music player moved to top-level, removed from here */}

          <div className={`max-w-2xl mx-auto px-4 pb-24 space-y-12 relative z-10 ${event?.song_url && songEnabled ? 'pt-20' : 'pt-8'}`}>

            {/* Greeting */}
            <div className="text-center pt-4">
              <h1 className="font-heading text-4xl mb-2" style={{ color: theme.colors.primary }}>{getGreeting()}</h1>
              <h2 className="font-heading text-3xl" style={{ color: theme.colors.text || '#fff' }}>{event?.person_name}!</h2>
            </div>

            {/* Flip Cards */}
            {event?.flip_cards?.length > 0 && (
              <div>
                <h3 className="font-heading text-xl mb-4 text-center" style={{ color: theme.colors.primary }}>Tap to reveal 💝</h3>
                <FlipCards cards={event.flip_cards} theme={theme} onComplete={() => {}} />
              </div>
            )}

            {/* Game Section */}
            <div>
              <h3 className="font-heading text-xl mb-4 text-center" style={{ color: theme.colors.text || '#fff' }}>🎈 Pop the Balloons!</h3>
              <BalloonPopGame theme={theme} onComplete={() => setGameComplete(true)} />
            </div>

            {/* Gifts - unlocked after game */}
            <AnimatePresence>
              {gameComplete && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="rounded-xl p-4 mb-4 text-center" style={{ backgroundColor: theme.colors.primary + '15', border: `1px solid ${theme.colors.primary}40` }}>
                    <Award className="w-8 h-8 mx-auto mb-2" style={{ color: theme.colors.primary }} />
                    <p className="font-heading text-lg" style={{ color: theme.colors.primary }}>Reward Unlocked! Open your gifts 🎁</p>
                  </div>
                  <PolaroidGallery theme={theme} photos={event?.photos || []} onComplete={() => setGiftsComplete(true)} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Love Letter - shown after gifts */}
            <AnimatePresence>
              {giftsComplete && event?.special_note && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <LoveLetter note={event.special_note} theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video - muted so background music keeps playing */}
            <AnimatePresence>
              {giftsComplete && event?.video_url && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="glass rounded-xl overflow-hidden">
                    <p className="text-center text-xs py-2" style={{ color: theme.colors.primary + '99' }}>🎵 Background music continues while video plays</p>
                    <video
                      src={event.video_url}
                      controls
                      muted
                      className="w-full rounded-xl"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* End Screen - Try Yours */}
            <AnimatePresence>
              {giftsComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center py-10"
                >
                  <div className="rounded-2xl p-8" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.secondary}10)`, border: `1px solid ${theme.colors.primary}30` }}>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-5xl mb-4"
                    >✨</motion.div>
                    <h3 className="font-heading text-2xl mb-2" style={{ color: theme.colors.primary }}>Loved this experience?</h3>
                    <p className="text-sm mb-6" style={{ color: theme.colors.text + '99' }}>Create your own magical celebration for someone special</p>
                    <button
                      onClick={() => navigate('/create')}
                      className="px-8 py-3 rounded-full font-bold text-sm mb-4 block w-full"
                      style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                    >
                      🎉 Create Yours Free
                    </button>
                    <p className="text-xs" style={{ color: theme.colors.text + '50' }}>
                      Made with ❤️ by <span style={{ color: theme.colors.primary }}>Sudhanshu Kumar</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feedback */}
            <AnimatePresence>
              {giftsComplete && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                  <FeedbackCard eventId={eventId} theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      )}

      {/* Easter Egg Modal */}
      <AnimatePresence>
        {showEasterEgg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={() => setShowEasterEgg(false)}
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="rounded-2xl p-8 max-w-md w-full text-center"
              style={{ backgroundColor: theme.colors.background, border: `2px solid ${theme.colors.primary}50` }}
              onClick={e => e.stopPropagation()}
            >
              <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.primary }} />
              <h3 className="font-heading text-2xl mb-4" style={{ color: theme.colors.primary }}>Secret Message! 🤫</h3>
              <p className="text-lg" style={{ color: theme.colors.text }}>{event?.easter_egg_message}</p>
              <Button onClick={() => { setShowEasterEgg(false); setEasterEggDismissed(true); }} className="mt-6" style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }} data-testid="close-easter-egg-btn">
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CelebrationExperience;
