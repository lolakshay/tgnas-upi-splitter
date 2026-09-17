import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Store, 
  RotateCcw, 
  FileText, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PaymentSession } from '../types';

interface FinalScreenProps {
  session: PaymentSession;
  onStartNew: () => void;
  demoMode: boolean;
}

export const FinalScreen: React.FC<FinalScreenProps> = ({
  session,
  onStartNew,
  demoMode
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const progress = session.progress;
  const isVerified = progress.is_verified_complete;

  useEffect(() => {
    if (isVerified) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isVerified]);

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center animate-fade-in">
      {/* Celebration or Completion Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 ring-8 shadow-sm transition-transform hover:scale-105"
        style={{
          backgroundColor: isVerified ? '#ecfdf5' : '#f8fafc',
          boxShadow: isVerified ? '0 10px 25px -5px rgba(16, 185, 129, 0.2)' : 'none'
        }}
      >
        {isVerified ? (
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        ) : (
          <ShieldCheck className="w-10 h-10 text-brand-600" />
        )}
      </div>

      {/* Main Title according to Section 18 */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        {isVerified ? 'Payment Complete 🎉' : 'Payment Sequence Completed'}
      </h2>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
        {isVerified
          ? 'All split payment chunks have been verified and reconciled.'
          : 'All steps in this split session have been confirmed by the user. (Bank/payment-provider verification is not connected in this prototype).'}
      </p>

      {/* Large Amount */}
      <div className="my-6 py-4 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 inline-block w-full">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Reconciled Amount
        </span>
        <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-0.5">
          {session.total_amount_rupees}
        </h3>
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Paid to</span>
          <span className="font-bold text-slate-900 dark:text-white">{session.payee_name}</span>
          <span className="font-mono text-slate-400">({session.payee_vpa})</span>
        </div>
      </div>

      {/* Reconciliation Summary Cards */}
      <div className="grid grid-cols-3 gap-2 text-left mb-6">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Steps</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {session.payments.length} Payments
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Reconciled</span>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {isVerified ? session.total_amount_rupees : progress.collected_user_marked_rupees}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Status</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            {progress.invoice_status}
          </p>
        </div>
      </div>

      {/* Toggle View Payment Details */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{showDetails ? 'Hide Payment Breakdown' : 'View Payment Breakdown & Receipts'}</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showDetails && (
          <div className="mt-4 text-left border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300 flex justify-between">
              <span>Split Payment</span>
              <span>Amount & Status</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
              {session.payments.map((p) => (
                <div key={p.payment_id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Step {p.sequence}: {p.amount_rupees}
                    </span>
                    <p className="text-[10px] font-mono text-slate-400">{p.transaction_ref}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    p.status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start New Payment CTA */}
      <button
        onClick={onStartNew}
        className="w-full py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Start New Payment</span>
      </button>
    </div>
  );
};
