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
    <div className="bg-[#1B1B1B] border border-[#222222] rounded-xl p-4 mt-4">
      <h3 className="font-medium text-white">Secondary Market</h3>
      <p className="text-sm mt-2 text-[#9B9B9B]">
        Your pledge receipts are liquid ERC20 tokens. You can exit your position by selling on Uniswap instead of
        waiting for refund.
      </p>
      <p className="text-xs mt-2 text-[#F2994A]">Selling tokens forfeits your refund rights</p>
      <button className="btn-brand w-full mt-3 py-2 text-sm" onClick={handleUniswapExit}>
        Exit via Uniswap
      </button>
    </div>
  );
};
