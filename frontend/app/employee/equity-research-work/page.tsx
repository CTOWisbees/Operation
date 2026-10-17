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
  Building2
} from 'lucide-react';
import { getOpsBaseUrl } from '@/lib/api';

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

// ─── Main Component ───────────────────────────────────────────
export default function EquityResearchWorkPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // ── Target Stock Search & Autocomplete ──
  const [stockQuery, setStockQuery] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [priceAsOn, setPriceAsOn] = useState(new Date().toISOString().split('T')[0]);
  const [targetPrice, setTargetPrice] = useState('');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // ── Comparison Mode & Recommendation ──
  const [compMode, setCompMode] = useState(COMPARISON_MODES[0]);
  const [recommendation, setRecommendation] = useState('');

  // ── Peer Columns & Peer Autocomplete ──
  const [peers, setPeers] = useState<PeerCol[]>([
    { id: 1, label: 'Target Company' },
  ]);
  const [peerNames, setPeerNames] = useState<Record<number, string>>({
    1: 'Target Company',
    2: 'Peer 1',
    3: 'Peer 2',
  });
  const [peerQuery, setPeerQuery] = useState<Record<number, string>>({});
  const [peerSuggestions, setPeerSuggestions] = useState<Record<number, any[]>>({});
  const [activePeerSearchId, setActivePeerSearchId] = useState<number | null>(null);
  const [fetchingPeerId, setFetchingPeerId] = useState<number | null>(null);

  // ── Metadata ──
  const [industrySector, setIndustrySector] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('12 - 24 Months');
  const [chartFile, setChartFile] = useState<File | null>(null);
  const chartInputRef = useRef<HTMLInputElement>(null);

  // ── Mode-specific Metric Table Data ──
  const [metricsData, setMetricsData] = useState<Record<string, Record<number, string>>>({});
  const [historicalData, setHistoricalData] = useState<Record<string, Record<number, string>>>({});
  const [benchmarkData, setBenchmarkData] = useState<Record<string, Record<number, string>>>({});
  const [dcfData, setDcfData] = useState<Record<string, Record<number, string>>>({});

  // ── Alignment Options ──
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [tableAlignment, setTableAlignment] = useState<'left' | 'center' | 'right'>('center');

  // ── Analyst Notes ──
  const [businessOverview, setBusinessOverview] = useState('');
  const [valuationThesis, setValuationThesis] = useState('');
  const [technicalAnalysis, setTechnicalAnalysis] = useState('');

  // ── Street Coverage Consensus ──
  const [consensusRows, setConsensusRows] = useState<ConsensusRow[]>([
    { id: 1, callDate: new Date().toLocaleDateString('en-GB'), brokerageHouse: 'WisBees Institutional Research', rating: 'Buy', targetPrice: '650.00' },
  ]);

  const [compiling, setCompiling] = useState(false);
  const isLoadedRef = useRef(false);

  // ── Load Cached Data on Mount ──
  useEffect(() => {
    const savedUser = localStorage.getItem('ops_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch {}
    }

    try {
      const cached = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (cached) {
        const d = JSON.parse(cached);
        if (d.stockQuery) setStockQuery(d.stockQuery);
        if (d.companyName) setCompanyName(d.companyName);
        if (d.currentPrice) setCurrentPrice(d.currentPrice);
        if (d.priceAsOn) setPriceAsOn(d.priceAsOn);
        if (d.targetPrice) setTargetPrice(d.targetPrice);
        if (d.recommendation) setRecommendation(d.recommendation);
        if (d.compMode) setCompMode(d.compMode);
        if (d.industrySector) setIndustrySector(d.industrySector);
        if (d.timeHorizon) setTimeHorizon(d.timeHorizon);
        if (d.peers && Array.isArray(d.peers) && d.peers.length > 0) setPeers(d.peers);
        if (d.peerNames && Object.keys(d.peerNames).length > 0) setPeerNames(d.peerNames);
        if (d.metricsData) setMetricsData(d.metricsData);
        if (d.historicalData) setHistoricalData(d.historicalData);
        if (d.benchmarkData) setBenchmarkData(d.benchmarkData);
        if (d.dcfData) setDcfData(d.dcfData);
        if (d.textAlignment) setTextAlignment(d.textAlignment);
        if (d.tableAlignment) setTableAlignment(d.tableAlignment);
        if (d.businessOverview) setBusinessOverview(d.businessOverview);
        if (d.valuationThesis) setValuationThesis(d.valuationThesis);
        if (d.technicalAnalysis) setTechnicalAnalysis(d.technicalAnalysis);
        if (d.consensusRows && Array.isArray(d.consensusRows) && d.consensusRows.length > 0) {
          setConsensusRows(d.consensusRows);
        }
      }
    } catch (err) {
      console.error('Failed to load cached form data:', err);
    } finally {
      isLoadedRef.current = true;
    }
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
    if (chartInputRef.current) chartInputRef.current.value = '';
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

  // ── Continuous Auto-Save to Prevent Data Vanishing ──
  useEffect(() => {
    if (!isLoadedRef.current) return;
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
      };
      try {
        localStorage.setItem('equity_research_report_data', JSON.stringify(payload));
        sessionStorage.setItem('equity_research_report_data', JSON.stringify(payload));
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
        const res = await fetch(`${baseUrl}/ia/search-stocks?query=${encodeURIComponent(stockQuery)}`);
        const data = await res.json();
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
    fetch(`${baseUrl}/ia/search-stocks?query=${encodeURIComponent(query)}`)
      .then(res => res.json())
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
      const res = await fetch(`${baseUrl}/ia/fetch-stock-data?query=${encodeURIComponent(peerSymbol)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
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
      const res = await fetch(`${baseUrl}/ia/fetch-stock-data?query=${encodeURIComponent(q)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch stock data');
      }

      if (data.stockQuery) setStockQuery(data.stockQuery);
      if (data.companyName) setCompanyName(data.companyName);
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
      const res = await fetch(`${baseUrl}/ia/fetch-stock-data?query=${encodeURIComponent(q)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-User-Auth': token || '',
        },
      });
      const data = await res.json();
      if (data.businessOverview) setBusinessOverview(data.businessOverview);
      if (data.valuationThesis) setValuationThesis(data.valuationThesis);
      if (data.technicalAnalysis) setTechnicalAnalysis(data.technicalAnalysis);
      if (data.industrySector && !industrySector) setIndustrySector(data.industrySector);
      setSuccessToast('AI Research commentary generated successfully.');
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err: any) {
      setFetchError('Failed to generate AI commentary.');
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
    if (compMode.includes('Historical')) {
      setHistoricalData(prev => ({
        ...prev,
        [metricKey]: { ...(prev[metricKey] || {}), [colId]: value },
      }));
    } else if (compMode.includes('Benchmark')) {
      setBenchmarkData(prev => ({
        ...prev,
        [metricKey]: { ...(prev[metricKey] || {}), [colId]: value },
      }));
    } else if (compMode.includes('DCF')) {
      setDcfData(prev => ({
        ...prev,
        [metricKey]: { ...(prev[metricKey] || {}), [colId]: value },
      }));
    } else {
      setMetricsData(prev => ({
        ...prev,
        [metricKey]: { ...(prev[metricKey] || {}), [colId]: value },
      }));
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

    const proceed = (chartImageData: string | null) => {
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
        chartImageData,
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
      reader.onload = () => proceed(reader.result as string);
      reader.onerror = () => proceed(null);
      reader.readAsDataURL(chartFile);
    } else {
      proceed(null);
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

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-fadeIn pb-16">

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
          <div className="flex items-center gap-2">
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
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              <Zap className="w-3 h-3" /> Live Fetch Available
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">

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
                          setStockQuery(s.symbol);
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
                <FieldLabel>Upload Chart</FieldLabel>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60">
                  <label
                    htmlFor="er-chart-file"
                    className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none shrink-0"
                  >
                    Choose File
                  </label>
                  <span className="text-[11px] text-slate-400 truncate">
                    {chartFile ? chartFile.name : 'No file chosen'}
                  </span>
                  <input
                    ref={chartInputRef}
                    id="er-chart-file"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => setChartFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
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
                        className={`px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px] text-${tableAlignment}`}
                      >
                        {compMode.includes('Peer')
                          ? peerNames[col.id] || (idx === 0 ? companyName || 'Target Company' : col.label)
                          : col.label}
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
                      {activeCols.map((col) => (
                        <td key={col.id} className="px-3 py-2">
                          <input
                            type="text"
                            value={activeDataMap[m.key]?.[col.id] || ''}
                            onChange={e => setMetric(m.key, col.id, e.target.value)}
                            placeholder={`Enter ${m.label.split(' ')[0]}...`}
                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 text-[12px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors text-${tableAlignment}`}
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
                  className={`${inputCls} resize-y`}
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
                    className={`${inputCls} resize-y`}
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
                    className={`${inputCls} resize-y`}
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

          {/* ── Compile Button ────────────────────────────── */}
          <button
            id="er-compile-btn"
            type="button"
            onClick={handleCompile}
            disabled={compiling}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-extrabold text-white
              bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700
              hover:from-violet-500 hover:to-indigo-500
              shadow-lg shadow-violet-500/25
              transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <FileBarChart2 className="w-5 h-5" />
            {compiling ? 'Compiling Dossier Report…' : 'Compile Standard Research Report'}
          </button>

        </div>
      </div>
    </div>
  );
}
