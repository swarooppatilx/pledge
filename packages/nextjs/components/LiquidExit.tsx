"use client";

import { useAccount } from "wagmi";

interface LiquidExitProps {
  tokenAddress: string;
}

/**
 * LiquidExit Component
 * Displays DeFi secondary market options for liquid pledge tokens
 *
 * Key Feature: Pledge receipt tokens are ERC20s that can be:
 * - Traded on Uniswap/secondary markets
 * - If sold, the buyer inherits refund rights
 * - Seller loses refund eligibility (must own tokens to refund)
 */
export const LiquidExit = ({ tokenAddress }: LiquidExitProps) => {
  const { isConnected } = useAccount();

  const handleUniswapExit = () => {
    // Base Mainnet Uniswap URL
    const uniswapUrl = `https://app.uniswap.org/swap?chain=base&outputCurrency=${tokenAddress}`;
    window.open(uniswapUrl, "_blank", "noopener,noreferrer");
  };

  if (!isConnected) return null;

  return (
    <div className="card bg-accent/10 border border-accent p-4 mt-4">
      <h3 className="font-bold text-accent">🔄 DeFi Secondary Market</h3>
      <p className="text-sm mt-2 opacity-80">
        Your pledge receipts are liquid ERC20 tokens. You can exit your position by selling on Uniswap instead of
        waiting for refund.
      </p>
      <p className="text-xs mt-1 text-warning">⚠️ Warning: Selling tokens forfeits your refund rights</p>
      <button className="btn btn-sm btn-accent mt-3" onClick={handleUniswapExit}>
        Exit via Uniswap →
      </button>
    </div>
  );
};
