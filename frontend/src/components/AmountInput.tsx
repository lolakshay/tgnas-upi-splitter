import React, { useState } from 'react';
import { IndianRupee, ArrowLeft, ArrowRight, Store, AlertCircle, Info } from 'lucide-react';
import { QRParseResult } from '../types';

interface AmountInputProps {
  payeeData: QRParseResult;
  onBack: () => void;
  onContinue: (totalAmountPaise: number) => void;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  payeeData,
  onBack,
  onContinue
}) => {
  const defaultAmount = payeeData.amount_paise 
    ? (payeeData.amount_paise / 100).toString() 
    : '10000';

  const [rawAmount, setRawAmount] = useState<string>(defaultAmount);
  const [useQrAmount, setUseQrAmount] = useState<boolean>(!!payeeData.amount_paise);
  const [error, setError] = useState<string | null>(null);

  const quickAmounts = [1999, 5000, 10000, 25000, 50000];

  const handleAmountChange = (val: string) => {
    // Only allow numbers and one optional decimal point with up to 2 decimal places
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;

    setRawAmount(cleaned);
    setError(null);
  };

  const handleContinue = () => {
    const num = parseFloat(rawAmount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (num > 500000) {
      setError('Maximum prototype collection limit is ₹5,00,000.');
      return;
    }

    // Convert to integer paise with strict precision
    const paise = Math.round(num * 100);
    if (paise <= 0) {
      setError('Amount must be at least ₹1 (100 paise).');
      return;
    }

    onContinue(paise);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
      {/* Back button & Payee details */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Change Payee
        </button>

        <div className="flex items-center gap-2 text-right">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900 dark:text-white">{payeeData.payee_name}</p>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{payeeData.payee_vpa}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Store className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Embedded QR Amount Notification Banner (Section 16 requirement) */}
      {payeeData.amount_paise && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                QR contains an amount of ₹{payeeData.amount_rupees}.
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                Would you like to use this detected amount or enter a different custom amount?
              </p>
              
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setUseQrAmount(true);
                    setRawAmount((payeeData.amount_paise! / 100).toString());
                    setError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    useQrAmount
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                  }`}
                >
                  Use ₹{payeeData.amount_rupees}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseQrAmount(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    !useQrAmount
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Enter Custom Amount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Input Form */}
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          How much do you want to collect?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This total will be split into smaller UPI transactions (max ₹1,999 each)
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <span className="text-2xl font-bold">₹</span>
          </div>
          <input
            type="text"
            value={rawAmount}
            onChange={(e) => {
              handleAmountChange(e.target.value);
              setUseQrAmount(false);
            }}
            placeholder="10,000"
            className="w-full pl-10 pr-16 py-4 text-3xl font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-hidden text-center"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-xs font-bold text-slate-400 uppercase">
            INR
          </div>
        </div>

        {/* Quick Amount Chips */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => {
                setRawAmount(amt.toString());
                setUseQrAmount(false);
                setError(null);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                rawAmount === amt.toString()
                  ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              ₹{amt.toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total to Collect:</span>
          <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
            ₹{rawAmount ? Number(rawAmount || 0).toLocaleString('en-IN') : '0'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-base shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
        >
          <span>Calculate Split</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
