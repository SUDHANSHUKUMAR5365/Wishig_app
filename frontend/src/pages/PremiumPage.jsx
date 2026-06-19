import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Check, Sparkles, Upload, Loader2, Image, Clock, X, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '@/lib/auth';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLANS = [
  { id: '1month',   label: '1 Month',   price: '₹99',   popular: false },
  { id: '6months',  label: '6 Months',  price: '₹499',  popular: true  },
  { id: '1year',    label: '1 Year',    price: '₹799',  popular: false },
  { id: '5years',   label: '5 Years',   price: '₹2499', popular: false },
  { id: 'lifetime', label: 'Lifetime',  price: '₹3999', popular: false },
];

const BENEFITS = [
  '25 Photos per celebration',
  'Up to 3 Videos',
  'All Themes (including future)',
  'All Games (including future)',
  'Premium Badge on your profile',
  'Future Premium Features',
];

const STATUS_CONFIG = {
  pending:  { label: 'Pending Review',  color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', icon: '⏳' },
  approved: { label: 'Approved',        color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',   icon: '✅' },
  rejected: { label: 'Rejected',        color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',       icon: '❌' },
};

const PremiumPage = () => {
  const navigate = useNavigate();
  const { token, user, isPremium } = useAuth();
  const screenshotInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1=plan, 2=pay, 3=upload, 4=done
  const [selectedPlan, setSelectedPlan] = useState('6months');
  const [qrUrl, setQrUrl] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    // Load payment QR URL
    axios.get(`${API}/settings/payment-qr`)
      .then(r => setQrUrl(r.data.url || '/qrcode_upi.jpeg'))
      .catch(() => setQrUrl('/qrcode_upi.jpeg'));

    // Load user's past requests
    axios.get(`${API}/payment-requests/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setMyRequests(r.data))
      .catch(() => {})
      .finally(() => setLoadingRequests(false));
  }, [token]);

  const hasPending = myRequests.some(r => r.status === 'pending');

  const uploadScreenshot = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      // Get upload signature
      const { data: sig } = await axios.get(`${API}/upload/signature`, {
        params: { folder: 'photos' },
        headers: { Authorization: `Bearer ${token}` },
      });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sig.api_key);
      fd.append('timestamp', sig.timestamp);
      fd.append('signature', sig.signature);
      fd.append('folder', sig.folder);
      const { data } = await axios.post(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setScreenshotUrl(data.secure_url);
      toast.success('Screenshot uploaded!');
    } catch {
      toast.error('Failed to upload screenshot');
    } finally {
      setUploading(false);
    }
  };

  const submitRequest = async () => {
    if (!screenshotUrl) { toast.error('Please upload your payment screenshot first'); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/payment-requests`,
        { plan_type: selectedPlan, screenshot_url: screenshotUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyRequests(prev => [res.data, ...prev]);
      setStep(4);
      toast.success('Payment request submitted!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const planLabel = PLANS.find(p => p.id === selectedPlan)?.label || '';

  return (
    <div className="min-h-screen bg-[#0A0F1F] py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="text-[#94A3B8] hover:text-white flex items-center gap-1">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
        </div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h1 className="font-heading text-3xl text-white mb-2">Upgrade to Premium</h1>
          <p className="text-[#94A3B8] text-sm">Unlock the full Celebration QR experience</p>
          {isPremium && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40">
              <Check className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-sm font-bold">You are already Premium!</span>
            </div>
          )}
        </motion.div>

        {/* Benefits */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-5 mb-6">
          <p className="text-white font-medium mb-3 text-sm">What you get with Premium:</p>
          <div className="space-y-2">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#D4AF37]" />
                </div>
                <span className="text-[#94A3B8] text-sm">{b}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Past Requests Status */}
        {!loadingRequests && myRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5 mb-6">
            <p className="text-white font-medium mb-3 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#94A3B8]" /> Your Payment Requests
            </p>
            <div className="space-y-3">
              {myRequests.map(req => {
                const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                return (
                  <div key={req.id} className={`rounded-xl p-3 border ${cfg.bg}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">
                          {PLANS.find(p => p.id === req.plan_type)?.label || req.plan_type}
                        </p>
                        <p className="text-[#94A3B8] text-xs mt-0.5">
                          {format(new Date(req.created_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                      <span className={`text-sm font-bold flex items-center gap-1 ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    {req.screenshot_url && (
                      <a href={req.screenshot_url} target="_blank" rel="noreferrer"
                        className="mt-2 text-xs text-[#D4AF37] hover:underline flex items-center gap-1">
                        <Image className="w-3 h-3" /> View Screenshot
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Block new submission if already premium or has pending */}
        {isPremium ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-6 text-center">
            <Sparkles className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" />
            <p className="text-white font-heading text-xl mb-2">You're all set!</p>
            <p className="text-[#94A3B8] text-sm mb-4">You already have Premium access. Enjoy all features!</p>
            <Button onClick={() => navigate('/dashboard')} className="btn-gold">Go to Dashboard</Button>
          </motion.div>
        ) : hasPending ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-6 text-center">
            <Clock className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <p className="text-white font-heading text-xl mb-2">Request Under Review</p>
            <p className="text-[#94A3B8] text-sm mb-4">
              Your payment is being verified. You'll be notified once it's approved.
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-white/10 text-white">
              Back to Dashboard
            </Button>
          </motion.div>
        ) : step === 4 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <p className="font-heading text-2xl text-white mb-2">Request Submitted!</p>
            <p className="text-[#94A3B8] text-sm mb-6">
              We'll verify your payment and activate Premium within a few hours.
              You'll receive a notification once approved.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="btn-gold w-full">
              Go to Dashboard
            </Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="space-y-6">

            {/* Step indicator */}
            <div className="flex items-center justify-between mb-2">
              {['Select Plan', 'Scan & Pay', 'Upload Proof'].map((label, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 transition-all ${
                    step > i + 1 ? 'bg-green-500 text-white' :
                    step === i + 1 ? 'bg-[#D4AF37] text-[#0A0F1F]' :
                    'bg-white/10 text-[#94A3B8]'
                  }`}>
                    {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs ${step === i + 1 ? 'text-[#D4AF37]' : 'text-[#94A3B8]'}`}>{label}</span>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* Step 1: Select Plan */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="glass rounded-2xl p-5">
                  <p className="text-white font-medium mb-4">Choose your plan:</p>
                  <div className="space-y-3">
                    {PLANS.map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                          selectedPlan === plan.id
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                            : 'border-white/10 bg-white/3 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedPlan === plan.id ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/30'
                          }`}>
                            {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-[#0A0F1F]" />}
                          </div>
                          <span className="text-white font-medium">{plan.label}</span>
                          {plan.popular && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                              Popular
                            </span>
                          )}
                        </div>
                        <span className={`font-bold text-lg ${selectedPlan === plan.id ? 'text-[#D4AF37]' : 'text-white'}`}>
                          {plan.price}
                        </span>
                      </button>
                    ))}
                  </div>
                  <Button onClick={() => setStep(2)} className="btn-gold w-full mt-5">
                    Continue to Payment →
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Scan & Pay */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white font-medium">Scan QR & Pay</p>
                    <span className="text-[#D4AF37] font-bold text-sm bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/30">
                      {PLANS.find(p => p.id === selectedPlan)?.label} — {PLANS.find(p => p.id === selectedPlan)?.price}
                    </span>
                  </div>

                  {/* Payment QR */}
                  <div className="flex flex-col items-center mb-5">
                    <div className="bg-white p-4 rounded-2xl shadow-2xl mb-3">
                      {qrUrl ? (
                        <img
                          src={qrUrl}
                          alt="UPI Payment QR"
                          className="w-52 h-52 object-contain"
                          onError={e => { e.target.onerror = null; e.target.src = '/qrcode_upi.jpeg'; }}
                        />
                      ) : (
                        <div className="w-52 h-52 flex items-center justify-center bg-gray-100 rounded-xl">
                          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-[#94A3B8] text-xs text-center">
                      Scan this QR with any UPI app (GPay, PhonePe, Paytm, etc.)
                    </p>
                    <p className="text-white text-sm font-bold mt-1">
                      Pay {PLANS.find(p => p.id === selectedPlan)?.price}
                    </p>
                  </div>

                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-3 mb-5">
                    <p className="text-[#D4AF37] text-xs font-medium mb-1">📌 Important</p>
                    <p className="text-[#94A3B8] text-xs">
                      After paying, take a screenshot of the payment confirmation and upload it in the next step.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-white/10 text-white">
                      ← Back
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex-1 btn-gold">
                      I've Paid →
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Upload Screenshot */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="glass rounded-2xl p-5">
                  <p className="text-white font-medium mb-1">Upload Payment Screenshot</p>
                  <p className="text-[#94A3B8] text-xs mb-4">
                    Upload a screenshot showing the successful payment for{' '}
                    <span className="text-[#D4AF37] font-medium">{planLabel} — {PLANS.find(p => p.id === selectedPlan)?.price}</span>
                  </p>

                  {/* Upload area */}
                  {!screenshotUrl ? (
                    <div
                      onClick={() => screenshotInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors mb-4"
                    >
                      {uploading ? (
                        <Loader2 className="w-10 h-10 text-[#D4AF37] mx-auto animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
                          <p className="text-white text-sm mb-1">Tap to upload screenshot</p>
                          <p className="text-[#94A3B8] text-xs">PNG, JPG supported</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="relative mb-4 rounded-xl overflow-hidden border border-[#D4AF37]/30">
                      <img src={screenshotUrl} alt="Payment proof" className="w-full max-h-60 object-contain bg-black/40" />
                      <button
                        onClick={() => setScreenshotUrl('')}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                        <Check className="w-3 h-3" /> Uploaded
                      </div>
                    </div>
                  )}

                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    onChange={uploadScreenshot}
                    className="hidden"
                  />

                  <div className="flex gap-3">
                    <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-white/10 text-white">
                      ← Back
                    </Button>
                    <Button
                      onClick={submitRequest}
                      disabled={!screenshotUrl || submitting}
                      className="flex-1 btn-gold"
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                      ) : (
                        'Submit for Review'
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default PremiumPage;
