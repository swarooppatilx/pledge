"use client";

import { useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowPathIcon, PlusIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { FilterTabs, IcoLockBadge, ProjectAvatar, RecycledTag, StatBanner } from "~~/components/ui";
import { useAllPledgeSummaries } from "~~/hooks/usePledge";
import { PledgeStatus, calculateProgress, formatBps, statusToString, timeRemaining } from "~~/types/pledge";

// Helper to format ETH values with reasonable precision
const formatEthValue = (value: bigint, decimals: number = 6): string => {
  const ethValue = Number(formatEther(value));
  if (ethValue === 0) return "0";
  if (ethValue < 0.000001) return "<0.000001";
  if (ethValue < 1) return ethValue.toFixed(decimals);
  if (ethValue < 1000) return ethValue.toFixed(4);
  return ethValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const FILTER_TABS = [
  { id: "all", label: "All Projects" },
  { id: "new", label: "New Assets" },
  { id: "yield", label: "Top Yield" },
  { id: "governance", label: "Governance" },
];

const PledgesPage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { summaries, isLoading, refetch } = useAllPledgeSummaries();

  const [activeFilter, setActiveFilter] = useState("all");

  // Calculate aggregate stats
  const totalRaised = summaries.reduce((acc, s) => acc + s.totalRaised, 0n);
  const totalVaultValue = summaries.reduce((acc, s) => acc + s.vaultBalance, 0n);
  const activePledges = summaries.filter(s => s.status === PledgeStatus.Active).length;

  // Filter summaries based on active filter
  const filteredSummaries = summaries.filter(pledge => {
    if (activeFilter === "all") return true;
    if (activeFilter === "new") return pledge.status === PledgeStatus.Funding;
    if (activeFilter === "yield")
      return pledge.status === PledgeStatus.Active && pledge.vaultBalance > pledge.totalRaised;
    if (activeFilter === "governance") return pledge.status === PledgeStatus.Active;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0D0D0D] page-enter">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-display mb-2">Trending Projects</h1>
            <p className="text-[#5E5E5E]">Discover and invest in equity-backed startups</p>
          </div>
          {connectedAddress && (
            <Link href="/pledges/create" className="btn-brand flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Create Pledge
            </Link>
          )}
        </div>

        {/* Stat Banner */}
        <StatBanner
          items={[
            {
              label: "Total Raised",
              value: `${formatEthValue(totalRaised)} ETH`,
              trend: `${summaries.length} pledges`,
              trendType: "neutral",
            },
            {
              label: "Vault TVL",
              value: `${formatEthValue(totalVaultValue)} ETH`,
              trend: "Earning yield",
              trendType: "positive",
            },
            { label: "Active Projects", value: String(activePledges), trend: "Trading live", trendType: "positive" },
          ]}
          className="mb-8"
        />

        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <FilterTabs tabs={FILTER_TABS} activeTab={activeFilter} onChange={setActiveFilter} />
          <button
            onClick={() => refetch()}
            className="text-[#5E5E5E] hover:text-white transition-colors flex items-center gap-1 text-sm"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-[#FF007A]"></span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredSummaries.length === 0 && (
          <div className="text-center py-16 card-pledge">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[rgba(255,0,122,0.08)] flex items-center justify-center">
              <SparklesIcon className="h-12 w-12 text-[#FF007A]" />
            </div>
            <h3 className="text-h1 mb-2">No pledges yet</h3>
            <p className="text-[#5E5E5E] mb-6">Be the first to create a pledge!</p>
            {connectedAddress && (
              <Link href="/pledges/create" className="btn-brand">
                Create First Pledge
              </Link>
            )}
          </div>
        )}

        {/* Pledge Grid - Uniswap Dark Style */}
        {!isLoading && filteredSummaries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSummaries.map(pledge => {
              const progress = calculateProgress(pledge.totalRaised, pledge.fundingGoal);
              const hasYield = pledge.vaultBalance > pledge.totalRaised;
              const isFunding = pledge.status === PledgeStatus.Funding;
              const isActive = pledge.status === PledgeStatus.Active;

              // Calculate floor price (vault / circulating supply)
              const TOTAL_SUPPLY = BigInt(1_000_000) * BigInt(1e18);
              const circulatingSupply = TOTAL_SUPPLY - pledge.treasuryShares;
              const floorPrice = circulatingSupply > 0n ? (pledge.vaultBalance * BigInt(1e18)) / circulatingSupply : 0n;

              // Treasury recycling percentage
              const treasuryPercent = Number((pledge.treasuryShares * 100n) / TOTAL_SUPPLY);

              return (
                <Link
                  key={pledge.address}
                  href={`/pledges/${pledge.address}`}
                  className="card-pledge p-6 hover:border-[#333333] transition-all group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <ProjectAvatar address={pledge.address as `0x${string}`} name={pledge.name} size="lg" />
                      <div>
                        <h2 className="text-h2 text-white group-hover:text-[#FF007A] transition-colors">
                          {pledge.name}
                        </h2>
                        <span className="text-sm text-[#5E5E5E] font-mono">p{pledge.ticker}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isFunding && <IcoLockBadge />}
                      {isActive && hasYield && (
                        <span className="tag-success flex items-center gap-1">
                          <SparklesIcon className="h-3 w-3" />
                          Earning
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price Display - Market Price dominant, Floor Price muted */}
                  <div className="mb-4">
                    <div className="text-label mb-1">Price</div>
                    <div className="price-market">
                      Ξ{formatEthValue(pledge.vaultBalance / (circulatingSupply / BigInt(1e18) || 1n))}
                    </div>
                    <div className="price-floor">Floor: Ξ{formatEthValue(floorPrice)}</div>
                  </div>

                  {/* Progress Bar (for funding) */}
                  {isFunding && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-[#9B9B9B]">{formatEthValue(pledge.totalRaised)} ETH raised</span>
                        <span className="text-[#5E5E5E]">{formatEthValue(pledge.fundingGoal)} ETH goal</span>
                      </div>
                      <div className="h-2 bg-[#1B1B1B] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF007A] to-[#27AE60] transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#5E5E5E] text-xs">Founder Share</span>
                      <p className="text-[#9B9B9B] font-medium">{formatBps(pledge.founderShareBps)}</p>
                    </div>
                    <div>
                      <span className="text-[#5E5E5E] text-xs">{isFunding ? "Time Left" : "Status"}</span>
                      <p className="text-[#9B9B9B] font-medium">
                        {isFunding ? timeRemaining(pledge.deadline) : statusToString(pledge.status)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#5E5E5E] text-xs">Vault Balance</span>
                      <p className="text-[#27AE60] font-mono font-medium">{formatEthValue(pledge.vaultBalance)} ETH</p>
                    </div>
                    <div>
                      <span className="text-[#5E5E5E] text-xs">Circulating</span>
                      <p className="text-[#9B9B9B] font-mono font-medium">
                        {(Number(circulatingSupply / BigInt(1e15)) / 1000).toFixed(2)}M
                      </p>
                    </div>
                  </div>

                  {/* Recycled Tag (if applicable) */}
                  {treasuryPercent > 10 && (
                    <div className="mt-4 pt-4 border-t border-[#222222]">
                      <RecycledTag treasuryPercent={treasuryPercent} />
                    </div>
                  )}

                  {/* Creator */}
                  <div className="mt-4 pt-4 border-t border-[#222222]">
                    <span className="text-[#5E5E5E] text-xs">Created by</span>
                    <div className="mt-1">
                      <Address address={pledge.creator} disableAddressLink />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PledgesPage;
