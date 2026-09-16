import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Crosshair, Radar } from 'lucide-react';
import Header from './components/Header';
import BlockList from './components/BlockList';
import TransactionList from './components/TransactionList';
import SnipeList from './components/SnipeList';
import StatsBar from './components/StatsBar';
import SnipeModal from './components/SnipeModal';
import EarlyGems from './components/EarlyGems';
import { useSolanaScanner } from './hooks/useSolanaScanner';
import { supabase } from './lib/supabase';
import { getMarketData } from './tokenService';
import { runEarlyGemScan } from './lib/multiChainDiscovery';
import { buildRadarSummary, getRadarSignal } from './lib/radarSignals';

export default function App() {
  const { blocks, transactions, networkStats, loading, error, lastScan, scan } = useSolanaScanner();
  const [targets, setTargets] = useState([]); const [targetsLoading, setTargetsLoading] = useState(true);
  const [snipeModal, setSnipeModal] = useState(null); const [toast, setToast] = useState(null); const [activeTab, setActiveTab] = useState('transactions');
  const [marketDetails, setMarketDetails] = useState({}); const [earlyTokens, setEarlyTokens] = useState([]); const [trendingWords, setTrendingWords] = useState([]);
  const [earlyLoading, setEarlyLoading] = useState(false); const [earlyError, setEarlyError] = useState(null); const [autoRadar, setAutoRadar] = useState(true);

  useEffect(() => {
    const latestTx = transactions[0];
    if (latestTx?.mint && !marketDetails[latestTx.mint]) getMarketData(latestTx.mint).then((data) => data && setMarketDetails((prev) => ({ ...prev, [latestTx.mint]: data })));
  }, [transactions]);

  const loadTargets = useCallback(async () => {
    setTargetsLoading(true); const { data, error: err } = await supabase.from('snipe_targets').select('*').order('created_at', { ascending: false });
    if (!err && data) setTargets(data); setTargetsLoading(false);
  }, []);

  const runEarlyScan = useCallback(async () => {
    setEarlyLoading(true); setEarlyError(null);
    try { const result = await runEarlyGemScan(); setEarlyTokens(result.tokens || []); setTrendingWords(result.trendingWords || []); }
    catch (err) { setEarlyError(err.message || 'Early-token scan failed'); }
    finally { setEarlyLoading(false); }
  }, []);

  useEffect(() => { loadTargets(); scan(); runEarlyScan(); }, []); // eslint-disable-line

  useEffect(() => {
    if (!autoRadar) return undefined;
    const timer = setInterval(() => { if (!earlyLoading && document.visibilityState !== 'hidden') runEarlyScan(); }, 60000);
    return () => clearInterval(timer);
  }, [autoRadar, earlyLoading, runEarlyScan]);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const handleSnipeClick = (tx) => { if (tx.mints?.length) setSnipeModal(tx); };
  const handleSnipeConfirm = async ({ tx, mint, notes }) => {
    const payload = { token_address: mint, slot: tx.slot, block_time: tx.blockTime || null, tx_signature: tx.sig, notes: notes || null, status: 'watching' };
    const { data, error: err } = await supabase.from('snipe_targets').insert(payload).select().single();
    if (err) showToast('Failed to save target: ' + err.message, 'error'); else { setTargets((prev) => [data, ...prev]); setSnipeModal(null); showToast('Snipe target added!'); setActiveTab('targets'); }
  };
  const handleUpdateStatus = async (id, status) => { const { error: err } = await supabase.from('snipe_targets').update({ status, updated_at: new Date().toISOString() }).eq('id', id); if (err) showToast('Update failed: ' + err.message, 'error'); else setTargets((prev) => prev.map((t) => t.id === id ? { ...t, status } : t)); };
  const handleDelete = async (id) => { const { error: err } = await supabase.from('snipe_targets').delete().eq('id', id); if (err) showToast('Delete failed: ' + err.message, 'error'); else { setTargets((prev) => prev.filter((t) => t.id !== id)); showToast('Target removed.'); } };

  const radarSummary = buildRadarSummary(earlyTokens);
  const hotTokens = earlyTokens.filter((token) => getRadarSignal(token).signal === 'HOT').length;
  const tabs = [
    { id: 'transactions', label: 'Transactions', count: transactions.length }, { id: 'blocks', label: 'Blocks', count: blocks.length },
    { id: 'targets', label: 'Snipe Targets', count: targets.length }, { id: 'early', label: 'Early Radar', count: earlyTokens.length },
  ];

  return <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col">
    <Header networkStats={networkStats} loading={loading} lastScan={lastScan} onScan={scan} />
    <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-5 space-y-5">
      <StatsBar blocks={blocks} transactions={transactions} targets={targets} />
      <div className="rounded-xl border border-brand-border bg-black/20 px-4 py-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-2 text-white font-semibold"><Radar size={15}/> Radar status</span>
        <span className="text-brand-subtext">HOT {radarSummary.HOT || 0}</span><span className="text-brand-subtext">WATCH {radarSummary.WATCH || 0}</span><span className="text-brand-subtext">VERIFY {radarSummary.VERIFY || 0}</span><span className="text-brand-subtext">BLOCKED {radarSummary.BLOCKED || 0}</span>
        <span className="ml-auto text-brand-subtext">{hotTokens} live hot signal{hotTokens === 1 ? '' : 's'}</span>
        <button onClick={() => setAutoRadar((v) => !v)} className="px-2.5 py-1.5 rounded-lg bg-brand-border text-brand-subtext hover:text-white">Auto-scan {autoRadar ? 'ON' : 'OFF'}</button>
      </div>
      {error && <div className="flex items-center gap-3 bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 text-sm text-brand-red"><AlertCircle size={16}/><div><span className="font-semibold">Scan Error: </span>{error}<span className="block text-xs text-brand-red/70 mt-0.5">Make sure your QuickNode endpoint is configured and active.</span></div></div>}
      {earlyError && <div className="flex items-center gap-3 bg-brand-red/10 border border-brand-red/30 rounded-xl px-4 py-3 text-sm text-brand-red"><AlertCircle size={16}/><div><span className="font-semibold">Early Radar: </span>{earlyError}</div></div>}
      <div className="flex items-center gap-1 border-b border-brand-border overflow-x-auto">
        {tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px ${activeTab === tab.id ? 'border-brand-accent text-white' : 'border-transparent text-brand-subtext hover:text-white hover:border-brand-border'}`}>{tab.label}{tab.count > 0 && <span className={`text-xs rounded-full px-1.5 py-0.5 font-mono ${activeTab === tab.id ? 'bg-brand-accent text-black' : 'bg-brand-border text-brand-subtext'}`}>{tab.count}</span>}</button>)}
      </div>
      {activeTab === 'early' && <EarlyGems tokens={earlyTokens} trendingWords={trendingWords} loading={earlyLoading} onRefresh={runEarlyScan}/>} 
      {activeTab === 'transactions' && <TransactionList transactions={transactions} onSnipe={handleSnipeClick}/>} 
      {activeTab === 'blocks' && <BlockList blocks={blocks}/>} 
      {activeTab === 'targets' && <SnipeList targets={targets} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete}/>} 
      {!loading && blocks.length === 0 && transactions.length === 0 && !error && activeTab !== 'early' && <div className="flex flex-col items-center justify-center text-center py-20 gap-4"><div className="w-16 h-16 rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center"><Crosshair size={32} className="text-brand-accent"/></div><div><h2 className="text-lg font-semibold text-white">Ready to Scan</h2><p className="text-brand-subtext text-sm mt-1 max-w-sm">Click “Scan Now” to fetch recent Solana blocks and use Early Radar to monitor Solana, Arc and Robinhood Chain.</p></div></div>}
    </main>
    {snipeModal && <SnipeModal tx={snipeModal} onConfirm={handleSnipeConfirm} onClose={() => setSnipeModal(null)}/>} 
    {toast && <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border transition-all ${toast.type === 'error' ? 'bg-brand-red/20 border-brand-red/40 text-brand-red' : 'bg-brand-green/20 border-brand-green/40 text-brand-green'}`}>{toast.msg}</div>}
  </div>;
}
