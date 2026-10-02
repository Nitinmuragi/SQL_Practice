import React, { useRef, useState } from 'react';
import {
  X,
  Award,
  Download,
  Copy,
  Check,
  Building2,
} from 'lucide-react';
import {
  certTopBorder,
  certBottomRank1,
  certBottomRank2,
  certBottomRank3,
} from '../assets/certAssets';

export const ContestCertificateModal = ({ isOpen, onClose, certificate, rank, xpAwarded, contestTitle }) => {
  const certificateRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !certificate) return null;

  const rankNum = Number(rank || certificate.contest_rank || certificate.rank || 1);
  const isGold = rankNum === 1;
  const isSilver = rankNum === 2;
  const isBronze = rankNum === 3;

  const rankPillText = isGold
    ? 'CHAMPION (RANK 1)'
    : isSilver
    ? 'RUNNER UP (RANK 2)'
    : 'SECOND RUNNER UP (RANK 3)';

  const ribbonLine1 = isGold ? 'CHAMPION' : isSilver ? 'RUNNER UP' : '2ND RUNNER UP';
  const ribbonLine2 = isGold ? 'RANK 1' : isSilver ? 'RANK 2' : 'RANK 3';

  const defaultXp = isGold ? 150 : isSilver ? 100 : 75;
  const xpValue = xpAwarded || defaultXp;

  // Visual Theme Configurations tailored to exact rank
  const goldTheme = {
    primaryText: '#b76e1a',
    pillBg: '#c27803',
    pillShadow: 'rgba(194, 120, 3, 0.4)',
    frameBorder: '#cda851',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    starColor: '#fbbf24',
    trophyGrad1: '#fde68a',
    trophyGrad2: '#f59e0b',
    trophyGrad3: '#b45309',
    ribbonBg: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 55%, #b45309 100%)',
    ribbonBorder: '#d97706',
    ribbonFold: '#78350f',
    ribbonText: '#381c00',
    iconColor: '#f59e0b',
  };

  const silverTheme = {
    primaryText: '#475569',
    pillBg: '#475569',
    pillShadow: 'rgba(71, 85, 105, 0.4)',
    frameBorder: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.35)',
    starColor: '#e2e8f0',
    trophyGrad1: '#ffffff',
    trophyGrad2: '#94a3b8',
    trophyGrad3: '#475569',
    ribbonBg: 'linear-gradient(180deg, #f8fafc 0%, #cbd5e1 55%, #64748b 100%)',
    ribbonBorder: '#64748b',
    ribbonFold: '#334155',
    ribbonText: '#0f172a',
    iconColor: '#cbd5e1',
  };

  const bronzeTheme = {
    primaryText: '#92400e',
    pillBg: '#92400e',
    pillShadow: 'rgba(146, 64, 14, 0.4)',
    frameBorder: '#b45309',
    glowColor: 'rgba(234, 88, 12, 0.35)',
    starColor: '#fb923c',
    trophyGrad1: '#ffedd5',
    trophyGrad2: '#ea580c',
    trophyGrad3: '#78350f',
    ribbonBg: 'linear-gradient(180deg, #ffedd5 0%, #f97316 55%, #78350f 100%)',
    ribbonBorder: '#c2410c',
    ribbonFold: '#451a03',
    ribbonText: '#431407',
    iconColor: '#f97316',
  };

  const theme = isGold ? goldTheme : isSilver ? silverTheme : bronzeTheme;
  const bottomBlockAsset = isGold ? certBottomRank1 : isSilver ? certBottomRank2 : certBottomRank3;

  // Single-Certificate Isolated PDF Export / Print
  const handlePrintCertificate = () => {
    const certElement = document.getElementById('printable-contest-certificate');
    if (!certElement) return;

    setIsGeneratingPdf(true);

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${certificate.user_name || 'Ranker'} - ${rankPillText} Official Certificate</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;0,800;0,900;1,500;1,600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
              @page {
                size: landscape;
                margin: 4mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              body {
                margin: 0;
                padding: 0;
                background-color: #03132e !important;
                color: #0f172a !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .cert-print-wrap {
                width: 100%;
                max-width: 1080px;
                margin: 0 auto;
                page-break-inside: avoid;
                page-break-after: avoid;
              }
              .font-serif {
                font-family: 'Playfair Display', Georgia, serif;
              }
            </style>
          </head>
          <body>
            <div class="cert-print-wrap">
              ${certElement.outerHTML}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() {
                  if (window.frameElement && window.frameElement.parentNode) {
                    window.frameElement.parentNode.removeChild(window.frameElement);
                  }
                }, 1500);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
    } catch (err) {
      console.error('Error printing certificate:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyCode = () => {
    if (certificate.certificate_code) {
      navigator.clipboard.writeText(certificate.certificate_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[96vh]">
        {/* Modal Top Control Bar */}
        <div className="px-3.5 sm:px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Award className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isGold ? 'text-amber-400' : isSilver ? 'text-slate-300' : 'text-amber-600'}`} />
            <div className="truncate">
              <span className="font-bold text-xs sm:text-sm text-white block truncate">Official Contest Certificate</span>
              <span className="text-[10px] text-slate-400 hidden sm:block">SQL Practice Platform — Verified Ranker Credential</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            <button
              onClick={handleCopyCode}
              title="Copy Certificate Verification ID"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs font-medium text-slate-300 flex items-center gap-1 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy ID'}</span>
            </button>
            <button
              onClick={handlePrintCertificate}
              disabled={isGeneratingPdf}
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-[11px] sm:text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Preparing...' : 'Download / Save PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div className="p-2 sm:p-5 overflow-y-auto flex items-center justify-center bg-slate-950/80">
          <div className="w-full overflow-x-auto pb-1 flex justify-center">
            {/* EXACT CERTIFICATE REPLICA (Matches Certificate Requrement.jpg) */}
            <div
              ref={certificateRef}
              id="printable-contest-certificate"
              className="w-full max-w-4xl min-w-[340px] sm:min-w-[680px] md:min-w-[850px] relative text-slate-900 overflow-hidden shadow-2xl"
              style={{
                backgroundColor: '#03132e',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
              }}
            >
              {/* Outer Beveled Gold & Navy Frame Wrapper */}
              <div
                className="relative bg-white overflow-hidden flex flex-col"
                style={{
                  borderLeft: `4px solid ${theme.frameBorder}`,
                  borderRight: `4px solid ${theme.frameBorder}`,
                  boxShadow: `inset 2px 0 0 #041634, inset -2px 0 0 #041634, inset 4px 0 0 ${theme.frameBorder}, inset -4px 0 0 ${theme.frameBorder}`,
                }}
              >
                {/* Authentic Top Beveled Border from Certificate Requrement.jpg */}
                <img
                  src={certTopBorder}
                  alt="Official Certificate Border"
                  className="w-full h-auto block select-none pointer-events-none"
                />

                {/* Main White Canvas Body */}
                <div className="relative pt-3 sm:pt-6 px-4 sm:px-8 pb-3 text-center bg-gradient-to-b from-white via-white to-slate-50 overflow-hidden flex-1">
                  {/* Subtle Background Watermarks (Laurel Wreath Left, Database Stack Right) */}
                  {/* Left Watermark: Laurels */}
                  <div className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 opacity-[0.09] pointer-events-none select-none">
                    <svg className="w-28 sm:w-44 h-48 sm:h-72" viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M45 10 C30 30, 20 60, 25 90 C30 120, 50 145, 60 150" stroke="#cda851" strokeWidth="3" />
                      <ellipse cx="30" cy="30" rx="8" ry="4" transform="rotate(-30 30 30)" fill="#cda851" />
                      <ellipse cx="23" cy="50" rx="9" ry="4.5" transform="rotate(-20 23 50)" fill="#cda851" />
                      <ellipse cx="21" cy="72" rx="9" ry="4.5" transform="rotate(-10 21 72)" fill="#cda851" />
                      <ellipse cx="23" cy="95" rx="9" ry="4.5" transform="rotate(5 23 95)" fill="#cda851" />
                      <ellipse cx="29" cy="118" rx="8" ry="4" transform="rotate(25 29 118)" fill="#cda851" />
                      <ellipse cx="40" cy="138" rx="7" ry="3.5" transform="rotate(45 40 138)" fill="#cda851" />
                    </svg>
                  </div>

                  {/* Right Watermark: 3D Database Cylinder Stack & Analytics Bar */}
                  <div className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 opacity-[0.09] pointer-events-none select-none">
                    <svg className="w-28 sm:w-44 h-48 sm:h-72" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g fill="#cda851">
                        <ellipse cx="60" cy="35" rx="35" ry="12" />
                        <path d="M25 35 v18 c0 6.6 15.7 12 35 12 s35 -5.4 35 -12 v-18 Z" opacity="0.8" />
                        <path d="M25 58 v18 c0 6.6 15.7 12 35 12 s35 -5.4 35 -12 v-18 Z" opacity="0.8" />
                        <path d="M25 81 v18 c0 6.6 15.7 12 35 12 s35 -5.4 35 -12 v-18 Z" opacity="0.8" />
                      </g>
                      <rect x="75" y="110" width="8" height="25" rx="2" fill="#cda851" />
                      <rect x="88" y="100" width="8" height="35" rx="2" fill="#cda851" />
                      <rect x="101" y="90" width="8" height="45" rx="2" fill="#cda851" />
                    </svg>
                  </div>

                  {/* Platform Brand Header */}
                  <div className="relative z-10 flex flex-col items-center justify-center space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-black text-xl sm:text-2xl tracking-tight text-slate-900">
                        <span className="text-slate-900"> </span>
                        <span className="text-blue-600">SQL Practice</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-blue-700 bg-blue-100/90 border border-blue-200 shadow-xs">
                        Platform
                      </span>
                    </div>
                    <span className="text-[11px] sm:text-[13px] font-extrabold tracking-[0.2em] uppercase text-slate-900 font-serif">
                      SQL SKILLS & PRACTICE COUNCIL
                    </span>
                  </div>

                  {/* Rank Honor Pill */}
                  <div className="relative z-10 mt-3 sm:mt-4">
                    <span
                      className="inline-block text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-widest px-4 sm:px-6 py-1 sm:py-1.5 rounded-full shadow-md"
                      style={{
                        backgroundColor: theme.pillBg,
                        boxShadow: `0 3px 12px ${theme.pillShadow}`,
                      }}
                    >
                      {rankPillText}
                    </span>
                  </div>

                  {/* Certificate Title */}
                  <div className="relative z-10 mt-2 sm:mt-3">
                    <h1
                      className="text-2xl sm:text-4xl md:text-[42px] font-black tracking-tight font-serif uppercase leading-tight"
                      style={{ color: theme.primaryText }}
                    >
                      CERTIFICATE OF EXCELLENCE
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 italic font-serif mt-1">
                      This official academic credential is authenticated and proudly conferred upon
                    </p>
                  </div>

                  {/* Recipient Full Name */}
                  <div className="relative z-10 mt-2 sm:mt-3">
                    <h2 className="text-2xl sm:text-4xl md:text-[40px] font-black text-slate-900 font-serif tracking-wide">
                      {certificate.user_name || 'Demo Student'}
                    </h2>
                    {/* Center Diamond Ornament */}
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-amber-600 text-xs sm:text-sm">◆</span>
                    </div>
                  </div>

                  {/* Citation / Context Description */}
                  <div className="relative z-10 text-[11px] sm:text-xs md:text-[13px] text-slate-700 max-w-2xl mx-auto mt-2 leading-relaxed">
                    <p>
                      for demonstrating exceptional technical mastery in relational query construction,
                      <br className="hidden sm:inline" />
                      complex join optimization, and rapid algorithmic execution during the
                    </p>
                    <p className="font-bold text-slate-900 mt-0.5">
                    SQL Practice Platform – {contestTitle || 'National SQL Championship (Edition #1)'}
                    </p>
                  </div>

                  {/* Summary Card with Metrics */}
                  <div
                    className="relative z-10 mt-3 sm:mt-4 p-2.5 sm:p-3.5 rounded-2xl max-w-2xl mx-auto text-xs"
                    style={{
                      backgroundColor: '#fffdf5',
                      border: '1px solid #fde68a',
                      boxShadow: '0 2px 8px rgba(251, 191, 36, 0.08)',
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-slate-700">
                      <span>
                        Final Score:{' '}
                        <strong className="text-emerald-600 font-bold">
                          {certificate.score_percent || 62}%
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Competitive Honor:{' '}
                        <strong style={{ color: theme.primaryText }} className="font-bold">
                          {rankPillText}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Bonus XP:{' '}
                        <strong style={{ color: theme.primaryText }} className="font-bold">
                          +{xpValue} XP
                        </strong>
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-600 flex items-center justify-center gap-3">
                      <span>
                        Issued:{' '}
                        <strong className="text-slate-900 font-semibold">
                          {certificate.issued_at || 'September 30, 2026'}
                        </strong>
                      </span>
                      {certificate.certificate_code && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-indigo-700 font-bold">
                            {certificate.certificate_code}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Authentic Deep Navy Blue Footer Block with 3D Trophy Cup, Laurel, Ribbon & 6 Golden Feature Icons (From Certificate Requrement.jpg) */}
                <div className="relative w-full overflow-hidden select-none pointer-events-none">
                  <img
                    src={bottomBlockAsset}
                    alt={`Contest Rank ${rankNum} Official Achievement Crest`}
                    className="w-full h-auto block select-none pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
