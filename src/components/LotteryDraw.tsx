import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gift, 
  Sparkles, 
  RotateCcw, 
  Download, 
  Trash2, 
  History, 
  Check, 
  Play, 
  Plus, 
  UserCheck, 
  Users, 
  Shuffle, 
  Award,
  AlertTriangle,
  Building2,
  ListOrdered
} from 'lucide-react';
import { Person, DrawRecord, Prize } from '../types';
import { sounds } from '../utils/audio';
import { exportWinnersToCSV } from '../utils/csv';
import { PRESET_PRIZES } from '../utils/sampleData';
import { WinnerCelebrationModal } from './WinnerCelebrationModal';

interface LotteryDrawProps {
  roster: Person[];
  drawRecords: DrawRecord[];
  setDrawRecords: React.Dispatch<React.SetStateAction<DrawRecord[]>>;
  onGoToRoster: () => void;
}

export const LotteryDraw: React.FC<LotteryDrawProps> = ({
  roster,
  drawRecords,
  setDrawRecords,
  onGoToRoster,
}) => {
  // Mode: allow repeat (重複抽取) or no repeat (不重複抽取)
  const [allowRepeat, setAllowRepeat] = useState<boolean>(false);

  // Prizes
  const [prizes, setPrizes] = useState<Prize[]>(PRESET_PRIZES);
  const [selectedPrizeName, setSelectedPrizeName] = useState<string>(PRESET_PRIZES[0]?.name || '頭獎');
  const [customPrizeInput, setCustomPrizeInput] = useState<string>('');
  const [isCustomPrize, setIsCustomPrize] = useState<boolean>(false);

  // Number of winners to draw this round
  const [drawCount, setDrawCount] = useState<number>(1);

  // Animation and lottery execution state
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollingDisplayNames, setRollingDisplayNames] = useState<string[]>(['準備抽籤...']);
  const [justWonWinners, setJustWonWinners] = useState<Person[]>([]);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Filter for history
  const [historySearch, setHistorySearch] = useState<string>('');

  const animTimerRef = useRef<number | null>(null);

  // Calculate already won member IDs
  const wonMemberIds = useMemo(() => {
    return new Set(drawRecords.map(r => r.winnerId));
  }, [drawRecords]);

  // Eligible pool of candidates based on repeat mode
  const eligibleCandidates = useMemo(() => {
    if (allowRepeat) {
      return roster;
    }
    return roster.filter(p => !wonMemberIds.has(p.id));
  }, [roster, allowRepeat, wonMemberIds]);

  // Cleanup animation timers on unmount
  useEffect(() => {
    return () => {
      if (animTimerRef.current) {
        clearInterval(animTimerRef.current);
      }
    };
  }, []);

  // Fire confetti
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ec4899', '#6366f1', '#10b981', '#3b82f6'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 250);
    } catch {
      // Ignore
    }
  };

  // Execute Lucky Draw Animation
  const startDraw = () => {
    if (isRolling) return;
    if (roster.length === 0) return;

    if (eligibleCandidates.length === 0) {
      alert('所有名單人員皆已獲獎！若欲繼續抽籤，請切換為「允許重複抽取」或清除中獎紀錄。');
      return;
    }

    const targetDrawCount = Math.min(drawCount, eligibleCandidates.length);

    // Pick target winners randomly from eligibleCandidates
    const shuffled = [...eligibleCandidates].sort(() => Math.random() - 0.5);
    const chosenWinners = shuffled.slice(0, targetDrawCount);

    setIsRolling(true);
    setJustWonWinners([]);

    // Sound & Rolling logic with progressive deceleration
    let speed = 45; // ms interval
    let steps = 0;
    const maxSteps = 38; // total animation frames (~2.5 - 3 seconds)

    const tickInterval = () => {
      steps++;
      // Pick random names to display in rolling ticker
      const randomNames = Array.from({ length: targetDrawCount }, () => {
        const rand = roster[Math.floor(Math.random() * roster.length)];
        return `${rand.name}${rand.department ? ` (${rand.department})` : ''}`;
      });
      setRollingDisplayNames(randomNames);

      sounds.playTick(1.0 + (steps / maxSteps) * 0.5);

      if (steps < maxSteps) {
        // Accelerate interval (slow down visually) near the end
        if (steps > 25) {
          speed += 18;
        } else if (steps > 15) {
          speed += 8;
        }
        animTimerRef.current = window.setTimeout(tickInterval, speed);
      } else {
        // Finalize: lock on winners
        setIsRolling(false);
        setRollingDisplayNames(
          chosenWinners.map(w => `${w.name}${w.department ? ` (${w.department})` : ''}`)
        );
        setJustWonWinners(chosenWinners);

        // Record to history
        const activePrize = isCustomPrize ? (customPrizeInput.trim() || '自訂獎項') : selectedPrizeName;
        const newRecords: DrawRecord[] = chosenWinners.map(w => ({
          id: `rec-${Date.now()}-${w.id}-${Math.random().toString(36).substring(2, 6)}`,
          prizeName: activePrize,
          winnerId: w.id,
          winnerName: w.name,
          winnerDepartment: w.department,
          timestamp: Date.now(),
        }));

        setDrawRecords(prev => [...newRecords, ...prev]);

        // Celebration
        sounds.playWin();
        triggerConfetti();
        setShowCelebration(true);
      }
    };

    animTimerRef.current = window.setTimeout(tickInterval, speed);
  };

  const handleClearHistory = () => {
    if (window.confirm('確定要清除所有中獎紀錄嗎？')) {
      setDrawRecords([]);
      setJustWonWinners([]);
      setRollingDisplayNames(['準備抽籤...']);
    }
  };

  const handleDeleteRecord = (id: string) => {
    setDrawRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleAddCustomPrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrizeInput.trim()) return;
    const newPrize: Prize = {
      id: `p-${Date.now()}`,
      name: customPrizeInput.trim(),
      quantity: 1,
    };
    setPrizes(prev => [...prev, newPrize]);
    setSelectedPrizeName(newPrize.name);
    setIsCustomPrize(false);
    setCustomPrizeInput('');
  };

  // Filtered draw records for search
  const filteredRecords = useMemo(() => {
    if (!historySearch.trim()) return drawRecords;
    const q = historySearch.toLowerCase();
    return drawRecords.filter(
      r =>
        r.winnerName.toLowerCase().includes(q) ||
        r.prizeName.toLowerCase().includes(q) ||
        (r.winnerDepartment && r.winnerDepartment.toLowerCase().includes(q))
    );
  }, [drawRecords, historySearch]);

  const activePrizeTitle = isCustomPrize
    ? customPrizeInput.trim() || '自訂獎品'
    : selectedPrizeName;

  return (
    <div className="space-y-6">
      {/* Winner Celebration Modal Popup */}
      <WinnerCelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        prizeName={activePrizeTitle}
        winners={justWonWinners}
        onRedraw={() => {
          setShowCelebration(false);
          startDraw();
        }}
        onNextDraw={() => setShowCelebration(false)}
      />

      {/* Warning if no roster */}
      {roster.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 text-sm">尚未建立人員名單</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              抽籤前請先至「名單來源」上傳 CSV 或載入示範名單。
            </p>
          </div>
          <button
            onClick={onGoToRoster}
            className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition whitespace-nowrap"
          >
            前往名單來源
          </button>
        </div>
      )}

      {/* Lucky Draw Stage (Hero Card) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Control Bar: Mode Toggle & Pool status */}
        <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                獎品隨機抽籤
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                動態數位輪播抽籤 · 支援多名額批次抽取與防重複機制設定
              </p>
            </div>
          </div>

          {/* Repeat Mode Switch (CRITICAL USER REQUIREMENT) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
            <button
              id="mode-no-repeat-btn"
              onClick={() => setAllowRepeat(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !allowRepeat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>不重複抽取 (獲獎移出)</span>
            </button>
            <button
              id="mode-repeat-btn"
              onClick={() => setAllowRepeat(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                allowRepeat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>允許重複抽取</span>
            </button>
          </div>
        </div>

        {/* Settings & Configuration Row */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Prize selection */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. 選擇或輸入欲抽取的獎項
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px]">
                {isCustomPrize ? (
                  <input
                    type="text"
                    placeholder="輸入自訂獎項名稱，例：特別加碼獎 $2,000"
                    value={customPrizeInput}
                    onChange={(e) => setCustomPrizeInput(e.target.value)}
                    className="w-full text-sm px-3.5 py-2 rounded-xl border border-blue-400 ring-2 ring-blue-500/10 focus:outline-hidden"
                  />
                ) : (
                  <select
                    value={selectedPrizeName}
                    onChange={(e) => setSelectedPrizeName(e.target.value)}
                    className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium text-slate-800"
                  >
                    {prizes.map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsCustomPrize(!isCustomPrize)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition whitespace-nowrap"
              >
                {isCustomPrize ? '選擇既有獎項' : '+ 自訂獎項'}
              </button>
            </div>
          </div>

          {/* Draw quantity */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. 本輪抽取名額
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 5].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setDrawCount(cnt)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    drawCount === cnt
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  {cnt} 位
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={Math.max(1, eligibleCandidates.length)}
                value={drawCount}
                onChange={(e) => setDrawCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 py-1.5 px-2 text-center text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 text-slate-800"
                title="自訂抽取人數"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Rolling Stage Display (Professional Dark Technical Terminal) */}
        <div className="p-6 sm:p-10 bg-slate-900 text-white text-center relative overflow-hidden [background-image:radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]">
          {/* Eyebrow badge / Technical indicator */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-1 mb-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-blue-400 font-bold">
              RANDOM SELECTOR / 隨機開獎機
            </span>
          </div>

          {/* Status Badges */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 mb-6">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-700 backdrop-blur-md shadow-2xs">
              當前抽獎：<span className="text-amber-300 font-bold">{activePrizeTitle}</span>
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-700 backdrop-blur-md shadow-2xs">
              候選母體：
              <span className="text-emerald-400 font-bold ml-1">
                {eligibleCandidates.length}
              </span>
              {' / '}
              <span>{roster.length} 人</span>
              {!allowRepeat && wonMemberIds.size > 0 && (
                <span className="text-slate-400 ml-1">
                  ({wonMemberIds.size} 人已獲獎)
                </span>
              )}
            </span>
          </div>

          {/* Animated Rolling Reel Window */}
          <div className="relative z-10 max-w-2xl mx-auto my-3">
            <div className="bg-slate-950/85 border border-blue-500/30 shadow-[0_0_35px_rgba(59,130,246,0.15)] rounded-2xl p-6 sm:p-8 backdrop-blur-md">
              {drawCount === 1 ? (
                <div className="min-h-[90px] flex flex-col items-center justify-center">
                  <div
                    className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-wider transition-all duration-75 ${
                      isRolling ? 'scale-105 text-amber-300 animate-pulse' : 'text-white'
                    }`}
                  >
                    {rollingDisplayNames[0] || '等待抽籤'}
                  </div>
                  {isRolling && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-blue-300 tracking-wider font-medium">
                      <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>正在急速隨機抽取中...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-blue-300">
                    一次抽取 {drawCount} 位幸運得主
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
                    {rollingDisplayNames.map((name, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-sm sm:text-base font-bold transition-all ${
                          isRolling
                            ? 'bg-blue-950/60 border-blue-400/40 text-amber-300'
                            : 'bg-slate-900 border-slate-700/80 text-white shadow-xs'
                        }`}
                      >
                        <span className="text-xs text-slate-400 mr-2 font-mono">#{i + 1}</span>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Big Action Button */}
          <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              id="start-draw-btn"
              disabled={isRolling || roster.length === 0 || eligibleCandidates.length === 0}
              onClick={startDraw}
              className={`inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 ${
                isRolling || roster.length === 0 || eligibleCandidates.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
              }`}
            >
              <Play className={`w-4 h-4 fill-current ${isRolling ? 'animate-spin' : ''}`} />
              <span>{isRolling ? '抽籤開獎中...' : `立即抽出 ${drawCount} 位得獎者`}</span>
            </button>

            {justWonWinners.length > 0 && !isRolling && (
              <button
                onClick={() => setShowCelebration(true)}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>查看本次得獎卡片</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Draw History & Winner Records */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
              <History className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">抽獎歷史紀錄</h3>
              <p className="text-xs text-slate-500">
                共產生 {drawRecords.length} 筆中獎名單
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {drawRecords.length > 0 && (
              <>
                <button
                  id="export-winners-btn"
                  onClick={() => exportWinnersToCSV(drawRecords)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  匯出得獎 CSV
                </button>
                <button
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清除紀錄
                </button>
              </>
            )}
          </div>
        </div>

        {/* History Search */}
        {drawRecords.length > 5 && (
          <div>
            <input
              type="text"
              placeholder="搜尋得獎者姓名或獎項..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        )}

        {/* History List or Empty State */}
        {drawRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            目前尚無中獎紀錄，點擊上方按鈕開始抽獎！
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {filteredRecords.map((record, idx) => (
              <div
                key={record.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-400 w-6">
                    #{drawRecords.length - idx}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {record.winnerName}
                      </span>
                      {record.winnerDepartment && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200/60">
                          {record.winnerDepartment}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
                        <Gift className="w-3 h-3 text-blue-600" />
                        {record.prizeName}
                      </span>
                      <span className="text-slate-400">
                        {new Date(record.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    title="移除此筆紀錄"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
