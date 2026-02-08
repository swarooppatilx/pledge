"use client";

import React from "react";
import { RedeemWarning } from "./Badges";
import { SimulatedYieldTicker, YieldTicker } from "./YieldTicker";
import { formatEther } from "viem";

// Helper to format ETH values with reasonable precision
const formatEthValue = (value: bigint, decimals: number = 6): string => {
  const ethValue = Number(formatEther(value));
  if (ethValue === 0) return "0";
  if (ethValue < 0.000001) return "<0.000001";
  if (ethValue < 1) return ethValue.toFixed(decimals);
  if (ethValue < 1000) return ethValue.toFixed(4);
  return ethValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

type RewardCardProps = {
  /** Unclaimed dividends (wei) */
  unclaimedDividends: bigint;
  /** Accrued Aave yield (wei) */
  accruedYield: bigint;
  /** Whether to animate yield (simulate real-time accrual) */
  animateYield?: boolean;
  /** Called when claim is initiated */
  onClaim?: () => Promise<void>;
  /** Whether claiming is in progress */
  isClaiming?: boolean;
  className?: string;
};

/**
 * Reward Card Component
 * Displays unclaimed dividends + accrued Aave yield
 * Critical UX: Animated yield ticker that increases in real-time
 */
export const RewardCard = ({
  unclaimedDividends,
  accruedYield,
  animateYield = true,
  onClaim,
  isClaiming = false,
  className = "",
}: RewardCardProps) => {
  const totalRewards = unclaimedDividends + accruedYield;
  const hasRewards = totalRewards > 0n;

  return (
    <div className={`card-pledge p-6 ${className}`}>
      <h3 className="text-h2 mb-4">Your Rewards</h3>

      <div className="space-y-4">
        {/* Unclaimed Dividends */}
        <div className="flex justify-between items-center">
          <span className="text-text-body">Unclaimed Dividends</span>
          <span className="text-mono font-medium text-text-hero">Ξ{formatEthValue(unclaimedDividends)}</span>
        </div>

        {/* Accrued Yield - Animated */}
        <div className="flex justify-between items-center">
          <span className="text-text-body">Aave Yield</span>
          <div className="text-mono font-medium">
            {animateYield ? (
              <SimulatedYieldTicker baseValue={accruedYield} precision={6} />
            ) : (
              <YieldTicker value={accruedYield} precision={6} />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-subtle pt-4">
          <div className="flex justify-between items-center">
            <span className="text-text-hero font-semibold">Total Claimable</span>
            <span className="text-price-big text-primary">Ξ{formatEthValue(totalRewards)}</span>
          </div>
        </div>

        {/* Claim Button */}
        {onClaim && (
          <button onClick={onClaim} disabled={!hasRewards || isClaiming} className="btn-brand w-full mt-4">
            {isClaiming ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : hasRewards ? (
              "Claim Rewards"
            ) : (
              "No Rewards to Claim"
            )}
          </button>
        )}
      </div>
    </div>
  );
};

type RedeemCardProps = {
  /** User's token balance */
  balance: bigint;
  /** Token symbol */
  symbol: string;
  /** Floor price per token (wei) */
  floorPrice: bigint;
  /** Called when redeem is initiated */
  onRedeem: (amount: bigint) => Promise<void>;
  /** Whether redeeming is in progress */
  isRedeeming?: boolean;
  className?: string;
};

/**
 * Redeem Card Component
 * Exit to Vault logic with warning overlay
 */
export const RedeemCard = ({
  balance,
  symbol,
  floorPrice,
  onRedeem,
  isRedeeming = false,
  className = "",
}: RedeemCardProps) => {
  const [redeemAmount, setRedeemAmount] = React.useState("");

  const estimatedValue = redeemAmount
    ? (BigInt(Math.floor(parseFloat(redeemAmount) * 1e18)) * floorPrice) / BigInt(1e18)
    : 0n;

  const handleRedeem = async () => {
    if (!redeemAmount) return;
    const amount = BigInt(Math.floor(parseFloat(redeemAmount) * 1e18));
    await onRedeem(amount);
    setRedeemAmount("");
  };

  const handleMax = () => {
    setRedeemAmount(formatEther(balance));
  };

  return (
    <div className={`card-pledge p-6 ${className}`}>
      <h3 className="text-h2 mb-4">Redeem Shares</h3>

      {/* Warning */}
      <RedeemWarning className="mb-4" />

      {/* Balance */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-label">Your Balance</span>
        <span className="text-text-body text-mono">
          {formatEthValue(balance, 2)} {symbol}
        </span>
      </div>

      {/* Input */}
      <div className="swap-input-container mb-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="0"
            value={redeemAmount}
            onChange={e => setRedeemAmount(e.target.value)}
            className="swap-input flex-1"
            step="any"
          />
          <button onClick={handleMax} className="text-xs text-primary hover:text-primary-hover transition-colors">
            MAX
          </button>
        </div>
      </div>

      {/* Estimated Value */}
      {redeemAmount && (
        <div className="flex justify-between items-center mb-4 text-sm">
          <span className="text-text-muted">You will receive</span>
          <span className="text-mono text-text-hero">Ξ{formatEthValue(estimatedValue)}</span>
        </div>
      )}

      {/* Redeem Button */}
      <button
        onClick={handleRedeem}
        disabled={!redeemAmount || isRedeeming || parseFloat(redeemAmount) <= 0}
        className="btn btn-error w-full"
      >
        {isRedeeming ? <span className="loading loading-spinner loading-sm"></span> : "Redeem & Exit"}
      </button>
    </div>
  );
};

export default RewardCard;
