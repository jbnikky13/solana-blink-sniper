🎯 Blink-N-Snipe: Solana Real-Time Block Scanner
Blink-N-Snipe is a high-performance on-chain monitoring dashboard designed to track real-time transactions, liquidity swaps, and token operations on the Solana blockchain. Built for speed and clarity, it leverages professional infrastructure to provide a "bird's-eye view" of network activity.
Live Demo (https://www.google.com/search?q=https://solana-blink-sniper-kczn.vercel.app)
🚀 Features
• Real-Time Block Monitoring: Streams live Solana slots, Epoch info, and network TPS.
• Transaction Classification: Automatically identifies and labels transactions (Swaps, Transfers, Token Operations).
• Protocol Detection: Specifically tracks activity across major Solana programs including Raydium, Orca, and Jupiter V6.
• Whale & Sniper Tooling: Designed to identify new token mints and significant liquidity movements as they happen.
• Responsive Dashboard: Optimized for both desktop and mobile monitoring.
🛠️ Technical Stack
• Frontend: React.js + Vite (for lightning-fast builds)
• Styling: Tailwind CSS
• Blockchain Infrastructure: QuickNode (https://www.quicknode.com/) (Mainnet RPC)
• Database/Backend: Supabase (https://supabase.com/) (For persistent target tracking)
• Deployment: Vercel
### ⚙️ Configuration & Setup
This project uses environment variables. To run this locally, create a .env file:

```env
VITE_QUICKNODE_URL=your_quicknode_rpc_url
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=your_deployment_url

📂 Project Structure
├── src/hooks: Contains useSolanaScanner.js for custom RPC logic.
├── src/config.js: Centralized configuration for API endpoints.
└── src/components: UI components for the transaction feed.
🤝 Contributing
As a project focused on bridging the gap between data analysis and blockchain health-tech, contributions are welcome! Whether it's adding new protocol detections or optimizing RPC call frequency, feel free to open a PR.


👨‍💻 Developed by
Godam Nichole
Licensed Pharmacist | Data Analyst | Web3 Developer
VITE_API_BASE_URL=your_deployment_url
