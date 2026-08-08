import { useEffect, useMemo, useRef, useState } from 'react';

export function assetLabel(asset) {
  if (!asset) return '';
  const name =
    asset.assetName ||
    [asset.make, asset.model].filter(Boolean).join(' ') ||
    asset.assetId;
  const detail = asset.serialNumber || asset.category;
  return detail ? `${name} · ${detail}` : name;
}

export default function DeviceAutocomplete({
  assets,
  value,
  onChange,
  placeholder = 'Search for a device…',
  disabled,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (value) {
      const match = assets.find((asset) => asset.assetId === value);
      setQuery(match ? assetLabel(match) : value);
    } else {
      setQuery('');
    }
  }, [value, assets]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) =>
      [
        asset.assetId,
        asset.assetName,
        asset.category,
        asset.make,
        asset.model,
        asset.serialNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [assets, query]);

  const select = (asset) => {
    onChange(asset.assetId);
    setQuery(assetLabel(asset));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'Enter') {
            if (matches.length === 1) {
              select(matches[0]);
              event.preventDefault();
            }
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
          {matches.map((asset) => (
            <li key={asset.assetId}>
              <button
                type="button"
                onClick={() => select(asset)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{assetLabel(asset)}</span>
                  <span className="block text-xs text-slate-500">
                    {asset.category || 'Asset'} · {asset.make || '—'} {asset.model || ''}
                  </span>
                </span>
                {asset.assetStatus && (
                  <span className="shrink-0 text-xs text-emerald-400">{asset.assetStatus}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && matches.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-500 shadow-2xl">
          No matching devices.
        </div>
      )}
    </div>
  );
}
