const STOP_WORDS = new Set(['the','and','for','with','from','this','that','token','coin','chain','crypto','new','official','finance','network']);
const NARRATIVE_PATTERNS = [
  ['ai', ['ai','agent','agents','inference','model','llm','compute','robot']],
  ['rwa', ['rwa','real world','tokenized','treasury','bonds','assets']],
  ['payments', ['payment','payments','pay','merchant','remittance','stablecoin']],
  ['defi', ['defi','yield','lending','borrow','liquidity','vault','swap']],
  ['memes', ['meme','memecoin','cat','dog','pepe','frog','community']],
  ['gaming', ['game','gaming','games','player','virtual','metaverse']],
  ['privacy', ['privacy','private','zk','zero knowledge','encrypted']],
  ['depin', ['depin','wireless','compute','storage','gpu','infrastructure']],
  ['social', ['social','creator','community','farcaster','telegram']],
];

function words(text) {
  return String(text || '').toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [];
}

export function classifyNarratives(text) {
  const normalized = String(text || '').toLowerCase();
  return NARRATIVE_PATTERNS.filter(([, terms]) => terms.some((term) => normalized.includes(term)))
    .map(([name]) => name);
}

export function buildNarrativeSnapshot(discovery = [], trending = []) {
  const corpus = [...discovery.map((x) => `${x.name || ''} ${x.symbol || ''} ${x.description || ''}`), ...trending.map((x) => x.name || x.title || x.slug || x.description || '')];
  const counts = new Map();
  corpus.forEach((text) => words(text).forEach((word) => {
    if (!STOP_WORDS.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  }));
  const hotWords = [...counts.entries()].sort((a,b) => b[1]-a[1]).slice(0, 30).map(([word,count]) => ({ word, count }));
  const narratives = NARRATIVE_PATTERNS.map(([name, terms]) => {
    const mentions = corpus.reduce((n, text) => n + terms.filter((term) => String(text).toLowerCase().includes(term)).length, 0);
    return { name, mentions, momentum: Math.min(100, mentions * 7) };
  }).filter((x) => x.mentions > 0).sort((a,b) => b.momentum-a.momentum);
  return { hotWords, narratives, generatedAt: new Date().toISOString() };
}

export function attachNarrativeIntelligence(token, snapshot) {
  const text = `${token.name || ''} ${token.symbol || ''} ${token.description || ''}`;
  const matched = classifyNarratives(text);
  const wordSet = new Set((snapshot?.hotWords || []).map((x) => x.word));
  const matchedWords = words(text).filter((word) => wordSet.has(word)).slice(0, 8);
  const momentum = matched.reduce((sum, name) => sum + Number(snapshot?.narratives?.find((n) => n.name === name)?.momentum || 0), 0);
  return { ...token, narrativeIntelligence: { narratives: matched, matchedWords, momentum: Math.min(100, momentum) } };
}
