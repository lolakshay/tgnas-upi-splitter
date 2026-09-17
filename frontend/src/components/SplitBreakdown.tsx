import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Edit3, Plus, Trash2, Check, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { QRParseResult } from '../types';

interface SplitBreakdownProps {
  payeeData: QRParseResult;
  totalAmountPaise: number;
  onBack: () => void;
  onConfirm: (customChunksPaise?: number[]) => void;
  creating: boolean;
}

export const SplitBreakdown: React.FC<SplitBreakdownProps> = ({
  payeeData,
  totalAmountPaise,
  onBack,
  onConfirm,
  creating
}) => {
  const MAX_CHUNK_PAISE = 199900; // ₹1,999.00

  // Calculate default chunks in integer paise
  const calculateDefaultChunks = (total: number): number[] => {
    const list: number[] = [];
    let rem = total;
    while (rem > MAX_CHUNK_PAISE) {
      list.push(MAX_CHUNK_PAISE);
      rem -= MAX_CHUNK_PAISE;
    }
    if (rem > 0) {
      list.push(rem);
    }
    return list;
  };

  const [isEditing, setIsEditing] = useState(false);
  const [chunks, setChunks] = useState<number[]>(() => calculateDefaultChunks(totalAmountPaise));
  const [editError, setEditError] = useState<string | null>(null);

  const formatRupees = (paise: number) => {
    const rupees = paise / 100;
    return rupees % 1 === 0 ? rupees.toLocaleString('en-IN') : rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const currentSum = chunks.reduce((acc, c) => acc + c, 0);
  const diffPaise = totalAmountPaise - currentSum;

  const handleChunkChange = (index: number, valStr: string) => {
    const num = parseFloat(valStr);
    const paiseVal = isNaN(num) ? 0 : Math.round(num * 100);
    const updated = [...chunks];
    updated[index] = paiseVal;
    setChunks(updated);
    setEditError(null);
  };

  const addChunk = () => {
    // Add a chunk with the remaining difference or 10000 paise (₹100)
    const newChunk = diffPaise > 0 ? diffPaise : 10000;
    setChunks([...chunks, newChunk]);
    setEditError(null);
  };

  const removeChunk = (index: number) => {
    if (chunks.length <= 1) {
      setEditError('Must have at least one payment step.');
      return;
    }
    const updated = chunks.filter((_, i) => i !== index);
    setChunks(updated);
    setEditError(null);
  };

  const resetToDefault = () => {
    setChunks(calculateDefaultChunks(totalAmountPaise));
    setIsEditing(false);
    setEditError(null);
  };

  const handleProceed = () => {
    if (diffPaise !== 0) {
      setEditError(
        diffPaise > 0
          ? `The sum of chunks is ₹${formatRupees(diffPaise)} less than the total ₹${formatRupees(totalAmountPaise)}.`
          : `The sum of chunks is ₹${formatRupees(Math.abs(diffPaise))} greater than the total ₹${formatRupees(totalAmountPaise)}.`
      );
      return;
    }

    if (chunks.some(c => c <= 0)) {
      setEditError('All split payment amounts must be strictly greater than ₹0.');
      return;
    }

    // If user edited and chunks match default, pass undefined so backend uses default
    const isCustom = isEditing;
    onConfirm(isCustom ? chunks : undefined);
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={onBack}
          disabled={creating}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Edit Total Amount
        </button>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Split
            </button>
          ) : (
            <button
              onClick={resetToDefault}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset to Default
            </button>
          )}
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Payment Split Plan
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Total of <span className="font-bold text-slate-900 dark:text-white">₹{formatRupees(totalAmountPaise)}</span> split into {chunks.length} step{chunks.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Payee Chip */}
      <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Recipient:</span>
        <span className="font-semibold text-slate-900 dark:text-white">{payeeData.payee_name} ({payeeData.payee_vpa})</span>
      </div>

      {/* Chunks List */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 mb-6">
        {chunks.map((paise, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
              isEditing 
                ? 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700' 
                : 'bg-slate-50/40 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Payment {idx + 1}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={paise ? paise / 100 : ''}
                    onChange={(e) => handleChunkChange(idx, e.target.value)}
                    className="w-24 px-2 py-1 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-right text-slate-900 dark:text-white outline-hidden focus:border-brand-500"
                  />
                  {chunks.length > 1 && (
                    <button
                      onClick={() => removeChunk(idx)}
                      className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      title="Remove chunk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  ₹{formatRupees(paise)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={addChunk}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Payment Step
          </button>

          <span className={`text-xs font-bold ${diffPaise === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            Sum: ₹{formatRupees(currentSum)} / ₹{formatRupees(totalAmountPaise)}
          </span>
        </div>
      )}

      {editError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{editError}</span>
        </div>
      )}

      {/* Verification Invariant Banner */}
      <div className="mb-6 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Strict integer paise balance guaranteed</span>
        </div>
        <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
          Σ = ₹{formatRupees(currentSum)}
        </span>
      </div>

      <button
        onClick={handleProceed}
        disabled={creating || diffPaise !== 0}
        className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-semibold text-base shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
      >
        {creating ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Generating Secure UPI Links...</span>
          </>
        ) : (
          <>
            <span>Proceed to Payment Flow</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  );
};
