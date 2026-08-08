import { useEffect } from 'react';

export default function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div className='w-full max-w-lg rounded-xl border border-slate-700 bgg-slate-900 bg-white shadow-2xl'>
        <div className='flex items-center justify-between border-b border-slate-800 px-5 py-4'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <button
            onClick={onClose}
            className='rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            aria-label='Close'>
            <svg
              className='h-5 w-5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'>
              <path d='M6 6l12 12M18 6L6 18' />
            </svg>
          </button>
        </div>
        <div className='max-h-[65vh] overflow-y-auto px-5 py-4'>{children}</div>
        {footer && (
          <div className='flex justify-end gap-3 border-t border-slate-800 px-5 py-4'>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
