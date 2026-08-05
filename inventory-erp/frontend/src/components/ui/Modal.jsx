import React, { useEffect } from 'react';

export function Modal({ open, title, children, footer, onClose, maxWidth = 'max-w-2xl', noTitle = false, containerClass = '', scrollOverlay = false }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) {
    return null;
  }

  if (scrollOverlay) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center bg-slate-950/35 p-4">
          <div className={`w-full rounded-[28px] bg-white shadow-2xl ${maxWidth} ${containerClass}`}>
            {!noTitle && (
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                <button className="text-sm font-medium text-slate-500" onClick={onClose} type="button">
                  Close
                </button>
              </div>
            )}
            <div className="space-y-4">{children}</div>
            {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl ${maxWidth} ${containerClass}`}>
        {!noTitle && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            <button className="text-sm font-medium text-slate-500" onClick={onClose} type="button">
              Close
            </button>
          </div>
        )}
        <div className="space-y-4">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
