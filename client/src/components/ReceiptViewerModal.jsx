import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

export default function ReceiptViewerModal({ receiptUrl, fileName, onClose }) {
  if (!receiptUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Expense Receipt</h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{fileName || 'Receipt Attachment'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              download={fileName || 'receipt.jpg'}
              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
              title="Open full image"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image preview body */}
        <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-100/50 min-h-[300px]">
          <img
            src={receiptUrl}
            alt="Receipt preview"
            className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-sm border border-slate-200"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://placehold.co/600x400?text=Receipt+Image+Unavailable';
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
