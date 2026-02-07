"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import {
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { PledgeTokenAbi } from "~~/contracts/implementationContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { PledgeStatus, getPhaseColor, getPhaseLabel } from "~~/types/pledge";

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

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="card bg-base-200 max-w-md mx-auto">
          <div className="card-body items-center text-center">
            <WalletIcon className="h-16 w-16 text-base-content/40 mb-4" />
            <h2 className="card-title text-2xl">Connect Your Wallet</h2>
            <p className="text-base-content/60 mb-4">View your portfolio and track your investments</p>
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ChartPieIcon className="h-8 w-8" />
            Portfolio
          </h1>
          <p className="text-base-content/60 mt-1">Track your Pledge investments</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/60">Connected:</span>
          <Address address={address} />
        </div>
      </div>

      {/* Portfolio Summary Stats */}
      <div className="stats stats-vertical md:stats-horizontal shadow w-full mb-8 bg-base-100">
        <div className="stat">
          <div className="stat-figure text-primary">
            <CurrencyDollarIcon className="h-8 w-8" />
          </div>
          <div className="stat-title">Total Portfolio Value</div>
          <div className="stat-value text-primary">{Number(formatEther(totalValue)).toFixed(4)} ETH</div>
          <div className="stat-desc">Redeemable at floor price</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <ChartPieIcon className="h-8 w-8" />
          </div>
          <div className="stat-title">Total Holdings</div>
          <div className="stat-value text-secondary">{holdings.length}</div>
          <div className="stat-desc">
            {activeHoldings} active, {fundingHoldings} funding
          </div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <BanknotesIcon className="h-8 w-8" />
          </div>
          <div className="stat-title">Total Shares</div>
          <div className="stat-value text-accent">{Number(totalShares / BigInt(1e18)).toLocaleString()}</div>
          <div className="stat-desc">Across all pledges</div>
        </div>
      </div>

      {/* Sort Controls */}
      {holdings.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Holdings</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">Sort by:</span>
            <select
              className="select select-sm select-bordered"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="value">Value</option>
              <option value="ownership">Ownership %</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && holdings.length === 0 && (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center py-12">
            <ChartPieIcon className="h-16 w-16 text-base-content/40 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Holdings Yet</h3>
            <p className="text-base-content/60 mb-4">You haven&apos;t invested in any pledges yet. Start exploring!</p>
            <Link href="/pledges" className="btn btn-primary">
              Explore Pledges
            </Link>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      {!isLoading && holdings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Pledge</th>
                <th className="text-right">Shares</th>
                <th className="text-right">Ownership</th>
                <th className="text-right">Value (ETH)</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map(holding => (
                <tr key={holding.pledge} className="hover">
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold">{holding.name}</span>
                      <span className="text-sm text-base-content/60">$p{holding.ticker}</span>
                    </div>
                  </td>
                  <td className="text-right font-mono">
                    {Number(holding.userBalance / BigInt(1e18)).toLocaleString()}
                  </td>
                  <td className="text-right">
                    <span className="badge badge-outline">{holding.ownershipPercent.toFixed(2)}%</span>
                  </td>
                  <td className="text-right font-mono text-success">
                    {Number(formatEther(holding.redeemableValue)).toFixed(4)}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${getPhaseColor(holding.status)}`}>{getPhaseLabel(holding.status)}</span>
                  </td>
                  <td className="text-right">
                    <Link href={`/pledges/${holding.pledge}`} className="btn btn-sm btn-ghost">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td>Total</td>
                <td className="text-right font-mono">{Number(totalShares / BigInt(1e18)).toLocaleString()}</td>
                <td></td>
                <td className="text-right font-mono text-success">{Number(formatEther(totalValue)).toFixed(4)}</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Portfolio Breakdown by Status */}
      {!isLoading && holdings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Portfolio Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active */}
            <div className="card bg-success/10 border border-success/30">
              <div className="card-body">
                <h3 className="card-title text-success">
                  <ArrowTrendingUpIcon className="h-5 w-5" />
                  Active Pledges
                </h3>
                <p className="text-3xl font-bold">{activeHoldings}</p>
                <p className="text-sm text-base-content/60">
                  Value:{" "}
                  {Number(
                    formatEther(
                      holdings
                        .filter(h => h.status === PledgeStatus.Active)
                        .reduce((sum, h) => sum + h.redeemableValue, 0n),
                    ),
                  ).toFixed(4)}{" "}
                  ETH
                </p>
              </div>
            </div>

            {/* Funding */}
            <div className="card bg-warning/10 border border-warning/30">
              <div className="card-body">
                <h3 className="card-title text-warning">
                  <BanknotesIcon className="h-5 w-5" />
                  Funding Phase
                </h3>
                <p className="text-3xl font-bold">{fundingHoldings}</p>
                <p className="text-sm text-base-content/60">
                  Value:{" "}
                  {Number(
                    formatEther(
                      holdings
                        .filter(h => h.status === PledgeStatus.Funding)
                        .reduce((sum, h) => sum + h.redeemableValue, 0n),
                    ),
                  ).toFixed(4)}{" "}
                  ETH
                </p>
              </div>
            </div>

            {/* Failed */}
            <div className="card bg-error/10 border border-error/30">
              <div className="card-body">
                <h3 className="card-title text-error">
                  <ArrowDownIcon className="h-5 w-5" />
                  Failed (Refundable)
                </h3>
                <p className="text-3xl font-bold">{holdings.filter(h => h.status === PledgeStatus.Failed).length}</p>
                <p className="text-sm text-base-content/60">Claim refunds on pledge pages</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
