import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ExternalLink, 
  QrCode, 
  Smartphone, 
  Copy, 
  Check, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw, 
  Info,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { PaymentSession, SplitPayment } from '../types';
import { api } from '../services/api';

interface PaymentFlowProps {
  session: PaymentSession;
  onUpdateSession: (session: PaymentSession) => void;
  demoMode: boolean;
  onCancel: () => void;
}

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  session,
  onUpdateSession,
  demoMode,
  onCancel
}) => {
  const [showQrOnMobile, setShowQrOnMobile] = useState<boolean>(false);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const payments = session.payments || [];
  const progress = session.progress;
  const currentPayment: SplitPayment = payments[progress.current_payment_index] || payments[0];
  const totalCount = payments.length;
  const currentStep = progress.current_payment_index + 1;

  // Percentage calculated strictly from paise
  const progressPercent = Math.min(
    100,
    Math.round(
      ((demoMode ? progress.collected_verified_paise : progress.collected_user_marked_paise) /
        session.total_amount_paise) *
        100
    )
  );

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(session.payee_vpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleCopyLink = () => {
    if (currentPayment) {
      navigator.clipboard.writeText(currentPayment.upi_uri);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePayClick = async () => {
    if (!currentPayment) return;
    setActionLoading(true);
    try {
      // 1. Inform backend payment was opened
      const updated = await api.markPaymentOpened(session.session_id, currentPayment.payment_id);
      onUpdateSession(updated);

      // 2. Attempt UPI deep link on client
      window.location.href = currentPayment.upi_uri;
      setActionNotice('Attempting to open installed UPI application (GPay, PhonePe, Paytm, etc.). If it does not launch automatically, scan the QR code above.');
    } catch (err: any) {
      console.error('Error opening payment:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserConfirm = async () => {
    if (!currentPayment) return;
    setActionLoading(true);
    setActionNotice(null);
    try {
      const updated = await api.userConfirmPayment(session.session_id, currentPayment.payment_id);
      onUpdateSession(updated);
    } catch (err: any) {
      console.error('Error confirming payment:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMockVerify = async (status: 'SUCCESS' | 'FAILED') => {
    if (!currentPayment) return;
    setActionLoading(true);
    setActionNotice(null);
    try {
      const updated = await api.mockVerifyPayment(currentPayment.payment_id, status);
      onUpdateSession(updated);
    } catch (err: any) {
      console.error('Mock verify error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const isCurrentPaid = currentPayment.status === 'USER_MARKED_PAID' || currentPayment.status === 'VERIFIED';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {session.session_id}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Session</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Paying {session.payee_name}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{session.payee_vpa}</span>
            <button
              onClick={handleCopyVpa}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Copy UPI ID"
            >
              {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Bill:</span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {session.total_amount_rupees}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline mt-1"
          >
            Cancel & Start Over
          </button>
        </div>
      </div>

      {/* Progress & Stats Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
          <span>
            Payment Progress ({progress.marked_payments_count} of {totalCount} completed)
          </span>
          <span>{progressPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Collected</span>
            <p className="text-base sm:text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
              {demoMode ? progress.collected_verified_rupees : progress.collected_user_marked_rupees}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Remaining</span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {progress.remaining_rupees}
            </p>
          </div>
        </div>

        {/* Payment Steps Horizontal Scroller / Pills */}
        <div className="flex gap-2 overflow-x-auto pt-4 pb-1">
          {payments.map((p, idx) => {
            const isCompleted = p.status === 'VERIFIED' || p.status === 'USER_MARKED_PAID';
            const isCurrent = idx === progress.current_payment_index;

            return (
              <div
                key={p.payment_id}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : isCurrent
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 ring-2 ring-brand-400 dark:ring-brand-500'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <ArrowRight className="w-3.5 h-3.5 text-white shrink-0 animate-pulse" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span>{p.amount_rupees}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Payment Action Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-2">
            Step {currentStep} of {totalCount}
          </div>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {currentPayment.amount_rupees}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Ref: {currentPayment.transaction_ref}
          </p>
        </div>

        {/* Responsive Dual Mode: QR Display for Desktop, Pay Button Primary for Mobile */}
        <div className="flex flex-col items-center">
          {/* QR Code Container (Prominent on Desktop; Toggled or visible on Mobile) */}
          <div className={`flex flex-col items-center mb-6 ${!showQrOnMobile ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200">
              <QRCodeSVG
                value={currentPayment.upi_uri}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3 text-center">
              Scan with PhonePe, Google Pay, Paytm, or any UPI app
            </p>
          </div>

          {/* Mobile QR Toggle Button */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setShowQrOnMobile(!showQrOnMobile)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              <QrCode className="w-4 h-4" />
              <span>{showQrOnMobile ? 'Hide QR Code' : 'Show QR Code Instead'}</span>
            </button>
          </div>

          {/* Primary Mobile Action / Direct UPI Deep Link */}
          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={handlePayClick}
              disabled={actionLoading}
              className="w-full py-4 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-base shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Pay {currentPayment.amount_rupees} via UPI</span>
              <ExternalLink className="w-4 h-4 opacity-75" />
            </button>

            {/* User Completion Confirmation Button */}
            <button
              onClick={handleUserConfirm}
              disabled={actionLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-500" />
              <span>I completed the payment</span>
            </button>

            <div className="flex justify-center">
              <button
                onClick={handleCopyLink}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>Copy raw UPI payment link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Informational Action Notice */}
        {actionNotice && (
          <div className="mt-6 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p>{actionNotice}</p>
          </div>
        )}

        {/* Prototype Verification Disclaimer (Mandatory Requirement from Section 5 & 18) */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Prototype Verification Status:
            </p>
            <p className="mt-0.5 leading-relaxed">
              Clicking "I completed the payment" records user confirmation. Official bank verification is not connected in this standalone prototype without live bank webhooks.
            </p>
          </div>
        </div>

        {/* Demo Mode Verification Box (Section 6 & 17) */}
        {demoMode && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                Demo Mode — Mock Bank Settlement
              </h4>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
              Simulate backend reconciliation from an external payment aggregator:
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleMockVerify('SUCCESS')}
                disabled={actionLoading}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simulate Bank Success</span>
              </button>
              <button
                onClick={() => handleMockVerify('FAILED')}
                disabled={actionLoading}
                className="py-2 px-3 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
              >
                Simulate Fail
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
