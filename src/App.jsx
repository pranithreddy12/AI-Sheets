import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { checkOllamaStatus } from './ai/ollamaConfig.js';
import { detectIntent, getIntentLabel } from './ai/intentRouter.js';
import { generateFormula } from './ai/formulaGenerator.js';
import { generateEdit } from './ai/dataEditor.js';
import { generateChart } from './ai/chartGenerator.js';
import { summarizeData } from './ai/dataSummarizer.js';
import { classifyData } from './ai/dataClassifier.js';
import ChartPanel from './components/ChartPanel.jsx';

const ROWS_PER_PAGE = 50;

// ──────────────────────────────────────────────
// Icons (inline SVGs)
// ──────────────────────────────────────────────
const Icons = {
  Upload: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Table: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  BarChart: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Zap: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Key: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  MoreVertical: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  ArrowUp: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  ArrowDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
};

// ──────────────────────────────────────────────
// Loading Spinner
// ──────────────────────────────────────────────
const LoadingSpinner = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-8">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-400 animate-spin"></div>
      <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
    </div>
    <p className="text-sm text-gray-300 animate-pulse">{text}</p>
  </div>
);

// ──────────────────────────────────────────────
// Column Stats Popover
// ──────────────────────────────────────────────
const ColumnStatsPopover = ({ stats, column, onClose }) => {
  if (!stats) return null;
  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 min-w-[220px] animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-emerald-300 truncate max-w-[160px]">{column}</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-white"><Icons.X /></button>
      </div>
      <div className="text-xs space-y-1.5 text-gray-300">
        <div className="flex justify-between"><span className="text-gray-500">Count:</span><span>{stats.count}</span></div>
        {stats.type === 'numeric' ? (
          <>
            <div className="flex justify-between"><span className="text-gray-500">Min:</span><span className="text-cyan-300">{stats.min}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Max:</span><span className="text-cyan-300">{stats.max}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Average:</span><span className="text-emerald-300">{stats.avg}</span></div>
          </>
        ) : (
          <>
            <div className="flex justify-between"><span className="text-gray-500">Unique:</span><span>{stats.uniqueCount}</span></div>
            <div className="mt-2">
              <span className="text-gray-500 text-[11px] uppercase tracking-wider">Top Values</span>
              {stats.topValues?.map(([val, count], i) => (
                <div key={i} className="flex justify-between mt-1">
                  <span className="truncate max-w-[120px]">{val}</span>
                  <span className="text-emerald-300">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Main App Component
// ──────────────────────────────────────────────
function App() {
  // Core data state
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [originalHeaders, setOriginalHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [workbookRef, setWorkbookRef] = useState(null);

  // AI interaction state
  const [prompt, setPrompt] = useState('');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [history, setHistory] = useState([]);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState(null);
  const [showRowWarning, setShowRowWarning] = useState(false);
  const [aiRowStart, setAiRowStart] = useState(1);
  const [aiRowEnd, setAiRowEnd] = useState(0);
  const [isValidationOpen, setIsValidationOpen] = useState(false);

  // Ollama status
  const [ollamaStatus, setOllamaStatus] = useState({ online: false, model: null, error: null });

  // Feature-specific state
  const [chartConfig, setChartConfig] = useState(null);
  const [textSummaryResult, setTextSummaryResult] = useState(null);
  const [detectedIntent, setDetectedIntent] = useState(null);

  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showColumnStats, setShowColumnStats] = useState(null);
  const [columnStatsData, setColumnStatsData] = useState(null);
  const [headerMenuCol, setHeaderMenuCol] = useState(null);
  const [sortConfig, setSortConfig] = useState(null);
  const [filters, setFilters] = useState({});
  const [contextMenu, setContextMenu] = useState(null);

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeCell, setWholeCell] = useState(false);

  // Formula bar
  const [formulaBarValue, setFormulaBarValue] = useState('');

  const fileInputRef = useRef(null);

  // Ctrl+H Find Replace
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derived state
  const aiColumns = useMemo(() => headers.filter(h => !originalHeaders.includes(h)), [headers, originalHeaders]);

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];
    Object.entries(filters).forEach(([col, text]) => {
      if (!text) return;
      const term = text.toLowerCase();
      result = result.filter(row => String(row[col] || '').toLowerCase().includes(term));
    });
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.col] ?? '';
        let valB = b[sortConfig.col] ?? '';
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortConfig.dir === 'asc' ? numA - numB : numB - numA;
        }
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortConfig.dir === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, filters, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedData.length / ROWS_PER_PAGE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAndSortedData.slice(start, start + ROWS_PER_PAGE);
  }, [filteredAndSortedData, currentPage]);

  const validationStats = useMemo(() => {
    if (!data || data.length === 0) return null;
    let emptyCells = 0;
    const seenRows = new Set();
    let duplicates = 0;
    const typeMismatches = {};

    data.forEach(row => {
      headers.forEach(h => {
        if (!row[h] || String(row[h]).trim() === '') emptyCells++;
      });
      const rowStr = JSON.stringify(row);
      if (seenRows.has(rowStr)) duplicates++;
      else seenRows.add(rowStr);
    });

    headers.forEach(h => {
      const vals = data.map(r => r[h]).filter(v => v !== undefined && String(v).trim() !== '');
      if (vals.length > 0) {
        let numCount = 0;
        let strCount = 0;
        vals.forEach(v => {
          if (!isNaN(Number(v))) numCount++;
          else strCount++;
        });
        if (numCount > 0 && strCount > 0 && (numCount > strCount * 2 || strCount > numCount * 2)) {
          typeMismatches[h] = Math.min(numCount, strCount);
        }
      }
    });

    return { emptyCells, duplicates, typeMismatches };
  }, [data, headers]);

  // Auto-select all columns when headers change
  useEffect(() => {
    if (headers.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns([...headers]);
    }
  }, [headers]);

  // Poll Ollama status on mount and every 30s
  useEffect(() => {
    const poll = async () => {
      const status = await checkOllamaStatus();
      setOllamaStatus(status);
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  // ──────────────────────────────────────────
  // File handling
  // ──────────────────────────────────────────
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setAiResponse(null);
    setAiSummary(null);
    setPendingResult(null);
    setHistory([]);
    setCurrentPage(1);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target.result, { type: 'array' });
        setWorkbookRef(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          setActiveSheet(wb.SheetNames[0]);
          processSheet(wb, wb.SheetNames[0]);
        }
      } catch {
        setError('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const processSheet = (workbook, sheetName) => {
    const ws = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (jsonData.length === 0) {
      setError('The sheet appears to be empty.');
      return;
    }
    const hdrs = jsonData[0].map((h, i) => String(h || `Column ${i + 1}`));
    const rows = jsonData.slice(1)
      .filter(row => row.some(c => c !== undefined && c !== null && c !== ''))
      .map(row => {
        const obj = {};
        hdrs.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
        return obj;
      });
    setHeaders(hdrs);
    setOriginalHeaders([...hdrs]);
    setSelectedColumns(hdrs);
    setData(rows);
    setFilters({});
    setSortConfig(null);
    setAiRowStart(1);
    setAiRowEnd(rows.length);
    setCurrentPage(1);
    setAiResponse(null);
    setAiSummary(null);
    setPendingResult(null);
  };

  const handleSheetChange = (sheetName) => {
    setActiveSheet(sheetName);
    if (workbookRef) processSheet(workbookRef, sheetName);
  };

  const clearData = () => {
    setData([]); setHeaders([]); setOriginalHeaders([]);
    setFileName(''); setSheetNames([]); setActiveSheet(''); setWorkbookRef(null);
    setPrompt(''); setSelectedColumns([]); setHistory([]);
    setAiResponse(null); setAiSummary(null); setPendingResult(null);
    setError(null); setCurrentPage(1);
    setAiRowStart(1); setAiRowEnd(0); setIsValidationOpen(false);
    setShowColumnStats(null); setColumnStatsData(null);
    setHeaderMenuCol(null); setSortConfig(null); setFilters({}); setContextMenu(null);
    setFormulaBarValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ──────────────────────────────────────────
  // Cell editing
  // ──────────────────────────────────────────
  const handleCellClick = (rowIdx, col) => {
    setEditingCell({ rowIdx, col });
    setEditValue(paginatedData[rowIdx]?.[col] || '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    const actualIdx = (currentPage - 1) * ROWS_PER_PAGE + editingCell.rowIdx;
    setData(prev => prev.map((row, idx) =>
      idx === actualIdx ? { ...row, [editingCell.col]: editValue } : row
    ));
    setEditingCell(null);
    setEditValue('');
  };

  // ──────────────────────────────────────────
  // Column stats
  // ──────────────────────────────────────────
  const getColumnStats = (col) => {
    const values = data.map(row => row[col]).filter(v => v !== undefined && v !== '');
    const numericValues = values.map(Number).filter(n => !isNaN(n));
    if (numericValues.length > values.length * 0.5) {
      return {
        type: 'numeric',
        min: Math.min(...numericValues).toFixed(2),
        max: Math.max(...numericValues).toFixed(2),
        avg: (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2),
        count: values.length
      };
    }
    const counts = {};
    values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { type: 'categorical', topValues: sorted.slice(0, 5), uniqueCount: sorted.length, count: values.length };
  };

  const handleColumnHeaderClick = (col) => {
    if (headerMenuCol === col) setHeaderMenuCol(null);
    else setHeaderMenuCol(col);
    setShowColumnStats(null);
  };

  const handleColumnAction = (col, action, payload) => {
    if (action === 'sort-asc') setSortConfig({ col, dir: 'asc' });
    else if (action === 'sort-desc') setSortConfig({ col, dir: 'desc' });
    else if (action === 'clear-sort') setSortConfig(null);
    else if (action === 'filter') {
      setFilters(prev => ({ ...prev, [col]: payload }));
    }
    else if (action === 'rename') {
      const newName = prompt(`Rename column "${col}" to:`, col);
      if (newName && newName !== col && !headers.includes(newName)) {
        setHeaders(prev => prev.map(h => h === col ? newName : h));
        setOriginalHeaders(prev => prev.map(h => h === col ? newName : h));
        setSelectedColumns(prev => prev.map(h => h === col ? newName : h));
        if (sortConfig?.col === col) setSortConfig({ ...sortConfig, col: newName });
        if (filters[col]) setFilters(prev => { const nf = {...prev}; nf[newName] = nf[col]; delete nf[col]; return nf; });
        setData(prev => prev.map(row => {
          const newRow = { ...row, [newName]: row[col] };
          delete newRow[col];
          return newRow;
        }));
      }
    } else if (action === 'delete') {
      setHeaders(prev => prev.filter(h => h !== col));
      setOriginalHeaders(prev => prev.filter(h => h !== col));
      setSelectedColumns(prev => prev.filter(h => h !== col));
      if (sortConfig?.col === col) setSortConfig(null);
      setFilters(prev => { const nf = {...prev}; delete nf[col]; return nf; });
      setData(prev => prev.map(row => {
        const newRow = { ...row };
        delete newRow[col];
        return newRow;
      }));
    } else if (action === 'stats') {
      setShowColumnStats(col);
      setColumnStatsData(getColumnStats(col));
    }
    if (action !== 'filter') setHeaderMenuCol(null);
  };

  const handleRowContextMenu = (e, rowData) => {
    e.preventDefault();
    setContextMenu({ rowData, x: e.clientX, y: e.clientY });
  };

  const handleRowAction = (action, rowData) => {
    setContextMenu(null);
    const globalIdx = data.indexOf(rowData);
    if (globalIdx === -1) return;

    if (action === 'delete') {
      setData(prev => prev.filter((_, i) => i !== globalIdx));
    } else if (action === 'duplicate') {
      setData(prev => {
        const newData = [...prev];
        newData.splice(globalIdx + 1, 0, { ...prev[globalIdx] });
        return newData;
      });
    } else if (action === 'copy') {
      navigator.clipboard.writeText(JSON.stringify(data[globalIdx], null, 2));
    }
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    let replaceCount = 0;
    const newData = data.map(row => {
      const newRow = { ...row };
      headers.forEach(h => {
        const val = String(newRow[h] || '');
        if (!val) return;
        if (wholeCell) {
          if (matchCase ? val === findText : val.toLowerCase() === findText.toLowerCase()) {
            newRow[h] = replaceText;
            replaceCount++;
          }
        } else {
          try {
             if (!matchCase) {
                 const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                 if (regex.test(val)) {
                    const matchedCount = (val.match(regex) || []).length;
                    newRow[h] = val.replace(regex, replaceText);
                    replaceCount += matchedCount;
                 }
             } else {
                 if (val.includes(findText)) {
                     const parts = val.split(findText);
                     newRow[h] = parts.join(replaceText);
                     replaceCount += parts.length - 1;
                 }
             }
          } catch (e) { console.error(e) }
        }
      });
      return newRow;
    });
    setData(newData);
    alert(`Replaced ${replaceCount} occurrence(s)`);
    setShowFindReplace(false);
  };

  // ──────────────────────────────────────────
  // AI Action — Intent-routed via Ollama (local)
  // ──────────────────────────────────────────
  const runAIAction = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    if (!ollamaStatus.online) {
      setError('Ollama is not running. Please start Ollama and try again.');
      return;
    }

    // Detect intent from prompt
    const intent = detectIntent(prompt);
    setDetectedIntent(intent);

    setLoading(true);
    setError(null);
    setAiResponse(null);
    setAiSummary(null);
    setPendingResult(null);
    setChartConfig(null);
    setTextSummaryResult(null);
    setShowRowWarning(false);

    const targetRows = data.slice(Math.max(0, aiRowStart - 1), aiRowEnd);
    const sampleRows = targetRows.slice(0, 5);

    try {
      // ── Route to the correct feature handler ──
      if (intent === 'visualize') {
        setLoadingText('Generating chart configuration...');
        const { chartConfig: config } = await generateChart(prompt, data, headers);
        setChartConfig(config);
        setAiResponse(`Chart: ${config.title}\nType: ${config.chartType}\nX: ${config.xAxis}, Y: ${config.yAxis}`);
        setHistory(prev => [{ prompt, columns: ['📊 Chart'], timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);

      } else if (intent === 'summarize') {
        setLoadingText('Analyzing and summarizing data...');
        const { textSummary, stats } = await summarizeData(prompt, data, headers);
        setTextSummaryResult(textSummary);
        setAiResponse(textSummary);
        setHistory(prev => [{ prompt, columns: ['📋 Summary'], timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);

      } else {
        // Formula, Edit, or Classify — all produce a transform function
        let transformFn, rawCode, newColumns = [];

        if (intent === 'edit') {
          setLoadingText('Generating data edit...');
          const result = await generateEdit(prompt, sampleRows, selectedColumns);
          transformFn = result.transformFn;
          rawCode = result.rawCode;
        } else if (intent === 'classify') {
          setLoadingText('Generating classification...');
          const result = await classifyData(prompt, sampleRows, selectedColumns);
          transformFn = result.transformFn;
          rawCode = result.rawCode;
          if (result.newColumnName) newColumns = [result.newColumnName];
        } else {
          // formula (default)
          setLoadingText('Generating formula...');
          const result = await generateFormula(prompt, sampleRows, selectedColumns);
          transformFn = result.transformFn;
          rawCode = result.rawCode;
          newColumns = result.newColumns || [];
        }

        setAiResponse(rawCode);

        // Execute the function locally on ALL rows in the selected range
        setLoadingText(`Applying to ${targetRows.length} rows locally...`);
        const parsedResult = [];
        const updatedData = [...data];

        targetRows.forEach((row, rIdx) => {
          const globalIdx = Math.max(0, aiRowStart - 1) + rIdx;
          const rowClone = JSON.parse(JSON.stringify(row));
          try {
            const newRow = transformFn(rowClone);
            const diff = {};
            Object.keys(newRow).forEach(k => {
              if (newRow[k] !== row[k]) diff[k] = newRow[k];
            });
            parsedResult.push(diff);
            updatedData[globalIdx] = newRow;
          } catch (e) {
            console.error("Error evaluating row:", e);
            parsedResult.push({});
          }
        });

        // Detect new columns from diffs
        const existingHeaders = new Set(headers);
        const newColumnsSet = new Set(newColumns);
        parsedResult.forEach(diff => {
          Object.keys(diff).forEach(k => {
            if (!existingHeaders.has(k)) newColumnsSet.add(k);
          });
        });
        newColumns = Array.from(newColumnsSet);

        const anyModifications = parsedResult.some(diff => Object.keys(diff).length > 0);
        if (newColumns.length === 0 && !anyModifications) {
          throw new Error(`The AI function did not modify any data.\nGenerated code:\n${rawCode}`);
        }

        const summary = generateSummary(newColumns, parsedResult);
        setAiSummary(summary);
        setPendingResult({ updatedData, newColumns, diffs: parsedResult });

        setHistory(prev => [{
          prompt,
          columns: newColumns.length > 0 ? newColumns : ['✏️ Edit'],
          timestamp: new Date().toLocaleTimeString(),
        }, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      setError(`${getIntentLabel(intent)} Failed: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };




  // Apply pending AI result to the table
  const applyToTable = () => {
    if (!pendingResult) return;
    const { updatedData, newColumns } = pendingResult;

    // Check if the AI created a grouping column (e.g. "Sheet", "Tab", "Store_Group")
    const sheetColumn = newColumns.find(h => 
      h.toLowerCase().includes('sheet') || 
      h.toLowerCase().includes('tab') || 
      h.toLowerCase().includes('category') ||
      h.toLowerCase().includes('group')
    );

    if (sheetColumn) {
      // Group the data by the new column
      const groupedData = {};
      updatedData.forEach(row => {
        let sheetName = row[sheetColumn];
        if (!sheetName || String(sheetName).trim() === '') sheetName = 'Uncategorized';
        // Ensure valid Excel sheet name (max 31 chars, no special chars)
        let validName = String(sheetName).substring(0, 31).replace(/[:\\\/?\*\[\]]/g, '_');
        if (!validName) validName = 'Sheet';
        
        if (!groupedData[validName]) groupedData[validName] = [];
        groupedData[validName].push(row);
      });

      const newSheetNames = Object.keys(groupedData);
      
      if (newSheetNames.length > 0) {
        // Create a new SheetJS workbook representing these splits
        const wb = XLSX.utils.book_new();
        newSheetNames.forEach(name => {
           const ws = XLSX.utils.json_to_sheet(groupedData[name]);
           XLSX.utils.book_append_sheet(wb, ws, name);
        });

        // Update application state to reflect the new multi-sheet structure
        setWorkbookRef(wb);
        setSheetNames(newSheetNames);
        
        // Load the first sheet into the view
        const firstSheet = newSheetNames[0];
        setActiveSheet(firstSheet);
        
        const firstSheetData = groupedData[firstSheet];
        // The first sheet's keys are our new headers
        if (firstSheetData.length > 0) {
           const newHeaders = Object.keys(firstSheetData[0]);
           setHeaders(newHeaders);
           setOriginalHeaders([...newHeaders]);
           setSelectedColumns([...newHeaders]); // Auto-select all columns for simplicity
        }
        
        setData(firstSheetData);
      }
    } else {
      // Standard apply - No sheet splitting
      setHeaders(prev => {
        const existing = new Set(prev);
        const toAdd = newColumns.filter(c => !existing.has(c));
        return [...prev, ...toAdd];
      });

      // Merge data - we processed ALL rows. Must create new array ref so React re-renders.
      setData([...updatedData]);
    }

    setPendingResult(null);
    setCurrentPage(1); // Reset pagination on apply
  };

  // ──────────────────────────────────────────
  // Summary generation
  // ──────────────────────────────────────────
  const generateSummary = (newColumns, parsedResult) => {
    return newColumns.map(col => {
      const values = parsedResult.map(r => r[col]).filter(v => v !== undefined && v !== null && v !== '');
      if (values.length === 0) return { column: col, type: 'empty' };

      const isNumeric = values.every(v => !isNaN(parseFloat(v)) && isFinite(v));
      if (isNumeric) {
        const nums = values.map(Number);
        return {
          column: col, type: 'numeric',
          min: Math.min(...nums).toFixed(2),
          max: Math.max(...nums).toFixed(2),
          avg: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),
        };
      }
      const counts = {};
      values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return {
        column: col, type: 'categorical',
        topValues: sorted.slice(0, 5).map(([val, cnt]) => `${val} (${((cnt / values.length) * 100).toFixed(0)}%)`),
        uniqueCount: Object.keys(counts).length,
      };
    });
  };

  // ──────────────────────────────────────────
  // Formula bar
  // ──────────────────────────────────────────
  const handleFormulaApply = () => {
    if (!formulaBarValue.startsWith('=')) return;
    const formula = formulaBarValue.slice(1);
    let columnName = 'Formula Result';

    // Check for "AS ColumnName" pattern
    const asMatch = formula.match(/\bAS\s+(\w[\w\s]*)/i);
    if (asMatch) columnName = asMatch[1].trim();

    const cleanFormula = formula.replace(/\bAS\s+\w[\w\s]*/i, '').trim().toUpperCase();

    const results = data.map(row => {
      try {
        let expr = cleanFormula;
        headers.forEach(h => {
          const val = row[h];
          const numVal = parseFloat(val);
          expr = expr.replace(new RegExp(`\\b${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
            isNaN(numVal) ? `"${val}"` : numVal);
        });

        // Handle IF()
        if (expr.includes('IF(')) {
          const ifMatch = expr.match(/IF\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i);
          if (ifMatch) {
            const cond = ifMatch[1], trueVal = ifMatch[2].replace(/"/g, ''), falseVal = ifMatch[3].replace(/"/g, '');
            return Function(`"use strict"; return (${cond})`)() ? trueVal : falseVal;
          }
        }
        return String(Function(`"use strict"; return (${expr})`)());
      } catch { return ''; }
    });

    setHeaders(prev => [...prev, columnName]);
    setData(prev => prev.map((row, idx) => ({ ...row, [columnName]: results[idx] })));
    setFormulaBarValue('');
  };

  // ──────────────────────────────────────────
  // Export
  // ──────────────────────────────────────────
  const exportToExcel = () => {
    if (data.length === 0) return;
    
    try {
      const wb = XLSX.utils.book_new();

      // Check if there is a column named "Sheet", "Tab", "Category", or "Group" (case-insensitive)
      const sheetColumn = headers.find(h => 
        h.toLowerCase().includes('sheet') || 
        h.toLowerCase().includes('tab') || 
        h.toLowerCase().includes('category') ||
        h.toLowerCase().includes('group')
      );

      if (sheetColumn) {
        // Group data by the sheet column
        const groupedData = {};
        data.forEach(row => {
          let sheetName = row[sheetColumn];
          if (!sheetName || String(sheetName).trim() === '') sheetName = 'Uncategorized';
          
          // Excel sheet names max 31 chars, no special chars like : \ / ? * [ ]
          let validName = String(sheetName).substring(0, 31).replace(/[:\\\/?\*\[\]]/g, '_');
          if (!validName) validName = 'Sheet';
          
          if (!groupedData[validName]) groupedData[validName] = [];
          groupedData[validName].push(row);
        });

        // Create a worksheet for each group
        Object.keys(groupedData).forEach(sheetName => {
          const ws = XLSX.utils.json_to_sheet(groupedData[sheetName]);
          // Fallback if sheetname is duplicate or invalid (though groupedData keys should be unique string)
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
      } else {
        // Standard single-sheet export
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, activeSheet || fileName?.split('.')[0] || 'Data');
      }

      XLSX.writeFile(wb, fileName ? `ExcelAI_${fileName}` : 'ExcelAI_Export.xlsx');
      setError(null); // clear any previous errors on success
    } catch (err) {
      console.error("Export Failed:", err);
      setError(`Export Failed: ${err.message}`);
    }
  };

  const toggleColumn = (col) => {
    setSelectedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const getCellColor = (val) => {
    if (!val) return '';
    const str = String(val).toLowerCase();
    if (["at risk", "fail", "low", "anomaly"].some(kw => str.includes(kw))) {
      return 'text-red-400 bg-red-500/10 font-medium px-1.5 py-0.5 rounded';
    }
    if (["active", "pass", "high", "safe"].some(kw => str.includes(kw))) {
      return 'text-emerald-400 bg-emerald-500/10 font-medium px-1.5 py-0.5 rounded';
    }
    return '';
  };

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden font-sans">
      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Icons.Table />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Excel AI</h1>
            <p className="text-[11px] text-gray-500 -mt-0.5">Powered by Mistral</p>
          </div>
        </div>

        {/* Formula Bar */}
        {data.length > 0 && (
          <div className="flex-1 max-w-xl mx-6">
            <div className="flex items-center gap-2 bg-gray-800/60 rounded-lg border border-gray-700/50 px-3 py-1.5">
              <span className="text-xs text-emerald-400 font-mono font-bold">fx</span>
              <input
                type="text"
                value={formulaBarValue}
                onChange={(e) => setFormulaBarValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFormulaApply()}
                placeholder="=Column1+Column2 AS Result"
                className="flex-1 bg-transparent text-sm font-mono text-gray-200 placeholder-gray-600 outline-none"
              />
              {formulaBarValue && (
                <button onClick={handleFormulaApply} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Icons.Check />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {data.length > 0 && (
            <>
              <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors" title="Export">
                <Icons.Download /> Export
              </button>
              <button onClick={clearData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-red-900/50 border border-gray-700 hover:border-red-700 rounded-lg transition-colors text-red-400" title="Clear">
                <Icons.Trash /> Clear
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Main 3-Panel Layout ── */}
      <div 
        className="flex-1 flex overflow-hidden relative"
        onClick={() => {
          if (contextMenu) setContextMenu(null);
          if (headerMenuCol) setHeaderMenuCol(null);
        }}
      >
        {/* Context Menu Overlay */}
        {contextMenu && (
          <div 
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl py-1 min-w-[160px] text-xs text-gray-300 animate-fadeIn"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => handleRowAction('delete', contextMenu.rowData)} className="w-full text-left px-4 py-1.5 hover:bg-red-900/40 text-red-400 transition-colors">Delete Row</button>
            <button onClick={() => handleRowAction('duplicate', contextMenu.rowData)} className="w-full text-left px-4 py-1.5 hover:bg-gray-700 hover:text-white transition-colors">Duplicate Row</button>
            <div className="h-px bg-gray-700/50 my-1"></div>
            <button onClick={() => handleRowAction('copy', contextMenu.rowData)} className="w-full text-left px-4 py-1.5 hover:bg-gray-700 hover:text-white transition-colors">Copy Row as JSON</button>
          </div>
        )}

        {/* ═══════ LEFT SIDEBAR ═══════ */}
        <aside className="w-80 flex-shrink-0 bg-gray-900/50 border-r border-gray-800/60 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">

            {/* API Key Input */}
            <div className="space-y-2">
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors w-full"
              >
                <Icons.Key />
                <span>{apiKey ? 'API Key Set ✓' : 'Set API Key'}</span>
              </button>
              {showApiKey && (
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-colors"
                />
              )}
            </div>

            {/* File Upload */}
            <div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 hover:from-emerald-600/30 hover:to-cyan-600/30 border-2 border-dashed border-emerald-500/30 hover:border-emerald-400/50 rounded-xl cursor-pointer transition-all duration-300 group"
              >
                <Icons.Upload />
                <span className="text-sm font-medium text-emerald-300 group-hover:text-emerald-200">
                  {fileName || 'Upload Excel / CSV'}
                </span>
              </label>
            </div>

            {/* File Info */}
            {fileName && (
              <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/40 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">File:</span>
                  <span className="text-xs text-gray-200 truncate font-medium">{fileName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{data.length} rows</span>
                  <span>{headers.length} columns</span>
                </div>

                {/* Multi-sheet tabs */}
                {sheetNames.length > 1 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {sheetNames.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSheetChange(s)}
                        className={`px-2 py-0.5 text-[11px] rounded-md transition-colors ${
                          s === activeSheet ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-gray-700/40 text-gray-400 hover:text-gray-200 border border-transparent'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Column Selector */}
            {headers.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Columns for AI</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-800/30 rounded-lg p-2 border border-gray-700/30">
                  {headers.map(col => (
                    <label key={col} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-700/30 cursor-pointer group transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(col)}
                        onChange={() => toggleColumn(col)}
                        className="w-3.5 h-3.5 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500/30 bg-gray-700"
                      />
                      <span className={`text-xs truncate ${aiColumns.includes(col) ? 'text-amber-300' : 'text-gray-300'}`}>
                        {col}
                        {aiColumns.includes(col) && <span className="ml-1 text-[10px] text-amber-400/60">AI</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Row Range Selector */}
            {data.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rows for AI</h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">From row</label>
                    <input type="number" min="1" max={Math.max(1, aiRowEnd)} value={aiRowStart} onChange={(e) => setAiRowStart(Math.max(1, Math.min(aiRowEnd, parseInt(e.target.value) || 1)))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">To row</label>
                    <input type="number" min={aiRowStart} max={data.length} value={aiRowEnd} onChange={(e) => setAiRowEnd(Math.min(data.length, Math.max(aiRowStart, parseInt(e.target.value) || data.length)))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
                <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] text-emerald-300 text-center font-medium">
                  Sending {Math.max(0, aiRowEnd - aiRowStart + 1)} rows to AI
                </div>
              </div>
            )}

            {/* Prompt Input */}
            {data.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Prompt</h3>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Classify sentiment of the 'Review' column..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-gray-800/60 border border-gray-700/50 rounded-lg text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500/50 resize-none transition-colors"
                />
                <button
                  onClick={runAIAction}
                  disabled={loading || !prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all duration-300 active:scale-[0.98]"
                >
                  <Icons.Sparkles />
                  {loading ? 'Processing...' : 'Run AI Action'}
                </button>
              </div>
            )}

            {/* Quick Actions */}
            {data.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Sentiment', p: 'Classify the sentiment of each row as Positive, Negative, or Neutral' },
                    { label: 'Categorize', p: 'Categorize each row into meaningful groups (High/Medium/Low)' },
                    { label: 'Flag Issues', p: 'Flag rows that have anomalies or issues as "Review Needed" or "OK"' },
                    { label: 'Summarize', p: 'Summarize each row\'s text data in 5 words or less' },
                    { label: 'Score 1-10', p: 'Assign a quality score from 1-10 to each row' },
                    { label: 'Clean Data', p: 'Standardize and clean all text values (fix case, trim spaces, remove duplicates)' },
                  ].map(action => (
                    <button
                      key={action.label}
                      onClick={() => { setPrompt(action.p); }}
                      className="px-2 py-1.5 text-[11px] font-medium bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/40 hover:border-emerald-500/30 rounded-lg transition-all duration-200 text-gray-300 hover:text-emerald-300"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action History */}
            {history.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">History</h3>
                <div className="space-y-1.5">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(item.prompt)}
                      className="w-full text-left p-2 bg-gray-800/30 hover:bg-gray-800/60 rounded-lg transition-colors border border-gray-700/20 group"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-0.5">
                        <Icons.Clock />
                        {item.timestamp}
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-2 group-hover:text-emerald-200">{item.prompt}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.columns.map(c => (
                          <span key={c} className="px-1.5 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-300 rounded">+{c}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data Validation Panel */}
            {validationStats && (
              <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/30 mt-4">
                <button
                  onClick={() => setIsValidationOpen(!isValidationOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 hover:bg-gray-800 transition-colors border-b border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <Icons.AlertTriangle />
                    <span className="text-xs font-semibold text-gray-300">Data Validation</span>
                    {(validationStats.emptyCells > 0 || validationStats.duplicates > 0 || Object.keys(validationStats.typeMismatches).length > 0) && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    )}
                  </div>
                  <div className={`text-gray-500 transition-transform ${isValidationOpen ? 'rotate-180' : ''}`}>
                    <Icons.ChevronDown />
                  </div>
                </button>
                {isValidationOpen && (
                  <div className="p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Empty Cells:</span>
                      <span className={validationStats.emptyCells > 0 ? 'text-amber-400 font-medium' : 'text-emerald-400'}>
                        {validationStats.emptyCells}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Duplicate Rows:</span>
                      <span className={validationStats.duplicates > 0 ? 'text-amber-400 font-medium' : 'text-emerald-400'}>
                        {validationStats.duplicates}
                      </span>
                    </div>
                    {Object.keys(validationStats.typeMismatches).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Type Mismatches</span>
                        {Object.entries(validationStats.typeMismatches).map(([col, cnt]) => (
                          <div key={col} className="flex justify-between items-center text-[11px] mt-1">
                            <span className="text-gray-400 truncate max-w-[120px]" title={col}>{col}</span>
                            <span className="text-amber-400 px-1.5 py-0.5 bg-amber-500/10 rounded">{cnt} values</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {validationStats.emptyCells === 0 && validationStats.duplicates === 0 && Object.keys(validationStats.typeMismatches).length === 0 && (
                      <div className="text-center text-emerald-400/80 italic mt-2">Data looks clean!</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ═══════ MAIN DATA TABLE ═══════ */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {data.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6 max-w-md animate-fadeIn">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg className="w-12 h-12 text-emerald-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-200">Import Your Data</h2>
                  <p className="text-gray-500 mt-2">Upload an Excel or CSV file to get started. Then use AI to analyze, classify, and transform your data.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
                  {['.xlsx', '.xls', '.csv'].map(ext => (
                    <span key={ext} className="px-3 py-1 bg-gray-800/50 rounded-full border border-gray-700/40">{ext}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Error banner */}
              {error && (
                <div className="mx-4 mt-3 px-4 py-2.5 bg-red-900/30 border border-red-700/40 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-red-300">{error}</p>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200"><Icons.X /></button>
                </div>
              )}

              {/* Row warning */}
              {showRowWarning && (
                <div className="mx-4 mt-2 px-3 py-2 bg-amber-900/20 border border-amber-700/30 rounded-lg flex items-center gap-2">
                  <Icons.Info />
                  <p className="text-xs text-amber-300">Showing AI results for first {MAX_AI_ROWS} rows only. Your data has {data.length} rows.</p>
                  <button onClick={() => setShowRowWarning(false)} className="ml-auto text-amber-400 hover:text-amber-200"><Icons.X /></button>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="mx-4 mt-3">
                  <LoadingSpinner text={loadingText} />
                </div>
              )}

              {/* Find/Replace Bar */}
              {showFindReplace && (
                <div className="mx-4 mt-3 px-4 py-2.5 bg-gray-800/80 border border-gray-700/50 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-md sticky top-0 z-20">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Icons.Search />
                    <span className="text-sm font-semibold text-gray-300">Find & Replace</span>
                  </div>
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="Find"
                    className="w-40 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replace with"
                    className="w-40 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-emerald-500"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} className="rounded border-gray-600 bg-gray-800 accent-emerald-500 cursor-pointer w-3.5 h-3.5" /> Match Case
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={wholeCell} onChange={(e) => setWholeCell(e.target.checked)} className="rounded border-gray-600 bg-gray-800 accent-emerald-500 cursor-pointer w-3.5 h-3.5" /> Whole Cell
                  </label>
                  <button onClick={handleReplaceAll} className="ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors shadow-md">Replace All</button>
                  <button onClick={() => setShowFindReplace(false)} className="text-gray-400 hover:text-white transition-colors"><Icons.X /></button>
                </div>
              )}

              {/* Data Table */}
              <div className="flex-1 overflow-auto m-3 rounded-xl border border-gray-800/60 bg-gray-900/30">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="bg-gray-800/95 backdrop-blur-sm px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700/50 w-12">
                        #
                      </th>
                      {headers.map((col, colIdx) => {
                        const isAI = aiColumns.includes(col);
                        return (
                          <th
                            key={colIdx}
                            className={`relative bg-gray-800/95 backdrop-blur-sm px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider border-b border-gray-700/50 cursor-pointer select-none transition-colors ${
                              isAI ? 'text-amber-300 bg-amber-500/5' : 'text-gray-400 hover:text-gray-200'
                            }`}
                            onClick={() => handleColumnHeaderClick(col)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className={filters[col] ? "text-cyan-300" : ""}>{col}</span>
                                {sortConfig?.col === col && (
                                  <span className="text-emerald-400">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>
                                )}
                                {isAI && (
                                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                )}
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleColumnHeaderClick(col); }} className="text-gray-500 hover:text-gray-300">
                                <Icons.MoreVertical />
                              </button>
                            </div>
                            
                            {/* Header Dropdown */}
                            {headerMenuCol === col && (
                              <div 
                                className="absolute top-full right-0 left-auto mt-2 z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl min-w-[200px] overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {showColumnStats === col ? (
                                  <div className="p-3 animate-fadeIn relative">
                                    <button onClick={() => setShowColumnStats(null)} className="absolute top-2 right-2 text-gray-400 hover:text-white"><Icons.X /></button>
                                    <h4 className="text-sm font-semibold text-emerald-300 truncate pr-6 mb-2">{col} Stats</h4>
                                    <div className="text-xs space-y-1.5 text-gray-300">
                                      <div className="flex justify-between"><span className="text-gray-500">Count:</span><span>{columnStatsData?.count}</span></div>
                                      {columnStatsData?.type === 'numeric' ? (
                                        <>
                                          <div className="flex justify-between"><span className="text-gray-500">Min:</span><span className="text-cyan-300">{columnStatsData.min}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-500">Max:</span><span className="text-cyan-300">{columnStatsData.max}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-500">Average:</span><span className="text-emerald-300">{columnStatsData.avg}</span></div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="flex justify-between"><span className="text-gray-500">Unique:</span><span>{columnStatsData?.uniqueCount}</span></div>
                                          <div className="mt-2">
                                            <span className="text-gray-500 text-[11px] uppercase tracking-wider block mb-1">Top Values</span>
                                            {columnStatsData?.topValues?.map(([val, count], i) => (
                                              <div key={i} className="flex justify-between mt-0.5">
                                                <span className="truncate max-w-[120px]" title={val}>{val}</span>
                                                <span className="text-emerald-300">{count}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-1 text-xs text-gray-300 animate-fadeIn font-normal normal-case tracking-normal">
                                    <div className="px-3 py-1.5 flex items-center gap-2 border-b border-gray-700/50">
                                      <Icons.Filter />
                                      <input 
                                        type="text" 
                                        value={filters[col] || ''} 
                                        onChange={(e) => handleColumnAction(col, 'filter', e.target.value)}
                                        placeholder="Filter values..." 
                                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500"
                                      />
                                    </div>
                                    <button onClick={() => handleColumnAction(col, 'sort-asc')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 hover:text-white transition-colors">
                                      <Icons.ArrowUp /> Sort A → Z
                                    </button>
                                    <button onClick={() => handleColumnAction(col, 'sort-desc')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 hover:text-white transition-colors">
                                      <Icons.ArrowDown /> Sort Z → A
                                    </button>
                                    {sortConfig?.col === col && (
                                      <button onClick={() => handleColumnAction(col, 'clear-sort')} className="w-full text-left px-3 py-1.5 hover:bg-gray-700 hover:text-white transition-colors text-emerald-400">
                                        Clear Sort
                                      </button>
                                    )}
                                    <div className="h-px bg-gray-700/50 my-1"></div>
                                    <button onClick={() => handleColumnAction(col, 'stats')} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 hover:text-white transition-colors">
                                      <Icons.BarChart /> Show Statistics
                                    </button>
                                    <div className="h-px bg-gray-700/50 my-1"></div>
                                    <button onClick={() => handleColumnAction(col, 'rename')} className="w-full text-left px-3 py-1.5 hover:bg-gray-700 hover:text-white transition-colors">Rename Column</button>
                                    <button onClick={() => handleColumnAction(col, 'delete')} className="w-full text-left px-3 py-1.5 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors">Delete Column</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, rowIdx) => {
                      const globalIdx = (currentPage - 1) * ROWS_PER_PAGE + rowIdx;
                      return (
                        <tr 
                          key={rowIdx} 
                          className="group hover:bg-gray-800/30 transition-colors"
                          onContextMenu={(e) => handleRowContextMenu(e, row)}
                        >
                          <td className="px-3 py-2 text-xs text-gray-600 border-b border-gray-800/40 font-mono">
                            {globalIdx + 1}
                          </td>
                          {headers.map((col, colIdx) => {
                            const isAI = aiColumns.includes(col);
                            const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.col === col;
                            return (
                              <td
                                key={colIdx}
                                className={`px-3 py-2 border-b border-gray-800/40 max-w-[200px] ${
                                  isAI ? 'bg-amber-500/[0.04]' : ''
                                }`}
                                onClick={() => handleCellClick(rowIdx, col)}
                              >
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellSave}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCellSave(); if (e.key === 'Escape') setEditingCell(null); }}
                                    className="w-full bg-gray-700 border border-emerald-500/50 rounded px-1.5 py-0.5 text-xs text-gray-100 outline-none"
                                  />
                                ) : (
                                  <span className={`text-xs block truncate ${isAI ? 'text-amber-200/90' : 'text-gray-300'} ${getCellColor(row[col])}`}>
                                    {row[col] || ''}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 bg-gray-900/60 border-t border-gray-800/50">
                  <span className="text-xs text-gray-500">
                    Page {currentPage} of {totalPages} · {data.length} rows
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <Icons.ChevronLeft />
                    </button>

                    {/* Page numbers */}
                    {(() => {
                      const pages = [];
                      const start = Math.max(1, currentPage - 2);
                      const end = Math.min(totalPages, currentPage + 2);
                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`w-7 h-7 text-xs rounded-md transition-colors ${
                              i === currentPage
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      return pages;
                    })()}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <Icons.ChevronRight />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* ═══════ RIGHT PANEL ═══════ */}
        <aside className="w-80 flex-shrink-0 bg-gray-900/50 border-l border-gray-800/60 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">

            {!aiResponse && !loading && (
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-gray-800/50 border border-gray-700/30 flex items-center justify-center">
                    <Icons.Sparkles />
                  </div>
                  <p className="text-sm text-gray-500">AI results will appear here</p>
                  <p className="text-xs text-gray-600 max-w-[200px]">Run an AI action to see insights, summaries, and new columns</p>
                </div>
              </div>
            )}

            {/* Summary Card */}
            {aiSummary && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Icons.Zap /> AI Insights
                </h3>
                {aiSummary.map((s, i) => (
                  <div key={i} className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <h4 className="text-sm font-semibold text-gray-200">
                        {pendingResult ? 'New Column' : 'Added Column'}: <span className="text-amber-300">{s.column}</span>
                      </h4>
                    </div>
                    {s.type === 'numeric' && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-[10px]">Min</p>
                          <p className="text-cyan-300 font-medium">{s.min}</p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-[10px]">Avg</p>
                          <p className="text-emerald-300 font-medium">{s.avg}</p>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-[10px]">Max</p>
                          <p className="text-cyan-300 font-medium">{s.max}</p>
                        </div>
                      </div>
                    )}
                    {s.type === 'categorical' && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.uniqueCount} unique values</p>
                        {s.topValues?.map((v, j) => {
                          const match = v.match(/^(.+?)\s*\((\d+)%\)$/);
                          const label = match ? match[1] : v;
                          const pct = match ? parseInt(match[2]) : 0;
                          return (
                            <div key={j} className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-300">{label}</span>
                                <span className="text-gray-500">{match ? `${match[2]}%` : ''}</span>
                              </div>
                              {pct > 0 && (
                                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {s.type === 'empty' && <p className="text-xs text-gray-500">No values generated</p>}
                  </div>
                ))}

                {/* Apply to Table */}
                {pendingResult && (
                  <button
                    onClick={applyToTable}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all duration-300 active:scale-[0.98]"
                  >
                    <Icons.Check /> Apply to Table
                  </button>
                )}
              </div>
            )}

            {/* Raw AI Response */}
            {aiResponse && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Raw Response</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(aiResponse)}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Icons.Copy /> Copy
                  </button>
                </div>
                <pre className="bg-gray-800/40 border border-gray-700/30 rounded-lg p-3 text-[11px] text-gray-400 font-mono overflow-x-auto max-h-60 whitespace-pre-wrap break-words scrollbar-thin">
                  {aiResponse}
                </pre>
              </div>
            )}

            {/* Export */}
            {data.length > 0 && aiColumns.length > 0 && (
              <div className="pt-2 border-t border-gray-800/40">
                <button
                  onClick={exportToExcel}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  <Icons.Download /> Export Modified Data
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
