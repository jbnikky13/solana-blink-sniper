// src/tokenService.js
export const getMarketData = async (mintAddress) => {
  try {
    // We call DexScreener's public API (no API key needed!)
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`);
    const data = await response.json();

    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0]; // The top trading pair
      return {
        symbol: pair.baseToken.symbol,
        price: pair.priceUsd,
        volume24h: pair.volume.h24,
        // Find Twitter and Telegram in the info section
        twitter: pair.info?.socials?.find(s => s.type === 'twitter')?.url,
        telegram: pair.info?.socials?.find(s => s.type === 'telegram')?.url,
        dexLink: pair.url
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching from DexScreener:", error);
    return null;
  }
};