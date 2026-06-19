import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Gift, Camera, QrCode, Cake, Music, PartyPopper,
  LogIn, UserPlus, LayoutDashboard, LogOut, Lock, Wand2,
  FlipHorizontal, Video, MessageSquare, Star, Heart, Gamepad2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, token, logout, isAdmin } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const features = [
    { icon: Cake,           title: 'Blow Candles',       desc: 'Interactive cake with candle blowing' },
    { icon: Lock,           title: 'Secret PIN Unlock',  desc: 'Protect with a 4-digit secret PIN' },
    { icon: FlipHorizontal, title: 'Memory Flip Cards',  desc: '6 reasons why they are special' },
    { icon: Gamepad2,       title: 'Interactive Games',  desc: 'Multiple birthday mini-games' },
    { icon: Sparkles,       title: 'Make A Wish',        desc: 'Type a birthday wish before the reveal' },
    { icon: Gift,           title: 'Gift Reveal',        desc: 'Animated gift box opening moment' },
    { icon: Camera,         title: 'Reward Gallery',     desc: 'Polaroid-style photo gallery unlock' },
    { icon: MessageSquare,  title: 'Secret Message',     desc: 'Heartfelt typewriter love letter' },
    { icon: Video,          title: 'Video Surprise',     desc: 'Play a personal video message' },
    { icon: Wand2,          title: 'Multiple Themes',    desc: '50 premium themes for every occasion' },
  ];

  const games = [
    { emoji: '🎈', title: 'Balloon Pop',    desc: 'Pop all balloons to unlock rewards' },
    { emoji: '🎁', title: 'Lucky Gift Box', desc: 'Find the winning gift box surprise' },
    { emoji: '🎂', title: 'Catch The Cake', desc: 'Catch falling cakes with your basket' },
    { emoji: '🍰', title: 'Cake Decoration',desc: 'Drag & drop decorations on the cake' },
    { emoji: '🧠', title: 'Memory Match',   desc: 'Match pairs of birthday cards' },
    { emoji: '❓', title: 'Birthday Quiz',  desc: 'Answer fun questions about the birthday person' },
  ];

  const journey = [
    { emoji: '🎂', label: 'Blow Candles' },
    { emoji: '🔐', label: 'Enter PIN' },
    { emoji: '🃏', label: 'Open Memory Cards' },
    { emoji: '🎮', label: 'Play Games' },
    { emoji: '✨', label: 'Make A Wish' },
    { emoji: '🎁', label: 'Open Gift' },
    { emoji: '📸', label: 'View Memories' },
    { emoji: '💌', label: 'Read Secret Message' },
    { emoji: '🎥', label: 'Watch Video' },
  ];

  const highlights = [
    { icon: Star,        value: '6',  label: 'Interactive Games' },
    { icon: Camera,      value: '📸', label: 'Photo Memories',    isEmoji: true },
    { icon: Music,       value: '🎵', label: 'Background Music',  isEmoji: true },
    { icon: Video,       value: '🎥', label: 'Video Surprises',   isEmoji: true },
    { icon: Lock,        value: '🔐', label: 'Secret PIN',        isEmoji: true },
    { icon: Wand2,       value: '50', label: 'Premium Themes' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1F] overflow-hidden relative">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 backdrop-blur-md" style={{ backgroundColor: 'rgba(10,15,31,0.85)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#D4AF37]" />
          <span className="font-heading text-white text-lg">Celebration QR</span>
        </div>
        <div className="flex items-center gap-2">
          {token ? (
            <>
              <span className="text-[#94A3B8] text-sm hidden sm:block">Hi, {user?.name?.split(' ')[0]}</span>
              <Button size="sm" onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')} className="bg-white/10 hover:bg-white/20 text-white">
                <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
              </Button>
              <Button size="sm" onClick={() => logout()} variant="outline" className="border-white/10 text-white hover:bg-white/5">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => navigate('/login')} variant="outline" className="border-white/10 text-white hover:bg-white/5">
                <LogIn className="w-4 h-4 mr-1" /> Sign In
              </Button>
              <Button size="sm" onClick={() => navigate('/login?mode=register')} className="btn-gold">
                <UserPlus className="w-4 h-4 mr-1" /> Sign Up
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#D4AF37] rounded-full"
            initial={{ x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800), y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600), opacity: 0.3 }}
            animate={{ y: [null, Math.random() * -200], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, repeatType: 'reverse' }}
          />
        ))}
      </div>

      {/* ── Hero Section ── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12 pt-24">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 mb-8"
        >
          <Sparkles className="w-10 h-10 text-[#D4AF37]" />
          <span className="font-heading text-2xl sm:text-3xl text-white tracking-wide">Celebration QR</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-heading text-4xl sm:text-5xl lg:text-7xl text-center text-white mb-6 leading-tight"
        >
          Create Interactive<br />
          <span className="text-[#D4AF37]">Birthday Surprise</span> Websites
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-[#94A3B8] text-base sm:text-lg text-center max-w-2xl mb-10 px-4"
        >
          Photos, games, music, videos, secret messages, rewards, and unforgettable birthday experiences — all in one QR code.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button
            data-testid="create-celebration-btn"
            onClick={() => navigate('/create')}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="btn-gold px-8 py-6 text-lg rounded-full flex items-center gap-2 gold-glow-hover"
          >
            <PartyPopper className="w-5 h-5" />
            Create Celebration
          </Button>
          <Button
            data-testid="view-dashboard-btn"
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="px-8 py-6 text-lg rounded-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            View My Events
          </Button>
        </motion.div>

        {/* Floating badge strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 flex flex-wrap justify-center gap-3 max-w-xl"
        >
          {['🎂 Candles', '🎮 Games', '📸 Photos', '🎵 Music', '🎥 Video', '🔐 PIN Lock'].map((tag) => (
            <span key={tag} className="glass px-4 py-2 rounded-full text-sm text-[#D4AF37] border border-[#D4AF37]/20">
              {tag}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── Features Section ── */}
      <div className="relative z-10 py-20 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4">Everything In One Experience</h2>
          <p className="text-[#94A3B8] text-sm max-w-lg mx-auto">Every celebration comes packed with interactive moments designed to delight.</p>
        </motion.div>

        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              className="glass rounded-2xl p-5 text-center hover:border-[#D4AF37]/40 transition-all duration-300 hover:-translate-y-1"
            >
              <feature.icon className="w-8 h-8 text-[#D4AF37] mx-auto mb-3" />
              <h3 className="font-heading text-sm text-white mb-1">{feature.title}</h3>
              <p className="text-[#94A3B8] text-xs">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Games Showcase Section ── */}
      <div className="relative z-10 py-20 px-4 bg-[#131B2F]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4">Interactive Birthday Games</h2>
          <p className="text-[#94A3B8] text-sm max-w-lg mx-auto">Six unique games to make every birthday celebration unforgettable.</p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-5">
          {games.map((game, index) => (
            <motion.div
              key={game.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.04, y: -4 }}
              className="glass rounded-2xl p-6 text-center cursor-default border border-white/5 hover:border-[#D4AF37]/30 transition-all duration-300"
            >
              <motion.div
                className="text-4xl mb-3"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3 + index * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {game.emoji}
              </motion.div>
              <h3 className="font-heading text-base text-white mb-2">{game.title}</h3>
              <p className="text-[#94A3B8] text-xs">{game.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Journey Preview Section ── */}
      <div className="relative z-10 py-20 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4">How The Birthday Journey Works</h2>
          <p className="text-[#94A3B8] text-sm max-w-lg mx-auto">A cinematic step-by-step experience from scan to surprise.</p>
        </motion.div>

        <div className="max-w-sm mx-auto">
          {journey.map((step, index) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="flex items-center gap-4"
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center glass border border-[#D4AF37]/30 text-xl gold-glow shrink-0">
                  {step.emoji}
                </div>
                {index < journey.length - 1 && (
                  <div className="w-px h-8 bg-gradient-to-b from-[#D4AF37]/40 to-transparent mt-1" />
                )}
              </div>
              <p className="font-heading text-white text-base pb-8">{step.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Product Highlights Section ── */}
      <div className="relative z-10 py-20 px-4 bg-[#131B2F]/50">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4">Everything You Get</h2>
          <p className="text-[#94A3B8] text-sm max-w-lg mx-auto">One link, endless surprises.</p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-5">
          {[
            { emoji: '⭐', value: '6', label: 'Interactive Games' },
            { emoji: '📸', value: '10', label: 'Photo Memories' },
            { emoji: '🎵', value: '1', label: 'Background Music Track' },
            { emoji: '🎥', value: '1', label: 'Video Surprise' },
            { emoji: '🔐', value: '1', label: 'Secret PIN Protection' },
            { emoji: '🎨', value: '50', label: 'Premium Themes' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6 text-center hover:border-[#D4AF37]/30 transition-all"
            >
              <div className="text-3xl mb-2">{item.emoji}</div>
              <div className="font-heading text-3xl text-[#D4AF37] mb-1">{item.value}</div>
              <p className="text-[#94A3B8] text-xs">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="relative z-10 py-20 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4">How It Works</h2>
        </motion.div>

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          {[
            { num: '01', title: 'Create Your Celebration',  desc: 'Upload photos, music, messages, themes and games.' },
            { num: '02', title: 'Generate QR Code',         desc: 'Instantly create your personalized celebration page.' },
            { num: '03', title: 'Share & Surprise',         desc: 'Send the QR code and let them experience the journey.' },
          ].map((step, index) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="text-center flex-1"
            >
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4 gold-glow">
                <span className="font-heading text-2xl text-[#D4AF37]">{step.num}</span>
              </div>
              <h3 className="font-heading text-xl text-white mb-2">{step.title}</h3>
              <p className="text-[#94A3B8] text-sm">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div className="relative z-10 py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto glass rounded-3xl p-10"
        >
          <Sparkles className="w-12 h-12 text-[#D4AF37] mx-auto mb-6" />
          <h2 className="font-heading text-2xl sm:text-3xl text-white mb-4">
            Ready To Create An Unforgettable Birthday Experience?
          </h2>
          <p className="text-[#94A3B8] mb-8">
            Create interactive celebrations with games, memories, music, videos and surprises.
          </p>
          <Button
            data-testid="footer-create-btn"
            onClick={() => navigate('/create')}
            className="btn-gold px-10 py-6 text-lg rounded-full gold-glow-hover"
          >
            Start Creating Now
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-white font-heading">Celebration QR</span>
          </div>
          <p className="text-[#94A3B8] text-sm">
            Created by <span className="text-[#D4AF37]">Sudhanshu Kumar</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
