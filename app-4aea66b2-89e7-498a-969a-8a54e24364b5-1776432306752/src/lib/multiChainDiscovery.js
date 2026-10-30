import {
  CHAINS,
  DEX_LATEST_PROFILES,
  DEX_LATEST_BOOSTS,
  DEX_TRENDING_META,
  RUGCHECK_REPORT,
  GOPLUS_TOKEN_SECURITY,
  HONEYPOT_CHECK,
} from '../config';
import { buildNarrativeSnapshot, attachNarrativeIntelligence } from './narrativeIntelligence';
import { observeTokenBirths } from './birthWatch';
import { fetchSolanaSecurity } from './solanaSecurity';

const ERC20 = { name: '0x06fdde03', symbol: '0x95d89b41', decimals: '0x313ce567', totalSupply: '0x18160ddd' };
async function getJson(url) { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }
async function evmRpc(rpc, method, params = []) { const res = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) }); if (!res.ok) throw new Error(`RPC ${method}: ${res.status}`); const json = await res.json(); if (json.error) throw new Error(json.error.message || 'RPC error'); return json.result; }
function decodeAbiString(hex) { if (!hex || hex === '0x') return null; try { const body = hex.slice(2); const offset = parseInt(body.slice(0,64),16); const len = parseInt(body.slice(offset*2,offset*2+64),16); const bytes = body.slice(offset*2+64,offset*2+64+len*2).match(/.{1,2}/g)||[]; return new TextDecoder().decode(new Uint8Array(bytes.map((x)=>parseInt(x,16)))); } catch (_) { return null; } }
function decodeUint(hex) { if (!hex || hex === '0x') return null; try { return Number(BigInt(hex)); } catch (_) { return null; } }
async function readErc20(rpc,address) { const [code,name,symbol,decimals,totalSupply]=await Promise.all([evmRpc(rpc,'eth_getCode',[address,'latest']),evmRpc(rpc,'eth_call',[{to:address,data:ERC20.name},'latest']).catch(()=>null),evmRpc(rpc,'eth_call',[{to:address,data:ERC20.symbol},'latest']).catch(()=>null),evmRpc(rpc,'eth_call',[{to:address,data:ERC20.decimals},'latest']).catch(()=>null),evmRpc(rpc,'eth_call',[{to:address,data:ERC20.totalSupply},'latest']).catch(()=>null)]); if(!code||code==='0x'||code.length<20||!(symbol||decimals||totalSupply))return null; return {address,name:decodeAbiString(name)||'Unknown token',symbol:decodeAbiString(symbol)||'UNKNOWN',decimals:decodeUint(decimals),totalSupply:totalSupply&&totalSupply!=='0x'?BigInt(totalSupply).toString():null,contractBytes:Math.max(0,(code.length-2)/2)}; }
async function scanEvmContracts(chain) { const latest=Number(BigInt(await evmRpc(chain.rpc,'eth_blockNumber'))); const blocks=await Promise.all(Array.from({length:8},(_,i)=>latest-i).map((n)=>evmRpc(chain.rpc,'eth_getBlockByNumber',[`0x${n.toString(16)}`,true]).catch(()=>null))); const creations=[]; for(const block of blocks){for(const tx of block?.transactions||[]){if(!tx.to&&tx.creates)creations.push(tx.creates); if(!tx.to&&tx.hash&&!tx.creates){const receipt=await evmRpc(chain.rpc,'eth_getTransactionReceipt',[tx.hash]).catch(()=>null);if(receipt?.contractAddress)creations.push(receipt.contractAddress);} if(creations.length>=60)break;}if(creations.length>=60)break;} const tokens=[]; for(const address of [...new Set(creations.map((x)=>x.toLowerCase()))].slice(0,40)){try{const token=await readErc20(chain.rpc,address);if(token)tokens.push({...token,chain:chain.id,chainName:chain.name,discoveredBy:'new-contract'});}catch(_){}} return tokens; }
function normalizeProfile(item){if(!item?.tokenAddress||!item?.chainId)return null;const chain=item.chainId==='solana'?CHAINS.solana:item.chainId==='arc'?CHAINS.arc:(item.chainId==='robin'||item.chainId==='robinhood')?CHAINS.robinhood:null;if(!chain)return null;return{address:item.tokenAddress,chain:chain.id,chainName:chain.name,name:item.description?.split(/\n| - | — /)[0]||'New token',symbol:item.symbol||'',description:item.description||'',icon:item.icon,profileUrl:item.url,discoveredBy:'dex-profile'};}
export async function discoverEarlyTokens(){const [profiles,boosts,trending]=await Promise.all([getJson(DEX_LATEST_PROFILES()).catch(()=>[]),getJson(DEX_LATEST_BOOSTS()).catch(()=>[]),getJson(DEX_TRENDING_META()).catch(()=>[])]);const profileTokens=(Array.isArray(profiles)?profiles:[]).map(normalizeProfile).filter(Boolean);const boostTokens=(Array.isArray(boosts)?boosts:[]).map((item)=>({...normalizeProfile(item),boostAmount:Number(item.totalAmount||item.amount||0),discoveredBy:'dex-boost'})).filter(Boolean);const evmTokens=[];for(const chain of[CHAINS.arc,CHAINS.robinhood]){try{evmTokens.push(...await scanEvmContracts(chain));}catch(_){}}const merged=new Map();[...profileTokens,...boostTokens,...evmTokens].forEach((token)=>{const k=`${token.chain}:${token.address.toLowerCase()}`;merged.set(k,{...merged.get(k),...token});});return{tokens:[...merged.values()],trending:Array.isArray(trending)?trending:[]};}
export async function enrichToken(token) {
  const chain = CHAINS[token.chain];
  if (!chain) return token;

  const dex = await getJson(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`).catch(() => ({ pairs: [] }));
  const pairs = (dex?.pairs || []).filter((pair) => pair.chainId === chain.dexChainId || (chain.id === 'solana' && pair.chainId === 'solana'));
  const pair = pairs.sort((a, b) => Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0))[0] || null;

  let security = { status: 'not_checked', source: null, isHoneypot: null, risk: null, flags: [] };
  if (chain.type === 'solana') {
    const [report, chainChecks] = await Promise.all([
      getJson(RUGCHECK_REPORT(token.address)).catch(() => null),
      fetchSolanaSecurity(token.address, chain.rpc).catch((error) => ({
        status: 'unavailable',
        source: 'Solana RPC',
        error: error.message || 'Solana security checks failed',
        mintAuthorityRevoked: null,
        freezeAuthorityRevoked: null,
        holderConcentrationStatus: 'unavailable',
        top10HolderPct: null,
      })),
    ]);
    const reportRisks = Array.isArray(report?.risks) ? report.risks : (Array.isArray(report?.risk) ? report.risk : []);
    security = {
      ...chainChecks,
      status: chainChecks.status,
      source: report ? 'RugCheck + Solana RPC' : 'Solana RPC',
      rugcheckStatus: report ? 'checked' : 'unavailable',
      isHoneypot: typeof report?.rugged === 'boolean' ? report.rugged : null,
      risk: report?.score ?? report?.riskScore ?? null,
      flags: reportRisks.map((risk) => risk?.name || risk?.description || String(risk)).slice(0, 12),
    };
  } else if (chain.chainId === 4663) {
    const gp = await getJson(GOPLUS_TOKEN_SECURITY(chain.chainId, token.address)).catch(() => null);
    const data = gp?.result?.[token.address.toLowerCase()] || gp?.result?.[token.address] || null;
    if (data) {
      const risky = [['is_honeypot', data.is_honeypot], ['is_blacklisted', data.is_blacklisted], ['is_mintable', data.is_mintable], ['owner_change_balance', data.owner_change_balance]];
      security = {
        status: 'checked',
        source: 'GoPlus',
        isHoneypot: data.is_honeypot === '1',
        risk: null,
        flags: risky.filter(([, value]) => value === '1').map(([key]) => key),
        buyTax: data.buy_tax,
        sellTax: data.sell_tax,
        openSource: data.is_open_source,
        holderCount: data.holder_count,
      };
    }
  }

  return {
    ...token,
    market: pair ? {
      pairAddress: pair.pairAddress,
      dex: pair.dexId,
      priceUsd: Number(pair.priceUsd || 0),
      liquidityUsd: Number(pair.liquidity?.usd || 0),
      volume5m: Number(pair.volume?.m5 || 0),
      volume1h: Number(pair.volume?.h1 || 0),
      buys5m: Number(pair.txns?.m5?.buys || 0),
      sells5m: Number(pair.txns?.m5?.sells || 0),
      priceChange5m: Number(pair.priceChange?.m5 || 0),
      priceChange1h: Number(pair.priceChange?.h1 || 0),
      fdv: Number(pair.fdv || 0),
      pairCreatedAt: pair.pairCreatedAt || null,
      url: pair.url,
      socials: pair.info?.socials || [],
    } : null,
    security,
  };
}
export function rankEarlyToken(token, trendingWords = []) {
  const market = token.market || {};
  const security = token.security || {};
  const text = `${token.name || ''} ${token.symbol || ''} ${token.description || ''}`.toLowerCase();
  const narrativeHits = trendingWords.filter((word) => text.includes(String(word).toLowerCase()));
  const liquidity = Number(market.liquidityUsd || 0);
  const volume = Number(market.volume1h || 0);
  const flow = Number(market.buys5m || 0) - Number(market.sells5m || 0);
  const ageHours = market.pairCreatedAt ? Math.max(0.05, (Date.now() - market.pairCreatedAt) / 3600000) : 999;

  // Discovery score only. This is not a calibrated probability or trade signal.
  let score = Math.min(25, narrativeHits.length * 8)
    + Math.min(20, Math.log10(Math.max(1, liquidity)) * 4)
    + Math.min(20, Math.log10(Math.max(1, volume)) * 4)
    + Math.max(-10, Math.min(10, flow));
  if (ageHours < 6) score += 15;
  else if (ageHours < 24) score += 8;
  if (token.discoveredBy === 'dex-boost') score += 5;
  if (security.isHoneypot === true) score -= 60;
  if (security.mintAuthorityRevoked === false) score -= 25;
  if (security.freezeAuthorityRevoked === false) score -= 15;
  if (Number.isFinite(security.top10HolderPct) && security.top10HolderPct > 25) score -= 25;
  if (security.flags?.length) score -= Math.min(20, security.flags.length * 4);

  const hardBlocked = security.isHoneypot === true
    || security.mintAuthorityRevoked === false
    || security.freezeAuthorityRevoked === false
    || (Number.isFinite(security.top10HolderPct) && security.top10HolderPct > 25);
  const verified = security.status === 'verified'
    && security.mintAuthorityRevoked === true
    && security.freezeAuthorityRevoked === true
    && security.holderConcentrationStatus === 'verified'
    && Number.isFinite(security.top10HolderPct)
    && security.top10HolderPct <= 25
    && security.isHoneypot === false;

  return {
    ...token,
    score: Math.max(0, Math.min(100, Math.round(score))),
    narrativeHits,
    verdict: hardBlocked ? 'BLOCKED' : verified ? 'SECURITY VERIFIED' : 'VERIFY BEFORE ENTRY',
  };
}
export function extractTrendingWords(trending,tokens=[]){const stop=new Set(['the','and','for','with','from','this','that','token','coin','chain','crypto','new']);const counts=new Map();const add=(value)=>String(value||'').toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g)?.forEach((w)=>{if(!stop.has(w)&&!/^\d+$/.test(w))counts.set(w,(counts.get(w)||0)+1);});(Array.isArray(trending)?trending:[]).forEach((x)=>add(x.name||x.title||x.slug||x.description));tokens.forEach((x)=>{add(x.name);add(x.symbol);add(x.description);});return[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([w])=>w);}
export async function runEarlyGemScan(){const discovered=await discoverEarlyTokens();const snapshot=buildNarrativeSnapshot(discovered.tokens,discovered.trending);const words=snapshot.hotWords.map((x)=>x.word);const enriched=[];for(const token of discovered.tokens.slice(0,60)){try{const enrichedToken=attachNarrativeIntelligence(await enrichToken(token),snapshot);enriched.push(rankEarlyToken(enrichedToken,words));}catch(_){enriched.push(rankEarlyToken(attachNarrativeIntelligence(token,snapshot),words));}}enriched.sort((a,b)=>b.score-a.score);return{tokens:observeTokenBirths(enriched),trendingWords:words,narrativeSnapshot:snapshot};}
