import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, Gift, Sparkles, Music, MessageSquare, Cake, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { getTheme } from '@/lib/themes';
import confetti from 'canvas-confetti';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Voice Note Timer - plays voice then shows cake
const VoiceTimer = ({ voiceUrl, onComplete }) => {
  const audioRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [started, setStarted] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  // Always fallback after 30s max no matter what
  useEffect(() => {
    const t = setTimeout(finish, 30000);
    return () => clearTimeout(t);
  }, [finish]);

  // No voice — skip after 2s
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

  // countdown tick
  useEffect(() => {
    if (!started || timeLeft === null) return;
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft, finish]);

  if (!voiceUrl) return (
    <div className="fixed inset-0 bg-[#0A0F1F] flex flex-col items-center justify-center z-50">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <Sparkles className="w-16 h-16 text-[#D4AF37] mb-6" />
      </motion.div>
      <p className="text-white text-xl font-heading text-center">Something special is waiting...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#0A0F1F] flex flex-col items-center justify-center z-50 px-6">
      <audio ref={audioRef} src={voiceUrl} onLoadedMetadata={handleLoaded} onEnded={finish} onError={finish} />
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <Sparkles className="w-16 h-16 text-[#D4AF37] mb-6" />
      </motion.div>
      <p className="text-white text-xl font-heading mb-8 text-center">A special message for you...</p>
      {!started ? (
        <Button onClick={start} className="btn-gold px-8 py-4 text-lg rounded-full">
          <Play className="w-5 h-5 mr-2" /> Play Message
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full border-4 border-[#D4AF37] flex items-center justify-center">
            <span className="text-[#D4AF37] text-4xl font-bold">{timeLeft ?? '...'}</span>
          </div>
          <p className="text-white/60 text-sm">Cake coming soon...</p>
          <button onClick={finish} className="text-white/30 text-xs underline mt-2">Skip</button>
        </div>
      )}
    </div>
  );
};

// Background floating balloons - shown throughout all phases
const FloatingBalloons = ({ theme }) => {
  const colors = [theme.colors.primary, theme.colors.secondary, '#FF6B6B', '#4ECDC4', '#FFD700'];
  const balloons = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: 5 + (i * 10) % 90,
    size: 30 + (i % 3) * 10,
    color: colors[i % colors.length],
    duration: 6 + (i % 4) * 2,
    delay: i * 0.8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {balloons.map(b => (
        <motion.div
          key={b.id}
          className="absolute"
          style={{ left: `${b.x}%`, bottom: 0 }}
          initial={{ y: '110vh' }}
          animate={{ y: '-20vh' }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, repeatDelay: 1 }}
        >
          <svg width={b.size} height={b.size * 1.3} viewBox="0 0 50 65" opacity="0.5">
            <ellipse cx="25" cy="25" rx="20" ry="25" fill={b.color} />
            <path d="M25 50 Q27 55 25 60 Q23 55 25 50" stroke={b.color} strokeWidth="1.5" fill="none" />
            <ellipse cx="18" cy="18" rx="5" ry="8" fill="white" opacity="0.25" />
          </svg>
        </motion.div>
      ))}
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
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-[#D4AF37] font-heading text-xl">
          Make a wish! ✨
        </motion.p>
      )}
    </div>
  );
};

