import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';
import Pill from '../../components/Pill';
import { formatDate } from '../../lib/utils';

const STATUS_TONE = {
  Available: 'success',
  Assigned: 'info',
  Returned: 'neutral',
};

export default function AssetViewPage() {
  const router = useRouter();
  const { uniqueId } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [asset, setAsset] = useState(null);

  useEffect(() => {
    if (!uniqueId) return;
    let active = true;
    setLoading(true);
    setError('');
    api
      .get(`/assets/unique/${uniqueId}`)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setError('This asset could not be found. The QR code may be outdated.');
          return;
        }
        setAsset(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uniqueId]);

  const assignment = asset?.currentAssignment;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">
            Asset Verification
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-100">
            {loading ? 'Loading asset…' : asset?.assetName || 'Asset'}
          </h1>
          {asset?.assetId && (
            <p className="mt-1 text-sm text-slate-500">{asset.assetId}</p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900 py-10 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
            <span className="text-sm">Verifying QR code…</span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {asset && !loading && (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <span className="text-sm font-medium text-slate-300">Status</span>
              <Pill tone={STATUS_TONE[asset.assetStatus] || 'neutral'}>
                {asset.assetStatus || 'Unknown'}
              </Pill>
            </div>

            <dl className="divide-y divide-slate-800 text-sm">
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Category</dt>
                <dd className="text-slate-200">{asset.category || asset.assetType || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Make / Model</dt>
                <dd className="text-slate-200">
                  {[asset.make, asset.model].filter(Boolean).join(' ') || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Serial number</dt>
                <dd className="text-slate-200">{asset.serialNumber || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Location</dt>
                <dd className="text-slate-200">{asset.assetLocation || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-slate-500">Warranty</dt>
                <dd className="text-slate-200">{asset.warranty || '—'}</dd>
              </div>
            </dl>

            <div className="border-t border-slate-800 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {assignment ? 'Currently assigned to' : 'Assignment'}
              </p>
              {assignment ? (
                <div className="mt-2">
                  <p className="text-lg font-semibold text-slate-100">{assignment.assignedTo}</p>
                  {assignment.department && (
                    <p className="mt-0.5 text-sm text-slate-400">{assignment.department}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Assigned {formatDate(assignment.assignedAt)}
                    {assignment.assignedBy ? ` by ${assignment.assignedBy}` : ''}
                  </p>
                  {assignment.notes && (
                    <p className="mt-2 rounded-lg bg-slate-800/60 p-3 text-xs text-slate-300">
                      {assignment.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-400">
                  {asset.assetStatus === 'Assigned'
                    ? 'Assignment details are being updated.'
                    : 'This device is currently unassigned.'}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-emerald-400 transition hover:text-emerald-300"
          >
            Powered by IT Asset Management
          </Link>
        </div>
      </div>
    </div>
  );
}
