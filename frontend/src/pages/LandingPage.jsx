import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Gift, Heart, Camera, QrCode, Cake, Music, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const features = [
    { icon: Cake, title: 'Interactive Cake', desc: 'Blow out candles with a tap' },
    { icon: Camera, title: 'Photo Gallery', desc: 'Beautiful slideshow memories' },
    { icon: Music, title: 'Music Player', desc: 'Add your special song' },
    { icon: Gift, title: 'Mini Games', desc: 'Pop balloons & open gifts' },
    { icon: Heart, title: '12 Themes', desc: 'Perfect for any occasion' },
    { icon: QrCode, title: 'QR Sharing', desc: 'Share the magic instantly' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1F] overflow-hidden relative">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#D4AF37] rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              opacity: 0.3
            }}
            animate={{ 
              y: [null, Math.random() * -200],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{ 
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo/Brand */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 mb-8"
        >
          <Sparkles className="w-10 h-10 text-[#D4AF37]" />
          <span className="font-heading text-2xl sm:text-3xl text-white tracking-wide">
            Celebration QR
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-heading text-4xl sm:text-5xl lg:text-7xl text-center text-white mb-6 leading-tight"
        >
          Create <span className="text-[#D4AF37]">Magical</span>
          <br />
          Celebrations
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-[#94A3B8] text-base sm:text-lg text-center max-w-xl mb-10 px-4"
        >
          Transform birthdays, anniversaries & special moments into 
          cinematic digital experiences. Share via QR code.
        </motion.p>

        {/* CTA Buttons */}
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

        {/* Floating celebration image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-16 relative"
        >
          <div className="relative w-72 h-72 sm:w-96 sm:h-96">
            <motion.img
              src={process.env.REACT_APP_CELEBRATION_IMAGE}
              alt="Celebration"
              className="w-full h-full object-contain float"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1F] via-transparent to-transparent" />
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20 px-4">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-heading text-3xl sm:text-4xl text-center text-white mb-16"
        >
          Everything You Need
        </motion.h2>

        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6 text-center hover:border-[#D4AF37]/30 transition-all duration-300"
            >
              <feature.icon className="w-10 h-10 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="font-heading text-lg text-white mb-2">{feature.title}</h3>
              <p className="text-[#94A3B8] text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="relative z-10 py-20 px-4 bg-[#131B2F]/50">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-heading text-3xl sm:text-4xl text-center text-white mb-16"
        >
          How It Works
        </motion.h2>

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          {[
            { num: '01', title: 'Create', desc: 'Add photos, music & messages' },
            { num: '02', title: 'Generate', desc: 'Get your unique QR code' },
            { num: '03', title: 'Share', desc: 'Send the magic to loved ones' },
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

      {/* Footer CTA */}
      <div className="relative z-10 py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto glass rounded-3xl p-10"
        >
          <Sparkles className="w-12 h-12 text-[#D4AF37] mx-auto mb-6" />
          <h2 className="font-heading text-2xl sm:text-3xl text-white mb-4">
            Ready to Create Something Special?
          </h2>
          <p className="text-[#94A3B8] mb-8">
            Make your loved ones feel extraordinary with a personalized celebration experience.
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
            Built by Sudhanshu Kumar
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
