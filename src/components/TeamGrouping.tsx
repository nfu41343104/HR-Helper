import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Shuffle, 
  Download, 
  Copy, 
  Check, 
  Crown, 
  Building2, 
  ArrowRightLeft, 
  Sparkles, 
  AlertCircle,
  Pencil,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Person, TeamGroup, GroupingMethod, GroupingStrategy } from '../types';
import { exportGroupsToCSV, formatGroupsAsText } from '../utils/csv';
import { sounds } from '../utils/audio';

interface TeamGroupingProps {
  roster: Person[];
  onGoToRoster: () => void;
}

const COLOR_PALETTES = [
  { border: 'border-blue-200', bg: 'bg-blue-50/30', header: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  { border: 'border-slate-300', bg: 'bg-slate-50/40', header: 'bg-slate-800', text: 'text-slate-700', badge: 'bg-slate-200 text-slate-800' },
  { border: 'border-emerald-200', bg: 'bg-emerald-50/30', header: 'bg-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  { border: 'border-indigo-200', bg: 'bg-indigo-50/30', header: 'bg-indigo-600', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  { border: 'border-teal-200', bg: 'bg-teal-50/30', header: 'bg-teal-600', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-800' },
  { border: 'border-sky-200', bg: 'bg-sky-50/30', header: 'bg-sky-600', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-800' },
  { border: 'border-amber-200', bg: 'bg-amber-50/30', header: 'bg-amber-600', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  { border: 'border-rose-200', bg: 'bg-rose-50/30', header: 'bg-rose-600', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800' },
];

export const TeamGrouping: React.FC<TeamGroupingProps> = ({
  roster,
  onGoToRoster,
}) => {
  // Grouping configuration
  const [method, setMethod] = useState<GroupingMethod>('by_member_count');
  const [sizeParam, setSizeParam] = useState<number>(4); // e.g. 4 people per group or 4 groups
  const [strategy, setStrategy] = useState<GroupingStrategy>('department_balanced');
  const [autoAssignLeader, setAutoAssignLeader] = useState<boolean>(true);
  const [remainderDistribution, setRemainderDistribution] = useState<'balance' | 'separate'>('balance');

  // Generated groups state
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);

  // Editing team name
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>('');

  // Moving member popup state
  const [movingMemberId, setMovingMemberId] = useState<string | null>(null);

  // Calculation forecast
  const forecast = useMemo(() => {
    const total = roster.length;
    if (total === 0) return { groupCount: 0, sizes: [] };

    if (method === 'by_member_count') {
      const perGroup = Math.max(1, sizeParam);
      if (remainderDistribution === 'separate') {
        const fullGroups = Math.floor(total / perGroup);
        const remainder = total % perGroup;
        const groupCount = fullGroups + (remainder > 0 ? 1 : 0);
        const sizes = Array(fullGroups).fill(perGroup);
        if (remainder > 0) sizes.push(remainder);
        return { groupCount, sizes, remainder };
      } else {
        // Balance remainders into groups
        const numGroups = Math.max(1, Math.round(total / perGroup));
        const base = Math.floor(total / numGroups);
        const rem = total % numGroups;
        const sizes = Array.from({ length: numGroups }, (_, i) => base + (i < rem ? 1 : 0));
        return { groupCount: numGroups, sizes, remainder: rem };
      }
    } else {
      // By group count
      const numGroups = Math.max(1, Math.min(sizeParam, total));
      const base = Math.floor(total / numGroups);
      const rem = total % numGroups;
      const sizes = Array.from({ length: numGroups }, (_, i) => base + (i < rem ? 1 : 0));
      return { groupCount: numGroups, sizes, remainder: rem };
    }
  }, [roster.length, method, sizeParam, remainderDistribution]);

  // Execute grouping algorithm
  const generateGroups = () => {
    if (roster.length === 0) return;

    setIsShuffling(true);
    sounds.playShuffle();

    setTimeout(() => {
      let pool: Person[] = [...roster];

      if (strategy === 'department_balanced') {
        // Group by department then round-robin distribute to mix departments
        const deptMap: Record<string, Person[]> = {};
        pool.forEach(p => {
          const dept = p.department || '未分配';
          if (!deptMap[dept]) deptMap[dept] = [];
          deptMap[dept].push(p);
        });

        // Shuffle each department internally
        Object.values(deptMap).forEach(list => list.sort(() => Math.random() - 0.5));

        // Interleave members from different departments
        const interleaved: Person[] = [];
        const depts = Object.keys(deptMap).sort(() => Math.random() - 0.5);
        let hasMore = true;
        let round = 0;
        while (hasMore) {
          hasMore = false;
          depts.forEach(d => {
            if (deptMap[d].length > round) {
              interleaved.push(deptMap[d][round]);
              hasMore = true;
            }
          });
          round++;
        }
        pool = interleaved;
      } else {
        // Pure random shuffle
        pool.sort(() => Math.random() - 0.5);
      }

      // Allocate into groups based on calculated sizes
      const { groupCount, sizes } = forecast;
      const newGroups: TeamGroup[] = [];
      let pointer = 0;

      for (let i = 0; i < groupCount; i++) {
        const count = sizes[i] || 0;
        const members = pool.slice(pointer, pointer + count);
        pointer += count;

        const colorIndex = i % COLOR_PALETTES.length;
        const leaderId = autoAssignLeader && members.length > 0
          ? members[Math.floor(Math.random() * members.length)].id
          : undefined;

        newGroups.push({
          id: `group-${i + 1}-${Date.now()}`,
          name: `第 ${i + 1} 組`,
          color: colorIndex.toString(),
          members,
          leaderId,
        });
      }

      setGroups(newGroups);
      setHasGenerated(true);
      setIsShuffling(false);
    }, 400);
  };

  const handleCopyText = () => {
    if (groups.length === 0) return;
    const text = formatGroupsAsText(groups);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleToggleLeader = (groupId: string, memberId: string) => {
    setGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          leaderId: g.leaderId === memberId ? undefined : memberId,
        };
      })
    );
  };

  const handleStartRename = (group: TeamGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleSaveRename = () => {
    if (!editingGroupId) return;
    setGroups(prev =>
      prev.map(g => (g.id === editingGroupId ? { ...g, name: editingGroupName.trim() || g.name } : g))
    );
    setEditingGroupId(null);
  };

  const handleMoveMember = (targetGroupId: string, member: Person, currentGroupId: string) => {
    if (targetGroupId === currentGroupId) {
      setMovingMemberId(null);
      return;
    }

    setGroups(prev => {
      return prev.map(g => {
        if (g.id === currentGroupId) {
          return {
            ...g,
            members: g.members.filter(m => m.id !== member.id),
            leaderId: g.leaderId === member.id ? undefined : g.leaderId,
          };
        }
        if (g.id === targetGroupId) {
          return {
            ...g,
            members: [...g.members, member],
          };
        }
        return g;
      });
    });

    setMovingMemberId(null);
  };

  return (
    <div className="space-y-6">
      {/* Warning if no roster */}
      {roster.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 text-sm">尚未建立人員名單</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              分組前請先至「名單來源」上傳 CSV 或載入示範名單。
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

      {/* Grouping Configuration Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">自動分組設定</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                彈性設定每組人數或目標組數，支援部門交叉打散與名單視覺化調整
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium self-start sm:self-auto border border-slate-200/60">
            名單庫人數：<span className="font-bold text-slate-900">{roster.length}</span> 人
          </div>
        </div>

        {/* Setting Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Method 1: By member count or group count */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. 分組方式
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => {
                  setMethod('by_member_count');
                  if (sizeParam > 12) setSizeParam(4);
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  method === 'by_member_count'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                依「每組人數」
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('by_group_count');
                  if (sizeParam > 12) setSizeParam(4);
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  method === 'by_group_count'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                依「指定組數」
              </button>
            </div>

            {/* Quick buttons & number input */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                <span>{method === 'by_member_count' ? '設定每組幾人：' : '設定要分成幾組：'}</span>
                <span className="font-bold text-blue-600 text-sm">{sizeParam} {method === 'by_member_count' ? '人' : '組'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSizeParam(num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                      sizeParam === num
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, roster.length)}
                  value={sizeParam}
                  onChange={(e) => setSizeParam(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 py-1.5 px-2 text-center text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-800"
                  title="自訂數值"
                />
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. 團隊組成策略
            </label>
            <div className="space-y-2">
              <label
                onClick={() => setStrategy('department_balanced')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  strategy === 'department_balanced'
                    ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  checked={strategy === 'department_balanced'}
                  onChange={() => setStrategy('department_balanced')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>部門均衡打散</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-semibold border border-blue-200/60">HR 推薦</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    盡可能將相同部門同仁分在不同組，促進跨部門交流
                  </p>
                </div>
              </label>

              <label
                onClick={() => setStrategy('random')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  strategy === 'random'
                    ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  checked={strategy === 'random'}
                  onChange={() => setStrategy('random')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">完全隨機打散</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    所有同仁機率均等，不參考部門資料
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Additional Options & Live Calculation Forecast */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. 進階選項 & 預估結果
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAssignLeader}
                  onChange={(e) => setAutoAssignLeader(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>自動為各組隨機指派一位隊長 👑</span>
              </label>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                即時分組試算
              </div>
              <p className="text-slate-600 leading-relaxed">
                共 <span className="font-bold text-slate-900">{roster.length}</span> 人
                {roster.length > 0 && (
                  <>
                    ，預計產生 <span className="font-bold text-blue-600">{forecast.groupCount}</span> 組
                    （各組人數：{forecast.sizes.join('、')} 人）
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Generate Button Action */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {hasGenerated ? `目前已產生 ${groups.length} 個團隊` : '確認設定後點擊按鈕立即分組'}
          </div>

          <div className="flex items-center gap-2">
            {hasGenerated && (
              <button
                onClick={generateGroups}
                disabled={isShuffling || roster.length === 0}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isShuffling ? 'animate-spin' : ''}`} />
                重新洗牌分組
              </button>
            )}

            <button
              id="generate-groups-btn"
              disabled={isShuffling || roster.length === 0}
              onClick={generateGroups}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition inline-flex items-center gap-2 ${
                isShuffling || roster.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 active:scale-95'
              }`}
            >
              <Shuffle className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>{isShuffling ? '分組運算中...' : '開始自動分組'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visualized Group Results Grid */}
      {hasGenerated && groups.length > 0 && (
        <div className="space-y-4">
          {/* Top Bar for Results Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">分組視覺化成果</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                共 {groups.length} 組 / {roster.length} 人
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="copy-groups-btn"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? '已複製到剪貼簿！' : '複製文字 (Slack/Teams)'}</span>
              </button>

              <button
                id="export-groups-btn"
                onClick={() => exportGroupsToCSV(groups)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出 CSV</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groups.map((group, groupIdx) => {
              const palette = COLOR_PALETTES[groupIdx % COLOR_PALETTES.length];

              return (
                <div
                  key={group.id}
                  className={`rounded-2xl border ${palette.border} ${palette.bg} shadow-xs overflow-hidden flex flex-col transition-all hover:shadow-md`}
                >
                  {/* Card Header */}
                  <div className={`${palette.header} px-4 py-3 text-white flex items-center justify-between shadow-xs`}>
                    <div className="flex items-center gap-2 flex-1">
                      {editingGroupId === group.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                            className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded-md w-full focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveRename}
                            className="p-1 text-white hover:bg-white/20 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm tracking-wide">{group.name}</span>
                          <button
                            onClick={() => handleStartRename(group)}
                            title="修改組名"
                            className="p-1 opacity-70 hover:opacity-100 transition rounded"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                      {group.members.length} 人
                    </div>
                  </div>

                  {/* Members list */}
                  <div className="p-4 space-y-2 flex-1 bg-white/90">
                    {group.members.map((member) => {
                      const isLeader = group.leaderId === member.id;

                      return (
                        <div
                          key={member.id}
                          className={`p-2.5 rounded-xl border transition flex items-center justify-between ${
                            isLeader
                              ? 'bg-amber-50/70 border-amber-300/80 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Avatar or Leader Crown */}
                            <button
                              onClick={() => handleToggleLeader(group.id, member.id)}
                              title={isLeader ? '點擊取消隊長身份' : '點擊設為此組隊長'}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition ${
                                isLeader
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-slate-200 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
                              }`}
                            >
                              {isLeader ? <Crown className="w-4 h-4 fill-current" /> : member.name.slice(0, 1)}
                            </button>

                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs">
                                  {member.name}
                                </span>
                                {isLeader && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold">
                                    隊長
                                  </span>
                                )}
                              </div>
                              {member.department && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-0.5 truncate">
                                  <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{member.department}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Move to another group menu */}
                          <div className="relative flex-shrink-0 ml-2">
                            {movingMemberId === member.id ? (
                              <div className="flex items-center gap-1 bg-white border border-slate-300 shadow-lg rounded-lg p-1 z-20">
                                <span className="text-[10px] text-slate-500 font-medium ml-1">移至:</span>
                                {groups.map(targetG => {
                                  if (targetG.id === group.id) return null;
                                  return (
                                    <button
                                      key={targetG.id}
                                      onClick={() => handleMoveMember(targetG.id, member, group.id)}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-600 hover:text-white font-semibold transition"
                                    >
                                      {targetG.name.replace('第', '').replace('組', '')}
                                    </button>
                                  );
                                })}
                                <button
                                  onClick={() => setMovingMemberId(null)}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 px-1"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setMovingMemberId(member.id)}
                                title="換到其他組"
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Footer: department distribution breakdown */}
                  <div className="px-4 py-2 bg-slate-50/90 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap items-center gap-1">
                    <span className="font-medium">部門構成:</span>
                    {Array.from(new Set(group.members.map(m => m.department || '未分配'))).map(dept => (
                      <span key={dept} className="px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600">
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
