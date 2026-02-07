"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import {
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  ChartPieIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { StatBanner, ProjectAvatar } from "~~/components/ui";
import { PledgeTokenAbi } from "~~/contracts/implementationContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { PledgeStatus, getPhaseLabel } from "~~/types/pledge";

type PortfolioHolding = {
  pledge: `0x${string}`;
  token: `0x${string}`;
  name: string;
  ticker: string;
  status: number;
  userBalance: bigint;
  vaultBalance: bigint;
  treasuryShares: bigint;
  totalRaised: bigint;
  fundingGoal: bigint;
  ownershipPercent: number;
  redeemableValue: bigint;
  pendingRewards: bigint;
};

const PortfolioPage: NextPage = () => {
  const { isConnected, address } = useAccount();
  const [sortBy, setSortBy] = useState<"value" | "ownership" | "name">("value");

  // Get all pledges
  const { data: allSummaries, isLoading: summariesLoading } = useScaffoldReadContract({
    contractName: "PledgeFactory",
    functionName: "getAllSummaries",
    watch: true,
  });

  // Build contract calls to check user's balance for each pledge's token
  const tokenBalanceCalls =
    allSummaries?.map(pledge => ({
      address: pledge.token as `0x${string}`,
      abi: PledgeTokenAbi,
      functionName: "balanceOf",
      args: [address],
    })) ?? [];

  const { data: balances, isLoading: balancesLoading } = useReadContracts({
    contracts: tokenBalanceCalls,
    query: {
      enabled: !!allSummaries && allSummaries.length > 0 && !!address,
    },
  });

  const isLoading = summariesLoading || balancesLoading;

  // Calculate portfolio holdings
  const holdings: PortfolioHolding[] = useMemo(() => {
    if (!allSummaries || !balances) return [];

    return allSummaries
      .map((pledge, index) => {
        const userBalance = (balances[index]?.result as bigint) ?? 0n;
        if (userBalance === 0n) return null;

        const totalSupply = BigInt(1_000_000) * BigInt(1e18);
        const circulatingSupply = totalSupply - pledge.treasuryShares;
        const ownershipPercent = circulatingSupply > 0n ? Number((userBalance * 10000n) / circulatingSupply) / 100 : 0;
        const redeemableValue = circulatingSupply > 0n ? (userBalance * pledge.vaultBalance) / circulatingSupply : 0n;

        return {
          pledge: pledge.pledge as `0x${string}`,
          token: pledge.token as `0x${string}`,
          name: pledge.name,
          ticker: pledge.ticker,
          status: Number(pledge.status),
          userBalance,
          vaultBalance: pledge.vaultBalance,
          treasuryShares: pledge.treasuryShares,
          totalRaised: pledge.totalRaised,
          fundingGoal: pledge.fundingGoal,
          ownershipPercent,
          redeemableValue,
          pendingRewards: 0n, // Would need to fetch from contract
        };
      })
      .filter((h): h is PortfolioHolding => h !== null);
  }, [allSummaries, balances]);

  // Sort holdings
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      switch (sortBy) {
        case "value":
          return Number(b.redeemableValue - a.redeemableValue);
        case "ownership":
          return b.ownershipPercent - a.ownershipPercent;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [holdings, sortBy]);

  // Portfolio stats
  const totalValue = holdings.reduce((sum, h) => sum + h.redeemableValue, 0n);
  const totalShares = holdings.reduce((sum, h) => sum + h.userBalance, 0n);
  const activeHoldings = holdings.filter(h => h.status === PledgeStatus.Active).length;
  const fundingHoldings = holdings.filter(h => h.status === PledgeStatus.Funding).length;

  // Show loading state first - before checking wallet connection
  if (isLoading && isConnected) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-[#FF007A]"></span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-6 page-enter">
        <div className="card-pledge max-w-md w-full p-8 text-center">
          {/* Uniswap-style abstract pattern placeholder */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[rgba(255,0,122,0.08)] flex items-center justify-center">
            <WalletIcon className="h-12 w-12 text-[#FF007A]" />
          </div>
          <h2 className="text-h1 mb-3">Connect a wallet to view your portfolio</h2>
          <p className="text-[#5E5E5E] mb-6">Track your investments, claim rewards, and manage your positions</p>
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] page-enter">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Summary */}
        <div className="text-center mb-12">
          <h1 className="text-label mb-2">Portfolio Value</h1>
          <div className="text-price-big text-white mb-2">
            {parseFloat(formatEther(totalValue)).toFixed(4)} ETH
          </div>
          <div className="text-sm text-[#5E5E5E]">
            {holdings.length} holding{holdings.length !== 1 ? "s" : ""} across pledges
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mb-12">
          <Link href="/pledges" className="btn-brand flex items-center gap-2 px-6">
            <ArrowUpRightIcon className="h-4 w-4" />
            Explore Pledges
          </Link>
        </div>

        {/* Tabs */}
        <div className="filter-tabs mb-8 justify-center">
          <button className="filter-tab active">Overview</button>
          <button className="filter-tab">Tokens (Equity)</button>
          <button className="filter-tab">Activity</button>
        </div>

        {/* Portfolio Stats */}
        <StatBanner
          items={[
            { label: "Total Value", value: `${parseFloat(formatEther(totalValue)).toFixed(4)} ETH`, trend: "Redeemable", trendType: "neutral" },
            { label: "Holdings", value: String(holdings.length), trend: `${activeHoldings} active`, trendType: "positive" },
            { label: "Total Shares", value: Number(totalShares / BigInt(1e18)).toLocaleString(), trend: "Across pledges", trendType: "neutral" },
          ]}
          className="mb-8"
        />

        {/* Sort Controls */}
        {holdings.length > 0 && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-h2">Your Holdings</h2>
            <select
              className="bg-[#131313] border border-[#222222] rounded-[12px] px-3 py-2 text-sm text-[#9B9B9B] focus:outline-none focus:border-[#333333]"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="value">Sort by Value</option>
              <option value="ownership">Sort by Ownership %</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-16">
            <span className="loading loading-spinner loading-lg text-[#FF007A]"></span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && holdings.length === 0 && (
          <div className="card-pledge text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[rgba(255,0,122,0.08)] flex items-center justify-center">
              <ChartPieIcon className="h-12 w-12 text-[#FF007A]" />
            </div>
            <h3 className="text-h1 mb-2">No Holdings Yet</h3>
            <p className="text-[#5E5E5E] mb-6">You haven&apos;t invested in any pledges yet. Start exploring!</p>
            <Link href="/pledges" className="btn-brand inline-flex items-center gap-2">
              Explore Pledges
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Holdings Table - Uniswap Style */}
        {!isLoading && holdings.length > 0 && (
          <div className="space-y-3">
            {sortedHoldings.map(holding => {
              const statusColors = {
                [PledgeStatus.Funding]: "tag-ico-lock",
                [PledgeStatus.Active]: "tag-success",
                [PledgeStatus.Failed]: "bg-[rgba(255,67,67,0.1)] text-[#FF4343]",
              };
              
              return (
                <Link
                  key={holding.pledge}
                  href={`/pledges/${holding.pledge}`}
                  className="card-pledge p-5 flex items-center justify-between gap-4 hover:border-[#333333] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <ProjectAvatar
                      address={holding.pledge}
                      name={holding.name}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-h2 text-white group-hover:text-[#FF007A] transition-colors">
                          {holding.name}
                        </span>
                        <span className={`tag ${statusColors[holding.status as PledgeStatus] || ""}`}>
                          {getPhaseLabel(holding.status)}
                        </span>
                      </div>
                      <span className="text-sm text-[#5E5E5E] font-mono">p{holding.ticker}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-label">Shares</div>
                      <div className="text-mono text-white">
                        {Number(holding.userBalance / BigInt(1e18)).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-label">Ownership</div>
                      <div className="text-mono text-[#9B9B9B]">
                        {holding.ownershipPercent.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div className="text-right min-w-[100px]">
                      <div className="text-label">Value</div>
                      <div className="text-mono text-[#27AE60] font-medium">
                        Ξ{parseFloat(formatEther(holding.redeemableValue)).toFixed(4)}
                      </div>
                    </div>
                    
                    <ArrowUpRightIcon className="h-5 w-5 text-[#5E5E5E] group-hover:text-white transition-colors" />
                  </div>
                </Link>
              );
            })}
            
            {/* Total Row */}
            <div className="card-pledge p-5 flex items-center justify-between bg-[#1B1B1B]">
              <span className="text-h2 text-white">Total</span>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-label">Shares</div>
                  <div className="text-mono text-white font-semibold">
                    {Number(totalShares / BigInt(1e18)).toLocaleString()}
                  </div>
                </div>
                <div className="text-right w-[80px]"></div>
                <div className="text-right min-w-[100px]">
                  <div className="text-label">Value</div>
                  <div className="text-mono text-[#27AE60] font-semibold text-lg">
                    Ξ{parseFloat(formatEther(totalValue)).toFixed(4)}
                  </div>
                </div>
                <div className="w-5"></div>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Breakdown by Status */}
        {!isLoading && holdings.length > 0 && (
          <div className="mt-12">
            <h2 className="text-h2 mb-6">Portfolio Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Active */}
              <div className="card-pledge p-6 border-l-4 border-l-[#27AE60]">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-[#27AE60]" />
                  <span className="text-[#27AE60] font-medium">Active Pledges</span>
                </div>
                <p className="text-display text-white">{activeHoldings}</p>
                <p className="text-sm text-[#5E5E5E] mt-1">
                  Ξ{parseFloat(formatEther(
                    holdings
                      .filter(h => h.status === PledgeStatus.Active)
                      .reduce((sum, h) => sum + h.redeemableValue, 0n),
                  )).toFixed(4)}
                </p>
              </div>

              {/* Funding */}
              <div className="card-pledge p-6 border-l-4 border-l-[#F59E0B]">
                <div className="flex items-center gap-2 mb-3">
                  <BanknotesIcon className="h-5 w-5 text-[#F59E0B]" />
                  <span className="text-[#F59E0B] font-medium">Funding Phase</span>
                </div>
                <p className="text-display text-white">{fundingHoldings}</p>
                <p className="text-sm text-[#5E5E5E] mt-1">
                  Ξ{parseFloat(formatEther(
                    holdings
                      .filter(h => h.status === PledgeStatus.Funding)
                      .reduce((sum, h) => sum + h.redeemableValue, 0n),
                  )).toFixed(4)}
                </p>
              </div>

              {/* Failed */}
              <div className="card-pledge p-6 border-l-4 border-l-[#FF4343]">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowDownIcon className="h-5 w-5 text-[#FF4343]" />
                  <span className="text-[#FF4343] font-medium">Failed (Refundable)</span>
                </div>
                <p className="text-display text-white">
                  {holdings.filter(h => h.status === PledgeStatus.Failed).length}
                </p>
                <p className="text-sm text-[#5E5E5E] mt-1">Claim refunds on pledge pages</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioPage;
