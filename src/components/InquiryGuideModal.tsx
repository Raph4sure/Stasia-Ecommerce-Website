"use client";

import React from 'react';
import { X, Tag, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface InquiryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InquiryGuideModal: React.FC<InquiryGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 dark:border-stone-800 relative text-stone-900 dark:text-stone-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center mb-4 border border-amber-300/60 dark:border-amber-700/60">
          <Tag className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>

        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50 mb-2">
          How to Order with Item Code No.
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
          At <strong className="text-stone-900 dark:text-stone-100">Stasia Elegant Fabrique</strong>, each piece of clothing, wrapper, and luxury fabric has a unique <strong className="text-amber-700 dark:text-amber-300 font-mono">Code No.</strong> so you can easily order or buy directly from us.
        </p>

        <div className="space-y-3.5 text-xs sm:text-sm text-stone-700 dark:text-stone-300 mb-6">
          <div className="flex items-start gap-3 bg-stone-50 dark:bg-stone-950/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
              1
            </span>
            <div>
              <strong className="text-stone-900 dark:text-stone-100 block font-semibold mb-0.5">Find Item & Copy Code No.</strong>
              Find the dress, wrapper, fabric, or bag you want and copy or write down the Code No. shown on the picture.
            </div>
          </div>

          <div className="flex items-start gap-3 bg-stone-50 dark:bg-stone-950/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
              2
            </span>
            <div>
              <strong className="text-stone-900 dark:text-stone-100 block font-semibold mb-0.5">Send Code to Store Staff</strong>
              Send the Code No. to our store staff on WhatsApp or call our phone line. If you are visiting our store in person, simply show or tell our staff the code.
            </div>
          </div>

          <div className="flex items-start gap-3 bg-stone-50 dark:bg-stone-950/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
              3
            </span>
            <div>
              <strong className="text-stone-900 dark:text-stone-100 block font-semibold mb-0.5">Fast In-Store Purchase & Delivery</strong>
              Staff will immediately check the item, confirm your size or color, complete your order, and give you your official receipt.
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-2xl text-xs sm:text-sm transition shadow-sm cursor-pointer"
        >
          Start Browsing Store
        </button>
      </div>
    </div>
  );
};
