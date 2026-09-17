import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { QRScanner } from './components/QRScanner';
import { AmountInput } from './components/AmountInput';
import { SplitBreakdown } from './components/SplitBreakdown';
import { PaymentFlow } from './components/PaymentFlow';
import { FinalScreen } from './components/FinalScreen';
import { usePaymentSession } from './hooks/usePaymentSession';
import { QRParseResult } from './types';
import { api } from './services/api';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Lock, 
  QrCode, 
  Smartphone,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [demoMode, setDemoMode] = useState<boolean>(true); // Default to Demo Mode for seamless evaluation

  // Wizard state when not in active session
  // 0 = Landing, 1 = Scan Payee QR, 2 = Enter Amount, 3 = Split Breakdown
  const [step, setStep] = useState<number>(0);
  const [scannedPayee, setScannedPayee] = useState<QRParseResult | null>(null);
  const [totalPaise, setTotalPaise] = useState<number>(1000000); // default ₹10,000
  const [creatingSession, setCreatingSession] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    session,
    loading: sessionLoading,
    startSession,
    clearSession,
    updateSession
  } = usePaymentSession();

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle scanned QR
  const handleQRSuccess = (data: QRParseResult) => {
    setScannedPayee(data);
    if (data.amount_paise) {
      setTotalPaise(data.amount_paise);
    }
    setStep(2); // Go to Amount Input
  };

  // Handle amount confirmed
  const handleAmountConfirmed = (paise: number) => {
    setTotalPaise(paise);
    setStep(3); // Go to Split Breakdown
  };

  // Create payment session
  const handleCreateSession = async (customChunks?: number[]) => {
    if (!scannedPayee || !scannedPayee.payee_vpa) return;
    setCreatingSession(true);
    setApiError(null);
    try {
      const newSession = await api.createSession({
        payee_vpa: scannedPayee.payee_vpa,
        payee_name: scannedPayee.payee_name || 'Merchant',
        total_amount_paise: totalPaise,
        merchant_code: scannedPayee.merchant_code,
        custom_split_paise: customChunks,
        notes: scannedPayee.transaction_note || undefined,
      });
      startSession(newSession);
      setStep(0);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setApiError(err.message || 'Failed to create payment session.');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleStartNew = () => {
    clearSession();
    setScannedPayee(null);
    setStep(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        demoMode={demoMode}
        setDemoMode={setDemoMode}
        onReset={handleStartNew}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        {/* If an active session is loaded */}
        {session ? (
          session.progress.is_completed || session.progress.is_verified_complete ? (
            <FinalScreen
              session={session}
              onStartNew={handleStartNew}
              demoMode={demoMode}
            />
          ) : (
            <PaymentFlow
              session={session}
              onUpdateSession={updateSession}
              demoMode={demoMode}
              onCancel={handleStartNew}
            />
          )
        ) : (
          /* Wizard Flow */
          <div>
            {step === 0 && (
              /* Landing Hero */
              <div className="max-w-3xl mx-auto text-center space-y-8 py-6 sm:py-12 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 text-xs font-semibold border border-brand-200 dark:border-brand-900/60 shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-brand-500" />
                  <span>Next-Generation UPI Split Engine</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                    Split One Payment into Multiple UPI Steps
                  </h1>
                  <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    Collect large sums effortlessly. Scan any payee QR, enter your total, split into auto-calculated chunks of ₹1,999, and track real-time reconciliation.
                  </p>
                </div>

                {/* Primary CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-base shadow-xl shadow-brand-500/25 hover:shadow-brand-500/35 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Create Payment</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Architecture & Trust Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 text-left">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Automated Splitting</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      Instantly chunks ₹10,000 into 5×₹1,999 + ₹5 with strict integer paise balance invariants.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Desktop & Mobile Native</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      Desktop shows crisp scannable QRs; mobile offers instant deep-linking to GPay, PhonePe, or Paytm.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zero Credential Exposure</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      Never requests or stores banking credentials, UPI PIN, OTPs, or passwords.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <QRScanner onSuccess={handleQRSuccess} />
            )}

            {step === 2 && scannedPayee && (
              <AmountInput
                payeeData={scannedPayee}
                onBack={() => setStep(1)}
                onContinue={handleAmountConfirmed}
              />
            )}

            {step === 3 && scannedPayee && (
              <SplitBreakdown
                payeeData={scannedPayee}
                totalAmountPaise={totalPaise}
                onBack={() => setStep(2)}
                onConfirm={handleCreateSession}
                creating={creatingSession}
              />
            )}

            {apiError && (
              <div className="max-w-xl mx-auto mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 text-center">
                {apiError}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
        <p className="max-w-md mx-auto">
          Experimental UPI payment-splitting & reconciliation prototype. Designed strictly for software architecture & UPI deep-link workflow demonstrations.
        </p>
      </footer>
    </div>
  );
}

export default App;
