import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Upload, AlertCircle, CheckCircle2, QrCode, Sparkles, RefreshCw } from 'lucide-react';
import { QRParseResult } from '../types';
import { api } from '../services/api';

interface QRScannerProps {
  onSuccess: (data: QRParseResult) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'samples'>('samples');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [detectedData, setDetectedData] = useState<QRParseResult | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerElementId = 'upi-reader-container';

  // Stop camera on unmount or tab change
  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleQRText = async (qrText: string) => {
    setParsing(true);
    setScanError(null);
    try {
      const result = await api.parseQR(qrText);
      if (!result.is_valid_upi) {
        setScanError(result.error_message || "This doesn't appear to be a valid UPI payment QR.");
        setDetectedData(null);
      } else {
        setDetectedData(result);
        stopCamera();
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to parse QR code.");
      setDetectedData(null);
    } finally {
      setParsing(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setScanError(null);
    try {
      // Ensure any previous instance is stopped
      await stopCamera();

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleQRText(decodedText);
        },
        () => {
          // Frame scan error, ignore per frame
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access or use image upload.'
          : 'Could not start camera on this device. Please use image upload or quick sample presets.'
      );
      setCameraActive(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setScanError(null);
    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      const decodedText = await html5QrCode.scanFile(file, true);
      await handleQRText(decodedText);
    } catch (err: any) {
      console.error('File scan error:', err);
      setScanError("Could not read a valid QR code from this image. Please upload a clear image of a UPI QR code.");
    } finally {
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Preset sample QRs for rapid testing without external camera
  const sampleQRs = [
    {
      label: 'Standard Merchant (₹10,000 Order)',
      description: 'Pre-set with ₹10,000 total amount to test ₹1,999 split',
      qr: 'upi://pay?pa=testmerchant@upi&pn=Apex%20Electronics&am=10000&cu=INR&tr=ORDER10000',
      vpa: 'testmerchant@upi',
      name: 'Apex Electronics',
      amount: '₹10,000'
    },
    {
      label: 'Store QR (No Embedded Amount)',
      description: 'Scan merchant QR and specify custom amount manually',
      qr: 'upi://pay?pa=quickmart@okaxis&pn=Quick%20Mart%20Store&cu=INR',
      vpa: 'quickmart@okaxis',
      name: 'Quick Mart Store',
      amount: 'Custom'
    },
    {
      label: 'High Value Merchant (₹25,000)',
      description: 'Test larger split payments (13 chunks)',
      qr: 'upi://pay?pa=luxuryfurnishings@hdfcbank&pn=Luxury%20Furnishings&am=25000&cu=INR',
      vpa: 'luxuryfurnishings@hdfcbank',
      name: 'Luxury Furnishings',
      amount: '₹25,000'
    }
  ];

  return (
    <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
      {/* Step Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mb-3 ring-8 ring-brand-50/50 dark:ring-brand-950/30">
          <QrCode className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Scan Payee UPI QR</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Provide the merchant or receiver's UPI QR code to begin
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl mb-6">
        <button
          onClick={() => {
            setActiveTab('samples');
            stopCamera();
            setScanError(null);
          }}
          className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'samples'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Presets</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('camera');
            setScanError(null);
            startCamera();
          }}
          className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'camera'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('upload');
            stopCamera();
            setScanError(null);
          }}
          className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Image</span>
        </button>
      </div>

      {/* Hidden container for file scanner */}
      <div id="file-scanner-temp" className="hidden" />

      {/* Tab: Presets */}
      {activeTab === 'samples' && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Select a verified sample UPI payee for one-click testing:
          </p>
          {sampleQRs.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleQRText(item.qr)}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {item.name}
                  </h4>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-brand-100/70 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-mono">
                    {item.vpa}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                  {item.amount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Camera */}
      {activeTab === 'camera' && (
        <div className="flex flex-col items-center">
          <div 
            id={readerElementId} 
            className="w-full max-w-[320px] aspect-square overflow-hidden rounded-2xl bg-black relative border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center"
          >
            {!cameraActive && !cameraError && (
              <div className="text-slate-400 text-center p-4">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Initializing camera...</p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Camera Access Notice</p>
                <p className="mt-0.5">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="mt-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry camera
                </button>
              </div>
            </div>
          )}

          {cameraActive && (
            <button
              onClick={stopCamera}
              className="mt-3 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Stop Camera
            </button>
          )}
        </div>
      )}

      {/* Tab: Upload */}
      {activeTab === 'upload' && (
        <div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-brand-500 dark:hover:border-brand-500 cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform text-slate-500 dark:text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Click to select or drag & drop QR image
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Supports PNG, JPG, WEBP screenshots of UPI QR codes
            </p>
          </div>
        </div>
      )}

      {/* Parsing indicator */}
      {parsing && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-brand-600 dark:text-brand-400 py-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Decoding & validating UPI parameters...</span>
        </div>
      )}

      {/* Error display */}
      {scanError && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Invalid QR</p>
            <p className="mt-0.5">{scanError}</p>
          </div>
        </div>
      )}

      {/* Detected Payee Card */}
      {detectedData && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">
                  Verified Payee Detected
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {detectedData.payee_name || 'Merchant'}
                </h3>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                  {detectedData.payee_vpa}
                </p>
              </div>
            </div>
            {detectedData.amount_rupees && (
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold">QR Amount</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  ₹{detectedData.amount_rupees}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => onSuccess(detectedData)}
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Confirm & Continue</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
};
