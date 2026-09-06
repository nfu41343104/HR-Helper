import React from 'react';
import { Trophy, Sparkles, X, Check, RotateCcw } from 'lucide-react';
import { Person } from '../types';

interface WinnerCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeName: string;
  winners: Person[];
  onRedraw?: () => void;
  onNextDraw?: () => void;
}

export const WinnerCelebrationModal: React.FC<WinnerCelebrationModalProps> = ({
  isOpen,
  onClose,
  prizeName,
  winners,
  onRedraw,
  onNextDraw,
}) => {
  if (!isOpen || winners.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-center relative">
        {/* Top Header: Dark Slate Corporate Stage with Gold Accent */}
        <div className="bg-slate-900 p-7 text-white relative [background-image:radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shadow-inner">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold tracking-wider uppercase mb-1.5">
            恭喜幸運得獎！
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            {prizeName}
          </h3>
        </div>

        {/* Winners List / Card Body */}
        <div className="p-6 sm:p-7 space-y-4">
          <div className="text-xs font-bold text-slate-500 tracking-wider uppercase">
            幸運得主 ({winners.length} 位)
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {winners.map((winner, index) => (
              <div
                key={winner.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {winner.name.slice(0, 1)}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900 text-sm">
                      {winner.name}
                    </div>
                    {winner.department && (
                      <div className="text-xs text-slate-500">
                        {winner.department}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>第 {index + 1} 位</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            {onRedraw && (
              <button
                onClick={onRedraw}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                重新抽取此獎項
              </button>
            )}

            <button
              onClick={onNextDraw || onClose}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs sm:text-sm hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
            >
              <Check className="w-4 h-4" />
              確定並收下紀錄
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
