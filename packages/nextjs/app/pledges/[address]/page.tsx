"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowLeftIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import {
  ProjectAvatar,
  IcoLockBadge,
  SimulatedYieldTicker,
  FounderShareCard,
  UniswapWidget,
} from "~~/components/ui";
import {
  useBuyTreasuryStock,
  useClaimRewards,
  useContribute,
  useDepositDividend,
  useFounderShare,
  useHarvestYield,
  useHolderInfo,
  usePledgeSummaries,
  usePledgeYieldStats,
  useRedeem,
  useRefund,
} from "~~/hooks/usePledge";
import {
  PledgeStatus,
  calculateProgress,
  isDeadlinePassed,
  timeRemaining,
} from "~~/types/pledge";

// Helper to format ETH values with reasonable precision
const formatEthValue = (value: bigint, decimals: number = 6): string => {
  const ethValue = Number(formatEther(value));
  if (ethValue === 0) return "0";
  if (ethValue < 0.000001) return "<0.000001";
  if (ethValue < 1) return ethValue.toFixed(decimals);
  if (ethValue < 1000) return ethValue.toFixed(4);
  return ethValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const PledgeDetailPage: NextPage = () => {
  const params = useParams();
  const pledgeAddress = params.address as `0x${string}`;
  const { address: connectedAddress } = useAccount();

  const { summaries, isLoading } = usePledgeSummaries([pledgeAddress]);
  const pledge = summaries[0];

  const { holderInfo, refetch: refetchHolder } = useHolderInfo(pledgeAddress);
  const {
    accruedYield,
    totalYieldHarvested,
    floorPrice,
    icoPrice,
    refetch: refetchYield,
  } = usePledgeYieldStats(pledgeAddress);
  
  // Track founder share changes
  const {
    currentPercentage: founderSharePct,
    previousPercentage: prevFounderSharePct,
    trend: founderTrend,
    changeAmount: founderChangeAmt,
    isLoading: founderLoading,
  } = useFounderShare(
    pledge?.token as `0x${string}`,
    pledge?.creator as `0x${string}`
  );
  
  const { contribute, isPending: isContributing } = useContribute();
  const { redeem, isPending: isRedeeming } = useRedeem();
  const { claim, isPending: isClaiming } = useClaimRewards();
  const { harvest, isPending: isHarvesting } = useHarvestYield();
  const { refund, isPending: isRefunding } = useRefund();
  const { deposit, isPending: isDepositing } = useDepositDividend();
  const { buyTreasuryStock, isPending: isBuyingTreasury } = useBuyTreasuryStock();

  const [contributeAmount, setContributeAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [dividendAmount, setDividendAmount] = useState("");
  const [treasuryBuyAmount, setTreasuryBuyAmount] = useState("");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0D0D0D]">
        <span className="loading loading-spinner loading-lg text-[#FF007A]"></span>
      </div>
    );
  }

  if (!pledge) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-6">
        <div className="card-pledge p-8 text-center max-w-md">
          <h1 className="text-h1 mb-4">Pledge Not Found</h1>
          <p className="text-[#5E5E5E] mb-6">The pledge you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/pledges" className="btn-brand">
            Back to Pledges
          </Link>
        </div>
      </div>
    );
  }

  // Calculate treasury recycling percentage (used for future features)
  const TOTAL_SUPPLY = BigInt(1_000_000) * BigInt(1e18);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _treasuryPercent = Number(pledge.treasuryShares * 100n / TOTAL_SUPPLY);

  const handleContribute = async () => {
    if (!contributeAmount) return;
    await contribute(pledgeAddress, parseEther(contributeAmount));
    setContributeAmount("");
  };

  const handleRedeem = async () => {
    if (!redeemAmount) return;
    await redeem(pledgeAddress, parseEther(redeemAmount));
    setRedeemAmount("");
    refetchHolder();
    refetchYield();
  };

  const handleClaim = async () => {
    await claim(pledgeAddress);
    refetchHolder();
    refetchYield();
  };

  const handleHarvest = async () => {
    await harvest(pledgeAddress);
    refetchYield();
    refetchHolder();
  };

  const handleRefund = async () => {
    await refund(pledgeAddress);
    refetchHolder();
  };

  const handleDepositDividend = async () => {
    if (!dividendAmount) return;
    await deposit(pledgeAddress, parseEther(dividendAmount));
    setDividendAmount("");
    refetchYield();
  };

  const handleBuyTreasuryStock = async () => {
    if (!treasuryBuyAmount || !pledge) return;
    const shares = parseEther(treasuryBuyAmount);
    // Calculate cost based on floor price
    const cost = pledge.circulatingSupply > 0n ? (shares * pledge.vaultBalance) / pledge.circulatingSupply : 0n;
    // Add 1% buffer for price movement
    const costWithBuffer = cost + cost / 100n;
    await buyTreasuryStock(pledgeAddress, shares, costWithBuffer);
    setTreasuryBuyAmount("");
    refetchHolder();
    refetchYield();
  };

  const progress = calculateProgress(pledge.totalRaised, pledge.fundingGoal);
  const isFunding = pledge.status === PledgeStatus.Funding;
  const isActive = pledge.status === PledgeStatus.Active;
  const isFailed = pledge.status === PledgeStatus.Failed;

  return (
    <div className="min-h-screen bg-[#0D0D0D] page-enter">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href="/pledges"
          className="inline-flex items-center gap-2 text-[#5E5E5E] hover:text-white transition-colors mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Pledges
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex items-start gap-4">
            <ProjectAvatar
              address={pledgeAddress}
              name={pledge.name}
              size="xl"
            />
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-display">{pledge.name}</h1>
                {isFunding && <IcoLockBadge />}
                {isActive && (
                  <span className="tag-success flex items-center gap-1">
                    <SparklesIcon className="h-3 w-3" />
                    Active
                  </span>
                )}
                {isFailed && (
                  <span className="tag bg-[rgba(255,67,67,0.1)] text-[#FF4343]">Failed</span>
                )}
              </div>
              <span className="text-[#5E5E5E] text-lg font-mono">p{pledge.ticker}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-label mb-1">Token Contract</div>
            <Address address={pledge.token} />
          </div>
        </div>

        {/* Main Grid - Project Detail Layout (8:4 split) */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column (8 cols) - Project Info */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Progress Card */}
            <div className="card-pledge">
              <h2 className="text-h2 mb-4">Funding Progress</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-display font-semibold">{formatEthValue(pledge.totalRaised)} ETH</span>
                  <span className="text-muted">of {formatEthValue(pledge.fundingGoal)} ETH</span>
                </div>
                <div className="h-3 bg-[#1B1B1B] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#FF007A] to-[#FF5CAA] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-label text-muted">
                  <span>{progress.toFixed(1)}% funded</span>
                  <span>{timeRemaining(pledge.deadline)}</span>
                </div>
              </div>
            </div>

            {/* Founder Share Card with Trend */}
            <FounderShareCard
              founderAddress={pledge.creator}
              currentPercentage={founderSharePct}
              previousPercentage={prevFounderSharePct}
              trend={founderTrend}
              changeAmount={founderChangeAmt}
              isLoading={founderLoading}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="card-pledge p-4">
                <div className="text-label text-muted mb-1">Vault Balance</div>
                <div className="text-h2 font-mono">{formatEthValue(pledge.vaultBalance)} ETH</div>
              </div>
              <div className="card-pledge p-4">
                <div className="text-label text-muted mb-1">Circulating</div>
                <div className="text-h2 font-mono">{Number(pledge.circulatingSupply / BigInt(1e15)) / 1000}M</div>
              </div>
              <div className="card-pledge p-4">
                <div className="text-label text-muted mb-1">Treasury Stock</div>
                <div className="text-h2 font-mono">{Number(pledge.treasuryShares / BigInt(1e15)) / 1000}M</div>
              </div>
            </div>

            {/* Yield & Price Stats */}
            {isActive && (
              <div className="card-pledge">
                <div className="flex items-center gap-2 mb-6">
                  <SparklesIcon className="h-5 w-5 text-[#FF007A]" />
                  <h2 className="text-h2">Yield & Pricing</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#1B1B1B] rounded-xl p-4 border border-[#222222]">
                    <div className="text-label text-muted mb-1">ICO Price</div>
                    <div className="text-h2 font-mono text-white">{icoPrice > 0n ? formatEthValue(icoPrice, 8) : "0"}</div>
                    <div className="text-label text-muted">ETH per share</div>
                  </div>
                  <div className="bg-[#1B1B1B] rounded-xl p-4 border border-[#222222]">
                    <div className="text-label text-muted mb-1">Floor Price</div>
                    <div className="text-h2 font-mono text-[#27AE60]">{floorPrice > 0n ? formatEthValue(floorPrice, 8) : "0"}</div>
                    <div className="text-label text-muted">ETH per share</div>
                  </div>
                  <div className="bg-[#1B1B1B] rounded-xl p-4 border border-[#27AE60]/30">
                    <div className="text-label text-muted mb-1">Accrued Yield</div>
                    <div className="text-h2">
                      <SimulatedYieldTicker baseValue={accruedYield} />
                    </div>
                    <div className="text-label text-muted">ETH (unharvested)</div>
                  </div>
                  <div className="bg-[#1B1B1B] rounded-xl p-4 border border-[#222222]">
                    <div className="text-label text-muted mb-1">Total Harvested</div>
                    <div className="text-h2 font-mono text-white">{formatEthValue(totalYieldHarvested)}</div>
                    <div className="text-label text-muted">ETH (all time)</div>
                  </div>
                </div>

                {/* Harvest Button */}
                <div className="mt-6 flex items-center gap-4">
                  <button
                    className="btn-brand px-6 py-3 flex items-center gap-2"
                    onClick={handleHarvest}
                    disabled={isHarvesting || accruedYield < BigInt(1e15)}
                  >
                    {isHarvesting ? <span className="loading loading-spinner loading-sm"></span> : "Harvest Yield"}
                  </button>
                  <span className="text-label text-muted">
                    {accruedYield >= BigInt(1e15)
                      ? `${formatEthValue(accruedYield)} ETH ready to harvest (80% to holders, 20% to protocol)`
                      : "Min 0.001 ETH required to harvest"}
                  </span>
                </div>
              </div>
            )}

            {/* Creator Card */}
            <div className="card-pledge">
              <h2 className="text-h2 mb-4">Created By</h2>
              <div className="flex items-center gap-4">
                <Address address={pledge.creator} format="long" />
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) - Actions */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Deadline Passed Warning for Funding pledges */}
          {isFunding && isDeadlinePassed(pledge.deadline) && pledge.totalRaised < pledge.fundingGoal && (
            <div className="card-pledge border-[#F2994A]/30">
              <div className="flex items-center gap-2 text-[#F2994A] mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-h2">Deadline Passed</h2>
              </div>
              <p className="text-body text-muted mb-4">
                This pledge did not reach its funding goal before the deadline. The status will update to
                &quot;Failed&quot; when anyone interacts with the contract.
              </p>
              <p className="text-label text-muted">Contributors will be able to claim full refunds.</p>
            </div>
          )}

          {/* Contribute Card */}
          {isFunding && !isDeadlinePassed(pledge.deadline) && (
            <div className="card-pledge">
              <h2 className="text-h2 mb-2">Contribute</h2>
              <p className="text-label text-muted mb-4">Buy shares at the fixed ICO price</p>

              {/* Remaining to goal */}
              <div className="bg-[#1B1B1B] rounded-xl p-4 mb-4 border border-[#FF007A]/20">
                <div className="flex justify-between text-body">
                  <span className="text-muted">Remaining to goal:</span>
                  <span className="font-mono text-white">{formatEthValue(pledge.fundingGoal - pledge.totalRaised)} ETH</span>
                </div>
                {icoPrice > 0n && (
                  <div className="flex justify-between text-label text-muted mt-2">
                    <span>Price per share:</span>
                    <span className="font-mono">{formatEthValue(icoPrice)} ETH</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-label text-muted">Amount (ETH)</span>
                  <button
                    className="text-label text-[#FF007A] hover:text-[#FF5CAA] transition-colors"
                    onClick={() => setContributeAmount(formatEther(pledge.fundingGoal - pledge.totalRaised))}
                  >
                    Max
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="0.1"
                  className="input-pledge w-full"
                  value={contributeAmount}
                  onChange={e => setContributeAmount(e.target.value)}
                />
              </div>

              {contributeAmount && icoPrice > 0n && (
                <p className="text-label text-[#27AE60] mt-3">
                  ≈ {Number(parseEther(contributeAmount || "0") / icoPrice).toLocaleString()} shares
                </p>
              )}

              <button
                className="btn-brand w-full mt-4"
                onClick={handleContribute}
                disabled={isContributing || !contributeAmount || !connectedAddress}
              >
                {isContributing ? <span className="loading loading-spinner"></span> : "Contribute"}
              </button>

              {!connectedAddress && (
                <p className="text-label text-[#F2994A] mt-3 text-center">Connect wallet to contribute</p>
              )}
            </div>
          )}

          {/* Active Actions */}
          {isActive && (
            <>
              {/* Uniswap Trading Widget */}
              <UniswapWidget
                tokenAddress={pledge.token}
                tokenSymbol={pledge.ticker}
                isActive={isActive}
              />

              {/* Claim Rewards */}
              <div className="card-pledge">
                <h2 className="text-h2 mb-2">Claim Rewards</h2>
                <p className="text-label text-muted mb-4">Claim your yield and dividends</p>
                {holderInfo && (
                  <div className="bg-[#1B1B1B] rounded-xl p-4 mb-4 border border-[#27AE60]/30">
                    <div className="flex justify-between items-center">
                      <span className="text-label text-muted">Pending</span>
                      <span className="font-mono text-[#27AE60] text-h2">{formatEthValue(holderInfo.pendingRewards)} ETH</span>
                    </div>
                  </div>
                )}

                <button
                  className="btn-brand w-full bg-[#27AE60] hover:bg-[#27AE60]/80"
                  onClick={handleClaim}
                  disabled={isClaiming || !connectedAddress || !holderInfo || holderInfo.pendingRewards === 0n}
                >
                  {isClaiming ? <span className="loading loading-spinner"></span> : "Claim Rewards"}
                </button>
              </div>

              {/* Redeem */}
              <div className="card-pledge border-[#F2994A]/30 relative overflow-hidden">
                
                <h2 className="text-h2 mb-2">Redeem Shares</h2>
                <p className="text-label text-muted mb-4">Exit at floor price (pro-rata vault assets)</p>

                {holderInfo && holderInfo.shareBalance > 0n && (
                  <p className="text-label text-muted mb-3">
                    You hold: <span className="font-mono text-white">{Number(holderInfo.shareBalance / BigInt(1e18)).toLocaleString()}</span> shares
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-label text-muted">Shares to Redeem</span>
                    {holderInfo && holderInfo.shareBalance > 0n && (
                      <button
                        className="text-label text-[#FF007A] hover:text-[#FF5CAA] transition-colors"
                        onClick={() => setRedeemAmount(formatEther(holderInfo.shareBalance))}
                      >
                        Max
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="1000"
                    className="input-pledge w-full"
                    value={redeemAmount}
                    onChange={e => setRedeemAmount(e.target.value)}
                  />
                </div>

                {redeemAmount && pledge.circulatingSupply > 0n && (
                  <p className="text-label text-[#27AE60] mt-3">
                    ≈{" "}
                    {formatEthValue((parseEther(redeemAmount || "0") * pledge.vaultBalance) / pledge.circulatingSupply)}{" "}
                    ETH
                  </p>
                )}

                <button
                  className="btn-brand w-full mt-4 bg-[#F2994A] hover:bg-[#F2994A]/80"
                  onClick={handleRedeem}
                  disabled={
                    isRedeeming || !redeemAmount || !connectedAddress || !holderInfo || holderInfo.shareBalance === 0n
                  }
                >
                  {isRedeeming ? <span className="loading loading-spinner"></span> : "Redeem"}
                </button>
              </div>

              {/* Buy Treasury Stock */}
              {pledge.treasuryShares > 0n && (
                <div className="card-pledge">
                  <h2 className="text-h2 mb-2">Buy Treasury Stock</h2>
                  <p className="text-label text-muted mb-4">Purchase recycled shares at floor price</p>

                  <div className="bg-[#1B1B1B] rounded-xl p-4 mb-4 border border-[#222222]">
                    <div className="flex justify-between items-center">
                      <span className="text-label text-muted">Available</span>
                      <span className="font-mono text-white">{Number(pledge.treasuryShares / BigInt(1e18)).toLocaleString()} shares</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-label text-muted">Shares to Buy</span>
                    <input
                      type="number"
                      placeholder="1000"
                      className="input-pledge w-full"
                      value={treasuryBuyAmount}
                      onChange={e => setTreasuryBuyAmount(e.target.value)}
                    />
                  </div>

                  {treasuryBuyAmount && pledge.circulatingSupply > 0n && (
                    <p className="text-label text-[#F2994A] mt-3">
                      Cost: ≈{" "}
                      {formatEthValue(
                        (parseEther(treasuryBuyAmount || "0") * pledge.vaultBalance) / pledge.circulatingSupply,
                      )}{" "}
                      ETH
                    </p>
                  )}

                  <button
                    className="btn-brand w-full mt-4"
                    onClick={handleBuyTreasuryStock}
                    disabled={isBuyingTreasury || !treasuryBuyAmount || !connectedAddress}
                  >
                    {isBuyingTreasury ? <span className="loading loading-spinner"></span> : "Buy Shares"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Failed State */}
          {isFailed && (
            <div className="card-pledge border-[#EB5757]/30">
              <h2 className="text-h2 text-[#EB5757] mb-3">Funding Failed</h2>
              <p className="text-body text-muted mb-4">
                This pledge did not reach its funding goal. Contributors can claim refunds.
              </p>
              {holderInfo && holderInfo.contribution > 0n && (
                <div className="bg-[#1B1B1B] rounded-xl p-4 mb-4 border border-[#EB5757]/20">
                  <div className="flex justify-between items-center">
                    <span className="text-label text-muted">Your contribution</span>
                    <span className="font-mono text-white">{formatEthValue(holderInfo.contribution)} ETH</span>
                  </div>
                </div>
              )}
              <button
                className="btn-brand w-full bg-[#EB5757] hover:bg-[#EB5757]/80"
                onClick={handleRefund}
                disabled={isRefunding || !connectedAddress || !holderInfo || holderInfo.contribution === 0n}
              >
                {isRefunding ? <span className="loading loading-spinner"></span> : "Claim Refund"}
              </button>
            </div>
          )}

          {/* Deposit Dividend - Creator Only */}
          {isActive && connectedAddress && pledge.creator.toLowerCase() === connectedAddress.toLowerCase() && (
            <div className="card-pledge border-[#27AE60]/30">
              <h2 className="text-h2 mb-2">Deposit Dividend</h2>
              <p className="text-label text-muted mb-4">
                As the creator, deposit revenue to distribute to shareholders
              </p>

              <div className="space-y-2">
                <span className="text-label text-muted">Amount (ETH)</span>
                <input
                  type="number"
                  placeholder="0.1"
                  className="input-pledge w-full"
                  value={dividendAmount}
                  onChange={e => setDividendAmount(e.target.value)}
                />
              </div>

              <button
                className="btn-brand w-full mt-4 bg-[#27AE60] hover:bg-[#27AE60]/80"
                onClick={handleDepositDividend}
                disabled={isDepositing || !dividendAmount}
              >
                {isDepositing ? <span className="loading loading-spinner"></span> : "Deposit Dividend"}
              </button>
            </div>
          )}

          {/* Your Position */}
          {connectedAddress && (
            <div className="card-pledge bg-[#131313]">
              <h2 className="text-h2 mb-4">Your Position</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-label text-muted">Shares Held</span>
                  <span className="font-mono text-white">
                    {holderInfo ? Number(holderInfo.shareBalance / BigInt(1e18)).toLocaleString() : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label text-muted">Contributed</span>
                  <span className="font-mono text-white">
                    {holderInfo ? `${formatEthValue(holderInfo.contribution)} ETH` : "-"}
                  </span>
                </div>
                <div className="border-t border-[#222222] my-2"></div>
                <div className="flex justify-between">
                  <span className="text-label text-muted">Pending Rewards</span>
                  <span className="font-mono text-[#27AE60] font-semibold">
                    {holderInfo ? `${formatEthValue(holderInfo.pendingRewards)} ETH` : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label text-muted">Redeemable Value</span>
                  <span className="font-mono text-[#F2994A]">
                    {holderInfo ? `${formatEthValue(holderInfo.redeemableValue)} ETH` : "-"}
                  </span>
                </div>
                <div className="border-t border-[#222222] my-2"></div>
                <div className="flex justify-between">
                  <span className="text-label text-muted">Ownership %</span>
                  <span className="font-mono text-white">
                    {holderInfo ? `${(Number(holderInfo.ownershipPercent) / 100).toFixed(4)}%` : "-"}
                  </span>
                </div>
                {holderInfo && holderInfo.shareBalance > 0n && floorPrice > 0n && (
                  <div className="flex justify-between">
                    <span className="text-label text-muted">Price per Share</span>
                    <span className="font-mono text-label">{formatEthValue(floorPrice, 8)} ETH</span>
                  </div>
                )}
              </div>

              {/* P&L Summary */}
              {holderInfo && holderInfo.contribution > 0n && (
                <div className="mt-4 p-4 bg-[#1B1B1B] rounded-xl border border-[#222222]">
                  <p className="text-label text-muted mb-2">Total Value (Redeemable + Pending)</p>
                  <p className="text-display font-semibold mb-2">
                    {formatEthValue(holderInfo.redeemableValue + holderInfo.pendingRewards)} ETH
                  </p>
                  {holderInfo.redeemableValue + holderInfo.pendingRewards > holderInfo.contribution ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#27AE60]/20 text-[#27AE60] rounded-lg text-label">
                      +{formatEthValue(holderInfo.redeemableValue + holderInfo.pendingRewards - holderInfo.contribution)} ETH profit
                    </span>
                  ) : holderInfo.redeemableValue + holderInfo.pendingRewards < holderInfo.contribution ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#EB5757]/20 text-[#EB5757] rounded-lg text-label">
                      -{formatEthValue(holderInfo.contribution - holderInfo.redeemableValue - holderInfo.pendingRewards)} ETH loss
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#5E5E5E]/20 text-[#9B9B9B] rounded-lg text-label">Break even</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Connect Wallet Prompt */}
          {!connectedAddress && (
            <div className="card-pledge bg-[#131313] text-center">
              <h2 className="text-h2 mb-2">Connect Wallet</h2>
              <p className="text-label text-muted mb-4">
                Connect your wallet to contribute, claim rewards, or redeem shares
              </p>
              <RainbowKitCustomConnectButton />
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default PledgeDetailPage;