// Balloon Pop Game - full screen float
const BalloonPopGame = ({ theme, onComplete }) => {
  const colors = [theme.colors.primary, theme.colors.secondary, '#FF6B6B', '#4ECDC4', '#FFD700'];
  const [balloons, setBalloons] = useState(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      size: 40 + Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 5 + Math.random() * 4,
      delay: Math.random() * 3,
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
    <div className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-sky-900/40 to-sky-600/20" style={{ height: '80vh' }}>
      <div className="absolute top-4 left-4 bg-white/10 backdrop-blur px-4 py-2 rounded-full z-10">
        <span className="text-white font-bold">🎈 {score}/15</span>
      </div>
      {balloons.map(b => !b.popped && (
        <motion.div
          key={b.id}
          className="absolute cursor-pointer"
          style={{ left: `${b.x}%`, bottom: 0 }}
          initial={{ y: '100%' }}
          animate={{ y: '-120%' }}
          transition={{ duration: b.duration, delay: b.delay, repeat: done ? 0 : Infinity, repeatDelay: Math.random() * 2 }}
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
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <Award className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
            <p className="font-heading text-3xl text-white">You Won! 🎉</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Gift Box - shows uploaded photos
const GiftBoxGame = ({ theme, photos, onComplete }) => {
  const fallbackMessages = ['You are amazing! 🌟', 'Best wishes! 🎉', 'Keep shining! ✨', 'You rock! 🎸', 'Stay awesome! 💫', 'Happiness always! 🌈'];
  const items = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    photo: photos && photos[i] ? photos[i].url : null,
    message: fallbackMessages[i],
  }));

  const [boxes, setBoxes] = useState(items.map(it => ({ ...it, opened: false })));
  const [openedCount, setOpenedCount] = useState(0);

  const openBox = (id) => {
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, opened: true } : b));
    const newCount = openedCount + 1;
    setOpenedCount(newCount);
    if (newCount >= 6) {
      confetti({ particleCount: 150, spread: 120, origin: { y: 0.5 } });
      setTimeout(onComplete, 1500);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {boxes.map(box => (
        <motion.div
          key={box.id}
          className={`aspect-square rounded-xl cursor-pointer overflow-hidden ${!box.opened ? 'gift-shake' : ''}`}
          style={{ backgroundColor: box.opened ? 'transparent' : theme.colors.primary + '30' }}
          onClick={() => !box.opened && openBox(box.id)}
          data-testid={`gift-box-${box.id}`}
        >
          {box.opened ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-full h-full flex items-center justify-center">
              {box.photo ? (
                <img src={box.photo} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <p className="text-white text-center text-sm p-2">{box.message}</p>
              )}
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

// Looping Music Player
const MusicPlayer = ({ songUrl }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [songUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (audioRef.current) { audioRef.current.muted = !isMuted; setIsMuted(!isMuted); }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
  };

  const handleSeek = (value) => {
    if (audioRef.current) { audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration; setProgress(value[0]); }
  };

  if (!songUrl) return null;

  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <audio ref={audioRef} src={songUrl} onTimeUpdate={handleTimeUpdate} loop />
      <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0A0F1F] shrink-0" data-testid="music-play-btn">
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.1} className="flex-1 cursor-pointer" />
      <button onClick={toggleMute} className="text-white shrink-0" data-testid="music-mute-btn">
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Flow phases: voiceTimer → cake → scroll (game → gifts → message)
  const alreadyBlown = sessionStorage.getItem(`candles_${eventId}`) === 'true';
  const [phase, setPhase] = useState(alreadyBlown ? 'scroll' : 'voiceTimer');
  const [candlesBlown, setCandlesBlown] = useState(alreadyBlown);
  const [gameComplete, setGameComplete] = useState(false);
  const [giftsComplete, setGiftsComplete] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef(null);

  const theme = event ? getTheme(event.theme) : getTheme('royal_gold');

  useEffect(() => {
    axios.get(`${API}/events/${eventId}`)
      .then(r => setEvent(r.data))
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
    <div className="fixed inset-0 bg-[#0A0F1F] flex items-center justify-center">
      <Sparkles className="w-12 h-12 text-[#D4AF37] animate-pulse" />
    </div>
  );

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: theme.colors.background }}>

      {/* Background floating balloons throughout all phases */}
      {event && <FloatingBalloons theme={theme} />}

      {/* Phase: Voice Timer */}
      <AnimatePresence>
        {phase === 'voiceTimer' && (
          <motion.div key="voice" exit={{ opacity: 0 }}>
            <VoiceTimer
              voiceUrl={event?.voice_message_url}
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
          {/* Floating particles */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
                initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, opacity: 0.3 }}
                animate={{ y: [null, Math.random() * -300], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, repeatType: 'reverse' }}
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

          {/* Secret message hint */}
          {event?.easter_egg_message && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 2 }}
              className="mt-8 text-white/40 text-xs text-center">
              💡 Tap the name 3 times for a secret message
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Phase: Scroll page */}
      {phase === 'scroll' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>

          {/* Music player fixed top */}
          {event?.song_url && (
            <div className="fixed top-0 left-0 right-0 z-40 p-3 backdrop-blur" style={{ backgroundColor: theme.colors.background + 'CC' }}>
              <MusicPlayer songUrl={event.song_url} />
            </div>
          )}

          <div className={`max-w-2xl mx-auto px-4 pb-24 space-y-12 ${event?.song_url ? 'pt-20' : 'pt-8'}`}>

            {/* Greeting */}
            <div className="text-center pt-4" onClick={handleTitleTap}>
              <h1 className="font-heading text-4xl mb-2" style={{ color: theme.colors.primary }}>{getGreeting()}</h1>
              <h2 className="font-heading text-3xl" style={{ color: theme.colors.text }}>{event?.person_name}!</h2>
              {event?.easter_egg_message && (
                <p className="mt-3 text-xs" style={{ color: theme.colors.text + '60' }}>💡 Tap the name 3 times for a secret message</p>
              )}
            </div>

            {/* Game Section */}
            <div>
              <h3 className="font-heading text-xl mb-4 text-center" style={{ color: theme.colors.text }}>🎈 Pop the Balloons!</h3>
              <BalloonPopGame theme={theme} onComplete={() => setGameComplete(true)} />
            </div>

            {/* Gifts - unlocked after game */}
            <AnimatePresence>
              {gameComplete && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="glass rounded-xl p-4 mb-4 text-center">
                    <Award className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                    <p className="text-[#D4AF37] font-heading text-lg">Reward Unlocked! Open your gifts 🎁</p>
                  </div>
                  <GiftBoxGame
                    theme={theme}
                    photos={event?.photos || []}
                    onComplete={() => setGiftsComplete(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message - shown after gifts opened */}
            <AnimatePresence>
              {giftsComplete && event?.special_note && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <SpecialNote note={event.special_note} theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video - shown after gifts opened */}
            <AnimatePresence>
              {giftsComplete && event?.video_url && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="glass rounded-xl overflow-hidden">
                    <video
                      src={event.video_url}
                      controls
                      className="w-full rounded-xl"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowEasterEgg(false)}
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="glass rounded-2xl p-8 max-w-md text-center"
              onClick={e => e.stopPropagation()}
            >
              <Sparkles className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="font-heading text-2xl text-white mb-4">Secret Message! 🤫</h3>
              <p className="text-white text-lg">{event?.easter_egg_message}</p>
              <Button onClick={() => setShowEasterEgg(false)} className="mt-6 btn-gold" data-testid="close-easter-egg-btn">
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
