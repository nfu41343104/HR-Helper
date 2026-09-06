import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Sparkles, 
  Trash2, 
  UserPlus, 
  Search, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Users,
  ArrowRight,
  Gift,
  Building2,
  Mail,
  AlertTriangle,
  UserX,
  CopyCheck
} from 'lucide-react';
import { Person } from '../types';
import { parseRosterInput, exportRosterToCSV } from '../utils/csv';
import { SAMPLE_MEMBERS } from '../utils/sampleData';

interface RosterManagerProps {
  roster: Person[];
  setRoster: React.Dispatch<React.SetStateAction<Person[]>>;
  onGoToLottery: () => void;
  onGoToGrouping: () => void;
}

export const RosterManager: React.FC<RosterManagerProps> = ({
  roster,
  setRoster,
  onGoToLottery,
  onGoToGrouping,
}) => {
  const [importMode, setImportMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Manual add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze duplicates in roster
  const duplicateStats = useMemo(() => {
    // Map from normalized name (trimmed, lowercased) to occurrences & metadata
    const nameMap = new Map<string, { count: number; firstId: string; members: Person[] }>();
    
    roster.forEach(m => {
      const key = m.name.trim().toLowerCase();
      const existing = nameMap.get(key);
      if (!existing) {
        nameMap.set(key, { count: 1, firstId: m.id, members: [m] });
      } else {
        existing.count += 1;
        existing.members.push(m);
      }
    });

    let duplicateNamesCount = 0; // Number of unique names that appear > 1
    let redundantEntriesCount = 0; // Total extra redundant rows to remove
    const duplicateKeySet = new Set<string>();

    nameMap.forEach((val, key) => {
      if (val.count > 1) {
        duplicateNamesCount += 1;
        redundantEntriesCount += (val.count - 1);
        duplicateKeySet.add(key);
      }
    });

    return {
      nameMap,
      duplicateNamesCount,
      redundantEntriesCount,
      duplicateKeySet,
    };
  }, [roster]);

  // Derive department statistics
  const departments = useMemo(() => {
    const counts: Record<string, number> = {};
    roster.forEach(m => {
      const dept = m.department || '未分配部門';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [roster]);

  // Filtered roster for search, dept filter & duplicate filter
  const filteredRoster = useMemo(() => {
    return roster.filter(m => {
      const normName = m.name.trim().toLowerCase();

      // If filtering only duplicates
      if (showOnlyDuplicates && !duplicateStats.duplicateKeySet.has(normName)) {
        return false;
      }

      const matchesSearch = 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesDept = 
        selectedDept === 'all' || 
        (selectedDept === '未分配部門' ? !m.department : m.department === selectedDept);

      return matchesSearch && matchesDept;
    });
  }, [roster, searchQuery, selectedDept, showOnlyDuplicates, duplicateStats]);

  // Handle removing all duplicate names, keeping the first occurrence of each unique name
  const handleRemoveDuplicates = () => {
    if (duplicateStats.redundantEntriesCount === 0) {
      setNotification({
        type: 'success',
        message: '目前名單無重複姓名，所有人名皆為唯一！',
      });
      return;
    }

    const seen = new Set<string>();
    const deduplicated: Person[] = [];
    let removedCount = 0;

    roster.forEach(person => {
      const key = person.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(person);
      } else {
        removedCount += 1;
      }
    });

    setRoster(deduplicated);
    setShowOnlyDuplicates(false);
    setNotification({
      type: 'success',
      message: `已成功清除 ${removedCount} 筆重複姓名！保留首筆資料，目前名單為 ${deduplicated.length} 位唯一同仁。`,
    });
  };

  // File upload handler
  const handleFileProcess = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      const { persons, message } = parseRosterInput(content);
      if (persons.length > 0) {
        setRoster(persons);
        setNotification({ type: 'success', message: `${message}，已更新名單！` });
      } else {
        setNotification({ type: 'error', message: '未能從此檔案讀取到有效姓名，請檢查檔案格式。' });
      }
    };
    reader.onerror = () => {
      setNotification({ type: 'error', message: '讀取檔案發生錯誤，請重試。' });
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      setNotification({ type: 'error', message: '請先貼上或輸入人員名單' });
      return;
    }
    const { persons, message } = parseRosterInput(pastedText);
    if (persons.length > 0) {
      setRoster(persons);
      setPastedText('');
      setNotification({ type: 'success', message: `${message}，已成功載入！` });
    } else {
      setNotification({ type: 'error', message: '未能解析出有效姓名，請每行輸入一個姓名。' });
    }
  };

  const handleLoadSample = () => {
    setRoster(SAMPLE_MEMBERS);
    setShowOnlyDuplicates(false);
    setNotification({ type: 'success', message: `已成功載入示範名單共 ${SAMPLE_MEMBERS.length} 位同仁！` });
  };

  const handleLoadSampleWithDuplicates = () => {
    const sampleWithDupes: Person[] = [
      ...SAMPLE_MEMBERS.slice(0, 8),
      { id: `dup-${Date.now()}-1`, name: '陳建銘', department: '人力資源部', email: 'jm.chen.dup@company.com' },
      { id: `dup-${Date.now()}-2`, name: '林雅婷', department: '人力資源部', email: 'yt.lin.2@company.com' },
      { id: `dup-${Date.now()}-3`, name: '陳建銘', department: '研發工程支援組' },
      ...SAMPLE_MEMBERS.slice(8, 14),
      { id: `dup-${Date.now()}-4`, name: '張家瑋', department: '研發工程部' },
    ];
    setRoster(sampleWithDupes);
    setShowOnlyDuplicates(false);
    setNotification({
      type: 'warning',
      message: '已載入測試名單，其中包含多筆重複姓名（陳建銘 3 筆、林雅婷 2 筆、張家瑋 2 筆），供您體驗重複姓名標示與一鍵去重！',
    });
  };

  const handleClearAll = () => {
    if (window.confirm('確定要清空目前的人員名單嗎？此操作無法還原。')) {
      setRoster([]);
      setShowOnlyDuplicates(false);
      setNotification({ type: 'success', message: '已清空名單' });
    }
  };

  const handleDeleteMember = (id: string) => {
    setRoster(prev => prev.filter(m => m.id !== id));
  };

  const handleAddSingleMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newMember: Person = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newName.trim(),
      department: newDept.trim() || undefined,
      email: newEmail.trim() || undefined,
    };

    setRoster(prev => [newMember, ...prev]);
    setNewName('');
    setNewDept('');
    setNewEmail('');
    setShowAddForm(false);
    setNotification({ type: 'success', message: `已新增同仁：${newMember.name}` });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : notification.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border border-amber-300'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : notification.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs text-slate-500 hover:text-slate-800 underline ml-4"
          >
            關閉
          </button>
        </div>
      )}

      {/* Import Section Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              名單來源管理
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              上傳 CSV 檔案或直接貼上同仁姓名，系統將自動解析為抽籤與分組的資料池
            </p>
          </div>

          {/* Load Sample Data Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="load-sample-btn"
              onClick={handleLoadSample}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              載入 24 位標準名單
            </button>
            <button
              id="load-sample-dupes-btn"
              onClick={handleLoadSampleWithDuplicates}
              title="載入含重複姓名的示範資料，立即測試重複標記與清除功能"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 transition shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              載入含重複名單 (體驗去重)
            </button>
          </div>
        </div>

        {/* Tab selection for Import Mode */}
        <div className="mt-5">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-md">
            <button
              onClick={() => setImportMode('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition ${
                importMode === 'upload'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              上傳 CSV 檔案
            </button>
            <button
              onClick={() => setImportMode('paste')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition ${
                importMode === 'paste'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              貼上姓名名單
            </button>
          </div>

          {/* Mode 1: CSV Upload */}
          {importMode === 'upload' && (
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div
                id="csv-dropzone"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-800 text-base">點擊選擇檔案 或 將 CSV 拖曳至此</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  支援 .csv 或 .txt 格式。系統會自動辨識包含「姓名」、「部門」、「Email/工號」的欄位標題。
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                  <span>範例欄位：姓名, 部門, 信箱</span>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Paste names */}
          {importMode === 'paste' && (
            <div className="mt-4 space-y-3">
              <textarea
                id="paste-names-textarea"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="請在此直接貼上同仁名單，一行一個姓名；亦可直接貼上「姓名, 部門」例如：&#10;王小明&#10;李美華, 行銷部&#10;張大千, 研發工程部&#10;陳欣怡, 人資部"
                rows={5}
                className="w-full text-sm p-3.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 font-mono resize-y"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  可直接從 Excel 或 Google Sheets 複製兩欄貼上，支援逗點或 Tab 分隔。
                </span>
                <button
                  id="submit-paste-btn"
                  onClick={handlePasteSubmit}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-xs"
                >
                  確認解析並匯入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roster Overview & Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">目前名單庫</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {roster.length} 位人員
                </span>
                {duplicateStats.duplicateNamesCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {duplicateStats.duplicateNamesCount} 組重複 ({duplicateStats.redundantEntriesCount} 筆)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                包含 {Object.keys(departments).length} 個部門類別
                {duplicateStats.redundantEntriesCount > 0 && (
                  <span className="text-amber-700 font-medium ml-1">
                    · 存在重複姓名，可點擊「清除重複名字」
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Actions on Roster */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Button to remove duplicate names */}
            <button
              id="remove-duplicates-btn"
              type="button"
              onClick={handleRemoveDuplicates}
              disabled={duplicateStats.redundantEntriesCount === 0}
              title={
                duplicateStats.redundantEntriesCount > 0
                  ? `清除 ${duplicateStats.redundantEntriesCount} 筆重複姓名（保留第一筆資料）`
                  : '目前名單無重複姓名'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                duplicateStats.redundantEntriesCount > 0
                  ? 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 shadow-2xs font-bold active:scale-95'
                  : 'text-slate-400 bg-slate-100 border border-slate-200/80 cursor-not-allowed opacity-60'
              }`}
            >
              <UserX className="w-3.5 h-3.5 text-amber-700" />
              <span>清除重複名字</span>
              {duplicateStats.redundantEntriesCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 font-black">
                  {duplicateStats.redundantEntriesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              新增單筆
            </button>

            {roster.length > 0 && (
              <>
                <button
                  onClick={() => exportRosterToCSV(roster)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  匯出 CSV
                </button>
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空名單
                </button>
              </>
            )}
          </div>
        </div>

        {/* Duplicate Names Alert Banner */}
        {duplicateStats.redundantEntriesCount > 0 && (
          <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0 text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="font-bold text-sm text-amber-900 flex flex-wrap items-center gap-2">
                  <span>偵測到名單中有重複姓名！</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold border border-amber-300">
                    共 {duplicateStats.duplicateNamesCount} 組重複姓名 · {duplicateStats.redundantEntriesCount} 筆待清理
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  重複的姓名已在下方表格中特別標示；點擊「清除重複名字」將保留第一筆並自動移除多餘紀錄。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowOnlyDuplicates(prev => !prev)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  showOnlyDuplicates
                    ? 'bg-amber-200 text-amber-950 border-amber-400 font-bold'
                    : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {showOnlyDuplicates ? '顯示全部名單' : '只看重複同仁'}
              </button>
              <button
                id="banner-remove-duplicates-btn"
                type="button"
                onClick={handleRemoveDuplicates}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition active:scale-95"
              >
                <UserX className="w-3.5 h-3.5" />
                一鍵清除重複 ({duplicateStats.redundantEntriesCount} 筆)
              </button>
            </div>
          </div>
        )}

        {/* Manual Add Single Member Modal/Box */}
        {showAddForm && (
          <form
            onSubmit={handleAddSingleMember}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
          >
            <div className="font-semibold text-xs text-slate-700 uppercase tracking-wider">新增人員資料</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">姓名 *</label>
                <input
                  type="text"
                  required
                  placeholder="例：陳大偉"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">部門 / 組別</label>
                <input
                  type="text"
                  placeholder="例：行銷企劃部"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email / 工號</label>
                <input
                  type="text"
                  placeholder="例：david@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
              >
                確認新增
              </button>
            </div>
          </form>
        )}

        {/* Quick Department & Duplicate Filter Pills */}
        {(Object.keys(departments).length > 1 || duplicateStats.duplicateNamesCount > 0) && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium whitespace-nowrap mr-1">名單篩選:</span>
            <button
              onClick={() => {
                setSelectedDept('all');
                setShowOnlyDuplicates(false);
              }}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                selectedDept === 'all' && !showOnlyDuplicates
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部 ({roster.length})
            </button>

            {/* Duplicate names quick filter button */}
            {duplicateStats.duplicateNamesCount > 0 && (
              <button
                type="button"
                onClick={() => setShowOnlyDuplicates(prev => !prev)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition flex items-center gap-1.5 font-bold ${
                  showOnlyDuplicates
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                }`}
              >
                <AlertTriangle className={`w-3 h-3 ${showOnlyDuplicates ? 'text-white' : 'text-amber-700'}`} />
                <span>重複姓名 ({duplicateStats.duplicateNamesCount} 組 / {duplicateStats.redundantEntriesCount} 筆待清)</span>
              </button>
            )}

            {Object.entries(departments).map(([dept, count]) => (
              <button
                key={dept}
                onClick={() => {
                  setSelectedDept(dept);
                  setShowOnlyDuplicates(false);
                }}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                  selectedDept === dept && !showOnlyDuplicates
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dept} ({count})
              </button>
            ))}
          </div>
        )}

        {/* Search Bar */}
        {roster.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋姓名、部門或信箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
          </div>
        )}

        {/* Member Table or Empty State */}
        {roster.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">目前尚無人員名單</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              請上方點擊「上傳 CSV」或「貼上名單」，或直接使用「載入示範名單」快速體驗！
            </p>
            <div className="mt-4">
              <button
                onClick={handleLoadSample}
                className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition shadow-xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                立即載入 24 位示範名單
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-12">#</th>
                    <th className="py-2.5 px-4">姓名</th>
                    <th className="py-2.5 px-4">部門 / 單位</th>
                    <th className="py-2.5 px-4 hidden sm:table-cell">Email / 工號</th>
                    <th className="py-2.5 px-4 text-right w-16">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRoster.map((person, idx) => {
                    const normName = person.name.trim().toLowerCase();
                    const dupInfo = duplicateStats.nameMap.get(normName);
                    const isDuplicate = (dupInfo?.count ?? 0) > 1;
                    const isFirstInstance = dupInfo?.firstId === person.id;

                    return (
                      <tr 
                        key={person.id} 
                        className={`transition-colors ${
                          isDuplicate 
                            ? 'bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-l-amber-500' 
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-4 text-xs font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`w-7 h-7 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0 shadow-2xs ${
                              isDuplicate ? 'bg-amber-600' : 'bg-blue-600'
                            }`}>
                              {person.name.slice(0, 1)}
                            </div>
                            <span className={isDuplicate ? 'font-bold text-amber-950' : 'text-slate-900'}>
                              {person.name}
                            </span>

                            {/* Duplicate Name Indicator Tag */}
                            {isDuplicate && (
                              <div className="inline-flex items-center gap-1 flex-wrap">
                                <span 
                                  title={`姓名「${person.name}」在名單中一共出現 ${dupInfo?.count} 次`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-150 bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                  重複姓名 (共 {dupInfo?.count} 次)
                                </span>
                                {isFirstInstance ? (
                                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md">
                                    首筆 (去重保留)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200 border border-amber-300 px-1.5 py-0.2 rounded-md">
                                    待去重清除
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">
                          {person.department ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {person.department}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500 hidden sm:table-cell font-mono">
                          {person.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {person.email}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteMember(person.id)}
                            title={isDuplicate ? '刪除此筆重複資料' : '刪除此同仁'}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  顯示 {filteredRoster.length} 筆資料 (共 {roster.length} 位人員)
                </span>
                {showOnlyDuplicates && (
                  <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    目前僅篩選重複名單
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {showOnlyDuplicates && (
                  <button
                    onClick={() => setShowOnlyDuplicates(false)}
                    className="text-amber-900 hover:underline font-bold"
                  >
                    顯示完整名單
                  </button>
                )}
                {(filteredRoster.length < roster.length || searchQuery || selectedDept !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDept('all');
                      setShowOnlyDuplicates(false);
                    }}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    清除所有篩選條件
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA to Jump to Features */}
        {roster.length > 0 && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={onGoToLottery}
              className="p-4 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50/70 to-orange-50/70 hover:border-rose-300 cursor-pointer transition shadow-xs flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-rose-700 transition">
                    前往獎品抽籤
                  </h4>
                  <p className="text-xs text-slate-500">
                    動態抽籤動畫 · 支援重複/不重複抽取
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition-transform" />
            </div>

            <div
              onClick={onGoToGrouping}
              className="p-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 hover:border-emerald-300 cursor-pointer transition shadow-xs flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition">
                    前往自動分組
                  </h4>
                  <p className="text-xs text-slate-500">
                    設定每組人數或組數 · 視覺化團隊卡片
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
