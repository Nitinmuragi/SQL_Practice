import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Calendar,
  Check,
  Award,
  Trophy,
  Medal,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Download,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { assessmentService } from '../services/assessmentService';
import { Toast } from '../components/Toast';
import { ContestCertificateModal } from '../components/ContestCertificateModal';
import { CertificateModal } from '../components/CertificateModal';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Certificates state
  const [certificates, setCertificates] = useState([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [selectedAssessmentCert, setSelectedAssessmentCert] = useState(null);
  const [selectedContestCert, setSelectedContestCert] = useState(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setCertsLoading(true);
        const res = await assessmentService.getMyCertificates();
        if (res.success && res.data) {
          setCertificates(res.data);
        }
      } catch (err) {
        console.error('Failed to load certificates:', err);
      } finally {
        setCertsLoading(false);
      }
    };
    fetchCertificates();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setLoading(true);
    try {
      const res = await authService.updateProfile(fullName.trim());
      if (res.success && res.data) {
        updateUser(res.data.user);
        setToast({ type: 'success', message: 'Profile updated successfully!' });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCertificate = (cert) => {
    if (cert.certificate_type === 'contest_ranker' || cert.contest_id) {
      setSelectedContestCert(cert);
    } else {
      setSelectedAssessmentCert(cert);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Account & Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details, credentials, and official earned certificates
        </p>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/20">
            {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {user?.full_name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            {user?.college_name && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 truncate">
                {user.college_name}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Account Created
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled
                value={user?.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Verified Certificates & Credentials Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                My Verified Certificates & Credentials
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authentic certificates earned from Sunday National SQL Championships and Skill Assessments.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 self-start sm:self-auto">
            {certificates.length} {certificates.length === 1 ? 'Credential' : 'Credentials'} Earned
          </span>
        </div>

        {certsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Loading your verified certificates...</p>
          </div>
        ) : certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => {
              const isContest = cert.certificate_type === 'contest_ranker' || !!cert.contest_id;
              const rankNum = cert.contest_rank || cert.rank;
              const isGold = rankNum === 1;
              const isSilver = rankNum === 2;

              return (
                <div
                  key={cert.id}
                  className="group relative bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 hover:border-amber-400/60 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm ${
                            isContest
                              ? isGold
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                : isSilver
                                ? 'bg-slate-300/20 text-slate-300 border border-slate-400/30'
                                : 'bg-amber-700/20 text-amber-600 border border-amber-600/30'
                              : 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30'
                          }`}
                        >
                          {isContest ? (
                            <Trophy className="w-5 h-5" />
                          ) : (
                            <ShieldCheck className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isContest
                                ? isGold
                                  ? 'bg-amber-400/20 text-amber-500 dark:text-amber-300'
                                  : isSilver
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  : 'bg-amber-600/20 text-amber-600 dark:text-amber-400'
                                : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {isContest
                              ? `Rank #${rankNum || 1} • Podium Finish`
                              : `${cert.level || 'Skill'} Assessment`}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                            {cert.track_name || 'SQL Competency'}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Score Achieved:</span>
                        <strong className="text-slate-900 dark:text-white font-semibold">
                          {cert.score_percent}%
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Issued On:</span>
                        <span>{cert.issued_at || 'Verified'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Credential ID:</span>
                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
                          {cert.certificate_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenCertificate(cert)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>View & Download Certificate</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Certificates Earned Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Compete in weekly Sunday National SQL Championships or pass our official Skill Assessments to earn verifiable digital credentials.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                to="/contests"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm"
              >
                Join SQL Contests
              </Link>
              <Link
                to="/assessment"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
              >
                Take Assessment
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Contest Certificate Modal */}
      {selectedContestCert && (
        <ContestCertificateModal
          isOpen={!!selectedContestCert}
          onClose={() => setSelectedContestCert(null)}
          certificate={selectedContestCert}
          rank={selectedContestCert.contest_rank || selectedContestCert.rank}
          contestTitle={selectedContestCert.track_name}
        />
      )}

      {/* Skill Assessment Certificate Modal */}
      {selectedAssessmentCert && (
        <CertificateModal
          isOpen={!!selectedAssessmentCert}
          onClose={() => setSelectedAssessmentCert(null)}
          certificate={selectedAssessmentCert}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
