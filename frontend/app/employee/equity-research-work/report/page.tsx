'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  ArrowLeft,
  History,
  Edit3,
  FileBarChart2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  CheckCircle2,
  Building2,
  FileDown,
  Sliders,
  RotateCcw,
  Database,
  FolderOpen,
  Eye,
  Calendar,
  Trash2,
  X,
  Search,
} from 'lucide-react';
import { getOpsBaseUrl } from '@/lib/api';

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
  'Historical Performance Comparison (Target Co. YoY)',
  'Sector Benchmark & Quartile Comparison',
  'DCF & Intrinsic Valuation Model',
];

// Mode-specific Metrics for the Report
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

const KNOWN_STOCK_NAMES: Record<string, string> = {
  'TCS': 'Tata Consultancy Services Limited',
  'TCS.NS': 'Tata Consultancy Services Limited',
  'INFY': 'Infosys Limited',
  'INFY.NS': 'Infosys Limited',
  'WIPRO': 'Wipro Limited',
  'WIPRO.NS': 'Wipro Limited',
  'HCLTECH': 'HCL Technologies Limited',
  'HCLTECH.NS': 'HCL Technologies Limited',
  'TECHM': 'Tech Mahindra Limited',
  'TECHM.NS': 'Tech Mahindra Limited',
  'LTIM': 'LTIMindtree Limited',
  'LTIM.NS': 'LTIMindtree Limited',
  'PERSISTENT': 'Persistent Systems Limited',
  'PERSISTENT.NS': 'Persistent Systems Limited',
  'JSLL': 'Jeena Sikho Lifecare Limited',
  'JSLL.NS': 'Jeena Sikho Lifecare Limited',
  'APOLLOHOSP': 'Apollo Hospitals Enterprise Limited',
  'APOLLOHOSP.NS': 'Apollo Hospitals Enterprise Limited',
  'FORTIS': 'Fortis Healthcare Limited',
  'FORTIS.NS': 'Fortis Healthcare Limited',
  'MAXHEALTH': 'Max Healthcare Institute Limited',
  'MAXHEALTH.NS': 'Max Healthcare Institute Limited',
  'SUNPHARMA': 'Sun Pharmaceutical Industries Limited',
  'SUNPHARMA.NS': 'Sun Pharmaceutical Industries Limited',
  'CIPLA': 'Cipla Limited',
  'CIPLA.NS': 'Cipla Limited',
  'DRREDDY': "Dr. Reddy's Laboratories Limited",
  'DRREDDY.NS': "Dr. Reddy's Laboratories Limited",
  'DIVISLAB': "Divi's Laboratories Limited",
  'DIVISLAB.NS': "Divi's Laboratories Limited",
  'LUPIN': 'Lupin Limited',
  'LUPIN.NS': 'Lupin Limited',
  'HDFCBANK': 'HDFC Bank Limited',
  'HDFCBANK.NS': 'HDFC Bank Limited',
  'ICICIBANK': 'ICICI Bank Limited',
  'ICICIBANK.NS': 'ICICI Bank Limited',
  'SBIN': 'State Bank of India',
  'SBIN.NS': 'State Bank of India',
  'KOTAKBANK': 'Kotak Mahindra Bank Limited',
  'KOTAKBANK.NS': 'Kotak Mahindra Bank Limited',
  'AXISBANK': 'Axis Bank Limited',
  'AXISBANK.NS': 'Axis Bank Limited',
  'BAJFINANCE': 'Bajaj Finance Limited',
  'BAJFINANCE.NS': 'Bajaj Finance Limited',
  'BAJAJFINSV': 'Bajaj Finserv Limited',
  'BAJAJFINSV.NS': 'Bajaj Finserv Limited',
  'TATAMOTORS': 'Tata Motors Limited',
  'TATAMOTORS.NS': 'Tata Motors Limited',
  'M&M': 'Mahindra & Mahindra Limited',
  'M&M.NS': 'Mahindra & Mahindra Limited',
  'MARUTI': 'Maruti Suzuki India Limited',
  'MARUTI.NS': 'Maruti Suzuki India Limited',
  'BAJAJ-AUTO': 'Bajaj Auto Limited',
  'BAJAJ-AUTO.NS': 'Bajaj Auto Limited',
  'EICHERMOT': 'Eicher Motors Limited',
  'EICHERMOT.NS': 'Eicher Motors Limited',
  'RELIANCE': 'Reliance Industries Limited',
  'RELIANCE.NS': 'Reliance Industries Limited',
  'TATAPOWER': 'Tata Power Company Limited',
  'TATAPOWER.NS': 'Tata Power Company Limited',
  'NTPC': 'NTPC Limited',
  'NTPC.NS': 'NTPC Limited',
  'POWERGRID': 'Power Grid Corporation of India Limited',
  'POWERGRID.NS': 'Power Grid Corporation of India Limited',
  'ONGC': 'Oil & Natural Gas Corporation Limited',
  'ONGC.NS': 'Oil & Natural Gas Corporation Limited',
  'BPCL': 'Bharat Petroleum Corporation Limited',
  'BPCL.NS': 'Bharat Petroleum Corporation Limited',
  'IOC': 'Indian Oil Corporation Limited',
  'IOC.NS': 'Indian Oil Corporation Limited',
  'ADANIGREEN': 'Adani Green Energy Limited',
  'ADANIGREEN.NS': 'Adani Green Energy Limited',
  'TATASTEEL': 'Tata Steel Limited',
  'TATASTEEL.NS': 'Tata Steel Limited',
  'JSWSTEEL': 'JSW Steel Limited',
  'JSWSTEEL.NS': 'JSW Steel Limited',
  'HINDALCO': 'Hindalco Industries Limited',
  'HINDALCO.NS': 'Hindalco Industries Limited',
  'JINDALSTEL': 'Jindal Steel & Power Limited',
  'JINDALSTEL.NS': 'Jindal Steel & Power Limited',
  'APLAPOLLO': 'APL Apollo Tubes Limited',
  'APLAPOLLO.NS': 'APL Apollo Tubes Limited',
  'ASTRAL': 'Astral Limited',
  'ASTRAL.NS': 'Astral Limited',
  'HINDUNILVR': 'Hindustan Unilever Limited',
  'HINDUNILVR.NS': 'Hindustan Unilever Limited',
  'ITC': 'ITC Limited',
  'ITC.NS': 'ITC Limited',
  'NESTLEIND': 'Nestle India Limited',
  'NESTLEIND.NS': 'Nestle India Limited',
  'BRITANNIA': 'Britannia Industries Limited',
  'BRITANNIA.NS': 'Britannia Industries Limited',
  'DABUR': 'Dabur India Limited',
  'DABUR.NS': 'Dabur India Limited',
  'ZOMATO': 'Zomato Limited',
  'ZOMATO.NS': 'Zomato Limited',
  'LT': 'Larsen & Toubro Limited',
  'LT.NS': 'Larsen & Toubro Limited',
  'BHEL': 'Bharat Heavy Electricals Limited',
  'BHEL.NS': 'Bharat Heavy Electricals Limited',
  'SIEMENS': 'Siemens Limited',
  'SIEMENS.NS': 'Siemens Limited',
  'BHARTIARTL': 'Bharti Airtel Limited',
  'BHARTIARTL.NS': 'Bharti Airtel Limited',
  'WABAG': 'VA Tech Wabag Limited',
  'WABAG.NS': 'VA Tech Wabag Limited',
  'MEDANTA': 'Global Health Limited (Medanta)',
  'MEDANTA.NS': 'Global Health Limited (Medanta)',
  'TITAN': 'Titan Company Limited',
  'TITAN.NS': 'Titan Company Limited',
  'ASIANPAINT': 'Asian Paints Limited',
  'ASIANPAINT.NS': 'Asian Paints Limited',
};

