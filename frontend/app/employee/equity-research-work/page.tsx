'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  RefreshCw,
  Zap,
  Plus,
  Trash2,
  FileBarChart2,
  ChevronDown,
  X,
  FileText,
  Search,
  CheckCircle2,
  Sparkles,
  Calculator,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUpRight,
  ArrowDownRight,
  BookmarkCheck,
  Building2,
  UploadCloud,
  FileUp,
  FileDown,
  Sliders,
  RotateCcw,
  Save,
  Database,
  FolderOpen,
  History,
  Calendar,
  Eye,
} from 'lucide-react';
import { getOpsBaseUrl, safeJsonFetch } from '@/lib/api';

// ─── Interfaces & Mode Definitions ───────────────────────────
interface PeerCol {
  id: number;
  label: string;
}

interface MetricRow {
  key: string;
  label: string;
}

interface ConsensusRow {
  id: number;
  callDate: string;
  brokerageHouse: string;
  rating: string;
  targetPrice: string;
}

const COMPARISON_MODES = [
  'Peer Comparison (Target Co. vs Peers)',
  'Historical Analysis (Target Co. Multi-Year)',
  'Sector Benchmark Analysis',
  'DCF Intrinsic Value Model',
];

const RECOMMENDATIONS = ['Buy', 'Accumulate', 'Hold', 'Reduce', 'Sell'];

// Mode-specific Metric Sets
const PEER_METRICS: MetricRow[] = [
  { key: 'market_cap', label: 'Market Cap (Cr)' },
  { key: 'pe_ratio',   label: 'P/E Ratio' },
  { key: 'roe',        label: 'ROE (%)' },
  { key: 'roce',       label: 'ROCE (%)' },
  { key: 'opm',        label: 'OPM (%)' },
  { key: 'ev_ebitda',  label: 'EV / EBITDA' },
];

const HISTORICAL_METRICS: MetricRow[] = [
  { key: 'revenue', label: 'Revenue from Ops (Cr)' },
  { key: 'ebitda',  label: 'EBITDA (Cr)' },
  { key: 'opm',     label: 'EBITDA Margin (%)' },
  { key: 'pat',     label: 'Net Profit / PAT (Cr)' },
  { key: 'eps',     label: 'EPS (₹)' },
  { key: 'roe',     label: 'ROE (%)' },
  { key: 'roce',    label: 'ROCE (%)' },
];

const BENCHMARK_METRICS: MetricRow[] = [
  { key: 'pe_ratio',    label: 'P/E Multiple (x)' },
  { key: 'ev_ebitda',   label: 'EV / EBITDA (x)' },
  { key: 'roe',         label: 'Return on Equity (ROE %)' },
  { key: 'opm',         label: 'Operating Margin (OPM %)' },
  { key: 'pb_ratio',    label: 'Price to Book (P/B)' },
  { key: 'debt_equity', label: 'Debt to Equity (x)' },
];

const DCF_METRICS: MetricRow[] = [
  { key: 'wacc',            label: 'WACC / Discount Rate (%)' },
  { key: 'terminal_growth', label: 'Terminal Growth Rate (%)' },
  { key: 'revenue_cagr',    label: '5Y Revenue CAGR (%)' },
  { key: 'ebitda_margin',   label: 'Projected EBITDA Margin (%)' },
  { key: 'fair_value',      label: 'Implied Intrinsic Value (₹)' },
  { key: 'cmp',             label: 'Current Market Price (₹)' },
  { key: 'margin_safety',   label: 'Margin of Safety (%)' },
];

// Mode-specific Columns
const HISTORICAL_COLS: PeerCol[] = [
  { id: 101, label: 'FY21' },
  { id: 102, label: 'FY22' },
  { id: 103, label: 'FY23' },
  { id: 104, label: 'FY24' },
  { id: 105, label: 'FY25 (Est)' },
];

const BENCHMARK_COLS: PeerCol[] = [
  { id: 201, label: 'Target Co.' },
  { id: 202, label: 'Sector Median' },
  { id: 203, label: 'Top Quartile (P75)' },
  { id: 204, label: 'Sector Low (P25)' },
];

const DCF_COLS: PeerCol[] = [
  { id: 301, label: 'Conservative Case' },
  { id: 302, label: 'Base Case (WisBees)' },
  { id: 303, label: 'Bull Case' },
];

function getMetricCellValue(
  dataMap: Record<string, Record<number | string, string>>,
  metricKey: string,
  colId: number,
  colIndex: number
): string {
  if (!dataMap || !dataMap[metricKey]) return '';
  const row = dataMap[metricKey];
  if (row[colId] !== undefined && row[colId] !== null && String(row[colId]).trim() !== '') {
    return String(row[colId]);
  }
  if (row[String(colId)] !== undefined && row[String(colId)] !== null && String(row[String(colId)]).trim() !== '') {
    return String(row[String(colId)]);
  }
  const fallbackKey = colIndex + 1;
  if (row[fallbackKey] !== undefined && row[fallbackKey] !== null && String(row[fallbackKey]).trim() !== '') {
    return String(row[fallbackKey]);
  }
  if (row[String(fallbackKey)] !== undefined && row[String(fallbackKey)] !== null && String(row[String(fallbackKey)]).trim() !== '') {
    return String(row[String(fallbackKey)]);
  }
  const modKey = colId % 100;
  if (modKey > 0 && row[modKey] !== undefined && row[modKey] !== null && String(row[modKey]).trim() !== '') {
    return String(row[modKey]);
  }
  return '';
}

// ─── Card Wrapper ─────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{children}</div>;
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-colors';

