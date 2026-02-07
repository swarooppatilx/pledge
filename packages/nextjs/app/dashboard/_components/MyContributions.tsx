"use client";

import { formatEther } from "viem";
import { useReadContracts } from "wagmi";
import { PledgeTokenAbi } from "~~/contracts/implementationContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { getPhaseColor, getPhaseLabel } from "~~/types/pledge";

type MyContributionsProps = {
  userAddress: `0x${string}`;
  onPledgeClick: (address: string) => void;
};

export const MyContributions = ({ userAddress, onPledgeClick }: MyContributionsProps) => {
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
      args: [userAddress],
    })) ?? [];

  const { data: balances, isLoading: balancesLoading } = useReadContracts({
    contracts: tokenBalanceCalls,
    query: {
      enabled: !!allSummaries && allSummaries.length > 0,
    },
  });

  const isLoading = summariesLoading || balancesLoading;

  // Filter pledges where user has a non-zero balance
  const myHoldings =
    allSummaries
      ?.filter((_, index) => {
        const balance = balances?.[index]?.result as bigint | undefined;
        return balance && balance > 0n;
      })
      .map(pledge => {
        // Find the correct balance for this pledge
        const balanceIndex = allSummaries?.indexOf(pledge);
        const balance = (balances?.[balanceIndex ?? 0]?.result as bigint) ?? 0n;
        return { ...pledge, userBalance: balance };
      }) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (myHoldings.length === 0) {
    return (
      <div className="card bg-base-200">
        <div className="card-body items-center text-center">
          <h3 className="text-lg font-semibold mb-2">No Holdings</h3>
          <p className="text-base-content/60">You don&apos;t hold shares in any pledges yet.</p>
          <p className="text-sm text-base-content/40 mt-2">Contribute to a pledge to receive shares!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {myHoldings.map(pledge => {
        const totalSupply = BigInt(1_000_000) * BigInt(1e18);
        const circulatingSupply = totalSupply - pledge.treasuryShares;
        const ownershipPercent =
          circulatingSupply > 0n ? Number((pledge.userBalance * 10000n) / circulatingSupply) / 100 : 0;
        const redeemableValue =
          circulatingSupply > 0n ? (pledge.userBalance * pledge.vaultBalance) / circulatingSupply : 0n;

        return (
          <div
            key={pledge.pledge}
            className="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
            onClick={() => onPledgeClick(pledge.pledge)}
          >
            <div className="card-body">
              <div className="flex justify-between items-start">
                <h3 className="card-title text-lg">{pledge.name || "Untitled Pledge"}</h3>
                <span className={`badge ${getPhaseColor(pledge.status)}`}>{getPhaseLabel(pledge.status)}</span>
              </div>

              <p className="text-sm text-base-content/60">{pledge.ticker ? `$p${pledge.ticker}` : "No ticker"}</p>

              {/* User's Position */}
              <div className="bg-primary/10 rounded-lg p-3 mt-4">
                <p className="text-xs text-base-content/60 mb-2">Your Position</p>
                <div className="flex justify-between">
                  <span className="text-sm">Shares:</span>
                  <span className="font-semibold">{Number(pledge.userBalance / BigInt(1e18)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Ownership:</span>
                  <span className="font-semibold">{ownershipPercent.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-success">
                  <span className="text-sm">Value:</span>
                  <span className="font-semibold">{formatEther(redeemableValue)} ETH</span>
                </div>
              </div>

              <div className="divider my-2"></div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-base-content/60">Vault Balance</span>
                  <p className="font-semibold text-success">{formatEther(pledge.vaultBalance)} ETH</p>
                </div>
                <div>
                  <span className="text-xs text-base-content/60">Circulating</span>
                  <p className="font-semibold">{Number(circulatingSupply / BigInt(1e18)).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
