"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import {
  useBuyTreasuryStock,
  useClaimRewards,
  useContribute,
  useDepositDividend,
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
  formatBps,
  isDeadlinePassed,
  statusToColor,
  statusToString,
  timeRemaining,
} from "~~/types/pledge";

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
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!pledge) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pledge Not Found</h1>
          <Link href="/pledges" className="btn btn-primary">
            Back to Pledges
          </Link>
        </div>
      </div>
    );
  }

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
    <div className="container mx-auto px-4 py-8">
      {/* Back Link */}
      <Link href="/pledges" className="btn btn-ghost btn-sm mb-4">
        ← Back to Pledges
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold">{pledge.name}</h1>
            <span className={`badge badge-lg ${statusToColor(pledge.status)}`}>{statusToString(pledge.status)}</span>
          </div>
          <p className="text-xl text-base-content/60 mt-1">p{pledge.ticker}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-base-content/60">Token Contract</p>
          <Address address={pledge.token} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Funding Progress</h2>

              <div className="mt-4">
                <div className="flex justify-between text-lg mb-2">
                  <span className="font-bold">{formatEther(pledge.totalRaised)} ETH</span>
                  <span className="text-base-content/60">of {formatEther(pledge.fundingGoal)} ETH</span>
                </div>
                <progress className="progress progress-primary w-full h-4" value={progress} max="100"></progress>
                <div className="flex justify-between mt-2 text-sm text-base-content/60">
                  <span>{progress.toFixed(1)}% funded</span>
                  <span>{timeRemaining(pledge.deadline)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">Founder Share</div>
              <div className="stat-value text-lg">{formatBps(pledge.founderShareBps)}</div>
            </div>
            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">Vault Balance</div>
              <div className="stat-value text-lg">{formatEther(pledge.vaultBalance)} ETH</div>
            </div>
            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">Circulating</div>
              <div className="stat-value text-lg">{Number(pledge.circulatingSupply / BigInt(1e15)) / 1000}M</div>
            </div>
            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">Treasury Stock</div>
              <div className="stat-value text-lg">{Number(pledge.treasuryShares / BigInt(1e15)) / 1000}M</div>
            </div>
          </div>

          {/* Yield & Price Stats */}
          {isActive && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">📈 Yield & Pricing</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="stat bg-primary/10 rounded-box p-4">
                    <div className="stat-title text-xs">ICO Price</div>
                    <div className="stat-value text-sm">{icoPrice > 0n ? formatEther(icoPrice) : "0"}</div>
                    <div className="stat-desc text-xs">ETH per share</div>
                  </div>
                  <div className="stat bg-success/10 rounded-box p-4">
                    <div className="stat-title text-xs">Floor Price</div>
                    <div className="stat-value text-sm">{floorPrice > 0n ? formatEther(floorPrice) : "0"}</div>
                    <div className="stat-desc text-xs">ETH per share</div>
                  </div>
                  <div className="stat bg-warning/10 rounded-box p-4">
                    <div className="stat-title text-xs">Accrued Yield</div>
                    <div className="stat-value text-sm">{formatEther(accruedYield)}</div>
                    <div className="stat-desc text-xs">ETH (unharvested)</div>
                  </div>
                  <div className="stat bg-info/10 rounded-box p-4">
                    <div className="stat-title text-xs">Total Harvested</div>
                    <div className="stat-value text-sm">{formatEther(totalYieldHarvested)}</div>
                    <div className="stat-desc text-xs">ETH (all time)</div>
                  </div>
                </div>

                {/* Harvest Button */}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    className="btn btn-outline btn-success"
                    onClick={handleHarvest}
                    disabled={isHarvesting || accruedYield < BigInt(1e15)}
                  >
                    {isHarvesting ? <span className="loading loading-spinner loading-sm"></span> : "🌾 Harvest Yield"}
                  </button>
                  <span className="text-sm text-base-content/60">
                    {accruedYield >= BigInt(1e15)
                      ? `${formatEther(accruedYield)} ETH ready to harvest (80% to holders, 20% to protocol)`
                      : "Min 0.001 ETH required to harvest"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Creator Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Created By</h2>
              <div className="flex items-center gap-4 mt-2">
                <Address address={pledge.creator} format="long" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Deadline Passed Warning for Funding pledges */}
          {isFunding && isDeadlinePassed(pledge.deadline) && pledge.totalRaised < pledge.fundingGoal && (
            <div className="card bg-warning/20 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-warning">⏰ Deadline Passed</h2>
                <p className="text-sm mb-4">
                  This pledge did not reach its funding goal before the deadline. The status will update to
                  &quot;Failed&quot; when anyone interacts with the contract.
                </p>
                <p className="text-xs text-base-content/60">Contributors will be able to claim full refunds.</p>
              </div>
            </div>
          )}

          {/* Contribute Card */}
          {isFunding && !isDeadlinePassed(pledge.deadline) && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">💎 Contribute</h2>
                <p className="text-sm text-base-content/60 mb-2">Buy shares at the fixed ICO price</p>

                {/* Remaining to goal */}
                <div className="bg-primary/10 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Remaining to goal:</span>
                    <span className="font-bold">{formatEther(pledge.fundingGoal - pledge.totalRaised)} ETH</span>
                  </div>
                  {icoPrice > 0n && (
                    <div className="flex justify-between text-xs text-base-content/60 mt-1">
                      <span>Price per share:</span>
                      <span>{formatEther(icoPrice)} ETH</span>
                    </div>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Amount (ETH)</span>
                    <button
                      className="label-text-alt link"
                      onClick={() => setContributeAmount(formatEther(pledge.fundingGoal - pledge.totalRaised))}
                    >
                      Max
                    </button>
                  </label>
                  <input
                    type="number"
                    placeholder="0.1"
                    className="input input-bordered"
                    value={contributeAmount}
                    onChange={e => setContributeAmount(e.target.value)}
                  />
                </div>

                {contributeAmount && icoPrice > 0n && (
                  <p className="text-xs text-success mt-2">
                    ≈ {Number(parseEther(contributeAmount || "0") / icoPrice).toLocaleString()} shares
                  </p>
                )}

                <button
                  className="btn btn-primary mt-4"
                  onClick={handleContribute}
                  disabled={isContributing || !contributeAmount || !connectedAddress}
                >
                  {isContributing ? <span className="loading loading-spinner"></span> : "Contribute"}
                </button>

                {!connectedAddress && (
                  <p className="text-xs text-warning mt-2 text-center">Connect wallet to contribute</p>
                )}
              </div>
            </div>
          )}

          {/* Active Actions */}
          {isActive && (
            <>
              {/* Claim Rewards */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Claim Rewards</h2>
                  <p className="text-sm text-base-content/60 mb-4">Claim your yield and dividends</p>
                  {holderInfo && (
                    <p className="text-sm mb-2">
                      Pending: <span className="font-bold">{formatEther(holderInfo.pendingRewards)} ETH</span>
                    </p>
                  )}

                  <button
                    className="btn btn-success"
                    onClick={handleClaim}
                    disabled={isClaiming || !connectedAddress || !holderInfo || holderInfo.pendingRewards === 0n}
                  >
                    {isClaiming ? <span className="loading loading-spinner"></span> : "Claim Rewards"}
                  </button>
                </div>
              </div>

              {/* Redeem */}
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Redeem Shares</h2>
                  <p className="text-sm text-base-content/60 mb-4">Exit at floor price (pro-rata vault assets)</p>

                  {holderInfo && holderInfo.shareBalance > 0n && (
                    <p className="text-xs text-base-content/60 mb-2">
                      You hold: {Number(holderInfo.shareBalance / BigInt(1e18)).toLocaleString()} shares
                    </p>
                  )}

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Shares to Redeem</span>
                      {holderInfo && holderInfo.shareBalance > 0n && (
                        <button
                          className="label-text-alt link"
                          onClick={() => setRedeemAmount(formatEther(holderInfo.shareBalance))}
                        >
                          Max
                        </button>
                      )}
                    </label>
                    <input
                      type="number"
                      placeholder="1000"
                      className="input input-bordered"
                      value={redeemAmount}
                      onChange={e => setRedeemAmount(e.target.value)}
                    />
                  </div>

                  {redeemAmount && pledge.circulatingSupply > 0n && (
                    <p className="text-xs text-success mt-2">
                      ≈{" "}
                      {formatEther((parseEther(redeemAmount || "0") * pledge.vaultBalance) / pledge.circulatingSupply)}{" "}
                      ETH
                    </p>
                  )}

                  <button
                    className="btn btn-warning mt-4"
                    onClick={handleRedeem}
                    disabled={
                      isRedeeming || !redeemAmount || !connectedAddress || !holderInfo || holderInfo.shareBalance === 0n
                    }
                  >
                    {isRedeeming ? <span className="loading loading-spinner"></span> : "Redeem"}
                  </button>
                </div>
              </div>

              {/* Buy Treasury Stock */}
              {pledge.treasuryShares > 0n && (
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title">🏦 Buy Treasury Stock</h2>
                    <p className="text-sm text-base-content/60 mb-4">Purchase recycled shares at floor price</p>

                    <p className="text-xs text-base-content/60 mb-2">
                      Available: {Number(pledge.treasuryShares / BigInt(1e18)).toLocaleString()} shares
                    </p>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Shares to Buy</span>
                      </label>
                      <input
                        type="number"
                        placeholder="1000"
                        className="input input-bordered"
                        value={treasuryBuyAmount}
                        onChange={e => setTreasuryBuyAmount(e.target.value)}
                      />
                    </div>

                    {treasuryBuyAmount && pledge.circulatingSupply > 0n && (
                      <p className="text-xs text-warning mt-2">
                        Cost: ≈{" "}
                        {formatEther(
                          (parseEther(treasuryBuyAmount || "0") * pledge.vaultBalance) / pledge.circulatingSupply,
                        )}{" "}
                        ETH
                      </p>
                    )}

                    <button
                      className="btn btn-info mt-4"
                      onClick={handleBuyTreasuryStock}
                      disabled={isBuyingTreasury || !treasuryBuyAmount || !connectedAddress}
                    >
                      {isBuyingTreasury ? <span className="loading loading-spinner"></span> : "Buy Shares"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Failed State */}
          {isFailed && (
            <div className="card bg-error/10 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-error">Funding Failed</h2>
                <p className="text-sm mb-4">
                  This pledge did not reach its funding goal. Contributors can claim refunds.
                </p>
                {holderInfo && holderInfo.contribution > 0n && (
                  <p className="text-sm mb-2">
                    Your contribution: <span className="font-bold">{formatEther(holderInfo.contribution)} ETH</span>
                  </p>
                )}
                <button
                  className="btn btn-error"
                  onClick={handleRefund}
                  disabled={isRefunding || !connectedAddress || !holderInfo || holderInfo.contribution === 0n}
                >
                  {isRefunding ? <span className="loading loading-spinner"></span> : "Claim Refund"}
                </button>
              </div>
            </div>
          )}

          {/* Deposit Dividend - Creator Only */}
          {isActive && connectedAddress && pledge.creator.toLowerCase() === connectedAddress.toLowerCase() && (
            <div className="card bg-accent/10 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">💰 Deposit Dividend</h2>
                <p className="text-sm text-base-content/60 mb-4">
                  As the creator, deposit revenue to distribute to shareholders
                </p>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Amount (ETH)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0.1"
                    className="input input-bordered"
                    value={dividendAmount}
                    onChange={e => setDividendAmount(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn-accent mt-4"
                  onClick={handleDepositDividend}
                  disabled={isDepositing || !dividendAmount}
                >
                  {isDepositing ? <span className="loading loading-spinner"></span> : "Deposit Dividend"}
                </button>
              </div>
            </div>
          )}

          {/* Your Position */}
          {connectedAddress && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">📊 Your Position</h2>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Shares Held</span>
                    <span className="font-mono">
                      {holderInfo ? Number(holderInfo.shareBalance / BigInt(1e18)).toLocaleString() : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Contributed</span>
                    <span className="font-mono">
                      {holderInfo ? `${formatEther(holderInfo.contribution)} ETH` : "-"}
                    </span>
                  </div>
                  <div className="divider my-1"></div>
                  <div className="flex justify-between text-success">
                    <span className="text-base-content/60">Pending Rewards</span>
                    <span className="font-mono font-bold">
                      {holderInfo ? `${formatEther(holderInfo.pendingRewards)} ETH` : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-warning">
                    <span className="text-base-content/60">Redeemable Value</span>
                    <span className="font-mono">
                      {holderInfo ? `${formatEther(holderInfo.redeemableValue)} ETH` : "-"}
                    </span>
                  </div>
                  <div className="divider my-1"></div>
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Ownership %</span>
                    <span className="font-mono">
                      {holderInfo ? `${(Number(holderInfo.ownershipPercent) / 100).toFixed(4)}%` : "-"}
                    </span>
                  </div>
                  {holderInfo && holderInfo.shareBalance > 0n && floorPrice > 0n && (
                    <div className="flex justify-between text-info">
                      <span className="text-base-content/60">Price per Share</span>
                      <span className="font-mono text-xs">{formatEther(floorPrice)} ETH</span>
                    </div>
                  )}
                </div>

                {/* P&L Summary */}
                {holderInfo && holderInfo.contribution > 0n && (
                  <div className="mt-4 p-3 bg-base-300 rounded-lg">
                    <p className="text-xs text-base-content/60 mb-1">Total Value (Redeemable + Pending)</p>
                    <p className="text-lg font-bold">
                      {formatEther(holderInfo.redeemableValue + holderInfo.pendingRewards)} ETH
                    </p>
                    {holderInfo.redeemableValue + holderInfo.pendingRewards > holderInfo.contribution ? (
                      <span className="badge badge-success badge-sm">
                        +{formatEther(holderInfo.redeemableValue + holderInfo.pendingRewards - holderInfo.contribution)}{" "}
                        ETH profit
                      </span>
                    ) : holderInfo.redeemableValue + holderInfo.pendingRewards < holderInfo.contribution ? (
                      <span className="badge badge-error badge-sm">
                        -{formatEther(holderInfo.contribution - holderInfo.redeemableValue - holderInfo.pendingRewards)}{" "}
                        ETH loss
                      </span>
                    ) : (
                      <span className="badge badge-neutral badge-sm">Break even</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connect Wallet Prompt */}
          {!connectedAddress && (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body items-center text-center">
                <h2 className="card-title">Connect Wallet</h2>
                <p className="text-sm text-base-content/60 mb-4">
                  Connect your wallet to contribute, claim rewards, or redeem shares
                </p>
                <RainbowKitCustomConnectButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PledgeDetailPage;
