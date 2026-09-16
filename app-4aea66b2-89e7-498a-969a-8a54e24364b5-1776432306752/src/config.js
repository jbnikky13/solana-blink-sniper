// External API proxy. Keep third-party calls behind the existing backend proxy.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.eitherway.ai';
export const PROXY_API = (url) => `${API_BASE_URL}/api/proxy-api?url=${encodeURIComponent(url)}`;

export const QUICKNODE_RPC = import.meta.env.VITE_QUICKNODE_URL || 'YOUR_BACKUP_URL_HERE';
export const QUICKNODE_PROXY = QUICKNODE_RPC;

// Arc Mainnet: Chain ID 5042, native gas token USDC.
export const ARC_RPC = import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.mainnet.arc.io';

// Robinhood Chain Mainnet: Chain ID 4663, native gas token ETH.
export const ROBINHOOD_RPC = import.meta.env.VITE_ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';

export const CHAINS = {
  solana: { id: 'solana', name: 'Solana', type: 'solana', rpc: QUICKNODE_RPC, native: 'SOL', explorer: 'https://solscan.io/token/' },
  arc: { id: 'arc', name: 'Arc', type: 'evm', chainId: 5042, dexChainId: 'arc', rpc: ARC_RPC, native: 'USDC', explorer: 'https://explorer.arc.io/address/' },
  robinhood: { id: 'robinhood', name: 'Robinhood Chain', type: 'evm', chainId: 4663, dexChainId: 'robin', rpc: ROBINHOOD_RPC, native: 'ETH', explorer: 'https://robinhoodchain.blockscout.com/address/' },
};

export const DEX_SCREENER = (addr) => PROXY_API(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
export const DEX_LATEST_PROFILES = () => PROXY_API('https://api.dexscreener.com/token-profiles/latest/v1');
export const DEX_LATEST_BOOSTS = () => PROXY_API('https://api.dexscreener.com/token-boosts/latest/v1');
export const DEX_TRENDING_META = () => PROXY_API('https://api.dexscreener.com/metas/trending/v1');
export const RUGCHECK_REPORT = (mint) => PROXY_API(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`);
export const GOPLUS_TOKEN_SECURITY = (chainId, address) => PROXY_API(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address.toLowerCase()}`);
export const HONEYPOT_CHECK = (chainId, address) => PROXY_API(`https://api.honeypot.is/v2/IsHoneypot?address=${address}&chainID=${chainId}`);

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