// ─── Helper to Read Cached Report State Synchronously on Mount ─
function getInitialReportData() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading cached report data:', err);
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────
export default function EquityResearchWorkPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // ── Target Stock Search & Autocomplete ──
  const [stockQuery, setStockQuery] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.stockQuery || d?.companyName || '';
  });
  const [companyName, setCompanyName] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.companyName || d?.stockQuery || '';
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [currentPrice, setCurrentPrice] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.currentPrice || '';
  });
  const [priceAsOn, setPriceAsOn] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.priceAsOn || new Date().toISOString().split('T')[0];
  });
  const [targetPrice, setTargetPrice] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.targetPrice || '';
  });
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // ── Comparison Mode & Recommendation ──
  const [compMode, setCompMode] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.compMode || COMPARISON_MODES[0];
  });
  const [recommendation, setRecommendation] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.recommendation || '';
  });

  // ── Peer Columns & Peer Autocomplete ──
  const [peers, setPeers] = useState<PeerCol[]>(() => {
    const d = getInitialReportData();
    if (d?.peers && Array.isArray(d.peers) && d.peers.length > 0) return d.peers;
    return [{ id: 1, label: 'Target Company' }];
  });
  const [peerNames, setPeerNames] = useState<Record<number, string>>(() => {
    const d = getInitialReportData();
    if (d?.peerNames && Object.keys(d.peerNames).length > 0) return d.peerNames;
    return { 1: 'Target Company', 2: 'Peer 1', 3: 'Peer 2' };
  });
  const [peerQuery, setPeerQuery] = useState<Record<number, string>>({});
  const [peerSuggestions, setPeerSuggestions] = useState<Record<number, any[]>>({});
  const [activePeerSearchId, setActivePeerSearchId] = useState<number | null>(null);
  const [fetchingPeerId, setFetchingPeerId] = useState<number | null>(null);

  // ── Metadata ──
  const [industrySector, setIndustrySector] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.industrySector || '';
  });
  const [timeHorizon, setTimeHorizon] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.timeHorizon || '12 - 24 Months';
  });
  const [chartFile, setChartFile] = useState<File | null>(null);
  const chartInputRef = useRef<HTMLInputElement>(null);
  const dropFileInputRef = useRef<HTMLInputElement>(null);
  const [chartImageData, setChartImageData] = useState<string | null>(() => {
    const d = getInitialReportData();
    return d?.chartImageData || null;
  });
  const [chartImageMaxHeight, setChartImageMaxHeight] = useState<number>(() => {
    const d = getInitialReportData();
    return d?.chartImageMaxHeight ? Number(d.chartImageMaxHeight) : 380;
  });
  const [chartImageWidth, setChartImageWidth] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.chartImageWidth || '100%';
  });
  const [isDraggingReport, setIsDraggingReport] = useState(false);

  // ── Database Saved Reports & History State ──
  const [currentReportId, setCurrentReportId] = useState<number | null>(() => {
    const d = getInitialReportData();
    return d?.reportId ? Number(d.reportId) : null;
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // ── Mode-specific Metric Table Data ──
  const [metricsData, setMetricsData] = useState<Record<string, Record<number, string>>>(() => {
    const d = getInitialReportData();
    return d?.metricsData || {};
  });
  const [historicalData, setHistoricalData] = useState<Record<string, Record<number, string>>>(() => {
    const d = getInitialReportData();
    return d?.historicalData?.data || d?.historicalData || {};
  });
  const [benchmarkData, setBenchmarkData] = useState<Record<string, Record<number, string>>>(() => {
    const d = getInitialReportData();
    return d?.benchmarkData?.data || d?.benchmarkData || {};
  });
  const [dcfData, setDcfData] = useState<Record<string, Record<number, string>>>(() => {
    const d = getInitialReportData();
    return d?.dcfData?.data || d?.dcfData || {};
  });

  // ── Alignment Options ──
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right' | 'justify'>(() => {
    const d = getInitialReportData();
    return d?.textAlignment || 'left';
  });
  const [tableAlignment, setTableAlignment] = useState<'left' | 'center' | 'right'>(() => {
    const d = getInitialReportData();
    return d?.tableAlignment || 'center';
  });

  // ── Analyst Notes ──
  const [businessOverview, setBusinessOverview] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.businessOverview || '';
  });
  const [valuationThesis, setValuationThesis] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.valuationThesis || '';
  });
  const [technicalAnalysis, setTechnicalAnalysis] = useState<string>(() => {
    const d = getInitialReportData();
    return d?.technicalAnalysis || '';
  });

  // ── Street Coverage Consensus ──
  const [consensusRows, setConsensusRows] = useState<ConsensusRow[]>(() => {
    const d = getInitialReportData();
    if (d?.consensusRows && Array.isArray(d.consensusRows) && d.consensusRows.length > 0) return d.consensusRows;
    return [{ id: 1, callDate: new Date().toLocaleDateString('en-GB'), brokerageHouse: 'WisBees Institutional Research', rating: 'Buy', targetPrice: '650.00' }];
  });

  const [compiling, setCompiling] = useState(false);

  // ── Load User & Synchronize Storage ──
  useEffect(() => {
    const savedUser = localStorage.getItem('ops_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch {}
    }

    const syncFromStorage = () => {
      try {
        const cached = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
        if (cached) {
          const d = JSON.parse(cached);
          if (d.stockQuery !== undefined) setStockQuery(d.stockQuery);
          if (d.companyName !== undefined) setCompanyName(d.companyName);
          if (d.currentPrice !== undefined) setCurrentPrice(d.currentPrice);
          if (d.priceAsOn !== undefined) setPriceAsOn(d.priceAsOn);
          if (d.targetPrice !== undefined) setTargetPrice(d.targetPrice);
          if (d.recommendation !== undefined) setRecommendation(d.recommendation);
          if (d.compMode !== undefined) setCompMode(d.compMode);
          if (d.industrySector !== undefined) setIndustrySector(d.industrySector);
          if (d.timeHorizon !== undefined) setTimeHorizon(d.timeHorizon);
          if (d.peers && Array.isArray(d.peers) && d.peers.length > 0) setPeers(d.peers);
          if (d.peerNames && Object.keys(d.peerNames).length > 0) setPeerNames(d.peerNames);
          if (d.metricsData) setMetricsData(d.metricsData);
          if (d.historicalData) setHistoricalData(d.historicalData?.data || d.historicalData);
          if (d.benchmarkData) setBenchmarkData(d.benchmarkData?.data || d.benchmarkData);
          if (d.dcfData) setDcfData(d.dcfData?.data || d.dcfData);
          if (d.textAlignment) setTextAlignment(d.textAlignment);
          if (d.tableAlignment) setTableAlignment(d.tableAlignment);
          if (d.businessOverview !== undefined) setBusinessOverview(d.businessOverview);
          if (d.valuationThesis !== undefined) setValuationThesis(d.valuationThesis);
          if (d.technicalAnalysis !== undefined) setTechnicalAnalysis(d.technicalAnalysis);
          if (d.consensusRows && Array.isArray(d.consensusRows) && d.consensusRows.length > 0) {
            setConsensusRows(d.consensusRows);
          }
          if (d.chartImageData !== undefined) setChartImageData(d.chartImageData);
          if (d.chartImageMaxHeight !== undefined) setChartImageMaxHeight(Number(d.chartImageMaxHeight));
          if (d.chartImageWidth !== undefined) setChartImageWidth(d.chartImageWidth);
        }
      } catch (err) {
        console.error('Failed to sync storage data:', err);
      }
    };

    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const handleResetForm = () => {
    setStockQuery('');
    setCompanyName('');
    setCurrentPrice('');
    setPriceAsOn(new Date().toISOString().split('T')[0]);
    setTargetPrice('');
    setRecommendation('');
    setCompMode(COMPARISON_MODES[0]);
    setIndustrySector('');
    setTimeHorizon('12 - 24 Months');
    setChartFile(null);
    setChartImageData(null);
    setChartImageMaxHeight(380);
    setChartImageWidth('100%');
    if (chartInputRef.current) chartInputRef.current.value = '';
    if (dropFileInputRef.current) dropFileInputRef.current.value = '';
    setPeers([
      { id: 1, label: 'Target Company' },
    ]);
    setPeerNames({});
    setPeerQuery({});
    setMetricsData({});
    setHistoricalData({});
    setBenchmarkData({});
    setDcfData({});
    setBusinessOverview('');
    setValuationThesis('');
    setTechnicalAnalysis('');
    setConsensusRows([
      { id: 1, callDate: '', brokerageHouse: '', rating: '', targetPrice: '' },
    ]);
    sessionStorage.removeItem('equity_research_report_data');
    localStorage.removeItem('equity_research_report_data');
    setSuccessToast('Form reset to clean blank state.');
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // ── Drag & Drop & Load Older Report ──
  const handleLoadReportFile = (file: File) => {
    if (!file) return;

    if (file.name.endsWith('.json') || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          const d = parsed.reportData || parsed;

          if (!d.stockQuery && !d.companyName && !d.currentPrice) {
            alert('The dropped file does not appear to be a valid WisBees Research Dossier JSON.');
            return;
          }

          if (d.stockQuery !== undefined) setStockQuery(d.stockQuery);
          if (d.companyName !== undefined) setCompanyName(d.companyName);
          if (d.currentPrice !== undefined) setCurrentPrice(d.currentPrice);
          if (d.priceAsOn !== undefined) setPriceAsOn(d.priceAsOn);
          if (d.targetPrice !== undefined) setTargetPrice(d.targetPrice);
          if (d.recommendation !== undefined) setRecommendation(d.recommendation);
          if (d.compMode !== undefined) setCompMode(d.compMode);
          if (d.industrySector !== undefined) setIndustrySector(d.industrySector);
          if (d.timeHorizon !== undefined) setTimeHorizon(d.timeHorizon);
          if (d.peers && Array.isArray(d.peers) && d.peers.length > 0) setPeers(d.peers);
          if (d.peerNames && Object.keys(d.peerNames).length > 0) setPeerNames(d.peerNames);
          if (d.metricsData) setMetricsData(d.metricsData);
          if (d.historicalData) setHistoricalData(d.historicalData?.data || d.historicalData);
          if (d.benchmarkData) setBenchmarkData(d.benchmarkData?.data || d.benchmarkData);
          if (d.dcfData) setDcfData(d.dcfData?.data || d.dcfData);
          if (d.textAlignment) setTextAlignment(d.textAlignment);
          if (d.tableAlignment) setTableAlignment(d.tableAlignment);
          if (d.businessOverview !== undefined) setBusinessOverview(d.businessOverview);
          if (d.valuationThesis !== undefined) setValuationThesis(d.valuationThesis);
          if (d.technicalAnalysis !== undefined) setTechnicalAnalysis(d.technicalAnalysis);
          if (d.consensusRows && Array.isArray(d.consensusRows) && d.consensusRows.length > 0) {
            setConsensusRows(d.consensusRows);
          }
          if (d.chartImageData !== undefined) setChartImageData(d.chartImageData);
          if (d.chartImageMaxHeight !== undefined) setChartImageMaxHeight(Number(d.chartImageMaxHeight));
          if (d.chartImageWidth !== undefined) setChartImageWidth(d.chartImageWidth);

          try {
            const serialized = JSON.stringify(d);
            sessionStorage.setItem('equity_research_report_data', serialized);
            localStorage.setItem('equity_research_report_data', serialized);
          } catch {}

          setSuccessToast(`Restored report dossier for ${d.companyName || d.stockQuery}! You can now edit.`);
          setTimeout(() => setSuccessToast(''), 4500);
        } catch (err: any) {
          console.error('Error parsing report json:', err);
          alert('Could not parse report file. Please ensure it is a valid JSON dossier.');
        }
      };
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setChartImageData(result);
        setChartFile(file);
        setSuccessToast(`Uploaded chart image (${file.name}). Adjust resizing options in Card 5.`);
        setTimeout(() => setSuccessToast(''), 4000);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Unsupported file format. Please drop a .json report dossier or a chart image file.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingReport(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingReport(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingReport(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleLoadReportFile(e.dataTransfer.files[0]);
    }
  };

  // ── Export Dossier JSON ──
  const handleExportReportJson = () => {
    const payload = {
      stockQuery,
      companyName: companyName || stockQuery || 'Target Company',
      currentPrice,
      priceAsOn,
      targetPrice,
      recommendation,
      compMode,
      industrySector,
      timeHorizon,
      peers,
      peerNames,
      metricsData,
      historicalData,
      benchmarkData,
      dcfData,
      textAlignment,
      tableAlignment,
      businessOverview,
      valuationThesis,
      technicalAnalysis,
      consensusRows,
      chartImageData,
      chartImageMaxHeight,
      chartImageWidth,
      exportedAt: new Date().toISOString(),
    };

    const fileName = `WISBEES_REPORT_${(companyName || stockQuery || 'DOSSIER').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccessToast(`Exported dossier backup as ${fileName}`);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // ── Fetch Saved Reports from Database ──
  const handleFetchSavedReports = async (query = '') => {
    setLoadingReports(true);
    try {
      const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
      const token = localStorage.getItem('ops_token');
      const res = await fetch(`${baseUrl}/ia/reports?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // ── Save Current Report to Database ──
  const handleSaveReportToDatabase = async () => {
    if (!stockQuery.trim() && !companyName.trim()) {
      alert('Please enter a target stock name or ticker before saving to database.');
      return;
    }
    setSavingToDb(true);
    try {
      const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
      const token = localStorage.getItem('ops_token');
      const payload = {
        report_id: currentReportId,
        stockQuery: stockQuery.trim(),
        companyName: companyName || stockQuery || 'Target Company',
        currentPrice: currentPrice || '',
        priceAsOn: priceAsOn || new Date().toISOString().split('T')[0],
        targetPrice: targetPrice || '',
        recommendation,
        compMode,
        industrySector: industrySector || 'Equities & Advisory',
        timeHorizon: timeHorizon || '12 - 24 Months',
        peers,
        peerNames,
        metricsData,
        historicalData,
        benchmarkData,
        dcfData,
        textAlignment,
        tableAlignment,
        businessOverview,
        valuationThesis,
        technicalAnalysis,
        consensusRows,
        chartImageData,
        chartImageMaxHeight,
        chartImageWidth,
        userName: user?.name || user?.email || 'WisBees Analyst',
      };

      const res = await fetch(`${baseUrl}/ia/reports/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to save report to database');
      }

      const savedId = result.report_id;
      setCurrentReportId(savedId);

      // Update storage with reportId
      try {
        const cached = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.reportId = savedId;
          sessionStorage.setItem('equity_research_report_data', JSON.stringify(parsed));
          localStorage.setItem('equity_research_report_data', JSON.stringify(parsed));
        }
      } catch {}

      setSuccessToast(`Report for ${companyName || stockQuery} saved to database successfully (ID: #${savedId})!`);
      setTimeout(() => setSuccessToast(''), 4500);
    } catch (err: any) {
      console.error('Error saving report to DB:', err);
      alert(err.message || 'Error saving report to database. Please check your connection.');
    } finally {
      setSavingToDb(false);
    }
  };

  // ── Load a Specific Saved Report from Database ──
  const handleLoadSavedReport = async (reportId: number, navigateToReport = false) => {
    try {
      const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
      const token = localStorage.getItem('ops_token');
      const res = await fetch(`${baseUrl}/ia/reports/${reportId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load report from database');
      }

      const rep = data.report;
      const d = rep.report_data || {};

      setCurrentReportId(rep.id);
      if (d.stockQuery !== undefined || rep.symbol) setStockQuery(d.stockQuery || rep.symbol);
      if (d.companyName !== undefined || rep.company_name) setCompanyName(d.companyName || rep.company_name);
      if (d.currentPrice !== undefined || rep.current_price) setCurrentPrice(d.currentPrice || rep.current_price);
      if (d.priceAsOn !== undefined) setPriceAsOn(d.priceAsOn);
      if (d.targetPrice !== undefined || rep.target_price) setTargetPrice(d.targetPrice || rep.target_price);
      if (d.recommendation !== undefined || rep.recommendation) setRecommendation(d.recommendation || rep.recommendation);
      if (d.compMode !== undefined || rep.comp_mode) setCompMode(d.compMode || rep.comp_mode);
      if (d.industrySector !== undefined || rep.sector) setIndustrySector(d.industrySector || rep.sector);
      if (d.timeHorizon !== undefined || rep.time_horizon) setTimeHorizon(d.timeHorizon || rep.time_horizon);
      if (d.peers && Array.isArray(d.peers) && d.peers.length > 0) setPeers(d.peers);
      if (d.peerNames && Object.keys(d.peerNames).length > 0) setPeerNames(d.peerNames);
      if (d.metricsData) setMetricsData(d.metricsData);
      if (d.historicalData) setHistoricalData(d.historicalData?.data || d.historicalData);
      if (d.benchmarkData) setBenchmarkData(d.benchmarkData?.data || d.benchmarkData);
      if (d.dcfData) setDcfData(d.dcfData?.data || d.dcfData);
      if (d.textAlignment) setTextAlignment(d.textAlignment);
      if (d.tableAlignment) setTableAlignment(d.tableAlignment);
      if (d.businessOverview !== undefined) setBusinessOverview(d.businessOverview);
      if (d.valuationThesis !== undefined) setValuationThesis(d.valuationThesis);
      if (d.technicalAnalysis !== undefined) setTechnicalAnalysis(d.technicalAnalysis);
      if (d.consensusRows && Array.isArray(d.consensusRows) && d.consensusRows.length > 0) {
        setConsensusRows(d.consensusRows);
      }
      if (d.chartImageData !== undefined) setChartImageData(d.chartImageData);
      if (d.chartImageMaxHeight !== undefined) setChartImageMaxHeight(Number(d.chartImageMaxHeight));
      if (d.chartImageWidth !== undefined) setChartImageWidth(d.chartImageWidth);

      // Store in browser
      try {
        const fullPayload = { ...d, reportId: rep.id };
        sessionStorage.setItem('equity_research_report_data', JSON.stringify(fullPayload));
        localStorage.setItem('equity_research_report_data', JSON.stringify(fullPayload));
      } catch {}

      setShowHistoryModal(false);
      setSuccessToast(`Loaded report #${rep.id} (${rep.company_name}) from database!`);
      setTimeout(() => setSuccessToast(''), 4500);

      if (navigateToReport) {
        router.push('/employee/equity-research-work/report');
      }
    } catch (err: any) {
      console.error('Error loading report:', err);
      alert(err.message || 'Error loading report from database.');
    }
  };

  // ── Delete a Saved Report ──
  const handleDeleteSavedReport = async (reportId: number, compName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the saved report for "${compName}" (#${reportId}) from database?`)) {
      return;
    }
    try {
      const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
      const token = localStorage.getItem('ops_token');
      const res = await fetch(`${baseUrl}/ia/reports/${reportId}/delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });
      if (res.ok) {
        setSavedReports(prev => prev.filter(r => r.id !== reportId));
        if (currentReportId === reportId) {
          setCurrentReportId(null);
        }
        setSuccessToast(`Deleted report #${reportId} for ${compName}`);
        setTimeout(() => setSuccessToast(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  // ── Continuous Auto-Save to Prevent Data Vanishing ──
  useEffect(() => {
    // CRITICAL GUARD: Never auto-save an empty form over existing cached data!
    const hasData =
      Boolean(stockQuery.trim()) ||
      Boolean(companyName.trim()) ||
      Boolean(currentPrice.trim()) ||
      Object.keys(metricsData).length > 0 ||
      Object.keys(historicalData).length > 0;

    if (!hasData) {
      return;
    }

    const timeout = setTimeout(() => {
      const payload = {
        stockQuery,
        companyName,
        currentPrice,
        priceAsOn,
        targetPrice,
        recommendation,
        compMode,
        industrySector,
        timeHorizon,
        peers,
        peerNames,
        metricsData,
        historicalData,
        benchmarkData,
        dcfData,
        textAlignment,
        tableAlignment,
        businessOverview,
        valuationThesis,
        technicalAnalysis,
        consensusRows,
        chartImageData,
        chartImageMaxHeight,
        chartImageWidth,
      };
      try {
        try {
          const serialized = JSON.stringify(payload);
          localStorage.setItem('equity_research_report_data', serialized);
          sessionStorage.setItem('equity_research_report_data', serialized);
        } catch {
          // If QuotaExceededError, store without large image data
          const { chartImageData: _img, ...safePayload } = payload;
          const safeStr = JSON.stringify(safePayload);
          localStorage.setItem('equity_research_report_data', safeStr);
          sessionStorage.setItem('equity_research_report_data', safeStr);
        }
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [
    stockQuery,
    companyName,
    currentPrice,
    priceAsOn,
    targetPrice,
    recommendation,
    compMode,
    industrySector,
    timeHorizon,
    peers,
    peerNames,
    metricsData,
    historicalData,
    benchmarkData,
    dcfData,
    textAlignment,
    tableAlignment,
    businessOverview,
    valuationThesis,
    technicalAnalysis,
    consensusRows,
    chartImageData,
    chartImageMaxHeight,
    chartImageWidth,
  ]);

  // ── Target Stock Autocomplete Search ──
  useEffect(() => {
    if (!stockQuery.trim() || stockQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setFetchingSuggestions(true);
        const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
        const data = await safeJsonFetch(`${baseUrl}/ia/search-stocks?query=${encodeURIComponent(stockQuery)}`);
        setSuggestions(data.results || []);
      } catch {
        setSuggestions([]);
      } finally {
        setFetchingSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [stockQuery]);

  // ── Peer Autocomplete Search ──
  const handlePeerSearchChange = (colId: number, query: string) => {
    setPeerQuery(prev => ({ ...prev, [colId]: query }));
    setPeerNames(prev => ({ ...prev, [colId]: query }));
    setActivePeerSearchId(colId);

    if (!query.trim() || query.length < 2) {
      setPeerSuggestions(prev => ({ ...prev, [colId]: [] }));
      return;
    }

    const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
    safeJsonFetch(`${baseUrl}/ia/search-stocks?query=${encodeURIComponent(query)}`)
      .then(data => {
        setPeerSuggestions(prev => ({ ...prev, [colId]: data.results || [] }));
      })
      .catch(() => {
        setPeerSuggestions(prev => ({ ...prev, [colId]: [] }));
      });
  };

  // ── Fetch Peer Metrics & Populate Table ──
  const handleSelectPeer = async (colId: number, peerItem: any) => {
    setActivePeerSearchId(null);
    const peerSymbol = peerItem.symbol;
    const peerFullName = peerItem.name || peerSymbol;
    setPeerNames(prev => ({ ...prev, [colId]: peerFullName }));
    setPeerQuery(prev => ({ ...prev, [colId]: peerFullName }));

    setFetchingPeerId(colId);
    try {
      const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
      const token = localStorage.getItem('ops_token');
      const data = await safeJsonFetch(`${baseUrl}/ia/fetch-stock-data?query=${encodeURIComponent(peerSymbol)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });
      if (data && data.success) {
        const fetchedMcap = data.metricsData?.market_cap?.[1] || '';
        const fetchedPe = data.metricsData?.pe_ratio?.[1] || '';
        const fetchedRoe = data.metricsData?.roe?.[1] || '';
        const fetchedRoce = data.metricsData?.roce?.[1] || '';
        const fetchedOpm = data.metricsData?.opm?.[1] || '';
        const fetchedEv = data.metricsData?.ev_ebitda?.[1] || '';

        setMetricsData(prev => ({
          ...prev,
          market_cap: { ...(prev.market_cap || {}), [colId]: fetchedMcap },
          pe_ratio:   { ...(prev.pe_ratio || {}),   [colId]: fetchedPe },
          roe:        { ...(prev.roe || {}),        [colId]: fetchedRoe },
          roce:       { ...(prev.roce || {}),       [colId]: fetchedRoce },
          opm:        { ...(prev.opm || {}),        [colId]: fetchedOpm },
          ev_ebitda:  { ...(prev.ev_ebitda || {}),  [colId]: fetchedEv },
        }));

        setSuccessToast(`Auto-filled fundamentals for ${peerFullName}!`);
        setTimeout(() => setSuccessToast(''), 3500);
      }
    } catch (err) {
      console.error('Error fetching peer data:', err);
    } finally {
      setFetchingPeerId(null);
    }
  };

  // ── Fetch Target Stock Data & Multi-Mode Fundamentals ──
  const handleFetchStockData = async (queryOverride?: string) => {
    const q = (queryOverride || stockQuery).trim();
    if (!q) return;
    setFetchingPrice(true);
    setFetchError('');
    setShowSuggestions(false);
    try {
      const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
      const token = localStorage.getItem('ops_token');
      const data = await safeJsonFetch(`${baseUrl}/ia/fetch-stock-data?query=${encodeURIComponent(q)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });

      if (data.companyName) {
        setCompanyName(data.companyName);
        setStockQuery(data.companyName);
      } else if (data.stockQuery) {
        setStockQuery(data.stockQuery);
      }
      if (data.currentPrice) setCurrentPrice(data.currentPrice);
      if (data.priceAsOn) setPriceAsOn(data.priceAsOn);
      if (data.targetPrice) setTargetPrice(data.targetPrice);
      if (data.recommendation) setRecommendation(data.recommendation);
      if (data.industrySector) setIndustrySector(data.industrySector);
      if (data.timeHorizon) setTimeHorizon(data.timeHorizon);

      // Peer comparison setup with full names
      if (data.peers && Array.isArray(data.peers)) setPeers(data.peers);
      if (data.peerNames) {
        const fullPeerNames = { ...data.peerNames };
        if (data.companyName) {
          fullPeerNames[1] = `${data.companyName} (TARGET)`;
        }
        setPeerNames(fullPeerNames);
      }
      if (data.metricsData) setMetricsData(data.metricsData);

      // Multi-mode pre-computed datasets
      if (data.historicalData?.data) setHistoricalData(data.historicalData.data);
      if (data.benchmarkData?.data) setBenchmarkData(data.benchmarkData.data);
      if (data.dcfData?.data) setDcfData(data.dcfData.data);

      if (data.businessOverview) setBusinessOverview(data.businessOverview);
      if (data.valuationThesis) setValuationThesis(data.valuationThesis);
      if (data.technicalAnalysis) setTechnicalAnalysis(data.technicalAnalysis);
      if (data.consensusRows && Array.isArray(data.consensusRows)) setConsensusRows(data.consensusRows);

      setSuccessToast(`Loaded live price and metrics for ${data.companyName || q}!`);
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      setFetchError(err.message || 'Could not fetch stock data. Enter manually.');
    } finally {
      setFetchingPrice(false);
    }
  };

  // ── Optional: Fill AI Institutional Thesis on Demand ──
  const [fetchingAiThesis, setFetchingAiThesis] = useState(false);
  const handleGenerateAiThesis = async () => {
    const q = stockQuery.trim();
    if (!q) {
      setFetchError('Please select or enter a stock first.');
      return;
    }
    setFetchingAiThesis(true);
    try {
      const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
      const token = localStorage.getItem('ops_token');
      const data = await safeJsonFetch(`${baseUrl}/ia/fetch-stock-data?query=${encodeURIComponent(q)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });
      if (data.businessOverview) setBusinessOverview(data.businessOverview);
      if (data.valuationThesis) setValuationThesis(data.valuationThesis);
      if (data.technicalAnalysis) setTechnicalAnalysis(data.technicalAnalysis);
      if (data.industrySector && !industrySector) setIndustrySector(data.industrySector);
      setSuccessToast('AI Research commentary generated successfully.');
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to generate AI commentary.');
    } finally {
      setFetchingAiThesis(false);
    }
  };

  // ── Peer Columns Management ──
  const addPeer = () => {
    if (peers.length >= 6) return;
    const nextId = Date.now();
    const nextNum = peers.length;
    setPeers(p => [...p, { id: nextId, label: `Peer ${nextNum}` }]);
  };

  const removePeer = (id: number) => {
    if (peers.length <= 1) return;
    setPeers(p => p.filter(c => c.id !== id));
    setPeerNames(prev => { const n = { ...prev }; delete n[id]; return n; });
    setMetricsData(prev => {
      const n = { ...prev };
      Object.keys(n).forEach(k => { delete n[k][id]; });
      return n;
    });
  };

  // ── Metric Value Setter ──
  const setMetric = (metricKey: string, colId: number, value: string) => {
    const modKey = colId % 100;
    const updater = (prev: Record<string, Record<number, string>>) => ({
      ...prev,
      [metricKey]: {
        ...(prev[metricKey] || {}),
        [colId]: value,
        ...(modKey > 0 ? { [modKey]: value } : {}),
      },
    });

    if (compMode.includes('Historical')) {
      setHistoricalData(updater);
    } else if (compMode.includes('Benchmark')) {
      setBenchmarkData(updater);
    } else if (compMode.includes('DCF')) {
      setDcfData(updater);
    } else {
      setMetricsData(updater);
    }
  };

  // ── Calculator & Recommendation Logger ──
  const cmpNum = parseFloat(currentPrice) || 0;
  const tgtNum = parseFloat(targetPrice) || 0;
  const hasValidCalculation = cmpNum > 0 && tgtNum > 0;
  const upsidePct = hasValidCalculation ? (((tgtNum - cmpNum) / cmpNum) * 100).toFixed(1) : null;
  const isUpsidePositive = upsidePct ? parseFloat(upsidePct) >= 0 : true;

  // Auto-calculated recommendation
  const suggestedRating = upsidePct
    ? parseFloat(upsidePct) >= 15
      ? 'Buy'
      : parseFloat(upsidePct) >= 5
      ? 'Accumulate'
      : parseFloat(upsidePct) >= -5
      ? 'Hold'
      : parseFloat(upsidePct) >= -15
      ? 'Reduce'
      : 'Sell'
    : 'Buy';

  const handleApplySuggestedRating = () => {
    setRecommendation(suggestedRating);
    setSuccessToast(`Applied suggested recommendation: ${suggestedRating}!`);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleLogRecommendation = () => {
    const todayStr = new Date().toLocaleDateString('en-GB');
    const newRow: ConsensusRow = {
      id: Date.now(),
      callDate: todayStr,
      brokerageHouse: user?.name ? `${user.name} (WisBees Research)` : 'WisBees Institutional Research',
      rating: recommendation,
      targetPrice: targetPrice || (cmpNum * 1.2).toFixed(2),
    };
    setConsensusRows(prev => [newRow, ...prev]);
    setSuccessToast(`Logged recommendation "${recommendation}" @ ₹${newRow.targetPrice} into Consensus Table!`);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // ── Consensus Table Management ──
  const addConsensusRow = () => {
    setConsensusRows(r => [...r, { id: Date.now(), callDate: new Date().toLocaleDateString('en-GB'), brokerageHouse: '', rating: 'Buy', targetPrice: '' }]);
  };
  const removeConsensusRow = (id: number) => {
    if (consensusRows.length <= 1) return;
    setConsensusRows(r => r.filter(row => row.id !== id));
  };
  const updateConsensusRow = (id: number, field: keyof ConsensusRow, value: string) => {
    setConsensusRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  // ── Compile & Open Report in Dedicated Page ──
  const handleCompile = () => {
    setCompiling(true);

    const proceed = (finalChartImage: string | null) => {
      const payload = {
        stockQuery: stockQuery.trim(),
        companyName: companyName || stockQuery.replace('.NS', '').replace('.BO', '') || 'Target Company',
        currentPrice: currentPrice || '',
        priceAsOn: priceAsOn || new Date().toISOString().split('T')[0],
        targetPrice: targetPrice || '',
        recommendation,
        compMode,
        industrySector: industrySector || 'Equities & Advisory',
        timeHorizon: timeHorizon || '12 - 24 Months',
        peers,
        peerNames,
        metricsData,
        historicalData,
        benchmarkData,
        dcfData,
        textAlignment,
        tableAlignment,
        businessOverview,
        valuationThesis,
        technicalAnalysis,
        consensusRows,
        chartImageData: finalChartImage,
        chartImageMaxHeight,
        chartImageWidth,
      };

      try {
        sessionStorage.setItem('equity_research_report_data', JSON.stringify(payload));
        localStorage.setItem('equity_research_report_data', JSON.stringify(payload));
      } catch (err) {
        console.error('Storage error:', err);
      }

      router.push('/employee/equity-research-work/report');
    };

    if (chartFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setChartImageData(result);
        proceed(result);
      };
      reader.onerror = () => proceed(chartImageData);
      reader.readAsDataURL(chartFile);
    } else {
      proceed(chartImageData);
    }
  };

  const recColor = recommendation === 'Buy' || recommendation === 'Accumulate'
    ? 'text-emerald-700 dark:text-emerald-400 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
    : recommendation === 'Sell' || recommendation === 'Reduce'
    ? 'text-red-700 dark:text-red-400 border-red-300 bg-red-50 dark:bg-red-950/30'
    : 'text-amber-700 dark:text-amber-400 border-amber-300 bg-amber-50 dark:bg-amber-950/30';

  // Active Metric Dimension Table Configuration based on Comparison Mode
  let activeCols: PeerCol[] = peers;
  let activeMetrics: MetricRow[] = PEER_METRICS;
  let activeDataMap: Record<string, Record<number, string>> = metricsData;

  if (compMode.includes('Historical')) {
    activeCols = HISTORICAL_COLS;
    activeMetrics = HISTORICAL_METRICS;
    activeDataMap = historicalData;
  } else if (compMode.includes('Benchmark')) {
    activeCols = BENCHMARK_COLS;
    activeMetrics = BENCHMARK_METRICS;
    activeDataMap = benchmarkData;
  } else if (compMode.includes('DCF')) {
    activeCols = DCF_COLS;
    activeMetrics = DCF_METRICS;
    activeDataMap = dcfData;
  }

  const tableAlignCls = tableAlignment === 'left' ? 'text-left' : tableAlignment === 'right' ? 'text-right' : 'text-center';
  const textAlignCls = textAlignment === 'left' ? 'text-left' : textAlignment === 'center' ? 'text-center' : textAlignment === 'right' ? 'text-right' : 'text-justify';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-5 max-w-4xl mx-auto animate-fadeIn pb-16 relative"
    >

      {/* ── Top Workspace Navigation Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <Link
            href="/employee/equity-research-work/performance"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 transition"
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Stock Returns & Performance Tracker</span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold">
              NEW
            </span>
          </Link>
          <Link
            href="/employee/equity-research-work"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm border border-violet-500/20"
          >
            <FileBarChart2 className="w-4 h-4" />
            <span>Research Dossier Compiler</span>
          </Link>
          <Link
            href="/employee/equity-research-work/report"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 transition"
          >
            <FileText className="w-4 h-4" />
            <span>Institutional Report View</span>
          </Link>
        </div>
      </div>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Work Hub</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Equity Research & Advisory Compiler Workspace</p>
        </div>
        {user?.designation && (
          <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 shrink-0">
            Designation: {user.designation}
          </span>
        )}
      </div>

      {/* ── Engine Card ──────────────────────────────────── */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-xs">

        {/* Engine header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--card-border)] flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <span className="text-sm font-black text-[var(--text-primary)] block">Institutional Stock Research Compiler Engine</span>
              {companyName && (
                <span className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold">{companyName} ({stockQuery})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSaveReportToDatabase}
              disabled={savingToDb}
              title="Save or update this report in the cloud database"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Database className={`w-3.5 h-3.5 ${savingToDb ? 'animate-spin' : ''}`} />
              {savingToDb ? 'Saving to DB…' : currentReportId ? `Update in DB (#${currentReportId})` : 'Save to DB'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowHistoryModal(true);
                handleFetchSavedReports();
              }}
              title="Browse and load previously saved reports from database"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30 text-[11px] font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>Saved Reports</span>
            </button>
            <button
              type="button"
              onClick={handleExportReportJson}
              title="Download full report dossier backup as JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" /> Export (.json)
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              title="Clear all fields and start fresh"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100/50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Form
            </button>
            <button 
              type="button"
              onClick={() => router.push('/employee/equity-research-work/report')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--card-border)] text-[11px] font-bold text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> View Current Report
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Drag & Drop Zone for Older Reports & Chart Images */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => dropFileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all text-center cursor-pointer select-none ${
              isDraggingReport
                ? 'border-violet-500 bg-violet-100/70 dark:bg-violet-950/60 scale-[1.01] shadow-lg ring-4 ring-violet-500/20'
                : 'border-slate-300 dark:border-slate-700 bg-gradient-to-r from-violet-50/30 via-slate-50/50 to-indigo-50/30 dark:from-slate-900/40 dark:via-slate-800/40 dark:to-slate-900/40 hover:border-violet-400 dark:hover:border-violet-500'
            }`}
          >
            <input
              ref={dropFileInputRef}
              type="file"
              accept=".json,image/*"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleLoadReportFile(f);
              }}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  Drag & Drop Older Generated Report (.json) or Chart Image here
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Drop any previously generated WisBees report file to restore all metrics and edit, or click to browse
                </span>
              </div>
            </div>
          </div>

          {/* Success Toast */}
          {successToast && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[12px] font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successToast}</span>
            </div>
          )}

          {/* ── 1. Target Stock Search & Autocomplete ─────── */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Search */}
              <div className="sm:col-span-1 relative">
                <FieldLabel>Search Target Stock</FieldLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="er-stock-query"
                      type="text"
                      value={stockQuery}
                      onChange={e => {
                        setStockQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={e => e.key === 'Enter' && handleFetchStockData()}
                      placeholder="e.g. JSLL, APOLLO, WIPRO"
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="button"
                    id="er-fetch-price"
                    onClick={() => handleFetchStockData()}
                    disabled={fetchingPrice || !stockQuery.trim()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-[12px] font-bold transition-all shadow-md shadow-violet-500/20 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingPrice ? 'animate-spin' : ''}`} />
                    {fetchingPrice ? 'Fetching…' : 'Fetch'}
                  </button>
                </div>

                {/* Autocomplete Dropdown with Full Company Names */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-100 dark:divide-slate-700/60">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setStockQuery(s.name);
                          setCompanyName(s.name);
                          setShowSuggestions(false);
                          handleFetchStockData(s.symbol);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors flex items-center justify-between gap-2 text-xs cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 block truncate">{s.name}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">({s.symbol})</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 font-medium">
                          {s.sector}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {fetchError && <p className="mt-1 text-[10px] text-red-500 font-semibold">{fetchError}</p>}
              </div>

              {/* Current Price */}
              <div>
                <FieldLabel>Current Price (₹)</FieldLabel>
                <input
                  id="er-current-price"
                  type="text"
                  value={currentPrice}
                  onChange={e => setCurrentPrice(e.target.value)}
                  placeholder="e.g. 481.20"
                  className={inputCls}
                />
              </div>

              {/* Price As On */}
              <div>
                <FieldLabel>Price As On</FieldLabel>
                <input
                  id="er-price-date"
                  type="date"
                  value={priceAsOn}
                  onChange={e => setPriceAsOn(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Target Price */}
              <div>
                <FieldLabel>Target Price (₹)</FieldLabel>
                <input
                  id="er-target-price"
                  type="text"
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value)}
                  placeholder="e.g. 620.00"
                  className={inputCls}
                />
              </div>
            </div>
          </Card>

          {/* ── 2. Calculator & Recommendation Logger ─────── */}
          <Card className="bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30 dark:from-slate-800/80 dark:to-indigo-950/20 border-violet-200 dark:border-violet-900/50">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Valuation & Upside Calculator Display */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/10 dark:bg-violet-400/10 border border-violet-200 dark:border-violet-800 flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Valuation & Upside Calculator
                  </div>
                  {upsidePct !== null ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`flex items-center gap-1 text-sm font-black ${isUpsidePositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isUpsidePositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {upsidePct}% Upside Potential
                      </span>
                      <span className="text-[11px] text-slate-400">• Suggested: <strong className="text-violet-600 dark:text-violet-400 font-extrabold">{suggestedRating}</strong></span>
                      <button
                        type="button"
                        onClick={handleApplySuggestedRating}
                        className="text-[10px] font-bold text-violet-600 hover:text-violet-700 underline cursor-pointer ml-1"
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-slate-400 mt-0.5">
                      Enter Current Price & Target Price to calculate returns
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendation Selection & Log Button */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-36">
                  <div className="relative">
                    <select
                      id="er-recommendation"
                      value={recommendation}
                      onChange={e => setRecommendation(e.target.value)}
                      className={`${inputCls} appearance-none pr-8 font-black border-2 ${recColor}`}
                    >
                      {RECOMMENDATIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-60" />
                  </div>
                </div>

                <button
                  type="button"
                  id="er-log-recommendation-btn"
                  onClick={handleLogRecommendation}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-extrabold shadow-sm shadow-violet-500/20 transition cursor-pointer shrink-0"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Log Recommendation</span>
                </button>
              </div>

            </div>
          </Card>

          {/* ── 3. Comparison Mode Selector ──────────────── */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <FieldLabel>Comparison Mode (Switches Dimension Screen)</FieldLabel>
                <div className="relative">
                  <select
                    id="er-comp-mode"
                    value={compMode}
                    onChange={e => setCompMode(e.target.value)}
                    className={`${inputCls} appearance-none pr-8 font-bold text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800`}
                  >
                    {COMPARISON_MODES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Active Mode Dimension:</span>
                {compMode.includes('Historical')
                  ? 'Multi-Year Financial Trends (Revenue, EBITDA, PAT, EPS, Margins)'
                  : compMode.includes('Benchmark')
                  ? 'Sector Distribution & Quartile Performance Comparison'
                  : compMode.includes('DCF')
                  ? 'Discounted Cash Flow Intrinsic Value & Margin of Safety'
                  : 'Institutional Peer Multiples & Relative Valuation'}
              </div>
            </div>
          </Card>

          {/* ── 4. Peer Comparison Identifiers (With Autocomplete & Full Names) ── */}
          {compMode.includes('Peer') && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <FieldLabel>Peer Comparison Identifiers</FieldLabel>
                {peers.length < 6 && (
                  <button
                    type="button"
                    id="er-add-peer"
                    onClick={addPeer}
                    className="flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-500 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Peer Column (Max 6)
                  </button>
                )}
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(peers.length, 3)}, 1fr)` }}>
                {peers.map((col, idx) => (
                  <div key={col.id} className="relative">
                    <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                      <span>{idx === 0 ? 'Target Company' : col.label}</span>
                      {idx > 0 && fetchingPeerId === col.id && (
                        <span className="text-[10px] text-violet-500 font-semibold animate-pulse">Fetching metrics…</span>
                      )}
                    </div>
                    <div className="flex gap-1 relative">
                      <input
                        type="text"
                        value={peerNames[col.id] || ''}
                        onChange={e => handlePeerSearchChange(col.id, e.target.value)}
                        onFocus={() => setActivePeerSearchId(col.id)}
                        placeholder={idx === 0 ? 'Target Co. Full Name' : `Search Peer ${idx} (e.g. Apollo Hospital, Fortis)`}
                        className={inputCls}
                      />
                      {idx > 1 && (
                        <button
                          type="button"
                          onClick={() => removePeer(col.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors shrink-0 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Dropdown for Peer Search */}
                    {activePeerSearchId === col.id && peerSuggestions[col.id] && peerSuggestions[col.id].length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-100 dark:divide-slate-700/60">
                        {peerSuggestions[col.id].map((s, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSelectPeer(col.id, s)}
                            className="w-full text-left px-3 py-2 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors flex items-center justify-between gap-2 text-xs cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">{s.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({s.symbol})</span>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 shrink-0 font-medium">
                              Auto-Fill
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── 5. Industry / Time Horizon / Chart Upload ── */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Industry Sector</FieldLabel>
                <input
                  id="er-industry"
                  type="text"
                  value={industrySector}
                  onChange={e => setIndustrySector(e.target.value)}
                  placeholder="e.g. Healthcare - Hospitals & Clinics, IT Services"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Time Horizon</FieldLabel>
                <input
                  id="er-time-horizon"
                  type="text"
                  value={timeHorizon}
                  onChange={e => setTimeHorizon(e.target.value)}
                  placeholder="e.g. 12 - 24 Months"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Upload Technical Chart</FieldLabel>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60">
                  <label
                    htmlFor="er-chart-file"
                    className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none shrink-0"
                  >
                    {chartImageData ? 'Replace Image' : 'Choose File'}
                  </label>
                  <span className="text-[11px] text-slate-400 truncate">
                    {chartFile ? chartFile.name : chartImageData ? 'Chart Image Loaded' : 'No file chosen'}
                  </span>
                  <input
                    ref={chartInputRef}
                    id="er-chart-file"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setChartFile(file);
                        if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = ev => setChartImageData(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Live Chart Image Resizing & Display Controls */}
            {chartImageData && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-violet-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Chart Image Size & Display Adjustments
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Width Presets */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px]">
                      <span className="font-bold text-slate-400 px-1.5">Width:</span>
                      {(['50%', '75%', '100%'] as const).map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setChartImageWidth(w)}
                          className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                            chartImageWidth === w
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setChartImageMaxHeight(380);
                        setChartImageWidth('100%');
                      }}
                      title="Reset to 380px height & 100% width"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-[11px] font-bold transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Size
                    </button>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setChartImageData(null);
                        setChartFile(null);
                        if (chartInputRef.current) chartInputRef.current.value = '';
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-[11px] font-bold transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Chart
                    </button>
                  </div>
                </div>

                {/* Height Slider */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-3">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">
                    Max Height: <span className="text-violet-600 dark:text-violet-400 font-extrabold">{chartImageMaxHeight}px</span>
                  </span>
                  <input
                    type="range"
                    min={150}
                    max={650}
                    step={10}
                    value={chartImageMaxHeight}
                    onChange={e => setChartImageMaxHeight(Number(e.target.value))}
                    className="w-full accent-violet-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setChartImageMaxHeight(h => Math.max(150, h - 25))}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer"
                    >
                      -25px
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartImageMaxHeight(h => Math.min(650, h + 25))}
                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer"
                    >
                      +25px
                    </button>
                  </div>
                </div>

                {/* Scaled Preview Box */}
                <div className="p-3 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Live Scaled Preview</div>
                  <div
                    className="flex items-center justify-center transition-all duration-150"
                    style={{ width: chartImageWidth }}
                  >
                    <img
                      src={chartImageData}
                      alt="Chart preview"
                      style={{ maxHeight: `${chartImageMaxHeight}px` }}
                      className="w-auto max-w-full object-contain rounded-lg border border-slate-300 dark:border-slate-600 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* ── 6. Dynamic Metrics Dimension Table ───────── */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Metric Dimension: {compMode}
              </span>

              {/* Table Column Alignment Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 px-1">Align:</span>
                <button
                  type="button"
                  title="Align Left"
                  onClick={() => setTableAlignment('left')}
                  className={`p-1 rounded-lg transition ${tableAlignment === 'left' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Align Center"
                  onClick={() => setTableAlignment('center')}
                  className={`p-1 rounded-lg transition ${tableAlignment === 'center' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Align Right"
                  onClick={() => setTableAlignment('right')}
                  className={`p-1 rounded-lg transition ${tableAlignment === 'right' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[12px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] w-48">
                      Metric Dimension
                    </th>
                    {activeCols.map((col, idx) => (
                      <th
                        key={col.id}
                        style={{ textAlign: tableAlignment }}
                        className={`px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px] ${tableAlignCls}`}
                      >
                        {compMode.includes('Peer')
                          ? peerNames[col.id] || (idx === 0 ? companyName || 'Target Company' : col.label)
                          : (compMode.includes('Benchmark') && idx === 0 ? (companyName || 'Target Company') + ' (Target)' : col.label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {activeMetrics.map(m => (
                    <tr key={m.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 text-[12px]">
                        {m.label}
                      </td>
                      {activeCols.map((col, idx) => (
                        <td key={col.id} className="px-3 py-2">
                          <input
                            type="text"
                            value={getMetricCellValue(activeDataMap, m.key, col.id, idx)}
                            onChange={e => setMetric(m.key, col.id, e.target.value)}
                            placeholder={`Enter ${m.label.split(' ')[0]}...`}
                            style={{ textAlign: tableAlignment }}
                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-[12px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors ${tableAlignCls}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── 7. Analyst Narrative (With Alignment Option) ── */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
              <span className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Analyst Commentary & Investment Thesis
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerateAiThesis}
                  disabled={fetchingAiThesis || !stockQuery}
                  className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {fetchingAiThesis ? 'Generating Draft...' : 'AI Assist (Draft Thesis)'}
                </button>

                {/* Text Alignment Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 px-1">Align:</span>
                  <button
                    type="button"
                    title="Align Left"
                    onClick={() => setTextAlignment('left')}
                    className={`p-1.5 rounded-lg transition ${textAlignment === 'left' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Align Center"
                    onClick={() => setTextAlignment('center')}
                    className={`p-1.5 rounded-lg transition ${textAlignment === 'center' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Align Right"
                    onClick={() => setTextAlignment('right')}
                    className={`p-1.5 rounded-lg transition ${textAlignment === 'right' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Justify"
                    onClick={() => setTextAlignment('justify')}
                    className={`p-1.5 rounded-lg transition ${textAlignment === 'justify' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Business Overview (Moat)</FieldLabel>
                <textarea
                  id="er-business-overview"
                  rows={3}
                  value={businessOverview}
                  onChange={e => setBusinessOverview(e.target.value)}
                  placeholder="Enter business model, key clients, and structural moat..."
                  style={{ textAlign: textAlignment }}
                  className={`${inputCls} resize-y ${textAlignCls}`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Relative Valuation Thesis</FieldLabel>
                  <textarea
                    id="er-valuation-thesis"
                    rows={3}
                    value={valuationThesis}
                    onChange={e => setValuationThesis(e.target.value)}
                    placeholder="Enter valuation rationale, P/E multiple discount, target upside..."
                    style={{ textAlign: textAlignment }}
                    className={`${inputCls} resize-y ${textAlignCls}`}
                  />
                </div>
                <div>
                  <FieldLabel>Technical Chart Analysis</FieldLabel>
                  <textarea
                    id="er-tech-analysis"
                    rows={3}
                    value={technicalAnalysis}
                    onChange={e => setTechnicalAnalysis(e.target.value)}
                    placeholder="Enter support/resistance levels, moving averages, breakout notes..."
                    style={{ textAlign: textAlignment }}
                    className={`${inputCls} resize-y ${textAlignCls}`}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* ── 8. Street Coverage Consensus ─────────────── */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-[12px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Street Coverage Consensus Analytics
              </span>
              <button
                type="button"
                id="er-add-consensus-row"
                onClick={addConsensusRow}
                className="flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-500 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-[12px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    {['Call Date', 'Brokerage House', 'Rating Recommendation', 'Target Price (₹)', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {consensusRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.callDate}
                          onChange={e => updateConsensusRow(row.id, 'callDate', e.target.value)}
                          placeholder="e.g. 11/08/2026"
                          className={inputCls}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.brokerageHouse}
                          onChange={e => updateConsensusRow(row.id, 'brokerageHouse', e.target.value)}
                          placeholder="e.g. WisBees Research"
                          className={inputCls}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.rating}
                          onChange={e => updateConsensusRow(row.id, 'rating', e.target.value)}
                          placeholder="e.g. Buy"
                          className={inputCls}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.targetPrice}
                          onChange={e => updateConsensusRow(row.id, 'targetPrice', e.target.value)}
                          placeholder="e.g. 900.00"
                          className={inputCls}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeConsensusRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Compile & Save Actions ───────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              id="er-compile-btn"
              type="button"
              onClick={handleCompile}
              disabled={compiling}
              className="sm:col-span-2 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-extrabold text-white
                bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700
                hover:from-violet-500 hover:to-indigo-500
                shadow-lg shadow-violet-500/25
                transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              <FileBarChart2 className="w-5 h-5" />
              {compiling ? 'Compiling Dossier Report…' : 'Compile Standard Research Report'}
            </button>

            <button
              type="button"
              onClick={handleSaveReportToDatabase}
              disabled={savingToDb}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-extrabold text-emerald-700 dark:text-emerald-300
                bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800
                hover:bg-emerald-100 dark:hover:bg-emerald-900/50
                shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Database className={`w-4 h-4 ${savingToDb ? 'animate-spin' : ''}`} />
              {savingToDb ? 'Saving to DB…' : currentReportId ? `Update in DB (#${currentReportId})` : 'Save Report to Database'}
            </button>
          </div>

        </div>
      </div>

      {/* ── Saved Reports History Modal ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Saved Research Reports Database
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Browse, load, and re-edit reports stored in the cloud database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter */}
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => {
                    setHistorySearch(e.target.value);
                    handleFetchSavedReports(e.target.value);
                  }}
                  placeholder="Filter by Stock Ticker, Company Name, or Sector..."
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            {/* Reports List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {loadingReports ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-xs font-semibold">Loading saved reports from database...</span>
                </div>
              ) : savedReports.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">No Saved Reports Found</span>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {historySearch ? 'No reports matched your search term.' : 'You have not saved any reports to the database yet. Click "Save to DB" to archive your work.'}
                  </p>
                </div>
              ) : (
                savedReports.map(rep => {
                  const recPillColor = rep.recommendation === 'Buy' || rep.recommendation === 'Accumulate'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : rep.recommendation === 'Sell' || rep.recommendation === 'Reduce'
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400';

                  const dateStr = new Date(rep.updated_at || rep.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={rep.id}
                      className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {rep.company_name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                            {rep.symbol}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${recPillColor}`}>
                            {rep.recommendation}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            v{rep.version}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                          {rep.current_price && (
                            <span>CMP: <strong className="text-slate-700 dark:text-slate-200">₹{rep.current_price}</strong></span>
                          )}
                          {rep.target_price && (
                            <span>Target: <strong className="text-emerald-600 dark:text-emerald-400">₹{rep.target_price}</strong></span>
                          )}
                          <span>&bull; {rep.sector}</span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Calendar className="w-3 h-3" /> {dateStr}
                          </span>
                          <span>&bull; By {rep.created_by_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedReport(rep.id, false)}
                          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          Load & Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadSavedReport(rep.id, true)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                          title="View compiled report"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedReport(rep.id, rep.company_name, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition cursor-pointer"
                          title="Delete from database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {savedReports.length} report{savedReports.length === 1 ? '' : 's'} stored in database
              </span>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
