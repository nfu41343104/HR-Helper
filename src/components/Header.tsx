import React from 'react';
import { Gift, Users, Volume2, VolumeX, Sparkles, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { sounds } from '../utils/audio';

interface HeaderProps {
  activeTab: 'roster' | 'lottery' | 'grouping';
  setActiveTab: (tab: 'roster' | 'lottery' | 'grouping') => void;
  memberCount: number;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onLoadSample: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  memberCount,
  isMuted,
  setIsMuted,
  onLoadSample,
}) => {
  const toggleSound = () => {
    const nextState = !isMuted;
    sounds.setMuted(nextState);
    setIsMuted(nextState);
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Organization Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs shadow-blue-500/20">
              HR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                  HR 活動工作台
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  Professional Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                名單匯入 · 獎品隨機抽籤 · 智慧團隊自動分組
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/70">
            <button
              id="tab-roster-btn"
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'roster'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>名單來源</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                  memberCount > 0
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {memberCount}
              </span>
            </button>

            <button
              id="tab-lottery-btn"
              onClick={() => setActiveTab('lottery')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'lottery'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Gift className="w-4 h-4 text-blue-600" />
              <span>獎品抽籤</span>
            </button>

            <button
              id="tab-grouping-btn"
              onClick={() => setActiveTab('grouping')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'grouping'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>自動分組</span>
            </button>
          </nav>

          {/* Quick Utility Actions */}
          <div className="flex items-center gap-2">
            {memberCount === 0 && (
              <button
                onClick={onLoadSample}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                載入示範名單
              </button>
            )}

            <button
              id="toggle-sound-btn"
              onClick={toggleSound}
              title={isMuted ? '開啟抽獎音效' : '抽獎音效靜音'}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