function resolveFullCompanyName(rawSymbolOrName: string): string {
  if (!rawSymbolOrName) return 'Target Company';
  const clean = rawSymbolOrName.trim();
  const upper = clean.toUpperCase();
  const bare = upper.replace('.NS', '').replace('.BO', '');

  if (KNOWN_STOCK_NAMES[upper]) return KNOWN_STOCK_NAMES[upper];
  if (KNOWN_STOCK_NAMES[bare]) return KNOWN_STOCK_NAMES[bare];

  if (clean.includes(' ') && !clean.endsWith('.NS') && !clean.endsWith('.BO')) {
    return clean;
  }

  if (clean.length <= 6 && clean === clean.toUpperCase()) {
    return `${clean.replace('.NS', '').replace('.BO', '')} Limited`;
  }

  return clean;
}

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

export default function EquityResearchReportPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => !reportData);
  const [isEditable, setIsEditable] = useState(false);
  const [currentCompMode, setCurrentCompMode] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Peer Comparison (Target Co. vs Peers)';
    try {
      const saved = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.compMode) return parsed.compMode;
      }
    } catch {}
    return 'Peer Comparison (Target Co. vs Peers)';
  });
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right' | 'justify'>(() => {
    if (typeof window === 'undefined') return 'left';
    try {
      const saved = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.textAlignment) return parsed.textAlignment;
      }
    } catch {}
    return 'left';
  });
  const [tableAlignment, setTableAlignment] = useState<'left' | 'center' | 'right'>(() => {
    if (typeof window === 'undefined') return 'center';
    try {
      const saved = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tableAlignment) return parsed.tableAlignment;
      }
    } catch {}
    return 'center';
  });
  const [currentChartHeight, setCurrentChartHeight] = useState<number>(() => {
    if (typeof window === 'undefined') return 380;
    try {
      const saved = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chartImageMaxHeight) return Number(parsed.chartImageMaxHeight);
      }
    } catch {}
    return 380;
  });
  const [currentChartWidth, setCurrentChartWidth] = useState<string>(() => {
    if (typeof window === 'undefined') return '100%';
    try {
      const saved = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chartImageWidth) return parsed.chartImageWidth;
      }
    } catch {}
    return '100%';
  });
  const [savedDbId, setSavedDbId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.reportId) return Number(parsed.reportId);
      }
    } catch {}
    return null;
  });
  const [savingToDb, setSavingToDb] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const dossierRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('equity_research_report_data') || localStorage.getItem('equity_research_report_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        setReportData(parsed);
        if (parsed.compMode) setCurrentCompMode(parsed.compMode);
        if (parsed.textAlignment) setTextAlignment(parsed.textAlignment);
        if (parsed.tableAlignment) setTableAlignment(parsed.tableAlignment);
        if (parsed.chartImageMaxHeight) setCurrentChartHeight(Number(parsed.chartImageMaxHeight));
        if (parsed.chartImageWidth) setCurrentChartWidth(parsed.chartImageWidth);
        if (parsed.reportId) setSavedDbId(Number(parsed.reportId));
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePrint = () => {
    // Disable edit outline during print
    const wasEditable = isEditable;
    if (wasEditable) {
      setIsEditable(false);
    }

    const origTitle = typeof document !== 'undefined' ? document.title : '';
    const cleanCompany = (resolvedCompanyName || stockSymbol || 'Equity_Research').replace(/[^a-zA-Z0-9]/g, '_');
    if (typeof document !== 'undefined') {
      document.title = `WisBees_Research_${cleanCompany}_${priceAsOn || ''}`;
    }

    // Allow state to apply before opening print dialog
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        if (typeof document !== 'undefined') {
          document.title = origTitle;
        }
        if (wasEditable) {
          setIsEditable(true);
        }
      }, 500);
    }, 60);
  };

  // ── Export Dossier JSON ──
  const handleExportReportJson = () => {
    if (!reportData) return;
    const targetSymbol = reportData.ticker || reportData.stockQuery || 'TARGET';
    const targetName = reportData.companyName || targetSymbol;
    const fileName = `WISBEES_REPORT_${(targetName || targetSymbol).replace(/[^a-zA-Z0-9]/g, '_')}_${reportData.priceAsOn || new Date().toISOString().split('T')[0]}.json`;
    const payload = {
      ...reportData,
      compMode: currentCompMode,
      textAlignment,
      tableAlignment,
      chartImageMaxHeight: currentChartHeight,
      chartImageWidth: currentChartWidth,
      exportedAt: new Date().toISOString(),
    };
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
  };

  // ── Crucial: Preserve all state when clicking "Edit this record" ──
  const handleBackToEdit = () => {
    try {
      if (reportData) {
        const boElem = document.getElementById('er-report-business-overview');
        const vtElem = document.getElementById('er-report-valuation-thesis');
        const taElem = document.getElementById('er-report-technical-analysis');

        const boText = boElem?.innerText?.trim();
        const vtText = vtElem?.innerText?.trim();
        const taText = taElem?.innerText?.trim();

        const updated = {
          ...reportData,
          compMode: currentCompMode,
          textAlignment,
          tableAlignment,
          chartImageMaxHeight: currentChartHeight,
          chartImageWidth: currentChartWidth,
          ...(boText && boText !== '—' ? { businessOverview: boText } : {}),
          ...(vtText && vtText !== '—' ? { valuationThesis: vtText } : {}),
          ...(taText && taText !== '—' ? { technicalAnalysis: taText } : {}),
        };

        try {
          const serialized = JSON.stringify(updated);
          sessionStorage.setItem('equity_research_report_data', serialized);
          localStorage.setItem('equity_research_report_data', serialized);
        } catch {
          // If QuotaExceededError, strip chartImageData to guarantee textual preservation
          const { chartImageData, ...safeData } = updated;
          const safeStr = JSON.stringify(safeData);
          sessionStorage.setItem('equity_research_report_data', safeStr);
          localStorage.setItem('equity_research_report_data', safeStr);
        }
      }
    } catch (err) {
      console.error('Error saving report data before navigation:', err);
    }
    router.push('/employee/equity-research-work');
  };

  // ── Save Current Report to Database ──
  const handleSaveReportToDb = async () => {
    if (!reportData) return;
    setSavingToDb(true);
    try {
      const boElem = document.getElementById('er-report-business-overview');
      const vtElem = document.getElementById('er-report-valuation-thesis');
      const taElem = document.getElementById('er-report-technical-analysis');

      const boText = boElem?.innerText?.trim();
      const vtText = vtElem?.innerText?.trim();
      const taText = taElem?.innerText?.trim();

      const updatedDossier = {
        ...reportData,
        compMode: currentCompMode,
        textAlignment,
        tableAlignment,
        chartImageMaxHeight: currentChartHeight,
        chartImageWidth: currentChartWidth,
        ...(boText && boText !== '—' ? { businessOverview: boText } : {}),
        ...(vtText && vtText !== '—' ? { valuationThesis: vtText } : {}),
        ...(taText && taText !== '—' ? { technicalAnalysis: taText } : {}),
      };

      const baseUrl = getOpsBaseUrl().replace(/\/$/, '');
      const token = localStorage.getItem('ops_token');

      const payload = {
        report_id: savedDbId || reportData.reportId,
        stockQuery: reportData.stockQuery || reportData.ticker || 'TARGET',
        companyName: reportData.companyName || reportData.stockQuery || 'Target Company',
        currentPrice: reportData.currentPrice || '',
        priceAsOn: reportData.priceAsOn || new Date().toISOString().split('T')[0],
        targetPrice: reportData.targetPrice || '',
        recommendation: reportData.recommendation || 'Buy',
        compMode: currentCompMode,
        industrySector: reportData.industrySector || 'Equities & Advisory',
        timeHorizon: reportData.timeHorizon || '12 - 24 Months',
        reportData: updatedDossier,
        chartImageData: reportData.chartImageData || null,
        chartImageMaxHeight: currentChartHeight,
        chartImageWidth: currentChartWidth,
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

      const newId = result.report_id;
      setSavedDbId(newId);

      // Update storage
      try {
        const stored = { ...updatedDossier, reportId: newId };
        sessionStorage.setItem('equity_research_report_data', JSON.stringify(stored));
        localStorage.setItem('equity_research_report_data', JSON.stringify(stored));
        setReportData(stored);
      } catch {}

      setSuccessToast(`Report for ${reportData.companyName || reportData.stockQuery} saved to database (ID: #${newId})!`);
      setTimeout(() => setSuccessToast(''), 4500);
    } catch (err: any) {
      console.error('Error saving report to DB:', err);
      alert(err.message || 'Error saving report to database');
    } finally {
      setSavingToDb(false);
    }
  };

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
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleLoadSavedReport = async (reportId: number) => {
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
      const fullDossier = { ...d, reportId: rep.id };

      setReportData(fullDossier);
      setSavedDbId(rep.id);
      if (fullDossier.compMode) setCurrentCompMode(fullDossier.compMode);
      if (fullDossier.textAlignment) setTextAlignment(fullDossier.textAlignment);
      if (fullDossier.tableAlignment) setTableAlignment(fullDossier.tableAlignment);
      if (fullDossier.chartImageMaxHeight) setCurrentChartHeight(Number(fullDossier.chartImageMaxHeight));
      if (fullDossier.chartImageWidth) setCurrentChartWidth(fullDossier.chartImageWidth);

      try {
        sessionStorage.setItem('equity_research_report_data', JSON.stringify(fullDossier));
        localStorage.setItem('equity_research_report_data', JSON.stringify(fullDossier));
      } catch {}

      setShowHistoryModal(false);
      setSuccessToast(`Switched to report #${rep.id} (${rep.company_name})!`);
      setTimeout(() => setSuccessToast(''), 4500);
    } catch (err: any) {
      console.error('Error loading report:', err);
      alert(err.message || 'Error loading report');
    }
  };

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
        if (savedDbId === reportId) setSavedDbId(null);
        setSuccessToast(`Deleted report #${reportId} for ${compName}`);
        setTimeout(() => setSuccessToast(''), 3000);
      }
    } catch (err) {
      console.error('Error deleting report:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-300">Loading Compiled Research Dossier...</span>
        </div>
      </div>
    );
  }

  if (!reportData || !reportData.stockQuery) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-200 dark:border-violet-800 shadow-sm">
          <FileBarChart2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">No Research Dossier Compiled Yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Please enter your target stock details in the Research Work Hub and click "Compile & Preview Dossier".
          </p>
        </div>
        <button
          onClick={handleBackToEdit}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Research Work Hub
        </button>
      </div>
    );
  }

  const data = reportData;

  const stockQuery = data.stockQuery || 'TARGET';
  const resolvedCompanyName = resolveFullCompanyName(data.companyName || stockQuery);
  const companyName = resolvedCompanyName;
  const stockSymbol = data.ticker || (stockQuery.includes('.') ? stockQuery : `${stockQuery.replace(/[^A-Za-z0-9]/g, '')}.NS`);
  const currentPrice = data.currentPrice || '0.00';
  const targetPrice = data.targetPrice || '0.00';
  const priceAsOn = data.priceAsOn || new Date().toISOString().split('T')[0];
  const recommendation = data.recommendation || 'Buy';
  const industrySector = data.industrySector || 'Equities & Advisory';
  const timeHorizon = data.timeHorizon || '12 - 24 Months';
  const peers: PeerCol[] = data.peers || [
    { id: 1, label: `${resolvedCompanyName} (TARGET)` },
    { id: 2, label: 'Peer 1' },
    { id: 3, label: 'Peer 2' },
  ];
  const rawPeerNames: Record<number, string> = { ...(data.peerNames || {}) };
  const peerNames: Record<number, string> = {};
  peerNames[1] = `${resolvedCompanyName} (TARGET)`;
  Object.keys(rawPeerNames).forEach(k => {
    const id = Number(k);
    if (id === 1) {
      peerNames[1] = `${resolvedCompanyName} (TARGET)`;
    } else {
      peerNames[id] = resolveFullCompanyName(rawPeerNames[id]);
    }
  });

  const metricsData: Record<string, Record<number, string>> = data.metricsData || {};
  const historicalData: Record<string, Record<number, string>> = data.historicalData?.data || data.historicalData || {};
  const benchmarkData: Record<string, Record<number, string>> = data.benchmarkData?.data || data.benchmarkData || {};
  const dcfData: Record<string, Record<number, string>> = data.dcfData?.data || data.dcfData || {};
  const businessOverview = data.businessOverview || '';
  const valuationThesis = data.valuationThesis || '';
  const technicalAnalysis = data.technicalAnalysis || '';
  const consensusRows: ConsensusRow[] = data.consensusRows || [];
  const chartImageData = data.chartImageData || null;

  // Numeric Calculations
  const cmpNum = parseFloat(currentPrice) || 0;
  const tgtNum = parseFloat(targetPrice) || 0;
  const hasValidPrices = cmpNum > 0 && tgtNum > 0;
  const calculatedUpside = hasValidPrices
    ? (((tgtNum - cmpNum) / cmpNum) * 100).toFixed(1)
    : '0.0';
  const isPositiveUpside = parseFloat(calculatedUpside) >= 0;

  const recColor =
    recommendation === 'Buy' || recommendation === 'Accumulate'
      ? 'text-emerald-600'
      : recommendation === 'Sell' || recommendation === 'Reduce'
      ? 'text-red-600'
      : 'text-amber-600';

  // Mode-Specific Table Headers & Data Selection based on dynamically selected mode
  let activeCols: PeerCol[] = peers;
  let activeMetrics: MetricRow[] = PEER_METRICS;
  let activeDataMap: Record<string, Record<number, string>> = metricsData;

  if (currentCompMode.includes('Historical')) {
    activeCols = HISTORICAL_COLS;
    activeMetrics = HISTORICAL_METRICS;
    activeDataMap = historicalData;
  } else if (currentCompMode.includes('Benchmark')) {
    activeCols = BENCHMARK_COLS.map((col, idx) =>
      idx === 0 ? { ...col, label: `${resolvedCompanyName} (Target)` } : col
    );
    activeMetrics = BENCHMARK_METRICS;
    activeDataMap = benchmarkData;
  } else if (currentCompMode.includes('DCF')) {
    activeCols = DCF_COLS;
    activeMetrics = DCF_METRICS;
    activeDataMap = dcfData;
  }

  const tableAlignCls = tableAlignment === 'left' ? 'text-left' : tableAlignment === 'right' ? 'text-right' : 'text-center';
  const textAlignCls = textAlignment === 'left' ? 'text-left' : textAlignment === 'center' ? 'text-center' : textAlignment === 'right' ? 'text-right' : 'text-justify';

  return (
    <div className="w-full pb-16 print:pb-0 font-sans">
      
      {/* ── Scoped Print Styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* 1. Reset Root Canvas to Pure White */
          html,
          body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 2. Hide Portal Chrome & Action Bars */
          aside,
          header,
          nav,
          footer,
          [role="navigation"],
          .print\\:hidden,
          #er-floating-bar,
          #er-notice-bar,
          #er-saved-reports-modal,
          button {
            display: none !important;
            visibility: hidden !important;
          }

          /* 3. Strip layout wrappers of dark backgrounds & paddings */
          body > div,
          div.min-h-screen,
          div.flex,
          div.flex-1,
          main {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
          }

          /* 4. Dossier Paper Document: in-flow static block, full width */
          #equity-research-dossier-paper {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
          }

          #equity-research-dossier-paper,
          #equity-research-dossier-paper * {
            outline: none !important;
            box-shadow: none !important;
          }

          /* 5. A4 Page Dimensions with clean margins */
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }

          /* 6. Page Breaks and Orphan Prevention */
          h1, h2, h3, h4, .section-heading {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          .report-section,
          .page-break-inside-avoid,
          .break-inside-avoid,
          table,
          tbody,
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Keep entire Section 3 Financials comparison together */
          .section-financials {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          th, td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* ── Top Action Toolbar ── */}
      <div
        id="er-floating-bar"
        className="max-w-4xl mx-auto mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-lg print:hidden"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="er-download-pdf-btn"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" /> Download Dossier PDF
          </button>

          <button
            id="er-edit-record-btn"
            onClick={handleBackToEdit}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold border border-violet-500 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit This Record
          </button>

          <button
            id="er-save-db-btn"
            onClick={handleSaveReportToDb}
            disabled={savingToDb}
            title="Save or update this report in cloud database"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Database className={`w-3.5 h-3.5 ${savingToDb ? 'animate-spin' : ''}`} />
            {savingToDb ? 'Saving to DB…' : savedDbId ? `Update in DB (#${savedDbId})` : 'Save to DB'}
          </button>

          <button
            id="er-report-history-btn"
            onClick={() => {
              setShowHistoryModal(true);
              handleFetchSavedReports();
            }}
            title="Browse all saved reports in database"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <History className="w-3.5 h-3.5 text-violet-400" /> Saved Reports History
          </button>

          <button
            id="er-export-json-btn"
            onClick={handleExportReportJson}
            title="Download full report dossier backup as JSON"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-300" /> Export (.json)
          </button>
        </div>

        <button
          onClick={handleBackToEdit}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Hub
        </button>
      </div>

      {/* ── Status & Alignment Notice Bar (Hidden in Print) ── */}
      <div
        id="er-notice-bar"
        className="max-w-4xl mx-auto mb-5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md flex items-center justify-between flex-wrap gap-3 print:hidden"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditable(!isEditable)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isEditable
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditable ? 'Editing Mode Active (Click text to edit)' : 'Enable In-Place Text Editing'}
          </button>
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            Ready to generate
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Table Column Alignment Controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1">Table Align:</span>
            <button
              type="button"
              title="Table Columns Left"
              onClick={() => setTableAlignment('left')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${tableAlignment === 'left' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Table Columns Center"
              onClick={() => setTableAlignment('center')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${tableAlignment === 'center' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Table Columns Right"
              onClick={() => setTableAlignment('right')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${tableAlignment === 'right' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Narrative Alignment Controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1">Text Align:</span>
            <button
              type="button"
              title="Align Left"
              onClick={() => setTextAlignment('left')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${textAlignment === 'left' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Align Center"
              onClick={() => setTextAlignment('center')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${textAlignment === 'center' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Align Right"
              onClick={() => setTextAlignment('right')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${textAlignment === 'right' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Justify"
              onClick={() => setTextAlignment('justify')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${textAlignment === 'justify' ? 'bg-white dark:bg-slate-800 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Dossier Paper Document ── */}
      <div
        ref={dossierRef}
        id="equity-research-dossier-paper"
        contentEditable={isEditable}
        suppressContentEditableWarning
        className={`max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl p-5 sm:p-10 md:p-12 font-sans border border-slate-200 print:shadow-none print:border-none print:outline-none print:rounded-none print:p-0 print:m-0 print:max-w-full print:w-full print:bg-white ${
          isEditable ? 'outline-2 outline-dashed outline-violet-400' : ''
        }`}
      >
        {/* 1. Header Bar: WISBEES INTELLIGENCE + WisBees Logo */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900 gap-2">
          <div className="text-[11px] sm:text-[13px] font-black tracking-widest text-[#e67e22] uppercase">
            WISBEES INTELLIGENCE
          </div>
          <div className="flex items-center select-none">
            <img
              src="/logo.png"
              alt="WisBees"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>
        </div>

        {/* 2. Main Stock Header with Full Company Name */}
        <div className="mt-6 mb-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 tracking-tight uppercase break-words">
            {resolvedCompanyName}
          </h1>
          <div className="text-xs font-mono text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            TICKER: {stockSymbol} &bull; SECTOR: {industrySector} &bull; MODE: {currentCompMode}
          </div>
        </div>

        {/* 3. 4-Box Key Metrics Highlight Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-300 rounded-lg overflow-hidden text-center divide-x divide-y sm:divide-y-0 divide-slate-300 mb-8 bg-slate-50/50">
          <div className="p-2.5 sm:p-4">
            <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              ACTION RATING
            </div>
            <div className={`text-lg sm:text-2xl font-black ${recColor}`}>
              {recommendation.toUpperCase()}
            </div>
          </div>

          <div className="p-2.5 sm:p-4">
            <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              CURRENT MARKET PRICE
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 truncate">
              ₹{currentPrice}
            </div>
          </div>

          <div className="p-2.5 sm:p-4">
            <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              TARGET EVALUATION
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 truncate">
              ₹{targetPrice}
            </div>
          </div>

          <div className="p-2.5 sm:p-4">
            <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              PROJECTED UPSIDE
            </div>
            <div className={`text-lg sm:text-2xl font-black ${isPositiveUpside ? 'text-[#e67e22]' : 'text-red-600'} truncate`}>
              {isPositiveUpside ? '+' : ''}{calculatedUpside}%
            </div>
          </div>
        </div>

        {/* ── Section 1: Stock Overview ───────────────── */}
        <div className="mb-8 report-section break-inside-avoid page-break-inside-avoid">
          <h2 className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wide mb-3">
            1. STOCK OVERVIEW
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[500px]">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800 w-1/4">Full Company Name</td>
                  <td className="py-2.5 px-3 sm:px-4 font-extrabold text-slate-900 w-1/4">{companyName}</td>
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800 w-1/4">Industry Sector</td>
                  <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-700 w-1/4">{industrySector}</td>
                </tr>
                <tr className="bg-white">
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800">Current Market Price (CMP)</td>
                  <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-700">₹{currentPrice}</td>
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800">Target Price</td>
                  <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-700">₹{targetPrice}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800">Price As On</td>
                  <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-700">{priceAsOn}</td>
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800">Upside Potential</td>
                  <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-700">
                    {isPositiveUpside ? '+' : ''}{calculatedUpside}%
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800">Action Recommendation</td>
                  <td className={`py-2.5 px-3 sm:px-4 font-bold ${recColor}`}>{recommendation}</td>
                  <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800">Investment Horizon</td>
                  <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-700">{timeHorizon}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 2: Technical Chart ─────────────── */}
        <div className="mb-8 report-section break-inside-avoid page-break-inside-avoid">
          <h2 className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wide mb-3">
            2. WHAT&apos;S HAPPENING ON THE CHART?
          </h2>

          <div className="border border-slate-200 rounded-xl p-3 sm:p-6 bg-white flex flex-col items-center justify-center">
            {chartImageData ? (
              <div className="w-full flex flex-col items-center">
                {/* Print-hidden Chart Resize Toolbar */}
                <div className="w-full mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Chart Width:</span>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[10px]">
                      {(['50%', '75%', '100%'] as const).map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setCurrentChartWidth(w)}
                          className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                            currentChartWidth === w
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600">
                      Height: <span className="text-violet-600 font-extrabold">{currentChartHeight}px</span>
                    </span>
                    <input
                      type="range"
                      min={150}
                      max={650}
                      step={10}
                      value={currentChartHeight}
                      onChange={e => setCurrentChartHeight(Number(e.target.value))}
                      className="w-24 sm:w-32 accent-violet-600 cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentChartHeight(h => Math.max(150, h - 25))}
                        className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer"
                      >
                        -25
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentChartHeight(h => Math.min(650, h + 25))}
                        className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer"
                      >
                        +25
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentChartHeight(380);
                          setCurrentChartWidth('100%');
                        }}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-bold cursor-pointer ml-1"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center transition-all duration-150" style={{ width: currentChartWidth }}>
                  <img
                    src={chartImageData}
                    alt="Stock Chart Analysis"
                    style={{ maxHeight: `${currentChartHeight}px` }}
                    className="w-auto max-w-full object-contain rounded-lg border border-slate-200 shadow-xs"
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-2 italic text-center">
                  Uploaded technical price chart for {companyName} ({stockQuery})
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center overflow-x-auto">
                <svg viewBox="0 0 720 340" className="w-full min-w-[500px] max-w-[660px] h-auto font-sans select-none">
                  <line x1="50" y1="40" x2="670" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="90" x2="670" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="140" x2="670" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="190" x2="670" y2="190" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="50" y1="240" x2="670" y2="240" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Dynamic Target Price Level Band */}
                  <line x1="50" y1="40" x2="670" y2="40" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,4" />
                  <rect x="530" y="26" width="135" height="22" rx="4" fill="#10b981" />
                  <text x="597" y="41" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                    Target ₹{targetPrice}
                  </text>

                  {/* Dynamic CMP Level Band */}
                  <line x1="50" y1="160" x2="670" y2="160" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" />
                  <rect x="530" y="146" width="135" height="22" rx="4" fill="#3b82f6" />
                  <text x="597" y="161" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                    CMP ₹{currentPrice}
                  </text>

                  {/* Support Neckline */}
                  <line x1="90" y1="240" x2="530" y2="240" stroke="#64748b" strokeWidth="1.5" strokeDasharray="5,5" />
                  <text x="310" y="262" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="bold">
                    Neckline Support
                  </text>

                  <text x="215" y="105" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="bold">Shoulder</text>
                  <text x="330" y="55" textAnchor="middle" fill="#334155" fontSize="13" fontWeight="bold">Head</text>
                  <text x="445" y="105" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="bold">Shoulder</text>

                  <line x1="100" y1="220" x2="100" y2="270" stroke="#22c55e" strokeWidth="1.5" />
                  <rect x="96" y="230" width="8" height="30" fill="#22c55e" rx="1" />
                  <line x1="120" y1="200" x2="120" y2="255" stroke="#22c55e" strokeWidth="1.5" />
                  <rect x="116" y="210" width="8" height="35" fill="#22c55e" rx="1" />
                  <line x1="140" y1="210" x2="140" y2="245" stroke="#ef4444" strokeWidth="1.5" />
                  <rect x="136" y="220" width="8" height="20" fill="#ef4444" rx="1" />
                  <line x1="160" y1="170" x2="160" y2="230" stroke="#22c55e" strokeWidth="1.5" />
                  <rect x="156" y="180" width="8" height="40" fill="#22c55e" rx="1" />
                  <line x1="180" y1="145" x2="180" y2="195" stroke="#22c55e" strokeWidth="1.5" />
                  <rect x="176" y="155" width="8" height="30" fill="#22c55e" rx="1" />
                  <line x1="215" y1="115" x2="215" y2="165" stroke="#22c55e" strokeWidth="2" />
                  <rect x="211" y="125" width="8" height="30" fill="#22c55e" rx="1" />
                  <line x1="240" y1="135" x2="240" y2="190" stroke="#ef4444" strokeWidth="1.5" />
                  <rect x="236" y="145" width="8" height="35" fill="#ef4444" rx="1" />
                  <line x1="265" y1="170" x2="265" y2="235" stroke="#ef4444" strokeWidth="1.5" />
                  <rect x="261" y="180" width="8" height="45" fill="#ef4444" rx="1" />
                  <line x1="295" y1="140" x2="295" y2="200" stroke="#22c55e" strokeWidth="1.5" />
                  <rect x="291" y="150" width="8" height="40" fill="#22c55e" rx="1" />
                  <line x1="330" y1="65" x2="330" y2="140" stroke="#22c55e" strokeWidth="2.5" />
                  <rect x="326" y="75" width="8" height="55" fill="#22c55e" rx="1" />
                  <line x1="360" y1="90" x2="360" y2="160" stroke="#ef4444" strokeWidth="1.5" />
                  <rect x="356" y="100" width="8" height="50" fill="#ef4444" rx="1" />
                  <line x1="385" y1="155" x2="385" y2="245" stroke="#ef4444" strokeWidth="2" />
                  <rect x="381" y="165" width="8" height="65" fill="#ef4444" rx="1" />
                  <line x1="415" y1="180" x2="415" y2="235" stroke="#22c55e" strokeWidth="1.5" />
                  <rect x="411" y="190" width="8" height="35" fill="#22c55e" rx="1" />
                  <line x1="445" y1="115" x2="445" y2="175" stroke="#22c55e" strokeWidth="2" />
                  <rect x="441" y="125" width="8" height="35" fill="#22c55e" rx="1" />
                  <line x1="475" y1="145" x2="475" y2="205" stroke="#ef4444" strokeWidth="1.5" />
                  <rect x="471" y="155" width="8" height="40" fill="#ef4444" rx="1" />
                  <line x1="505" y1="195" x2="505" y2="275" stroke="#ef4444" strokeWidth="2.5" />
                  <rect x="501" y="205" width="8" height="60" fill="#ef4444" rx="1" />
                </svg>
                <div className="text-[11px] text-slate-500 mt-2 italic text-center">
                  Chart Model: Pattern setup mapped with CMP (₹{currentPrice}) and Target Evaluation (₹{targetPrice})
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Dynamic Financial Analysis (By Comparison Mode) ── */}
        <div className="mb-8 report-section section-financials break-inside-avoid page-break-inside-avoid">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wide">
              3. {resolvedCompanyName} FINANCIAL ANALYSIS &amp; VALUATION
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Table Column Alignment Selector */}
              <div className="print:hidden flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 px-1">Column Align:</span>
                <button
                  type="button"
                  title="Align Columns Left"
                  onClick={() => setTableAlignment('left')}
                  className={`p-1 rounded transition cursor-pointer ${tableAlignment === 'left' ? 'bg-white dark:bg-slate-700 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Align Columns Center"
                  onClick={() => setTableAlignment('center')}
                  className={`p-1 rounded transition cursor-pointer ${tableAlignment === 'center' ? 'bg-white dark:bg-slate-700 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Align Columns Right"
                  onClick={() => setTableAlignment('right')}
                  className={`p-1 rounded transition cursor-pointer ${tableAlignment === 'right' ? 'bg-white dark:bg-slate-700 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <select
                value={currentCompMode}
                onChange={e => setCurrentCompMode(e.target.value)}
                className="print:hidden text-[11px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-300 rounded-lg px-2.5 py-1 cursor-pointer transition focus:outline-none"
              >
                {COMPARISON_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="text-[10px] font-black text-violet-700 bg-violet-50 px-2.5 py-1 rounded-md border border-violet-200">
                {currentCompMode}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-3 font-medium">
            Dimension Analysis &middot; {currentCompMode}:
          </p>

          <div className="border border-slate-300 rounded-lg overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="bg-[#e8eff5] border-b border-slate-300 text-slate-900">
                  <th className="py-2.5 px-3 sm:px-4 font-black uppercase text-[10px] sm:text-[11px] tracking-wider text-left w-1/3">
                    FINANCIAL METRIC
                  </th>
                  {activeCols.map((col, idx) => (
                    <th
                      key={col.id}
                      style={{ textAlign: tableAlignment }}
                      className={`py-2.5 px-3 sm:px-4 font-black uppercase text-[10px] sm:text-[11px] tracking-wider ${tableAlignCls} ${
                        idx === 0 ? 'bg-[#dce7f0] text-slate-950' : 'text-slate-800'
                      }`}
                    >
                      {currentCompMode.includes('Peer')
                        ? peerNames[col.id] || (idx === 0 ? `${resolvedCompanyName} (TARGET)` : col.label)
                        : (currentCompMode.includes('Benchmark') && idx === 0
                            ? `${resolvedCompanyName} (Target)`
                            : col.label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeMetrics.map((m, rowIdx) => (
                  <tr
                    key={m.key}
                    className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                  >
                    <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-800 text-left">
                      {m.label}
                    </td>
                    {activeCols.map((col, idx) => {
                      const val = getMetricCellValue(activeDataMap, m.key, col.id, idx);
                      return (
                        <td
                          key={col.id}
                          style={{ textAlign: tableAlignment }}
                          className={`py-2.5 px-3 sm:px-4 font-semibold ${tableAlignCls} ${
                            idx === 0 ? 'bg-slate-100/50 font-black text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {val && String(val).trim() !== '' ? val : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 4: Understanding Business & Evaluation (With Alignment) ─ */}
        <div className="mb-8 space-y-4 report-section">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wide">
              4. UNDERSTANDING BUSINESS &amp; EVALUATION
            </h2>
            <div className="print:hidden flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 px-1">Text Align:</span>
              <button
                type="button"
                title="Align Left"
                onClick={() => setTextAlignment('left')}
                className={`p-1 rounded transition cursor-pointer ${textAlignment === 'left' ? 'bg-white dark:bg-slate-700 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Align Center"
                onClick={() => setTextAlignment('center')}
                className={`p-1 rounded transition cursor-pointer ${textAlignment === 'center' ? 'bg-white dark:bg-slate-700 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Align Right"
                onClick={() => setTextAlignment('right')}
                className={`p-1 rounded transition cursor-pointer ${textAlignment === 'right' ? 'bg-white dark:bg-slate-700 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Justify"
                onClick={() => setTextAlignment('justify')}
                className={`p-1 rounded transition cursor-pointer ${textAlignment === 'justify' ? 'bg-white dark:bg-slate-700 shadow-xs text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            className="space-y-4 text-xs text-slate-700 leading-relaxed"
            style={{ textAlign: textAlignment }}
          >
            <div className="break-inside-avoid page-break-inside-avoid">
              <h3 className="font-black text-slate-900 text-xs mb-1.5 uppercase tracking-wide">
                Business Overview (Moat)
              </h3>
              <p id="er-report-business-overview" className="whitespace-pre-wrap leading-relaxed">
                {businessOverview && businessOverview.trim() !== ''
                  ? businessOverview
                  : '—'}
              </p>
            </div>

            <div className="break-inside-avoid page-break-inside-avoid">
              <h3 className="font-black text-slate-900 text-xs mb-1.5 uppercase tracking-wide">
                Relative Valuation Thesis
              </h3>
              <p id="er-report-valuation-thesis" className="whitespace-pre-wrap leading-relaxed">
                {valuationThesis && valuationThesis.trim() !== ''
                  ? valuationThesis
                  : '—'}
              </p>
            </div>

            <div className="break-inside-avoid page-break-inside-avoid">
              <h3 className="font-black text-slate-900 text-xs mb-1.5 uppercase tracking-wide">
                Technical Chart Analysis
              </h3>
              <p id="er-report-technical-analysis" className="whitespace-pre-wrap leading-relaxed">
                {technicalAnalysis && technicalAnalysis.trim() !== ''
                  ? technicalAnalysis
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 5: What Analysts Say? (Consensus Table) ─ */}
        <div className="mb-4 report-section break-inside-avoid page-break-inside-avoid">
          <h2 className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wide mb-3">
            5. WHAT ANALYSTS SAY? (STREET COVERAGE CONSENSUS)
          </h2>

          <div className="border border-slate-300 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[500px]">
              <thead>
                <tr className="bg-[#e8eff5] border-b border-slate-300 text-slate-900">
                  <th className="py-2.5 px-3 sm:px-4 font-black uppercase text-[10px] sm:text-[11px] tracking-wider">RELEASE DATE</th>
                  <th className="py-2.5 px-3 sm:px-4 font-black uppercase text-[10px] sm:text-[11px] tracking-wider">BROKERAGE INSTITUTION</th>
                  <th className="py-2.5 px-3 sm:px-4 font-black uppercase text-[10px] sm:text-[11px] tracking-wider text-center">INVESTMENT DIRECTIVE</th>
                  <th className="py-2.5 px-3 sm:px-4 font-black uppercase text-[10px] sm:text-[11px] tracking-wider text-right">TARGET PRICE</th>
                  <th className="py-2.5 px-3 sm:px-4 font-black uppercase text-[10px] sm:text-[11px] tracking-wider text-right">PERCENTAGE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {consensusRows && consensusRows.length > 0 && consensusRows.some(r => r.brokerageHouse || r.targetPrice) ? (
                  consensusRows.map((row, idx) => {
                    const callDate = row.callDate || '—';
                    const broker = row.brokerageHouse || '—';
                    const rating = row.rating || '—';
                    const rowTgt = parseFloat(row.targetPrice) || 0;
                    const pct = cmpNum > 0 && rowTgt > 0
                      ? (((rowTgt - cmpNum) / cmpNum) * 100).toFixed(1)
                      : null;

                    return (
                      <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2.5 px-3 sm:px-4 font-medium text-slate-700">{callDate}</td>
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">{broker}</td>
                        <td className="py-2.5 px-3 sm:px-4 font-black text-center text-emerald-600">{rating}</td>
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-right text-slate-900">
                          {row.targetPrice ? `₹${row.targetPrice}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-black text-right text-emerald-600">
                          {pct !== null ? `+${pct}%` : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 text-center text-slate-400 italic">
                      No street analyst rows provided.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>WisBees Intelligence Research &middot; Confidential Institutional Dossier</span>
          <span>Generated on {priceAsOn} {savedDbId ? `&bull; Saved in Cloud DB (Record #${savedDbId})` : ''}</span>
        </div>

      </div>

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs font-bold shadow-2xl animate-fadeIn print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── Saved Reports History Modal ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn print:hidden">
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
                    Switch between previously compiled reports stored in the database
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
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>

            {/* Reports List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {loadingReports ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-xs font-semibold">Loading reports from database...</span>
                </div>
              ) : savedReports.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">No Saved Reports Found</span>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {historySearch ? 'No reports matched your search query.' : 'Click "Save to DB" on the report view or compiler hub to save reports.'}
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

                  const isCurrent = savedDbId === rep.id;

                  return (
                    <div
                      key={rep.id}
                      className={`pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl transition border ${
                        isCurrent
                          ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent hover:border-slate-200'
                      }`}
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
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600 text-white font-extrabold">
                              Active View
                            </span>
                          )}
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
                          onClick={() => handleLoadSavedReport(rep.id)}
                          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          View Report
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadSavedReport(rep.id);
                            router.push('/employee/equity-research-work');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
                          title="Open in Compiler Hub to Edit"
                        >
                          Edit
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
