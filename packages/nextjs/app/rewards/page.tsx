"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { CheckCircleIcon, CurrencyDollarIcon, GiftIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { PledgeAbi, PledgeTokenAbi } from "~~/contracts/implementationContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useClaimRewards } from "~~/hooks/usePledge";
import { getPhaseLabel } from "~~/types/pledge";

const RewardsPage: NextPage = () => {
  const { isConnected, address } = useAccount();
  const { claim, isPending: isClaiming } = useClaimRewards();
  const [claimingAddress, setClaimingAddress] = useState<string | null>(null);

  // Get all pledges
  const {
    data: allSummaries,
    isLoading: summariesLoading,
    refetch,
  } = useScaffoldReadContract({
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

  // Get holder info (pending rewards) for each pledge the user holds
  const holderInfoCalls =
    allSummaries?.map(pledge => ({
      address: pledge.pledge as `0x${string}`,
      abi: PledgeAbi,
      functionName: "getHolderInfo",
      args: [address],
    })) ?? [];

  const { data: holderInfos, isLoading: holderInfoLoading } = useReadContracts({
    contracts: holderInfoCalls,
    query: {
      enabled: !!allSummaries && allSummaries.length > 0 && !!address,
    },
  });

  const isLoading = summariesLoading || balancesLoading || holderInfoLoading;

  // Calculate rewards for each holding
  const holdings = useMemo(() => {
    if (!allSummaries || !balances || !holderInfos) return [];

    return allSummaries
      .map((pledge, index) => {
        const userBalance = (balances[index]?.result as bigint) ?? 0n;
        if (userBalance === 0n) return null;

        const holderInfo = holderInfos[index]?.result as any;
        const pendingRewards = holderInfo?.pendingRewards ?? 0n;

        return {
          pledge: pledge.pledge as `0x${string}`,
          name: pledge.name,
          ticker: pledge.ticker,
          status: Number(pledge.status),
          userBalance,
          pendingRewards,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null);
  }, [allSummaries, balances, holderInfos]);

  // Filter to holdings with pending rewards
  const holdingsWithRewards = holdings.filter(h => h.pendingRewards > 0n);
  const totalPendingRewards = holdingsWithRewards.reduce((sum, h) => sum + h.pendingRewards, 0n);

  const handleClaim = async (pledgeAddress: `0x${string}`) => {
    try {
      setClaimingAddress(pledgeAddress);
      await claim(pledgeAddress);
      refetch();
    } catch (error) {
      console.error("Failed to claim:", error);
    } finally {
      setClaimingAddress(null);
    }
  };

  const handleClaimAll = async () => {
    for (const holding of holdingsWithRewards) {
      try {
        setClaimingAddress(holding.pledge);
        await claim(holding.pledge);
      } catch (error) {
        console.error(`Failed to claim from ${holding.name}:`, error);
      }
    }
    setClaimingAddress(null);
    refetch();
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="card bg-base-200 max-w-md mx-auto">
          <div className="card-body items-center text-center">
            <GiftIcon className="h-16 w-16 text-base-content/40 mb-4" />
            <h2 className="card-title text-2xl">Connect Your Wallet</h2>
            <p className="text-base-content/60 mb-4">View and claim your pending rewards</p>
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
            <GiftIcon className="h-8 w-8" />
            Rewards
          </h1>
          <p className="text-base-content/60 mt-1">Claim your yield and dividend rewards</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/60">Connected:</span>
          <Address address={address} />
        </div>
      </div>

      {/* Total Rewards Summary */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content mb-8">
        <div className="card-body">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg opacity-80">Total Pending Rewards</h2>
              <p className="text-4xl font-bold">{Number(formatEther(totalPendingRewards)).toFixed(6)} ETH</p>
              <p className="text-sm opacity-60">
                From {holdingsWithRewards.length} pledge{holdingsWithRewards.length !== 1 ? "s" : ""}
              </p>
            </div>
            {holdingsWithRewards.length > 0 && (
              <button
                className="btn btn-ghost bg-white/20 hover:bg-white/30 gap-2"
                onClick={handleClaimAll}
                disabled={isClaiming}
              >
                {isClaiming ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <SparklesIcon className="h-5 w-5" />
                )}
                Claim All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* No Holdings */}
      {!isLoading && holdings.length === 0 && (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center py-12">
            <GiftIcon className="h-16 w-16 text-base-content/40 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Holdings</h3>
            <p className="text-base-content/60 mb-4">You need to hold shares in pledges to earn rewards.</p>
            <Link href="/pledges" className="btn btn-primary">
              Explore Pledges
            </Link>
          </div>
        </div>
      )}

      {/* No Pending Rewards */}
      {!isLoading && holdings.length > 0 && holdingsWithRewards.length === 0 && (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center py-12">
            <CheckCircleIcon className="h-16 w-16 text-success mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
            <p className="text-base-content/60 mb-4">
              No pending rewards to claim. Check back after yield is harvested.
            </p>
            <Link href="/portfolio" className="btn btn-outline">
              View Portfolio
            </Link>
          </div>
        </div>
      )}

      {/* Rewards List */}
      {!isLoading && holdingsWithRewards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Claims</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdingsWithRewards.map(holding => (
              <div key={holding.pledge} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="card-title text-lg">{holding.name}</h3>
                      <p className="text-sm text-base-content/60">$p{holding.ticker}</p>
                    </div>
                    <span className="badge badge-success">{getPhaseLabel(holding.status)}</span>
                  </div>

                  <div className="divider my-2"></div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Your Shares</span>
                      <span className="font-mono">{Number(holding.userBalance / BigInt(1e18)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Pending Rewards</span>
                      <span className="font-mono text-success font-bold">
                        {Number(formatEther(holding.pendingRewards)).toFixed(6)} ETH
                      </span>
                    </div>
                  </div>

                  <div className="card-actions mt-4">
                    <button
                      className="btn btn-primary btn-block gap-2"
                      onClick={() => handleClaim(holding.pledge)}
                      disabled={isClaiming && claimingAddress === holding.pledge}
                    >
                      {isClaiming && claimingAddress === holding.pledge ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <CurrencyDollarIcon className="h-5 w-5" />
                      )}
                      Claim Rewards
                    </button>
                    <Link href={`/pledges/${holding.pledge}`} className="btn btn-outline btn-block btn-sm">
                      View Pledge
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">How Rewards Work</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-primary" />
                <h3 className="card-title text-base">Yield Rewards</h3>
              </div>
              <p className="text-sm text-base-content/60">
                ETH in the vault earns yield from Aave V3. When harvested, 80% is distributed to shareholders
                proportional to their holdings.
              </p>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-6 w-6 text-secondary" />
                <h3 className="card-title text-base">Dividend Rewards</h3>
              </div>
              <p className="text-sm text-base-content/60">
                Founders can deposit dividends from business revenue. Distributions are proportional to share ownership.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
