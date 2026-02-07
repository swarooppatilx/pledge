"use client";

import React, { useState } from "react";
import { formatEther, parseEther } from "viem";
import { ArrowDownIcon } from "@heroicons/react/24/outline";

// Helper to format ETH values with reasonable precision
const formatEthValue = (value: bigint, decimals: number = 6): string => {
  const ethValue = Number(formatEther(value));
  if (ethValue === 0) return "0";
  if (ethValue < 0.000001) return "<0.000001";
  if (ethValue < 1) return ethValue.toFixed(decimals);
  if (ethValue < 1000) return ethValue.toFixed(4);
  return ethValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

type SwapWidgetProps = {
  /** Token being sold */
  fromToken: {
    symbol: string;
    balance: bigint;
    icon?: React.ReactNode;
  };
  /** Token being bought */
  toToken: {
    symbol: string;
    balance?: bigint;
    icon?: React.ReactNode;
  };
  /** Current exchange rate (fromToken per toToken) */
  exchangeRate?: number;
  /** Called when swap is initiated */
  onSwap: (amount: bigint) => Promise<void>;
  /** Whether a swap is in progress */
  isPending?: boolean;
  /** Additional class names */
  className?: string;
  /** Button label */
  buttonLabel?: string;
  /** Disabled state */
  disabled?: boolean;
};

/**
 * Swap Widget Component
 * Uniswap v4 themed swap interface
 * Uses #FF007A brand color and #0D0D0D background
 */
export const SwapWidget = ({
  fromToken,
  toToken,
  exchangeRate,
  onSwap,
  isPending = false,
  className = "",
  buttonLabel = "Swap",
  disabled = false,
}: SwapWidgetProps) => {
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");

  const handleInputChange = (value: string) => {
    setInputAmount(value);
    if (exchangeRate && value) {
      const output = parseFloat(value) * exchangeRate;
      setOutputAmount(output.toFixed(8));
    } else {
      setOutputAmount("");
    }
  };

  const handleSwap = async () => {
    if (!inputAmount) return;
    try {
      const amount = parseEther(inputAmount);
      await onSwap(amount);
      setInputAmount("");
      setOutputAmount("");
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  const insufficientBalance = inputAmount ? parseEther(inputAmount) > fromToken.balance : false;
  const isDisabled = disabled || isPending || !inputAmount || insufficientBalance;

  return (
    <div className={`swap-widget ${className}`}>
      {/* From Token Input */}
      <div className="swap-input-container">
        <div className="flex justify-between items-center mb-2">
          <span className="text-label">You pay</span>
          <span className="text-xs text-text-muted">
            Balance: {formatEthValue(fromToken.balance)} {fromToken.symbol}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="0"
            value={inputAmount}
            onChange={e => handleInputChange(e.target.value)}
            className="swap-input flex-1"
            step="any"
          />
          <div className="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-xl">
            {fromToken.icon}
            <span className="font-medium">{fromToken.symbol}</span>
          </div>
        </div>
        {insufficientBalance && <span className="text-xs text-danger mt-1">Insufficient balance</span>}
      </div>

      {/* Swap Direction Arrow */}
      <div className="flex justify-center -my-2 relative z-10">
        <div className="bg-base-300 border-4 border-base-100 rounded-xl p-2">
          <ArrowDownIcon className="w-4 h-4 text-text-muted" />
        </div>
      </div>

      {/* To Token Output */}
      <div className="swap-input-container">
        <div className="flex justify-between items-center mb-2">
          <span className="text-label">You receive</span>
          {toToken.balance !== undefined && (
            <span className="text-xs text-text-muted">
              Balance: {formatEthValue(toToken.balance)} {toToken.symbol}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="0"
            value={outputAmount}
            readOnly
            className="swap-input flex-1 text-text-muted"
          />
          <div className="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-xl">
            {toToken.icon}
            <span className="font-medium">{toToken.symbol}</span>
          </div>
        </div>
      </div>

      {/* Exchange Rate */}
      {exchangeRate && inputAmount && (
        <div className="text-xs text-text-muted text-center mt-3">
          1 {fromToken.symbol} = {exchangeRate.toFixed(6)} {toToken.symbol}
        </div>
      )}

      {/* Swap Button */}
      <button onClick={handleSwap} disabled={isDisabled} className="swap-button mt-4">
        {isPending ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : insufficientBalance ? (
          "Insufficient Balance"
        ) : (
          buttonLabel
        )}
      </button>
    </div>
  );
};

export default SwapWidget;
