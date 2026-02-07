"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { ChartBarIcon, CurrencyDollarIcon, FireIcon, TrophyIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { PledgeStatus } from "~~/types/pledge";

const LeaderboardPage: NextPage = () => {
  // Get all pledges
  const { data: allSummaries, isLoading } = useScaffoldReadContract({
    contractName: "PledgeFactory",
    functionName: "getAllSummaries",
    watch: true,
  });

  // Calculate leaderboards
  const leaderboards = useMemo(() => {
    if (!allSummaries) return null;

    const activePledges = allSummaries.filter(p => Number(p.status) === PledgeStatus.Active);
    const fundingPledges = allSummaries.filter(p => Number(p.status) === PledgeStatus.Funding);

    // By vault balance (most valuable)
    const byVaultBalance = [...activePledges].sort((a, b) => Number(b.vaultBalance - a.vaultBalance)).slice(0, 10);

    // By total raised
    const byTotalRaised = [...allSummaries]
      .filter(p => Number(p.status) !== PledgeStatus.Failed)
      .sort((a, b) => Number(b.totalRaised - a.totalRaised))
      .slice(0, 10);

    // Hot funding (closest to goal)
    const hotFunding = [...fundingPledges]
      .map(p => ({
        ...p,
        progress: p.fundingGoal > 0n ? Number((p.totalRaised * 100n) / p.fundingGoal) : 0,
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 10);

    // By public circulation (most decentralized)
    const byCirculation = [...activePledges]
      .map(p => {
        const totalSupply = BigInt(1_000_000) * BigInt(1e18);
        const circulating = totalSupply - p.treasuryShares;
        const circulatingPercent = Number((circulating * 100n) / totalSupply);
        return { ...p, circulatingPercent };
      })
      .sort((a, b) => b.circulatingPercent - a.circulatingPercent)
      .slice(0, 10);

    return {
      byVaultBalance,
      byTotalRaised,
      hotFunding,
      byCirculation,
    };
  }, [allSummaries]);

  // Platform stats
  const stats = useMemo(() => {
    if (!allSummaries) return null;

    const totalPledges = allSummaries.length;
    const activePledges = allSummaries.filter(p => Number(p.status) === PledgeStatus.Active).length;
    const totalRaised = allSummaries.reduce((sum, p) => sum + p.totalRaised, 0n);
    const totalVaultValue = allSummaries
      .filter(p => Number(p.status) === PledgeStatus.Active)
      .reduce((sum, p) => sum + p.vaultBalance, 0n);

    return {
      totalPledges,
      activePledges,
      totalRaised,
      totalVaultValue,
    };
  }, [allSummaries]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Loading State - Full page spinner */}
      {isLoading && (
        <div className="flex justify-center items-center min-h-[60vh]">
          <span className="loading loading-spinner loading-lg text-[#FF007A]"></span>
        </div>
      )}

      {/* Content - only show after loading */}
      {!isLoading && (
        <>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold flex items-center justify-center gap-2">
              <TrophyIcon className="h-10 w-10 text-warning" />
              Leaderboard
            </h1>
            <p className="text-base-content/60 mt-2">Top performing pledges on the platform</p>
          </div>

          {/* Platform Stats */}
          {stats && (
            <div className="stats stats-vertical md:stats-horizontal shadow w-full mb-8 bg-base-100">
          <div className="stat">
            <div className="stat-title">Total Pledges</div>
            <div className="stat-value">{stats.totalPledges}</div>
            <div className="stat-desc">{stats.activePledges} active</div>
          </div>
          <div className="stat">
            <div className="stat-title">Total Raised</div>
            <div className="stat-value text-primary">{Number(formatEther(stats.totalRaised)).toFixed(2)} ETH</div>
            <div className="stat-desc">All-time</div>
          </div>
          <div className="stat">
            <div className="stat-title">Total Vault Value</div>
            <div className="stat-value text-success">{Number(formatEther(stats.totalVaultValue)).toFixed(2)} ETH</div>
            <div className="stat-desc">Active pledges</div>
          </div>
        </div>
      )}

      {/* Leaderboards Grid */}
      {leaderboards && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Valuable */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-success">
                <CurrencyDollarIcon className="h-6 w-6" />
                Most Valuable
              </h2>
              <p className="text-sm text-base-content/60 mb-4">By vault balance</p>

              {leaderboards.byVaultBalance.length === 0 ? (
                <p className="text-center text-base-content/60 py-4">No active pledges yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Pledge</th>
                        <th className="text-right">Vault</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboards.byVaultBalance.map((pledge, idx) => (
                        <tr key={pledge.pledge} className="hover">
                          <td>
                            {idx === 0 && <span className="text-xl">🥇</span>}
                            {idx === 1 && <span className="text-xl">🥈</span>}
                            {idx === 2 && <span className="text-xl">🥉</span>}
                            {idx > 2 && <span className="text-base-content/60">{idx + 1}</span>}
                          </td>
                          <td>
                            <Link href={`/pledges/${pledge.pledge}`} className="link link-hover">
                              <div className="font-bold">{pledge.name}</div>
                              <div className="text-xs text-base-content/60">$p{pledge.ticker}</div>
                            </Link>
                          </td>
                          <td className="text-right font-mono text-success">
                            {Number(formatEther(pledge.vaultBalance)).toFixed(3)} ETH
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Most Raised */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-primary">
                <ChartBarIcon className="h-6 w-6" />
                Most Raised
              </h2>
              <p className="text-sm text-base-content/60 mb-4">Total contributions received</p>

              {leaderboards.byTotalRaised.length === 0 ? (
                <p className="text-center text-base-content/60 py-4">No pledges yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Pledge</th>
                        <th className="text-right">Raised</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboards.byTotalRaised.map((pledge, idx) => (
                        <tr key={pledge.pledge} className="hover">
                          <td>
                            {idx === 0 && <span className="text-xl">🥇</span>}
                            {idx === 1 && <span className="text-xl">🥈</span>}
                            {idx === 2 && <span className="text-xl">🥉</span>}
                            {idx > 2 && <span className="text-base-content/60">{idx + 1}</span>}
                          </td>
                          <td>
                            <Link href={`/pledges/${pledge.pledge}`} className="link link-hover">
                              <div className="font-bold">{pledge.name}</div>
                              <div className="text-xs text-base-content/60">$p{pledge.ticker}</div>
                            </Link>
                          </td>
                          <td className="text-right font-mono text-primary">
                            {Number(formatEther(pledge.totalRaised)).toFixed(3)} ETH
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Hot Funding */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-warning">
                <FireIcon className="h-6 w-6" />
                Hot Funding
              </h2>
              <p className="text-sm text-base-content/60 mb-4">Closest to funding goal</p>

              {leaderboards.hotFunding.length === 0 ? (
                <p className="text-center text-base-content/60 py-4">No pledges in funding phase</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Pledge</th>
                        <th className="text-right">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboards.hotFunding.map((pledge, idx) => (
                        <tr key={pledge.pledge} className="hover">
                          <td>
                            {idx < 3 ? (
                              <span className="w-6 h-6 rounded-full bg-[#FF007A] text-white text-xs flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="text-[#5E5E5E]">{idx + 1}</span>
                            )}
                          </td>
                          <td>
                            <Link href={`/pledges/${pledge.pledge}`} className="link link-hover">
                              <div className="font-bold">{pledge.name}</div>
                              <div className="text-xs text-base-content/60">$p{pledge.ticker}</div>
                            </Link>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <progress
                                className="progress progress-warning w-16"
                                value={pledge.progress}
                                max="100"
                              ></progress>
                              <span className="font-mono text-warning">{pledge.progress}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Most Decentralized */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-secondary">
                <UserGroupIcon className="h-6 w-6" />
                Most Decentralized
              </h2>
              <p className="text-sm text-base-content/60 mb-4">Highest public circulation</p>

              {leaderboards.byCirculation.length === 0 ? (
                <p className="text-center text-base-content/60 py-4">No active pledges yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Pledge</th>
                        <th className="text-right">Circulating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboards.byCirculation.map((pledge, idx) => (
                        <tr key={pledge.pledge} className="hover">
                          <td>
                            {idx === 0 && <span className="text-xl">🌐</span>}
                            {idx === 1 && <span className="text-xl">🌐</span>}
                            {idx === 2 && <span className="text-xl">🌐</span>}
                            {idx > 2 && <span className="text-base-content/60">{idx + 1}</span>}
                          </td>
                          <td>
                            <Link href={`/pledges/${pledge.pledge}`} className="link link-hover">
                              <div className="font-bold">{pledge.name}</div>
                              <div className="text-xs text-base-content/60">$p{pledge.ticker}</div>
                            </Link>
                          </td>
                          <td className="text-right font-mono text-secondary">
                            {pledge.circulatingPercent.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default LeaderboardPage;
