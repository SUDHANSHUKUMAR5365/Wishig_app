import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, X, Sparkles, MessageSquare, Award, Lock, LogIn, Check, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import axios from 'axios';
import { getTheme } from '@/lib/themes';
import { useAuth } from '@/lib/auth';
import confetti from 'canvas-confetti';
import ReactConfetti from 'react-confetti';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── LockScreen ──────────────────────────────────────────────────────────────
const LockScreen = ({ hint, correctPin, onUnlock, theme }) => {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

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
        <div className="flex gap-4 mb-8">
          {[0,1,2,3].map(i => (
            <div key={i} className="w-4 h-4 rounded-full border-2 transition-all" style={{
              backgroundColor: pin.length > i ? theme.colors.primary : 'transparent',
              borderColor: pin.length > i ? theme.colors.primary : theme.colors.text + '40',
            }} />
          ))}
        </div>
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

// ─── VoiceTimer ───────────────────────────────────────────────────────────────
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

// ─── InteractiveCake ──────────────────────────────────────────────────────────
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

// ─── Game 1: BalloonPopGame ───────────────────────────────────────────────────
const BALLOON_SPEEDS = { easy: 5, medium: 3.2, hard: 2 };
const BALLOON_COLORS = ['#FF6B6B','#4ECDC4','#FFD700','#A78BFA','#F472B6','#34D399','#60A5FA','#FB923C'];

const BalloonPopGame = ({ settings, difficulty, theme, onComplete }) => {
  const total = Math.min(20, Math.max(5, settings?.balloon_count || 15));
  const target = settings?.target_score || total;
  const speedMult = BALLOON_SPEEDS[difficulty] || BALLOON_SPEEDS.medium;
  const colors = [theme.colors.primary, theme.colors.secondary, ...BALLOON_COLORS];

  const [balloons, setBalloons] = useState(() =>
    Array.from({ length: total }, (_, i) => ({
      id: i,
      x: 5 + (i * 6.2) % 85,
      size: 38 + (i % 4) * 10,
      color: colors[i % colors.length],
      duration: speedMult + (i % 5) * 0.8,
      delay: (i * 0.35) % 4,
      popped: false,
    }))
  );
  const [score, setScore] = useState(0);
  const [pops, setPops] = useState([]); // burst positions
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const scoreRef = useRef(0);

  const pop = useCallback((id, color) => {
    setBalloons(prev => prev.map(b => b.id === id ? { ...b, popped: true } : b));
    const newScore = scoreRef.current + 1;
    scoreRef.current = newScore;
    setScore(newScore);
    setPops(prev => [...prev, { id: Date.now(), color }]);
    if (newScore >= target) {
      setDone(true);
      setShowConfetti(true);
      setTimeout(onComplete, 2200);
    }
  }, [target, onComplete]);

  const pct = Math.min(100, Math.round((score / target) * 100));

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.colors.primary}25` }}>
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={300} colors={[theme.colors.primary, theme.colors.secondary, '#FFD700', '#fff']} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999, pointerEvents: 'none' }} />}

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: theme.colors.primary + '18' }}>
        <span className="text-xl">🎈</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading text-sm" style={{ color: theme.colors.primary }}>Balloon Pop</span>
            <span className="text-sm font-bold" style={{ color: theme.colors.text }}>{score}/{target}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.text + '15' }}>
            <motion.div className="h-full rounded-full" style={{ backgroundColor: theme.colors.primary }}
              animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="relative w-full" style={{
        height: '72vw', maxHeight: '460px',
        background: `linear-gradient(180deg, ${theme.colors.primary}12 0%, ${theme.colors.background} 100%)`,
        overflow: 'hidden',
      }}>
        {!done && balloons.map(b => !b.popped && (
          <motion.button
            key={b.id}
            className="absolute cursor-pointer select-none"
            style={{ left: `${b.x}%`, touchAction: 'manipulation' }}
            initial={{ bottom: -90 }}
            animate={{ bottom: '108%' }}
            transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, repeatDelay: 0.3 + (b.id % 3) * 0.4, ease: 'linear' }}
            onClick={() => pop(b.id, b.color)}
            whileTap={{ scale: 0.5, opacity: 0 }}
            aria-label={`Pop balloon ${b.id + 1}`}
          >
            <svg width={b.size} height={b.size * 1.25} viewBox="0 0 50 62" style={{ filter: `drop-shadow(0 2px 8px ${b.color}60)` }}>
              <ellipse cx="25" cy="25" rx="20" ry="24" fill={b.color} />
              <ellipse cx="18" cy="16" rx="6" ry="9" fill="white" opacity="0.25" />
              <path d="M23 49 Q25 54 27 49" stroke={b.color} strokeWidth="2.5" fill="none" />
              <line x1="25" y1="51" x2="25" y2="62" stroke={b.color} strokeWidth="1.5" />
            </svg>
          </motion.button>
        ))}

        {/* Pop burst FX */}
        {pops.slice(-8).map(p => (
          <motion.div key={p.id} className="absolute text-2xl pointer-events-none"
            style={{ left: '50%', top: '50%' }}
            initial={{ opacity: 1, scale: 0.5 }} animate={{ opacity: 0, scale: 2.5 }}
            transition={{ duration: 0.45 }}
          >💥</motion.div>
        ))}

        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ backgroundColor: theme.colors.background + 'E0' }}>
            <div className="text-6xl mb-3">🏆</div>
            <p className="font-heading text-2xl" style={{ color: theme.colors.primary }}>All Popped!</p>
            <p className="text-sm mt-1" style={{ color: theme.colors.text + '80' }}>Score: {score}/{target}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Game 2: LuckyGiftBox ─────────────────────────────────────────────────────
const LuckyGiftBox = ({ settings, theme, onComplete }) => {
  const count = Math.min(16, Math.max(4, settings?.box_count || 9));
  const winMessage = settings?.winning_message || 'You found the gift! 🎉';
  const rewardImage = settings?.reward_image || null;
  const [winIndex] = useState(() => Math.floor(Math.random() * count));
  const [opened, setOpened] = useState([]);
  const [won, setWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const cols = count <= 4 ? 2 : count <= 9 ? 3 : 4;

  const open = (i) => {
    if (opened.includes(i) || won) return;
    const next = [...opened, i];
    setOpened(next);
    if (i === winIndex) {
      setWon(true);
      setShowConfetti(true);
      setTimeout(onComplete, 2800);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}12, ${theme.colors.secondary}08)`, border: `1.5px solid ${theme.colors.primary}25` }}>
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={280} colors={[theme.colors.primary, theme.colors.secondary, '#FFD700', '#fff']} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999, pointerEvents: 'none' }} />}

      <div className="px-5 pt-5 pb-3 text-center">
        <div className="text-4xl mb-1">🎁</div>
        <h3 className="font-heading text-xl" style={{ color: theme.colors.primary }}>Lucky Gift Box</h3>
        <p className="text-sm mt-1" style={{ color: theme.colors.text + '80' }}>
          {won ? winMessage : `Tap a box to find the surprise! ${opened.length > 0 ? `(${opened.length} opened)` : ''}`}
        </p>
      </div>

      <div className="p-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: count }, (_, i) => {
            const isOpen = opened.includes(i);
            const isWinner = isOpen && i === winIndex;
            return (
              <motion.button
                key={i}
                onClick={() => open(i)}
                disabled={isOpen}
                whileTap={!isOpen ? { scale: 0.88 } : {}}
                animate={isWinner
                  ? { scale: [1, 1.18, 0.95, 1.12, 1], rotate: [0, -6, 6, -3, 0], boxShadow: [`0 0 0px ${theme.colors.primary}00`, `0 0 30px ${theme.colors.primary}80`, `0 0 20px ${theme.colors.primary}50`] }
                  : {}
                }
                transition={{ duration: 0.7 }}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 text-3xl"
                style={{
                  backgroundColor: isWinner ? theme.colors.primary + '35' : isOpen ? theme.colors.text + '08' : theme.colors.primary + '18',
                  border: `2px solid ${isWinner ? theme.colors.primary : isOpen ? theme.colors.text + '15' : theme.colors.primary + '35'}`,
                  cursor: isOpen ? 'default' : 'pointer',
                  boxShadow: isWinner ? `0 0 24px ${theme.colors.primary}50` : 'none',
                }}
              >
                {isWinner ? (
                  <>
                    {rewardImage
                      ? <img src={rewardImage} alt="reward" className="w-3/4 h-3/4 object-cover rounded-xl" />
                      : <span>🏆</span>
                    }
                    <motion.span initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      className="text-xs font-bold" style={{ color: theme.colors.primary, fontSize: '0.6rem' }}>YOU WIN!</motion.span>
                  </>
                ) : isOpen ? '📦' : '🎁'}
              </motion.button>
            );
          })}
        </div>

        {won && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-5 rounded-xl p-4 text-center"
            style={{ background: `linear-gradient(135deg, ${theme.colors.primary}25, ${theme.colors.secondary}15)`, border: `1.5px solid ${theme.colors.primary}50` }}>
            <div className="text-3xl mb-2">✨</div>
            <p className="font-heading text-lg" style={{ color: theme.colors.primary }}>{winMessage}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Game 3 (removed: GiftHunt) — old events with gift_hunt skipped silently ─

// ─── Game 4: CatchTheCake ────────────────────────────────────────────────────
// Uses refs for all mutable game state to avoid stale-closure bugs in RAF.
const CATCH_CONFIG = { easy: { spawnMs: 1400, fallPx: 2.2 }, medium: { spawnMs: 950, fallPx: 3.8 }, hard: { spawnMs: 620, fallPx: 6 } };

const CatchTheCake = ({ settings, difficulty, theme, onComplete }) => {
  const cfg = CATCH_CONFIG[difficulty] || CATCH_CONFIG.medium;
  const target = settings?.target_score || 10;

  // All mutable game state in refs so RAF closure is always fresh
  const scoreRef = useRef(0);
  const missedRef = useRef(0);
  const basketRef = useRef(50);
  const cakesRef = useRef([]);
  const idRef = useRef(0);
  const wonRef = useRef(false);
  const rafRef = useRef(null);
  const spawnRef = useRef(null);
  const gameAreaRef = useRef(null);

  // Display state (read-only renders)
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [basketX, setBasketX] = useState(50);
  const [cakes, setCakes] = useState([]);
  const [won, setWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    // Spawn loop
    spawnRef.current = setInterval(() => {
      if (wonRef.current) return;
      const id = idRef.current++;
      cakesRef.current = [...cakesRef.current, {
        id, x: 6 + Math.random() * 82, y: 0,
        emoji: ['🎂', '🍰', '🧁'][id % 3],
      }];
    }, cfg.spawnMs);

    // RAF physics loop
    const tick = () => {
      if (wonRef.current) return;
      const BASKET_HW = 14; // half-width in %
      const next = [];
      let scoreChanged = false;
      let missedChanged = false;

      for (const c of cakesRef.current) {
        const ny = c.y + cfg.fallPx;
        if (ny >= 87) {
          if (Math.abs(c.x - basketRef.current) < BASKET_HW) {
            scoreRef.current++;
            scoreChanged = true;
            if (scoreRef.current >= target) {
              wonRef.current = true;
              clearInterval(spawnRef.current);
              setWon(true);
              setShowConfetti(true);
              setScore(scoreRef.current);
              cakesRef.current = [];
              setCakes([]);
              setTimeout(() => onCompleteRef.current(), 2400);
              return;
            }
          } else {
            missedRef.current++;
            missedChanged = true;
          }
        } else {
          next.push({ ...c, y: ny });
        }
      }
      cakesRef.current = next;
      setCakes([...next]);
      if (scoreChanged) setScore(scoreRef.current);
      if (missedChanged) setMissed(missedRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      clearInterval(spawnRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [cfg.spawnMs, cfg.fallPx, target]);

  const handlePointer = useCallback((e) => {
    if (wonRef.current) return;
    const area = gameAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(90, Math.max(10, ((clientX - rect.left) / rect.width) * 100));
    basketRef.current = pct;
    setBasketX(pct);
  }, []);

  const pct = Math.min(100, Math.round((score / target) * 100));

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${theme.colors.primary}25` }}>
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={300} colors={[theme.colors.primary, theme.colors.secondary, '#FFD700']} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999, pointerEvents: 'none' }} />}

      {/* Header */}
      <div className="px-4 py-3" style={{ backgroundColor: theme.colors.primary + '18' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-heading text-sm" style={{ color: theme.colors.primary }}>🎂 Catch The Cake</span>
          <div className="flex gap-3 text-sm">
            <span style={{ color: theme.colors.primary }}>✓ {score}/{target}</span>
            <span style={{ color: theme.colors.text + '50' }}>✗ {missed}</span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.text + '15' }}>
          <motion.div className="h-full rounded-full" style={{ backgroundColor: theme.colors.primary }}
            animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Game arena */}
      <div
        ref={gameAreaRef}
        className="relative select-none"
        style={{ height: '65vw', maxHeight: '420px', background: `linear-gradient(180deg, ${theme.colors.background} 0%, ${theme.colors.primary}10 100%)`, touchAction: 'none', overflow: 'hidden', cursor: 'none' }}
        onMouseMove={handlePointer}
        onTouchMove={handlePointer}
      >
        {/* Falling items */}
        {cakes.map(c => (
          <div key={c.id} className="absolute text-3xl pointer-events-none"
            style={{ left: `${c.x}%`, top: `${c.y}%`, transform: 'translate(-50%,-50%)', filter: `drop-shadow(0 2px 4px ${theme.colors.primary}40)` }}>
            {c.emoji}
          </div>
        ))}

        {/* Basket */}
        <div className="absolute text-4xl pointer-events-none"
          style={{ left: `${basketX}%`, bottom: '6%', transform: 'translateX(-50%)', transition: 'left 0.04s linear' }}>
          🧺
        </div>

        {/* Touch hint */}
        {score === 0 && missed === 0 && (
          <p className="absolute bottom-16 inset-x-0 text-center text-xs pointer-events-none select-none"
            style={{ color: theme.colors.text + '40' }}>Move finger / mouse to control basket</p>
        )}

        {won && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ backgroundColor: theme.colors.background + 'E0' }}>
            <div className="text-6xl mb-3">🏆</div>
            <p className="font-heading text-2xl" style={{ color: theme.colors.primary }}>You caught {score} cakes!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Game 5: CakeDecoration (dnd-kit) ─────────────────────────────────────────
const DECO_PALETTE = [
  { id: 'cherry', emoji: '🍒', label: 'Cherry' },
  { id: 'strawberry', emoji: '🍓', label: 'Strawberry' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'flower', emoji: '🌸', label: 'Flower' },
  { id: 'candle', emoji: '🕯️', label: 'Candle' },
  { id: 'balloon', emoji: '🎈', label: 'Balloon' },
  { id: 'sparkle', emoji: '✨', label: 'Sparkle' },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow' },
  { id: 'choco', emoji: '🍫', label: 'Chocolate' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'gem', emoji: '💎', label: 'Gem' },
];

// Draggable palette item
const DraggableDeco = ({ item, theme }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id, data: { emoji: item.emoji } });
  const transformStyle = transform ? { transform: CSS.Translate.toString(transform) } : {};
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="w-11 h-11 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      style={{
        ...transformStyle,
        backgroundColor: isDragging ? theme.colors.primary + '40' : theme.colors.primary + '18',
        border: `1.5px solid ${isDragging ? theme.colors.primary : theme.colors.primary + '30'}`,
        opacity: isDragging ? 0.5 : 1,
        fontSize: '1.4rem',
      }}
      title={item.label}
    >{item.emoji}</div>
  );
};

// Droppable cake canvas
const DroppableCake = ({ children, theme }) => {
  const { isOver, setNodeRef } = useDroppable({ id: 'cake-canvas' });
  return (
    <div ref={setNodeRef} className="relative" style={{
      height: '52vw', maxHeight: '300px',
      background: `linear-gradient(135deg, ${theme.colors.primary}10, ${theme.colors.secondary}08)`,
      border: `2px dashed ${isOver ? theme.colors.primary : theme.colors.primary + '30'}`,
      borderRadius: '16px',
      transition: 'border-color 0.2s',
      overflow: 'hidden',
    }}>{children}</div>
  );
};

const CakeDecoration = ({ settings, theme, onComplete }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );
  const [placed, setPlaced] = useState([]);
  const [activeDeco, setActiveDeco] = useState(null);
  const [finished, setFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const canvasRef = useRef(null);

  const handleDragStart = ({ active }) => setActiveDeco(active.data.current);

  const handleDragEnd = ({ active, over }) => {
    setActiveDeco(null);
    if (!over || over.id !== 'cake-canvas' || finished) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Place at center of canvas as approximation (dnd-kit gives us drop target, not exact pixel)
    // Use random scatter within canvas for natural look
    const x = 15 + Math.random() * 70;
    const y = 15 + Math.random() * 70;
    setPlaced(prev => [...prev, { id: Date.now(), emoji: active.data.current.emoji, x, y }]);
  };

  const finish = () => {
    setFinished(true);
    setShowConfetti(true);
    setTimeout(onComplete, 2800);
  };

  const undo = () => setPlaced(prev => prev.slice(0, -1));
  const reset = () => setPlaced([]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${theme.colors.primary}25` }}>
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={250} colors={[theme.colors.primary, theme.colors.secondary, '#FFD700', '#fff']} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999, pointerEvents: 'none' }} />}

      <div className="px-4 py-3" style={{ backgroundColor: theme.colors.primary + '18' }}>
        <div className="flex items-center justify-between">
          <span className="font-heading text-sm" style={{ color: theme.colors.primary }}>🍰 Decorate the Cake</span>
          {!finished && placed.length > 0 && (
            <div className="flex gap-2">
              <button onClick={undo} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: theme.colors.text + '12', color: theme.colors.text + 'AA' }}>
                <Undo2 className="w-3 h-3" /> Undo
              </button>
              <button onClick={reset} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: theme.colors.text + '12', color: theme.colors.text + 'AA' }}>
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          )}
        </div>
        {!finished && <p className="text-xs mt-1" style={{ color: theme.colors.text + '60' }}>Drag decorations onto the cake</p>}
      </div>

      <div className="p-4" style={{ backgroundColor: theme.colors.background }}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Cake drop zone */}
          <DroppableCake theme={theme}>
            <div ref={canvasRef} className="absolute inset-0">
              {/* Cake SVG */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg width="180" height="130" viewBox="0 0 180 130">
                  <rect x="15" y="58" width="150" height="66" rx="10" fill="#D2691E" opacity="0.75" />
                  <rect x="8" y="86" width="164" height="42" rx="9" fill="#8B4513" opacity="0.75" />
                  <path d="M15 58 Q45 38 90 43 Q135 38 165 58" fill="#FFFACD" opacity="0.92" />
                  <text x="90" y="115" textAnchor="middle" fontSize="13" fill={theme.colors.primary} fontFamily="Dancing Script, cursive" opacity="0.9">Happy Birthday!</text>
                </svg>
              </div>
              {/* Placed decorations */}
              {placed.map(d => (
                <motion.div key={d.id}
                  initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="absolute text-2xl pointer-events-none select-none"
                  style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%,-50%)' }}>
                  {d.emoji}
                </motion.div>
              ))}
              {finished && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.background + 'B0' }}>
                  <p className="font-heading text-xl" style={{ color: theme.colors.primary }}>Beautiful! 🎉</p>
                </motion.div>
              )}
            </div>
          </DroppableCake>

          {/* Palette */}
          {!finished && (
            <div className="mt-4">
              <p className="text-xs mb-2" style={{ color: theme.colors.text + '60' }}>Drag to cake:</p>
              <div className="flex flex-wrap gap-2">
                {DECO_PALETTE.map(item => <DraggableDeco key={item.id} item={item} theme={theme} />)}
              </div>
            </div>
          )}

          {/* Drag overlay */}
          <DragOverlay>
            {activeDeco && (
              <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: theme.colors.primary + '30', border: `2px solid ${theme.colors.primary}`, boxShadow: `0 8px 24px ${theme.colors.primary}50` }}>
                {activeDeco.emoji}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {!finished && (
          <button onClick={finish} disabled={placed.length === 0}
            className="w-full mt-4 py-3 rounded-xl font-bold transition-all disabled:opacity-30"
            style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}>
            🎂 Finish Cake!
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Game 6: MemoryMatch ─────────────────────────────────────────────────────────
const MEMORY_EMOJIS = ['🎂','🎁','🎈','🎊','🌟','💝','🦋','🌸','🎵','🎠','🍰','🌈'];
const PAIRS_FOR_DIFFICULTY = { easy: 4, medium: 6, hard: 8 };

const MemoryMatch = ({ settings, difficulty, theme, onComplete }) => {
  const pairCount = PAIRS_FOR_DIFFICULTY[difficulty] || 6;
  const completionMsg = settings?.completion_message || 'Amazing memory! 🌟';
  const photos = settings?.photos || [];

  const [cards] = useState(() => {
    const symbols = photos.length >= pairCount
      ? photos.slice(0, pairCount).map((url, i) => ({ type: 'photo', value: url, key: i }))
      : MEMORY_EMOJIS.slice(0, pairCount).map((e, i) => ({ type: 'emoji', value: e, key: i }));
    return [...symbols, ...symbols.map(s => ({ ...s, key: s.key + pairCount }))]
      .sort(() => Math.random() - 0.5)
      .map((s, i) => ({ ...s, id: i }));
  });

  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const flip = (i) => {
    if (checking || flipped.includes(i) || matched.includes(i) || done) return;
    const next = [...flipped, i];
    setFlipped(next);
    setMoves(m => m + 1);

    if (next.length === 2) {
      setChecking(true);
      const [a, b] = [cards[next[0]], cards[next[1]]];
      if (a.key % pairCount === b.key % pairCount) {
        const newMatched = [...matched, ...next];
        const newCombo = combo + 1;
        setMatched(newMatched);
        setFlipped([]);
        setChecking(false);
        setCombo(newCombo);
        if (newMatched.length === cards.length) {
          setDone(true);
          setShowConfetti(true);
          setTimeout(onComplete, 2400);
        }
      } else {
        setCombo(0);
        setTimeout(() => { setFlipped([]); setChecking(false); }, 850);
      }
    }
  };

  // Responsive cols: 4 cols always looks best on mobile
  const cols = 4;
  const pct = Math.round((matched.length / cards.length) * 100);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${theme.colors.primary}25` }}>
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={280} colors={[theme.colors.primary, theme.colors.secondary, '#FFD700']} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999, pointerEvents: 'none' }} />}

      {/* Header */}
      <div className="px-4 py-3" style={{ backgroundColor: theme.colors.primary + '18' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-heading text-sm" style={{ color: theme.colors.primary }}>🃏 Memory Match</span>
          <div className="flex items-center gap-3 text-xs">
            {combo >= 2 && <motion.span key={combo} initial={{ scale: 0 }} animate={{ scale: 1 }} className="font-bold" style={{ color: theme.colors.primary }}>⚡ {combo}x Combo!</motion.span>}
            <span style={{ color: theme.colors.text + '70' }}>{moves} moves</span>
            <span style={{ color: theme.colors.primary }}>{matched.length / 2}/{pairCount}</span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.text + '15' }}>
          <motion.div className="h-full rounded-full" style={{ backgroundColor: theme.colors.primary }}
            animate={{ width: `${pct}%` }} transition={{ duration: 0.35 }} />
        </div>
      </div>

      {/* Grid */}
      <div className="p-3" style={{ background: `linear-gradient(135deg, ${theme.colors.background}, ${theme.colors.primary}06)` }}>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {cards.map((card, i) => {
            const isFaceUp = flipped.includes(i) || matched.includes(i);
            const isMatched = matched.includes(i);
            return (
              <div key={card.id} onClick={() => flip(i)} className="cursor-pointer" style={{ perspective: '700px' }}>
                <motion.div
                  animate={{ rotateY: isFaceUp ? 180 : 0 }}
                  transition={{ duration: 0.38, ease: 'easeInOut' }}
                  style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', paddingBottom: '100%' }}
                >
                  {/* Back face */}
                  <div style={{
                    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                    position: 'absolute', inset: 0, borderRadius: '10px',
                    background: `linear-gradient(135deg, ${theme.colors.primary}35, ${theme.colors.secondary}25)`,
                    border: `2px solid ${theme.colors.primary}45`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                  }}>❓</div>
                  {/* Front face */}
                  <motion.div
                    animate={isMatched ? { boxShadow: [`0 0 0px ${theme.colors.primary}00`, `0 0 16px ${theme.colors.primary}70`, `0 0 8px ${theme.colors.primary}40`] } : {}}
                    style={{
                      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      position: 'absolute', inset: 0, borderRadius: '10px',
                      backgroundColor: isMatched ? theme.colors.primary + '30' : theme.colors.primary + '12',
                      border: `2px solid ${isMatched ? theme.colors.primary : theme.colors.primary + '35'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                    {card.type === 'photo'
                      ? <img src={card.value} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <span style={{ fontSize: '1.6rem' }}>{card.value}</span>}
                  </motion.div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {done && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-4 rounded-xl p-4 text-center"
            style={{ background: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.secondary}12)`, border: `1.5px solid ${theme.colors.primary}45` }}>
            <div className="text-4xl mb-2">🌟</div>
            <p className="font-heading text-lg" style={{ color: theme.colors.primary }}>{completionMsg}</p>
            <p className="text-xs mt-1" style={{ color: theme.colors.text + '70' }}>Completed in {moves} moves</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── GiftHuntSkip — silently advances for old events that had gift_hunt ──────────
const GiftHuntSkip = ({ onComplete }) => {
  useEffect(() => { onComplete(); }, [onComplete]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// ─── Game 7: BirthdayQuiz ────────────────────────────────────────────────────────
const BirthdayQuiz = ({ settings, theme, onComplete }) => {
  const questions = settings?.questions || [];
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (questions.length === 0) { onComplete(); }
  }, [questions.length, onComplete]);

  if (questions.length === 0) return null;

  const q = questions[current];
  const pct = Math.round(((current + (answered ? 1 : 0)) / questions.length) * 100);

  const choose = (i) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (q.correctIndex != null && i === q.correctIndex) {
      setScore(s => s + 1);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: [theme.colors.primary, '#FFD700'] });
    }
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setDone(true);
      setShowConfetti(true);
      setTimeout(onComplete, 2800);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const optionStyle = (i) => {
    if (!answered) return {
      backgroundColor: theme.colors.primary + '15',
      border: `1.5px solid ${theme.colors.primary}30`,
      color: theme.colors.text,
    };
    const isCorrect = q.correctIndex != null && i === q.correctIndex;
    const isWrong = selected === i && !isCorrect;
    if (isCorrect) return { backgroundColor: '#16a34a30', border: '1.5px solid #16a34a', color: theme.colors.text };
    if (isWrong)  return { backgroundColor: '#dc262630', border: '1.5px solid #dc2626', color: theme.colors.text };
    return { backgroundColor: theme.colors.primary + '08', border: `1.5px solid ${theme.colors.text}15`, color: theme.colors.text + '70' };
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${theme.colors.primary}25` }}>
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={250} colors={[theme.colors.primary, theme.colors.secondary, '#FFD700']} style={{ position: 'fixed', top: 0, left: 0, zIndex: 999, pointerEvents: 'none' }} />}

      {/* Header */}
      <div className="px-4 py-3" style={{ backgroundColor: theme.colors.primary + '18' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-heading text-sm" style={{ color: theme.colors.primary }}>❓ Birthday Quiz</span>
          <span className="text-xs" style={{ color: theme.colors.text + '70' }}>{current + 1} / {questions.length}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.text + '15' }}>
          <motion.div className="h-full rounded-full" style={{ backgroundColor: theme.colors.primary }}
            animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      <div className="p-5" style={{ background: `linear-gradient(135deg, ${theme.colors.background}, ${theme.colors.primary}06)` }}>
        {!done ? (
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28 }}>
              <p className="font-heading text-lg mb-5 text-center" style={{ color: theme.colors.text }}>{q.question}</p>
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={answered}
                    whileTap={!answered ? { scale: 0.97 } : {}}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    style={optionStyle(i)}
                  >
                    <span className="mr-2" style={{ color: theme.colors.primary }}>{'ABCD'[i]}.</span> {opt}
                    {answered && q.correctIndex === i && <span className="float-right">✅</span>}
                    {answered && selected === i && q.correctIndex !== i && <span className="float-right">❌</span>}
                  </motion.button>
                ))}
              </div>

              {answered && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  {q.explanation ? (
                    <p className="text-xs rounded-xl px-4 py-3 mb-3" style={{ backgroundColor: theme.colors.primary + '15', color: theme.colors.text + 'CC' }}>
                      💡 {q.explanation}
                    </p>
                  ) : null}
                  <button
                    onClick={next}
                    className="w-full py-3 rounded-xl font-bold text-sm"
                    style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                  >
                    {current + 1 < questions.length ? 'Next Question →' : 'Finish Quiz!'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <div className="text-5xl mb-3">🏆</div>
            <p className="font-heading text-xl mb-2" style={{ color: theme.colors.primary }}>
              {score === questions.length ? 'Perfect Score!' : score >= questions.length / 2 ? 'Great Job!' : 'Nice Try!'}
            </p>
            {questions.some(q => q.correctIndex != null) && (
              <p className="text-sm" style={{ color: theme.colors.text + '80' }}>
                You scored {score} / {questions.filter(q => q.correctIndex != null).length}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Game Flow Engine ─────────────────────────────────────────────────────────
// Builds an ordered list of enabled games from games_config.
// Each entry: { id, settings, difficulty }
// Returns [] if no games_config (backward compatible with old events).
const buildGameQueue = (gamesConfig) => {
  if (!gamesConfig) return [];
  return Object.entries(gamesConfig)
    .filter(([, cfg]) => cfg?.enabled)
    .sort(([, a], [, b]) => (a.order ?? 99) - (b.order ?? 99))
    .map(([id, cfg]) => ({ id, settings: cfg.settings || {}, difficulty: cfg.difficulty || 'medium' }));
};

// Renders the active game in the queue. Calls onAllComplete when queue is done.
const GameFlowEngine = ({ gamesConfig, theme, onAllComplete }) => {
  const queue = useMemo(() => buildGameQueue(gamesConfig), [gamesConfig]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allDone, setAllDone] = useState(false);

  // If no games enabled, complete immediately
  useEffect(() => {
    if (queue.length === 0) { onAllComplete(); }
  }, [queue.length, onAllComplete]);

  const advance = useCallback(() => {
    const next = currentIdx + 1;
    if (next >= queue.length) {
      setAllDone(true);
      setTimeout(onAllComplete, 800);
    } else {
      setCurrentIdx(next);
    }
  }, [currentIdx, queue.length, onAllComplete]);

  if (queue.length === 0 || allDone) return null;

  const current = queue[currentIdx];

  // Progress indicator
  const progress = queue.length > 1 ? (
    <div className="flex items-center justify-center gap-1.5 mb-4">
      {queue.map((g, i) => (
        <div key={g.id} className="rounded-full transition-all"
          style={{
            width: i === currentIdx ? 20 : 8, height: 8,
            backgroundColor: i < currentIdx ? theme.colors.primary
              : i === currentIdx ? theme.colors.primary + 'CC'
              : theme.colors.text + '20',
          }}
        />
      ))}
    </div>
  ) : null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35 }}
      >
        {progress}
        {current.id === 'balloon_pop' && (
          <BalloonPopGame settings={current.settings} difficulty={current.difficulty} theme={theme} onComplete={advance} />
        )}
        {current.id === 'lucky_gift' && (
          <LuckyGiftBox settings={current.settings} theme={theme} onComplete={advance} />
        )}
        {current.id === 'gift_hunt' && (
          <GiftHuntSkip onComplete={advance} />
        )}
        {current.id === 'catch_cake' && (
          <CatchTheCake settings={current.settings} difficulty={current.difficulty} theme={theme} onComplete={advance} />
        )}
        {current.id === 'cake_decoration' && (
          <CakeDecoration theme={theme} onComplete={advance} />
        )}
        {current.id === 'memory_match' && (
          <MemoryMatch settings={current.settings} difficulty={current.difficulty} theme={theme} onComplete={advance} />
        )}
        {current.id === 'birthday_quiz' && (
          <BirthdayQuiz settings={current.settings} theme={theme} onComplete={advance} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

const BirthdayWishStep = ({ theme, onWishMade }) => {
  const [wish, setWish] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!wish.trim()) return;
    setSubmitted(true);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: [theme.colors.primary, theme.colors.secondary, '#fff'] });
    setTimeout(() => onWishMade(wish.trim()), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl p-8 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${theme.colors.primary}18, ${theme.colors.secondary}12)`, border: `1.5px solid ${theme.colors.primary}40` }}
    >
      {/* Sparkle decorations */}
      {['top-3 right-4', 'bottom-4 left-3', 'top-1/2 right-2'].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} text-xl pointer-events-none`}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity }}
        >✨</motion.div>
      ))}

      <div className="text-center mb-6">
        <motion.div
          className="text-5xl mb-3"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >🌟</motion.div>
        <h3 className="font-heading text-2xl mb-2" style={{ color: theme.colors.primary }}>
          Make a Birthday Wish ✨
        </h3>
        <p className="text-sm" style={{ color: theme.colors.text + 'BB' }}>
          Before opening your surprise, make a birthday wish ✨
        </p>
      </div>

      {!submitted ? (
        <div className="space-y-4">
          <textarea
            value={wish}
            onChange={e => setWish(e.target.value)}
            placeholder="I wish for..."
            maxLength={200}
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={{
              backgroundColor: theme.colors.text + '10',
              border: `1px solid ${theme.colors.primary}40`,
              color: theme.colors.text,
              outline: 'none',
            }}
            aria-label="Birthday wish input"
          />
          <button
            onClick={handleSubmit}
            disabled={!wish.trim()}
            className="w-full py-3 rounded-xl font-bold transition-all disabled:opacity-40"
            style={{
              backgroundColor: wish.trim() ? theme.colors.primary : theme.colors.text + '20',
              color: wish.trim() ? theme.colors.background : theme.colors.text,
            }}
          >
            Make My Wish 🌟
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-4"
        >
          <div className="text-4xl mb-2">🌠</div>
          <p className="font-heading text-lg" style={{ color: theme.colors.primary }}>Wish sent to the stars!</p>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── GiftReveal ───────────────────────────────────────────────────────────────
const GiftReveal = ({ theme, onComplete }) => {
  const [stage, setStage] = useState('idle'); // idle | shaking | opening | done

  useEffect(() => {
    const t1 = setTimeout(() => setStage('shaking'), 300);
    const t2 = setTimeout(() => setStage('opening'), 1800);
    const t3 = setTimeout(() => {
      confetti({ particleCount: 250, spread: 180, origin: { y: 0.5 }, colors: [theme.colors.primary, theme.colors.secondary, '#fff', '#FFD700'] });
      setStage('done');
    }, 2800);
    const t4 = setTimeout(onComplete, 4200);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onComplete, theme.colors.primary, theme.colors.secondary]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ backgroundColor: theme.colors.background }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Glow ring */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 200, height: 200, background: `radial-gradient(circle, ${theme.colors.primary}40 0%, transparent 70%)` }}
        animate={stage !== 'idle' ? { scale: [1, 1.8, 1.2], opacity: [0.6, 1, 0.4] } : {}}
        transition={{ duration: 1.5, repeat: stage === 'done' ? 0 : Infinity }}
      />

      {/* Sparkle particles */}
      {stage !== 'idle' && ['top-1/4 left-1/4', 'top-1/3 right-1/4', 'bottom-1/3 left-1/3', 'bottom-1/4 right-1/3'].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} text-2xl pointer-events-none`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], rotate: [0, 180] }}
          transition={{ duration: 1, delay: i * 0.2, repeat: 2 }}
        >✨</motion.div>
      ))}

      {/* Gift box SVG */}
      <motion.div
        animate={
          stage === 'shaking' ? { rotate: [-8, 8, -8, 8, 0], y: [0, -5, 0] } :
          stage === 'opening' ? { scale: [1, 1.15, 0.95, 1.3], y: [0, -20, 0, -10] } :
          stage === 'done' ? { scale: 1.4, opacity: [1, 0] } : {}
        }
        transition={{ duration: stage === 'shaking' ? 1.2 : 0.6 }}
      >
        <svg width="120" height="130" viewBox="0 0 120 130" aria-label="Gift box">
          {/* Box */}
          <rect x="10" y="55" width="100" height="70" rx="6" fill={theme.colors.primary} />
          <rect x="10" y="45" width="100" height="20" rx="4" fill={theme.colors.accent || theme.colors.secondary} />
          {/* Ribbon vertical */}
          <rect x="53" y="45" width="14" height="80" rx="3" fill={theme.colors.secondary} opacity="0.8" />
          {/* Ribbon horizontal */}
          <rect x="10" y="52" width="100" height="13" rx="3" fill={theme.colors.secondary} opacity="0.8" />
          {/* Bow left */}
          <ellipse cx="38" cy="42" rx="22" ry="12" fill={theme.colors.secondary} transform="rotate(-30 38 42)" opacity="0.9" />
          {/* Bow right */}
          <ellipse cx="82" cy="42" rx="22" ry="12" fill={theme.colors.secondary} transform="rotate(30 82 42)" opacity="0.9" />
          {/* Bow center */}
          <circle cx="60" cy="45" r="8" fill={theme.colors.accent || theme.colors.primary} />
          {/* Glow lines */}
          <line x1="25" y1="70" x2="95" y2="70" stroke="white" strokeWidth="1.5" strokeOpacity="0.2" />
          <line x1="25" y1="90" x2="95" y2="90" stroke="white" strokeWidth="1.5" strokeOpacity="0.15" />
        </svg>
      </motion.div>

      <motion.p
        className="mt-8 font-heading text-2xl text-center px-6"
        style={{ color: theme.colors.primary }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: stage === 'done' ? 1 : 0, y: stage === 'done' ? 0 : 20 }}
        transition={{ duration: 0.5 }}
      >
        Your gifts are here! 🎁
      </motion.p>
    </motion.div>
  );
};

// ─── PolaroidGallery ──────────────────────────────────────────────────────────
const PolaroidGallery = ({ photos, theme, onComplete }) => {
  const [modalPhoto, setModalPhoto] = useState(null);
  const [modalIndex, setModalIndex] = useState(null);
  const [revealed, setRevealed] = useState([]);

  useEffect(() => {
    if (photos.length === 0) onComplete();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = photos.length;

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
    const idx = (modalIndex - 1 + total) % total;
    setModalIndex(idx);
    setModalPhoto(photos[idx].url);
  };
  const showNext = () => {
    const idx = (modalIndex + 1) % total;
    setModalIndex(idx);
    setModalPhoto(photos[idx].url);
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
                <img
                  src={photo.url}
                  alt=""
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
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
            {total > 1 && (
              <div className="w-full flex justify-end px-4 pt-4 shrink-0" onClick={e => e.stopPropagation()}>
                <span className="text-white/60 text-sm bg-black/40 px-3 py-1 rounded-full">{modalIndex + 1} / {total}</span>
              </div>
            )}
            <div className="flex-1 flex items-center justify-center w-full px-4 relative" onClick={e => e.stopPropagation()}>
              {total > 1 && (
                <button onClick={showPrev} className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl" aria-label="Previous photo">‹</button>
              )}
              <motion.img
                key={modalPhoto}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={modalPhoto}
                alt=""
                className="max-w-full max-h-[75vh] rounded-lg shadow-2xl object-contain"
                loading="lazy"
              />
              {total > 1 && (
                <button onClick={showNext} className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl" aria-label="Next photo">›</button>
              )}
            </div>
            <div className="w-full flex justify-center px-4 py-5 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setModalPhoto(null)}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm"
                style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                aria-label="Close photo viewer"
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

// ─── FlipCards ────────────────────────────────────────────────────────────────
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
            <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', position: 'absolute', inset: 0, backgroundColor: theme.colors.primary + '30', border: `1px solid ${theme.colors.primary}50`, borderRadius: '12px' }}
              className="flex items-center justify-center text-3xl">
              ❓
            </div>
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

// ─── WishRecall ───────────────────────────────────────────────────────────────
const WishRecall = ({ wish, theme, onComplete }) => {
  const [showMessage, setShowMessage] = useState(false);
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setShowMessage(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showMessage || !wish) return;
    let i = 0;
    const t = setInterval(() => {
      if (i <= wish.length) { setDisplayed(wish.slice(0, i)); i++; }
      else { clearInterval(t); setTimeout(onComplete, 1500); }
    }, 30);
    return () => clearInterval(t);
  }, [showMessage, wish, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-8 text-center"
      style={{ background: `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.secondary}10)`, border: `1.5px solid ${theme.colors.primary}40` }}
    >
      <motion.div
        className="text-4xl mb-4"
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >🌠</motion.div>
      <p className="text-sm mb-4" style={{ color: theme.colors.text + '99' }}>You wished for...</p>
      <AnimatePresence>
        {showMessage && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-heading text-xl leading-relaxed"
            style={{ color: theme.colors.primary, fontFamily: 'Dancing Script, cursive' }}
          >
            "{displayed}<span className="animate-pulse" style={{ color: theme.colors.primary }}>|</span>"
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── LoveLetter ───────────────────────────────────────────────────────────────
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

// ─── CompletionScreen ─────────────────────────────────────────────────────────
const milestones = [
  { icon: '🎂', label: 'Candles Blown' },
  { icon: '🔒', label: 'PIN Unlocked' },
  { icon: '💝', label: 'Cards Opened' },
  { icon: '🎈', label: 'Balloon Challenge Completed' },
  { icon: '🎁', label: 'Gift Opened' },
  { icon: '💌', label: 'Secret Message Revealed' },
  { icon: '🎬', label: 'Video Watched' },
  { icon: '🌟', label: 'Birthday Journey Completed' },
];

const CompletionScreen = ({ theme, hasPin, hasVideo }) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    confetti({ particleCount: 300, spread: 200, origin: { y: 0.4 }, colors: [theme.colors.primary, theme.colors.secondary, '#fff', '#FFD700'] });

    // Reveal milestones one by one
    let count = 0;
    const relevant = milestones.filter(m => {
      if (m.label === 'PIN Unlocked' && !hasPin) return false;
      if (m.label === 'Video Watched' && !hasVideo) return false;
      return true;
    });

    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= relevant.length) {
        clearInterval(interval);
        setTimeout(() => setShowMessage(true), 500);
      }
    }, 350);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const relevant = milestones.filter(m => {
    if (m.label === 'PIN Unlocked' && !hasPin) return false;
    if (m.label === 'Video Watched' && !hasVideo) return false;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl p-8 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.secondary}10)`, border: `1.5px solid ${theme.colors.primary}40` }}
    >
      {/* Floating balloons */}
      {['🎈', '🎉', '🎊', '✨'].map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl pointer-events-none"
          style={{ left: `${15 + i * 22}%`, top: -10 }}
          animate={{ y: [0, -20, 0], rotate: [-5, 5, -5] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
        >{emoji}</motion.div>
      ))}

      <div className="text-center mb-6">
        <motion.div
          className="text-6xl mb-3"
          animate={{ scale: [1, 1.15, 1], rotate: [-5, 5, -5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >🎉</motion.div>
        <h3 className="font-heading text-2xl" style={{ color: theme.colors.primary }}>Journey Complete!</h3>
      </div>

      {/* Progress milestones */}
      <div className="space-y-3 mb-6">
        {relevant.map((m, i) => (
          <AnimatePresence key={m.label}>
            {i < visibleCount && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 py-2 px-4 rounded-xl"
                style={{ backgroundColor: theme.colors.primary + '15' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Check className="w-4 h-4" style={{ color: theme.colors.background }} />
                </div>
                <span className="text-sm font-medium" style={{ color: theme.colors.text }}>{m.icon} {m.label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Final message */}
      <AnimatePresence>
        {showMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center rounded-xl p-4"
            style={{ backgroundColor: theme.colors.primary + '20', border: `1px solid ${theme.colors.primary}30` }}
          >
            <p className="font-heading text-lg" style={{ color: theme.colors.primary }}>
              Thank you for being part of this special birthday journey 🎉
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── HeartsCanvas ─────────────────────────────────────────────────────────────
const HeartsCanvas = ({ color }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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

// ─── MusicPlayer ──────────────────────────────────────────────────────────────
const MusicPlayer = ({ songUrl, theme }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    startedRef.current = false;
    audio.volume = 0;
    const play = () => {
      audio.play().then(() => {
        setIsPlaying(true);
        startedRef.current = true;
        let v = 0;
        const t = setInterval(() => {
          v = Math.min(1, v + 0.05);
          if (audio) audio.volume = v;
          if (v >= 1) clearInterval(t);
        }, 100);
      }).catch(() => {});
    };
    const t = setTimeout(play, 300);
    return () => clearTimeout(t);
  }, [songUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(audio.duration || 0);
    const onTime = () => { if (startedRef.current && duration > 0) setProgress((audio.currentTime / duration) * 100 || 0); };
    const onEnd = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().catch(() => {}); setIsPlaying(true); }
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
      <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }} data-testid="music-play-btn" aria-label={isPlaying ? 'Pause music' : 'Play music'}>
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <Slider value={[Math.min(100, Math.max(0, progress))]} onValueChange={handleSeek} max={100} step={0.1} className="flex-1 cursor-pointer" />
      <button onClick={toggleMute} className="shrink-0" style={{ color: theme.colors.text }} data-testid="music-mute-btn" aria-label={isMuted ? 'Unmute' : 'Mute'}>
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
};

// ─── FeedbackCard ─────────────────────────────────────────────────────────────
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
      <div className="flex justify-center gap-3 mb-5">
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => setStars(s)} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
            className="text-4xl transition-transform active:scale-90"
            style={{ transform: (hovered || stars) >= s ? 'scale(1.15)' : 'scale(1)' }}>
            <span style={{ filter: (hovered || stars) >= s ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
          </button>
        ))}
      </div>
      <textarea value={message} onChange={e => setMessage(e.target.value)}
        placeholder="Share your thoughts... (optional)" maxLength={500} rows={3}
        className="w-full rounded-xl px-4 py-3 text-sm resize-none mb-4"
        style={{ backgroundColor: theme.colors.text + '10', border: `1px solid ${theme.colors.text}20`, color: theme.colors.text, outline: 'none' }} />
      <button onClick={submit} disabled={!stars || submitting}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
        style={{ backgroundColor: stars ? theme.colors.primary : theme.colors.text + '20', color: stars ? theme.colors.background : theme.colors.text }}>
        {submitting ? 'Sending...' : stars ? `Submit ${stars}★ Feedback` : 'Select stars to submit'}
      </button>
    </div>
  );
};

// ─── SpecialNote ──────────────────────────────────────────────────────────────
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

// ─── Main CelebrationExperience ───────────────────────────────────────────────
const CelebrationExperience = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const alreadyBlown = sessionStorage.getItem(`candles_${eventId}`) === 'true';
  const alreadyUnlocked = sessionStorage.getItem(`unlocked_${eventId}`) === 'true';

  const [unlocked, setUnlocked] = useState(alreadyUnlocked);
  const [songEnabled, setSongEnabled] = useState(alreadyUnlocked);
  const [phase, setPhase] = useState(alreadyBlown ? 'scroll' : 'envelope');
  const [candlesBlown, setCandlesBlown] = useState(alreadyBlown);
  // Games: gamesComplete gates the wish/gift flow that follows
  const [gamesComplete, setGamesComplete] = useState(false);

  // Re-evaluate gamesComplete when event loads (handles events with no games_config)
  useEffect(() => {
    if (event && (!event.games_config || Object.values(event.games_config).every(g => !g?.enabled))) {
      setGamesComplete(true);
    }
  }, [event]);

  // Legacy: if no games_config, treat balloon-pop completion as gamesComplete
  // (the GameFlowEngine handles this natively via buildGameQueue returning [])

  // New: wish flow
  const [birthdayWish, setBirthdayWish] = useState('');
  const [wishComplete, setWishComplete] = useState(false);
  const [giftRevealed, setGiftRevealed] = useState(false);

  // Renamed: giftsComplete → rewardsComplete to track gallery
  const [rewardsComplete, setRewardsComplete] = useState(false);

  // Wish recall & completion
  const [wishRecallComplete, setWishRecallComplete] = useState(false);
  const [journeyComplete, setJourneyComplete] = useState(false);

  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggDismissed, setEasterEggDismissed] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef(null);

  const theme = event ? getTheme(event.theme) : getTheme('royal_gold');

  // Auto-advance wish recall when no wish was made
  useEffect(() => {
    if (rewardsComplete && !birthdayWish && !wishRecallComplete) {
      setWishRecallComplete(true);
    }
  }, [rewardsComplete, birthdayWish, wishRecallComplete]);

  // Easter egg auto-show after journey complete
  useEffect(() => {
    if (rewardsComplete && event?.easter_egg_message && !easterEggDismissed) {
      const t = setTimeout(() => {
        setShowEasterEgg(true);
        confetti({ particleCount: 200, spread: 180, colors: ['#D4AF37', '#FFD700', '#FFF8DC'] });
      }, event?.special_note ? 4000 : 1000);
      return () => clearTimeout(t);
    }
  }, [rewardsComplete, event, easterEggDismissed]);

  useEffect(() => {
    axios.get(`${API}/events/${eventId}`)
      .then(r => {
        setEvent(r.data);
        if (!r.data.lock_pin || alreadyUnlocked) setSongEnabled(true);
      })
      .catch(() => { toast.error('Event not found'); navigate('/'); })
      .finally(() => setLoading(false));
  }, [eventId, navigate, alreadyUnlocked]);

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

  // Derived: giftsComplete (old name) = rewardsComplete, for backward-compat with end-screen visibility
  const giftsComplete = rewardsComplete;

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: theme.colors.background }}>

      {/* Music */}
      {event?.song_url && songEnabled && (
        <div className="fixed top-0 left-0 right-0 z-40 p-3 backdrop-blur" style={{ backgroundColor: theme.colors.background + 'CC' }}>
          <MusicPlayer songUrl={event.song_url} theme={theme} />
        </div>
      )}

      {/* Auth bar */}
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

      {/* Envelope phase */}
      <AnimatePresence>
        {phase === 'envelope' && (
          <motion.div key="envelope" exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex flex-col items-center justify-center z-50 px-6"
            style={{ backgroundColor: theme.colors.background }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              <motion.div className="text-8xl mb-8 cursor-pointer select-none"
                animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}
                onClick={() => setPhase('voiceTimer')}>💌</motion.div>
              <h2 className="font-heading text-2xl mb-3" style={{ color: theme.colors.text }}>You have a special message</h2>
              <p className="text-sm mb-8" style={{ color: theme.colors.text + '80' }}>Tap the envelope to open</p>
              <Button onClick={() => setPhase('voiceTimer')} className="btn-gold px-8 py-4 rounded-full text-lg">
                Open ✨
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VoiceTimer phase */}
      <AnimatePresence>
        {phase === 'voiceTimer' && (
          <motion.div key="voice" exit={{ opacity: 0 }}>
            <VoiceTimer voiceUrl={event?.voice_message_url} theme={theme} onComplete={() => setPhase('cake')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cake phase */}
      {phase === 'cake' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 flex flex-col items-center justify-center z-40"
          style={{ backgroundColor: theme.colors.background }}>
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
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="font-heading text-4xl mb-2 text-center px-4"
            style={{ color: theme.colors.primary }} onClick={handleTitleTap}>
            {getGreeting()}
          </motion.h1>
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="font-heading text-3xl mb-8 text-center"
            style={{ color: theme.colors.text || '#fff' }}>
            {event?.person_name}!
          </motion.h2>
          <InteractiveCake theme={theme} candlesBlown={candlesBlown} onBlowComplete={handleBlowComplete} />
        </motion.div>
      )}

      {/* Scroll phase — the full journey */}
      {phase === 'scroll' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
          <HeartsCanvas color={theme.colors.primary} />

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

            {/* ── Game Flow Engine: renders all enabled games in order ── */}
            {!gamesComplete && (
              <div>
                <h3 className="font-heading text-xl mb-4 text-center" style={{ color: theme.colors.text || '#fff' }}>🎮 Time to Play!</h3>
                <GameFlowEngine
                  gamesConfig={event?.games_config}
                  theme={theme}
                  onAllComplete={() => setGamesComplete(true)}
                />
              </div>
            )}

            {/* ── Birthday Wish Step (after all games, before gift reveal) ── */}
            <AnimatePresence>
              {gamesComplete && !wishComplete && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <BirthdayWishStep
                    theme={theme}
                    onWishMade={(w) => {
                      setBirthdayWish(w);
                      setWishComplete(true);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── NEW: Gift Reveal (after wish, before reward gallery) ── */}
            <AnimatePresence>
              {wishComplete && !giftRevealed && (
                <GiftReveal
                  theme={theme}
                  onComplete={() => setGiftRevealed(true)}
                />
              )}
            </AnimatePresence>

            {/* Rewards / Photo Gallery (unlocked after gift reveal) */}
            <AnimatePresence>
              {giftRevealed && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="rounded-xl p-4 mb-4 text-center" style={{ backgroundColor: theme.colors.primary + '15', border: `1px solid ${theme.colors.primary}40` }}>
                    <Award className="w-8 h-8 mx-auto mb-2" style={{ color: theme.colors.primary }} />
                    <p className="font-heading text-lg" style={{ color: theme.colors.primary }}>Reward Unlocked! Open your gifts 🎁</p>
                  </div>
                  <PolaroidGallery
                    theme={theme}
                    photos={event?.photos || []}
                    onComplete={() => setRewardsComplete(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── NEW: Wish Recall (before Secret Message) ── */}
            <AnimatePresence>
              {rewardsComplete && birthdayWish && !wishRecallComplete && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <WishRecall
                    wish={birthdayWish}
                    theme={theme}
                    onComplete={() => setWishRecallComplete(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>



            {/* Love Letter / Secret Message */}
            <AnimatePresence>
              {(wishRecallComplete || (rewardsComplete && !birthdayWish)) && event?.special_note && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <LoveLetter note={event.special_note} theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video */}
            <AnimatePresence>
              {giftsComplete && event?.video_url && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="glass rounded-xl overflow-hidden">
                    <p className="text-center text-xs py-2" style={{ color: theme.colors.primary + '99' }}>🎵 Background music continues while video plays</p>
                    <video src={event.video_url} controls muted className="w-full rounded-xl" style={{ maxHeight: '400px' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── NEW: Completion Screen (after video / after final content) ── */}
            <AnimatePresence>
              {giftsComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: event?.video_url ? 2 : 0.5 }}
                  onAnimationComplete={() => setTimeout(() => setJourneyComplete(true), 5000)}
                >
                  <CompletionScreen
                    theme={theme}
                    hasPin={!!event?.lock_pin}
                    hasVideo={!!event?.video_url}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* End Screen — Try Yours */}
            <AnimatePresence>
              {journeyComplete && (
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-center py-10">
                  <div className="rounded-2xl p-8" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.secondary}10)`, border: `1px solid ${theme.colors.primary}30` }}>
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl mb-4">✨</motion.div>
                    <h3 className="font-heading text-2xl mb-2" style={{ color: theme.colors.primary }}>Loved this experience?</h3>
                    <p className="text-sm mb-6" style={{ color: theme.colors.text + '99' }}>Create your own magical celebration for someone special</p>
                    <button onClick={() => navigate('/create')}
                      className="px-8 py-3 rounded-full font-bold text-sm mb-4 block w-full"
                      style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}>
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
              {journeyComplete && (
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
            onClick={() => setShowEasterEgg(false)}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="rounded-2xl p-8 max-w-md w-full text-center"
              style={{ backgroundColor: theme.colors.background, border: `2px solid ${theme.colors.primary}50` }}
              onClick={e => e.stopPropagation()}>
              <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: theme.colors.primary }} />
              <h3 className="font-heading text-2xl mb-4" style={{ color: theme.colors.primary }}>Secret Message! 🤫</h3>
              <p className="text-lg" style={{ color: theme.colors.text }}>{event?.easter_egg_message}</p>
              <Button onClick={() => { setShowEasterEgg(false); setEasterEggDismissed(true); }}
                className="mt-6" style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
                data-testid="close-easter-egg-btn">
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
