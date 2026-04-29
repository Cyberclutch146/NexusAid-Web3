'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

interface ScannerViewProps {
  eventId: string;
  onScanSuccess: (ticketId: string) => Promise<void>;
}

export default function ScannerView({ eventId, onScanSuccess }: ScannerViewProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const processingRef = useRef(false);

  const startScanning = async () => {
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      };

      const qrCodeSuccessCallback = async (decodedText: string) => {
        if (processingRef.current) return;
        processingRef.current = true;

        setScanResult('processing');
        setLastScanned(decodedText);

        try {
          await onScanSuccess(decodedText);
          setScanResult('success');

          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        } catch (err: any) {
          setScanResult('error');
          toast.error(err.message || 'Check-in failed');
        } finally {
          setTimeout(() => {
            processingRef.current = false;
            setScanResult('idle');
          }, 2500);
        }
      };

      try {
        // Attempt 1: Environment (Back) camera
        await scanner.start({ facingMode: 'environment' }, config, qrCodeSuccessCallback, () => {});
      } catch (err: any) {
        // Attempt 2: User (Front) camera or any camera if environment fails
        console.warn('Environment camera not found, falling back to default camera:', err);
        try {
          await scanner.start({ facingMode: 'user' }, config, qrCodeSuccessCallback, () => {});
        } catch (fallbackErr) {
          // Attempt 3: Let the browser decide (empty constraints)
          await scanner.start({}, config, qrCodeSuccessCallback, () => {});
        }
      }

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      const isNotFoundError = err?.toString().includes('NotFoundError');
      toast.error(isNotFoundError 
        ? 'No camera found on this device.' 
        : 'Unable to access camera. Please check permissions.');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBorderColor =
    scanResult === 'success' ? 'rgba(59,107,74,0.8)' :
    scanResult === 'error' ? 'rgba(184,50,48,0.8)' :
    scanResult === 'processing' ? 'rgba(212,168,82,0.8)' :
    'var(--glass-border)';

  return (
    <div className="space-y-6">
      {/* Scanner viewport */}
      <div
        className="relative rounded-[24px] overflow-hidden transition-all duration-500"
        style={{
          border: `3px solid ${statusBorderColor}`,
          boxShadow: scanResult === 'success' ? '0 0 40px rgba(59,107,74,0.2)' :
                     scanResult === 'error' ? '0 0 40px rgba(184,50,48,0.2)' :
                     'var(--glass-shadow)',
        }}
      >
        <div id="qr-reader" className="w-full" style={{ minHeight: '300px', background: 'var(--color-surface-container-base)' }} />
        
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--glass-bg-strong)' }}>
            <div className="p-6 rounded-full" style={{ background: 'rgba(59,107,74,0.1)' }}>
              <span className="material-symbols-outlined text-5xl" style={{ color: 'var(--color-primary-base)' }}>qr_code_scanner</span>
            </div>
            <p className="text-on-surface-variant text-sm font-medium text-center max-w-[200px]">
              Tap the button below to start scanning volunteer tickets
            </p>
          </div>
        )}
      </div>

      {/* Status indicator */}
      {lastScanned && (
        <div
          className="p-4 rounded-[20px] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{
            background: scanResult === 'success' ? 'rgba(59,107,74,0.08)' :
                         scanResult === 'error' ? 'rgba(184,50,48,0.08)' :
                         'rgba(212,168,82,0.08)',
            border: `1px solid ${statusBorderColor}`,
          }}
        >
          <span className="material-symbols-outlined text-3xl" style={{
            color: scanResult === 'success' ? 'var(--color-primary-base)' :
                   scanResult === 'error' ? 'var(--color-error-base)' :
                   'var(--color-warm-amber)',
            fontVariationSettings: "'FILL' 1",
          }}>
            {scanResult === 'success' ? 'check_circle' :
             scanResult === 'error' ? 'error' :
             'pending'}
          </span>
          <div>
            <p className="font-bold text-sm text-on-surface">
              {scanResult === 'success' ? 'Check-in Successful!' :
               scanResult === 'error' ? 'Check-in Failed' :
               'Processing...'}
            </p>
            <p className="text-xs text-on-surface-variant font-mono tracking-wider">
              Ticket: {lastScanned}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <button
        onClick={isScanning ? stopScanning : startScanning}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
          isScanning
            ? 'text-on-surface hover:opacity-80'
            : 'text-on-primary shadow-xl hover:opacity-90'
        }`}
        style={isScanning ? {
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
        } : {
          background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
          boxShadow: '0 6px 24px rgba(59,107,74,0.3)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          {isScanning ? 'stop_circle' : 'qr_code_scanner'}
        </span>
        {isScanning ? 'Stop Scanner' : 'Start Scanner'}
      </button>
    </div>
  );
}
