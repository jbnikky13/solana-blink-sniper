// Proxy base — all external API calls route through Eitherway's backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.eitherway.ai';

export const PROXY_API = (url) =>
  `${API_BASE_URL}/api/proxy-api?url=${encodeURIComponent(url)}`;

// QuickNode Solana RPC — direct endpoint (supports browser CORS)
export const QUICKNODE_RPC = 'https://blue-methodical-wind.solana-mainnet.quiknode.pro/868f6a3418a3d888082ff32f1f75416a08735fdd';

// Keep alias for any legacy references
export const QUICKNODE_PROXY = QUICKNODE_RPC;

// DexScreener for token metadata
export const DEX_SCREENER = (addr) =>
  PROXY_API(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
