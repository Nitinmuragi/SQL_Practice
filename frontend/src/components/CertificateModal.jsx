import React, { useState } from 'react';
import { X, Award, Printer, Check, Copy, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

export const CertificateModal = ({ isOpen, onClose, certificate }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const link = certificate.verification_url || window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 print:shadow-none print:border-none print:m-0 print:max-w-none">
        
        {/* Top Action Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Official SQL Competency Certificate
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Link' : 'Copy Verification'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body (Styled for both Screen & Print) */}
        <div className="p-8 sm:p-12 bg-gradient-to-br from-amber-500/5 via-slate-50 to-orange-500/5 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900">
          <div className="relative border-4 border-double border-amber-600/40 rounded-xl p-8 sm:p-10 text-center bg-white dark:bg-slate-900/90 shadow-inner">
            {/* Watermark Emblem */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
              <ShieldCheck className="w-96 h-96 text-amber-600" />
            </div>

            {/* Corner Ornaments */}
            <div className="absolute top-2 left-2 text-amber-500/60 font-serif text-xs">◆ ◆ ◆</div>
            <div className="absolute top-2 right-2 text-amber-500/60 font-serif text-xs">◆ ◆ ◆</div>
            <div className="absolute bottom-2 left-2 text-amber-500/60 font-serif text-xs">◆ ◆ ◆</div>
            <div className="absolute bottom-2 right-2 text-amber-500/60 font-serif text-xs">◆ ◆ ◆</div>

            {/* Issuer Header */}
            <div className="flex flex-col items-center justify-center space-y-2 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-600 dark:text-amber-400">
                SQL Practice & Analytics Academy
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-slate-900 dark:text-white">
                Certificate of SQL Competency
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                This credential certifies verified proficiency in relational database querying and analytical SQL.
              </p>
            </div>

            {/* Recipient */}
            <div className="my-6 space-y-1">
              <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
                This honor is proudly awarded to
              </p>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold text-amber-700 dark:text-amber-400 underline decoration-amber-400/40 underline-offset-8">
                {certificate.user_name || 'SQL Practitioner'}
              </h2>
              {certificate.level && (
                <div className="pt-2">
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    {certificate.level} Tier Certification
                  </span>
                </div>
              )}
            </div>

            {/* Achievement details */}
            <p className="max-w-xl mx-auto text-sm text-slate-600 dark:text-slate-300 leading-relaxed my-4">
              for successfully passing the <span className="font-semibold text-slate-900 dark:text-white">{certificate.track_name}</span> Comprehensive Skill Assessment with a verified score of <span className="font-bold text-amber-600 dark:text-amber-400">{certificate.score_percent}%</span> with Honors Distinction.
            </p>

            {/* Skills Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 my-6">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Data Filtering & Logic
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                GROUP BY & Aggregations
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Relational Joins & Models
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Window Functions & Analytics
              </span>
            </div>

            {/* Signatures & Verification footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">ISSUED ON</div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {certificate.issued_at || 'Verified Date'}
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="text-[11px] text-slate-400 font-medium">CREDENTIAL ID</div>
                <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {certificate.certificate_code}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden during print) */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Verified Digital Credential • Tamper-Resistant ID
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
