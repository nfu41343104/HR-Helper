import { Person, DrawRecord, TeamGroup } from '../types';

/**
 * Parses raw text from CSV file or pasted content into Person records.
 * Supports comma, tab, semicolon delimiters and auto-detects column headers.
 */
export function parseRosterInput(rawText: string): { persons: Person[]; errorCount: number; message?: string } {
  // Remove BOM if present
  let cleanText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { persons: [], errorCount: 0 };
  }

  // Split into lines
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { persons: [], errorCount: 0 };
  }

  // Auto-detect delimiter
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (!firstLine.includes(',') && firstLine.includes(';')) {
    delimiter = ';';
  }

  // Helper to split row handling quotes
  const splitRow = (row: string): string[] => {
    if (delimiter === '\t') {
      return row.split('\t').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
    }
    const regex = new RegExp(`(?:^|${delimiter})("(?:[^"]|"")*"|[^${delimiter}]*)`, 'g');
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(row)) !== null) {
      let val = match[1] ?? '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      matches.push(val.trim());
      if (regex.lastIndex >= row.length) break;
    }
    return matches.length > 0 ? matches : row.split(delimiter).map(c => c.trim());
  };

  const parsedRows = lines.map(line => splitRow(line));

  // Determine if first row is header
  const headerCandidates = parsedRows[0].map(col => col.toLowerCase());
  const nameKeywords = ['姓名', '名字', 'name', '員工姓名', '員工', 'member', 'player', 'participant'];
  const deptKeywords = ['部門', '單位', '組別', 'department', 'dept', '組', '處級', '分部'];
  const emailKeywords = ['email', 'mail', '信箱', '電子郵件', '工號', 'id', '員編', '編號'];

  let nameIndex = -1;
  let deptIndex = -1;
  let emailIndex = -1;

  headerCandidates.forEach((header, idx) => {
    if (nameKeywords.some(k => header.includes(k))) {
      if (nameIndex === -1) nameIndex = idx;
    } else if (deptKeywords.some(k => header.includes(k))) {
      if (deptIndex === -1) deptIndex = idx;
    } else if (emailKeywords.some(k => header.includes(k))) {
      if (emailIndex === -1) emailIndex = idx;
    }
  });

  let dataRows: string[][];
  const hasDetectedHeader = nameIndex !== -1 || deptIndex !== -1 || emailIndex !== -1;

  if (hasDetectedHeader) {
    if (nameIndex === -1) nameIndex = 0;
    dataRows = parsedRows.slice(1);
  } else {
    // If no clear headers, check if row 0 looks like a header label or actual person name
    const looksLikeHeader = headerCandidates.some(c => ['name', 'dept', '姓名', '部門'].includes(c));
    if (looksLikeHeader) {
      dataRows = parsedRows.slice(1);
    } else {
      dataRows = parsedRows;
    }
    nameIndex = 0;
    deptIndex = parsedRows[0].length > 1 ? 1 : -1;
    emailIndex = parsedRows[0].length > 2 ? 2 : -1;
  }

  const results: Person[] = [];
  let errorCount = 0;

  dataRows.forEach((cols, idx) => {
    const rawName = cols[nameIndex]?.trim();
    if (!rawName) {
      errorCount++;
      return;
    }

    const dept = deptIndex !== -1 && cols[deptIndex] ? cols[deptIndex].trim() : undefined;
    const email = emailIndex !== -1 && cols[emailIndex] ? cols[emailIndex].trim() : undefined;

    results.push({
      id: `p-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: rawName,
      department: dept || undefined,
      email: email || undefined,
    });
  });

  // Calculate duplicate name count for informational messaging
  const nameCounts = new Map<string, number>();
  results.forEach(p => {
    const k = p.name.trim().toLowerCase();
    nameCounts.set(k, (nameCounts.get(k) || 0) + 1);
  });
  let duplicateCount = 0;
  nameCounts.forEach(count => {
    if (count > 1) duplicateCount += (count - 1);
  });

  let message = '未能解析出有效的姓名資料';
  if (results.length > 0) {
    if (duplicateCount > 0) {
      message = `成功解析 ${results.length} 位同仁資料（發現 ${duplicateCount} 筆重複姓名，可於名單庫中一鍵去重）`;
    } else {
      message = `成功解析 ${results.length} 位人員資料（無重複姓名）`;
    }
  }

  return {
    persons: results,
    errorCount,
    message,
  };
}

/**
 * Triggers browser download of a CSV file with UTF-8 BOM so Excel opens without garbled characters.
 */
function downloadCSV(csvContent: string, filename: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export full roster to CSV
 */
export function exportRosterToCSV(roster: Person[], filename = 'HR_人員名單.csv') {
  const headers = ['編號', '姓名', '部門/組別', '信箱/工號'];
  const rows = roster.map((p, idx) => [
    idx + 1,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${(p.department || '').replace(/"/g, '""')}"`,
    `"${(p.email || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, filename);
}

/**
 * Export lottery winners history to CSV
 */
export function exportWinnersToCSV(winners: DrawRecord[], filename = 'HR_抽獎中獎名單.csv') {
  const headers = ['獲獎序號', '獎項名稱', '得獎者姓名', '所屬部門', '中獎時間'];
  const rows = winners.map((w, idx) => [
    idx + 1,
    `"${w.prizeName.replace(/"/g, '""')}"`,
    `"${w.winnerName.replace(/"/g, '""')}"`,
    `"${(w.winnerDepartment || '-').replace(/"/g, '""')}"`,
    `"${new Date(w.timestamp).toLocaleString('zh-TW')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, filename);
}

/**
 * Export grouping results to CSV
 */
export function exportGroupsToCSV(groups: TeamGroup[], filename = 'HR_團隊分組結果.csv') {
  const headers = ['組別', '組內角色', '姓名', '部門', '信箱/工號'];
  const rows: string[][] = [];

  groups.forEach(g => {
    g.members.forEach(m => {
      const isLeader = g.leaderId === m.id;
      rows.push([
        `"${g.name.replace(/"/g, '""')}"`,
        isLeader ? '"隊長"' : '"組員"',
        `"${m.name.replace(/"/g, '""')}"`,
        `"${(m.department || '-').replace(/"/g, '""')}"`,
        `"${(m.email || '').replace(/"/g, '""')}"`,
      ]);
    });
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(csv, filename);
}

/**
 * Format teams as text for copying to Slack, Teams, or Email
 */
export function formatGroupsAsText(groups: TeamGroup[]): string {
  const header = `【活動團隊分組名單】 共 ${groups.length} 組\n============================\n`;
  const body = groups.map(g => {
    const memberLines = g.members.map(m => {
      const isLeader = g.leaderId === m.id;
      const deptStr = m.department ? ` (${m.department})` : '';
      const leaderTag = isLeader ? ' 👑 [隊長]' : '';
      return `  • ${m.name}${deptStr}${leaderTag}`;
    }).join('\n');

    return `📌 ${g.name} (共 ${g.members.length} 人)\n${memberLines}`;
  }).join('\n\n');

  return header + body;
}
