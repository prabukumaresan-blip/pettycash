import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

export default function ReceiptViewerModal({ receiptUrl, fileName, onClose }) {
  if (!receiptUrl) return null;

  const isPdf =
    receiptUrl.toLowerCase().endsWith('.pdf') ||
    (fileName && fileName.toLowerCase().endsWith('.pdf'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Expense Attachment
              </h3>
              <p className="text-xs text-slate-500 font-mono truncate">{fileName || 'Receipt Attachment'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              download={fileName || (isPdf ? 'receipt.pdf' : 'receipt.jpg')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-100/60 min-h-[350px]">
          {isPdf ? (
            <div className="w-full h-[65vh] flex flex-col">
              <iframe
                src={`${receiptUrl}#view=FitH`}
                title="Receipt Document"
                className="w-full flex-1 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <img
              src={receiptUrl}
              alt="Receipt preview"
              className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-xs border border-slate-200 bg-white"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/600x400?text=Receipt+File+Preview+Unavailable';
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Bright Flowers Trading LLC • Document Verification
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
