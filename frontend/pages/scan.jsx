import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Alert, GhostButton, PageHeader, PrimaryButton, Spinner } from '../components/Ui';
import Pill from '../components/Pill';
import { formatDate, formatNumber, riskLevel } from '../lib/utils';

const BARCODE_FORMATS = ['qr_code'];

export default function ScanPage() {
  const { can } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanningRef = useRef(true);

  const [cameraSupported, setCameraSupported] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastValue, setLastValue] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [asset, setAsset] = useState(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [error, setError] = useState('');

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const lookupAsset = useCallback(
    async (identifier) => {
      setLoadingAsset(true);
      setError('');
      setLastValue(identifier);
      try {
        await api.post('/assets/scan', { assetIdentifier: identifier }).catch(() => null);
        const data = await api.get(`/assets/${identifier}`);
        setAsset(data || null);
        if (!data) setError(`No asset was found for "${identifier}".`);
      } catch (err) {
        setError(err.message);
        setAsset(null);
      } finally {
        setLoadingAsset(false);
      }
    },
    [],
  );

  const startCamera = useCallback(async () => {
    setCameraError('');
    if (!('BarcodeDetector' in window)) {
      setCameraSupported(false);
      setCameraError(
        'QR scanning is not supported in this browser. Enter the asset ID manually below.',
      );
      return;
    }
    setCameraSupported(true);
    try {
      const formats = BARCODE_FORMATS.filter((format) =>
        window.BarcodeDetector.getSupportedFormats().includes(format),
      );
      detectorRef.current = new window.BarcodeDetector(
        formats.length ? { formats } : undefined,
      );
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      setScanning(true);
      tick();
    } catch (err) {
      setCameraSupported(false);
      setCameraError(
        'Unable to access the camera. Grant camera permission or enter the asset ID manually below.',
      );
    }
  }, []);

  const tick = useCallback(async () => {
    if (!scanningRef.current || !detectorRef.current || !videoRef.current) return;
    if (videoRef.current.readyState === 4) {
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        for (const code of codes) {
          if (code.rawValue) {
            stopCamera();
            await lookupAsset(code.rawValue.trim());
            break;
          }
        }
      } catch {
        // detection frame failed; keep scanning
      }
    }
    if (scanningRef.current) {
      requestAnimationFrame(tick);
    }
  }, [lookupAsset, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleManualSubmit = (event) => {
    event.preventDefault();
    if (!manualValue.trim()) return;
    stopCamera();
    lookupAsset(manualValue.trim());
  };

  const risk = riskLevel(asset?.predictiveScore);

  return (
    <div>
      <PageHeader
        title="QR Code Scanner"
        description="Authenticate to scan an asset QR code and view its predictive maintenance details."
      />

      <Alert>{error}</Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Camera Scanner</h2>

          {cameraSupported === null && (
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-slate-400">
                Point your camera at an asset QR code. Scanning stops automatically once a code
                is recognized.
              </p>
              <PrimaryButton onClick={startCamera}>Start camera</PrimaryButton>
            </div>
          )}

          {cameraSupported === false && (
            <div>
              <Alert tone="info">{cameraError}</Alert>
              <GhostButton onClick={startCamera}>Retry camera</GhostButton>
            </div>
          )}

          {cameraSupported === true && (
            <div>
              <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-black">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-xl border-2 border-dashed border-emerald-400/70" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Pill tone={scanning ? 'success' : 'neutral'}>
                  {scanning ? 'Scanning…' : 'Camera stopped'}
                </Pill>
                <GhostButton onClick={scanning ? stopCamera : startCamera}>
                  {scanning ? 'Stop camera' : 'Restart camera'}
                </GhostButton>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Manual Entry</h2>
            <form onSubmit={handleManualSubmit} className="flex gap-3">
              <input
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                placeholder="Enter asset ID (e.g. AST-1001)"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
              />
              <PrimaryButton type="submit" disabled={loadingAsset || !manualValue.trim()}>
                Look up
              </PrimaryButton>
            </form>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-semibold">Scan Result</h2>
            {loadingAsset && <Spinner label="Fetching asset…" />}

            {!loadingAsset && lastValue && !asset && (
              <p className="text-sm text-slate-500">
                Scanned <span className="font-mono text-slate-300">{lastValue}</span> — no asset
                matched.
              </p>
            )}

            {!loadingAsset && !lastValue && (
              <p className="text-sm text-slate-500">
                Scan a QR code or enter an asset ID to see its details here.
              </p>
            )}

            {asset && (
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{asset.assetName}</h3>
                    <p className="text-sm text-slate-500">{asset.assetId}</p>
                  </div>
                  <Pill tone={asset.assetStatus === 'active' ? 'success' : 'neutral'}>
                    {asset.assetStatus}
                  </Pill>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Type</dt>
                    <dd className="text-slate-200">{asset.assetType || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Location</dt>
                    <dd className="text-slate-200">{asset.assetLocation || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Manufacturer</dt>
                    <dd className="text-slate-200">{asset.manufacturer || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Next Maintenance</dt>
                    <dd className="text-slate-200">{formatDate(asset.nextMaintenanceDate)}</dd>
                  </div>
                </dl>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Risk Score</p>
                    <p className="mt-1 text-xl font-semibold">{formatNumber(asset.predictiveScore)}</p>
                    <Pill tone={risk.tone}>{risk.label}</Pill>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Temperature</p>
                    <p className="mt-1 text-xl font-semibold">{formatNumber(asset.temperature)}°C</p>
                    <p className="mt-1 text-xs text-slate-500">live telemetry</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-500">CPU Usage</p>
                    <p className="mt-1 text-xl font-semibold">{formatNumber(asset.cpuUsage)}%</p>
                    <p className="mt-1 text-xs text-slate-500">live telemetry</p>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <Link
                    href={`/assets/${asset.assetId}`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-emerald-500/40 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
                  >
                    View full details
                  </Link>
                  {can.resource('assets').predict && (
                    <Link
                      href={`/assets/${asset.assetId}`}
                      className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      Run prediction
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
