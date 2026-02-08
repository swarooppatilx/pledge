"use client";

import { ArrowTopRightOnSquareIcon, ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

type UniswapWidgetProps = {
  /** Token address to swap */
  tokenAddress: `0x${string}`;
  /** Token symbol */
  tokenSymbol: string;
  /** Whether the pledge is active (trading enabled) */
  isActive: boolean;
  /** Additional class names */
  className?: string;
};

/**
 * UniswapWidget Component
 * Displays Uniswap swap interface for trading pledge tokens
 * Opens Uniswap app in a new tab for swapping
 */
export const UniswapWidget = ({ tokenAddress, tokenSymbol, isActive, className = "" }: UniswapWidgetProps) => {
  const { targetNetwork } = useTargetNetwork();

  const chainName = targetNetwork.id === 8453 ? "base" : targetNetwork.id === 1 ? "mainnet" : "base";

  const handleBuy = () => {
    const url = `https://app.uniswap.org/swap?chain=${chainName}&outputCurrency=${tokenAddress}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSell = () => {
    const url = `https://app.uniswap.org/swap?chain=${chainName}&inputCurrency=${tokenAddress}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!isActive) {
    return (
      <div className={`card-pledge p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <ArrowsRightLeftIcon className="h-5 w-5 text-[#5E5E5E]" />
          <h3 className="text-h2">Trade on Uniswap</h3>
        </div>
        <p className="text-sm text-[#5E5E5E]">Trading is not available until the funding goal is reached.</p>
      </div>
    );
  }

  return (
    <div className={`card-pledge p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <ArrowsRightLeftIcon className="h-5 w-5 text-[#FF007A]" />
        <h3 className="text-h2">Trade on Uniswap</h3>
      </div>

      <p className="text-sm text-[#5E5E5E] mb-4">
        Buy or sell <span className="font-mono text-white">p{tokenSymbol}</span> tokens on the secondary market.
      </p>

      <div className="flex gap-3">
        <button onClick={handleBuy} className="btn-brand flex-1 flex items-center justify-center gap-2 py-3">
          Buy
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </button>
        <button onClick={handleSell} className="btn-brand-outline flex-1 flex items-center justify-center gap-2 py-3">
          Sell
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-[#5E5E5E] mt-3 text-center">Opens Uniswap in a new tab</p>
    </div>
  );
};

export default UniswapWidget;
