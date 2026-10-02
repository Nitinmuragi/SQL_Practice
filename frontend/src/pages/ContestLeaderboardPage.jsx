import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy,
  Award,
  Medal,
  Clock,
  Sparkles,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Download,
  Share2,
  Users,
  Flame,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { contestService } from '../services/contestService';
import { ContestCertificateModal } from '../components/ContestCertificateModal';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const ContestLeaderboardPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [activeCert, setActiveCert] = useState(null);
  const [activeRank, setActiveRank] = useState(1);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await contestService.getContestLeaderboard(id);
      if (res.success) {
        setBoardData(res);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [id]);

  // Ownership check: Certificate is only viewable/downloadable by the candidate who earned that rank (or platform admin)
  const isCandidateOwner = (ranker) => {
    if (!ranker) return false;
    if (user && user.is_admin) return true;
    if (user && user.id && ranker.user_id && user.id === ranker.user_id) return true;
    if (boardData?.my_standing && boardData.my_standing.user_id === ranker.user_id) return true;
    return false;
  };

  const handleOpenCertificate = async (rankerEntry) => {
    if (!isCandidateOwner(rankerEntry)) return;

    try {
      // If admin is inspecting another ranker, pass their target user_id
      const targetUserId = (user && user.is_admin && rankerEntry?.user_id !== user.id) ? rankerEntry.user_id : null;
      const res = await contestService.getMyContestCertificate(id, targetUserId);
      if (res.success && res.certificate) {
        setActiveCert(res.certificate);
        setActiveRank(res.rank || rankerEntry.rank);
        setShowCertModal(true);
      } else {
        // Fallback preview for current ranker
        setActiveCert({
          user_name: rankerEntry.user_name,
          college_name: rankerEntry.college_name,
          track_name: boardData?.contest?.title || 'Sunday SQL Championship',
          score_percent: Math.round((rankerEntry.total_marks / (boardData?.contest?.total_marks || 100)) * 100),
          certificate_code: rankerEntry.certificate_code || 'CERT-CONTEST-OFFICIAL',
          issued_at: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
        setActiveRank(rankerEntry.rank);
        setShowCertModal(true);
      }
    } catch (err) {
      console.error('Failed to load certificate:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <LoadingSpinner />
        <p className="mt-4 text-xs">Computing Final Standings & Top 3 Podium...</p>
      </div>
    );
  }

  const contest = boardData?.contest;
  const top3 = boardData?.top_3 || [];
  const standings = boardData?.standings || [];
  const myStanding = boardData?.my_standing;

  const rank1 = top3.find((r) => r.rank === 1);
  const rank2 = top3.find((r) => r.rank === 2);
  const rank3 = top3.find((r) => r.rank === 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            to="/contests"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Official Leaderboard
              </span>
              <span className="text-xs text-slate-400">
                Calculated within 5 Minutes of Contest Close
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
              {contest?.title || 'Contest Leaderboard'}
            </h1>
          </div>
        </div>

        {/* Enter Arena / Action */}
        <div className="flex items-center gap-2">
          {contest?.status === 'active' && (
            <Link
              to={`/contests/${id}/arena`}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg flex items-center gap-2"
            >
              Back to Exam Arena
            </Link>
          )}
        </div>
      </div>

      {/* Candidate's Personal Winner Notification Card (If Current User is a Top 3 Ranker) */}
      {myStanding && myStanding.is_ranker && (
        <div className="bg-gradient-to-r from-amber-950/60 via-indigo-950/40 to-slate-900 border-2 border-amber-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5 animate-in fade-in">
          <div className="flex items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/50 flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-lg shadow-amber-500/10">
              {myStanding.rank === 1 ? '🥇' : myStanding.rank === 2 ? '🥈' : '🥉'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Your Outcome: Rank #{myStanding.rank}
                </span>
                <span className="text-[11px] sm:text-xs text-emerald-400 font-semibold">
                  +{myStanding.xp_awarded} Platform XP
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                Congratulations, {myStanding.user_name}!
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300">
                You achieved a podium finish ({myStanding.total_marks} Marks in {myStanding.time_formatted}). Your official certificate is ready.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenCertificate(myStanding)}
            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 transition shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Award className="w-4 h-4 text-slate-950" />
            <span>Download My Official Certificate</span>
          </button>
        </div>
      )}

      {/* Top 3 Podium Celebration Hero */}
      {top3.length > 0 ? (
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-indigo-950/70 via-slate-900 to-slate-950 p-6 md:p-10 shadow-2xl">
          <div className="text-center space-y-2 mb-8">
            <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-4 h-4" /> HALL OF FAME: TOP 3 RANKERS
            </span>
            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Congratulations to Our Sunday Champions!
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Standings determined by highest total marks, with ties broken down to the exact second. Top 3 Rankers earn authentic digital credentials and bonus platform XP!
            </p>
          </div>

          {/* 3-Tier Visual Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto">
            {/* Rank 2 (Silver) */}
            {rank2 ? (
              <div className="order-2 md:order-1 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 text-center shadow-xl space-y-3 relative hover:scale-105 transition transform">
                <div className="w-14 h-14 rounded-full bg-slate-700/80 border-2 border-slate-300 text-slate-200 flex items-center justify-center font-black text-xl mx-auto shadow-lg">
                  2
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Runner Up
                  </span>
                  <h3 className="font-bold text-white text-base mt-0.5">{rank2.user_name}</h3>
                  <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-slate-400" /> {rank2.college_name}
                  </p>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-2.5 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Marks:</span>
                    <strong className="text-white">{rank2.total_marks} / {contest?.total_marks}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time Taken:</span>
                    <span className="font-mono text-slate-300">{rank2.time_formatted}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-300">
                    <span className="text-slate-500">XP Reward:</span>
                    <strong className="text-slate-300">+100 XP</strong>
                  </div>
                </div>

                {isCandidateOwner(rank2) ? (
                  <button
                    onClick={() => handleOpenCertificate(rank2)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-slate-200 to-slate-300 hover:from-white hover:to-slate-200 shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-slate-900" /> View & Download My Certificate
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/80 border border-slate-700/80 flex items-center justify-center gap-1.5">
                    <Medal className="w-3.5 h-3.5 text-slate-400" /> Silver Credential Awarded
                  </div>
                )}
              </div>
            ) : null}

            {/* Rank 1 (Gold - Center & Elevated) */}
            {rank1 ? (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 text-center shadow-2xl shadow-amber-500/20 space-y-4 relative md:-translate-y-4 hover:scale-105 transition transform">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 shadow-md flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> CHAMPION
                </div>

                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-2xl mx-auto shadow-xl">
                  1
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block">
                    1ST PLACE WINNER
                  </span>
                  <h3 className="font-extrabold text-white text-lg mt-0.5">{rank1.user_name}</h3>
                  <p className="text-xs text-amber-200/80 flex items-center justify-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" /> {rank1.college_name}
                  </p>
                </div>

                <div className="bg-slate-950/80 rounded-xl p-3 text-xs text-slate-300 space-y-1.5 border border-amber-500/30">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Marks:</span>
                    <strong className="text-amber-300 font-bold">{rank1.total_marks} / {contest?.total_marks}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fastest Time:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{rank1.time_formatted}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-amber-400 font-bold">
                    <span>Exclusive XP:</span>
                    <span>+150 XP</span>
                  </div>
                </div>

                {isCandidateOwner(rank1) ? (
                  <button
                    onClick={() => handleOpenCertificate(rank1)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-slate-950" /> View & Download My Certificate
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-1.5">
                    <Medal className="w-4 h-4 text-amber-400" /> Gold Credential Awarded
                  </div>
                )}
              </div>
            ) : null}

            {/* Rank 3 (Bronze) */}
            {rank3 ? (
              <div className="order-3 bg-slate-900/90 border border-amber-900/60 rounded-2xl p-5 text-center shadow-xl space-y-3 relative hover:scale-105 transition transform">
                <div className="w-14 h-14 rounded-full bg-amber-900/60 border-2 border-amber-600 text-amber-300 flex items-center justify-center font-black text-xl mx-auto shadow-lg">
                  3
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">
                    2nd Runner Up
                  </span>
                  <h3 className="font-bold text-white text-base mt-0.5">{rank3.user_name}</h3>
                  <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-amber-500" /> {rank3.college_name}
                  </p>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-2.5 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Marks:</span>
                    <strong className="text-white">{rank3.total_marks} / {contest?.total_marks}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time Taken:</span>
                    <span className="font-mono text-slate-300">{rank3.time_formatted}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-amber-500">
                    <span className="text-slate-500">XP Reward:</span>
                    <strong className="text-amber-500">+75 XP</strong>
                  </div>
                </div>

                {isCandidateOwner(rank3) ? (
                  <button
                    onClick={() => handleOpenCertificate(rank3)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-amber-200 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-700/60 shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" /> View & Download My Certificate
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-xl text-xs font-semibold text-amber-400/90 bg-amber-950/30 border border-amber-900/50 flex items-center justify-center gap-1.5">
                    <Medal className="w-3.5 h-3.5 text-amber-500" /> Bronze Credential Awarded
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Full Standings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Full Participant Standings</h2>
            <p className="text-xs text-slate-400">
              Ranked by Total Marks $\rightarrow$ Earliest Completion Time in Seconds
            </p>
          </div>
          <span className="text-xs text-slate-400">{standings.length} Total Competitors</span>
        </div>

        {standings.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No submissions recorded yet for this contest edition.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="p-3 font-semibold">Rank</th>
                  <th className="p-3 font-semibold">Candidate</th>
                  <th className="p-3 font-semibold">College / Organization</th>
                  <th className="p-3 font-semibold text-center">Marks</th>
                  <th className="p-3 font-semibold text-center">Time Taken</th>
                  <th className="p-3 font-semibold text-center">XP Reward</th>
                  <th className="p-3 font-semibold text-right">Certificate</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => {
                  const isTop3 = row.rank <= 3 && row.total_marks > 0;
                  const isOwner = isCandidateOwner(row);

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-800/60 transition ${
                        row.rank === 1
                          ? 'bg-amber-950/20 text-amber-200'
                          : row.rank === 2
                          ? 'bg-slate-800/40 text-slate-200'
                          : row.rank === 3
                          ? 'bg-amber-950/10 text-amber-300'
                          : 'text-slate-300 hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="p-3 font-bold">
                        {row.rank === 1 ? '🥇 1' : row.rank === 2 ? '🥈 2' : row.rank === 3 ? '🥉 3' : `#${row.rank}`}
                      </td>
                      <td className="p-3 font-semibold text-white">
                        <span>{row.user_name}</span>
                        {isOwner && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            You
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">{row.college_name || '—'}</td>
                      <td className="p-3 font-bold text-center text-white">{row.total_marks}</td>
                      <td className="p-3 font-mono text-center text-slate-400">{row.time_formatted}</td>
                      <td className="p-3 font-bold text-center">
                        {row.xp_awarded > 0 ? (
                          <span className="text-amber-400">+{row.xp_awarded} XP</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isTop3 ? (
                          isOwner ? (
                            <button
                              onClick={() => handleOpenCertificate(row)}
                              className="text-xs font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5" /> View Certificate
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-medium">
                              Top 3 Credential
                            </span>
                          )
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Certificate Modal */}
      <ContestCertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        certificate={activeCert}
        rank={activeRank}
        xpAwarded={activeRank === 1 ? 150 : activeRank === 2 ? 100 : 75}
        contestTitle={contest?.title}
      />
    </div>
  );
};
