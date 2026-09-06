import React, { useState, useEffect } from 'react';
import { Person, DrawRecord } from './types';
import { Header } from './components/Header';
import { RosterManager } from './components/RosterManager';
import { LotteryDraw } from './components/LotteryDraw';
import { TeamGrouping } from './components/TeamGrouping';
import { SAMPLE_MEMBERS } from './utils/sampleData';
import { sounds } from './utils/audio';

const STORAGE_KEY_ROSTER = 'hr_assistant_roster_v1';
const STORAGE_KEY_RECORDS = 'hr_assistant_draw_records_v1';
const STORAGE_KEY_MUTED = 'hr_assistant_muted_v1';

export default function App() {
  // Active Navigation Tab: 'roster' | 'lottery' | 'grouping'
  const [activeTab, setActiveTab] = useState<'roster' | 'lottery' | 'grouping'>('lottery');

  // Master Roster State
  const [roster, setRoster] = useState<Person[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROSTER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    // Default to sample data so the app has content ready to test right away
    return SAMPLE_MEMBERS;
  });

  // Lottery Draw Records
  const [drawRecords, setDrawRecords] = useState<DrawRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Sound Muted State
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
    } catch {
      return false;
    }
  });

  // Synchronize audio sound mute
  useEffect(() => {
    sounds.setMuted(isMuted);
  }, [isMuted]);

  // Persist roster
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(roster));
    } catch {
      // Ignore storage errors
    }
  }, [roster]);

  // Persist records
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(drawRecords));
    } catch {
      // Ignore
    }
  }, [drawRecords]);

  // Persist muted
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, isMuted ? 'true' : 'false');
    } catch {
      // Ignore
    }
  }, [isMuted]);

  const handleLoadSample = () => {
    setRoster(SAMPLE_MEMBERS);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        memberCount={roster.length}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onLoadSample={handleLoadSample}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'roster' && (
          <RosterManager
            roster={roster}
            setRoster={setRoster}
            onGoToLottery={() => setActiveTab('lottery')}
            onGoToGrouping={() => setActiveTab('grouping')}
          />
        )}

        {activeTab === 'lottery' && (
          <LotteryDraw
            roster={roster}
            drawRecords={drawRecords}
            setDrawRecords={setDrawRecords}
            onGoToRoster={() => setActiveTab('roster')}
          />
        )}

        {activeTab === 'grouping' && (
          <TeamGrouping
            roster={roster}
            onGoToRoster={() => setActiveTab('roster')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">HR 活動抽籤與自動分組系統</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Professional Polish Edition</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-400">
            <span>支援 CSV / 貼上名單</span>
            <span>·</span>
            <span>可重複 / 不重複開獎動畫</span>
            <span>·</span>
            <span>自訂人數 / 組數視覺化分組</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
