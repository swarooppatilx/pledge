"use client";

import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { getPhaseColor, getPhaseLabel } from "~~/types/pledge";

type MyPledgesProps = {
  userAddress: `0x${string}`;
  onPledgeClick: (address: string) => void;
};

export const MyPledges = ({ userAddress, onPledgeClick }: MyPledgesProps) => {
  const { data: allSummaries, isLoading } = useScaffoldReadContract({
    contractName: "PledgeFactory",
    functionName: "getAllSummaries",
    watch: true,
  });

  // Filter to only pledges created by this user
  const myPledges = allSummaries?.filter(summary => summary.creator.toLowerCase() === userAddress.toLowerCase()) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (myPledges.length === 0) {
    return (
      <div className="card bg-base-200">
        <div className="card-body items-center text-center">
          <h3 className="text-lg font-semibold mb-2">No Pledges Created</h3>
          <p className="text-base-content/60">You haven&apos;t created any pledges yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {myPledges.map(pledge => {
        const progress = pledge.fundingGoal > 0n ? Number((pledge.totalRaised * 100n) / pledge.fundingGoal) : 0;
        // Calculate circulating supply (1M total - treasury shares)
        const totalSupply = BigInt(1_000_000) * BigInt(1e18);
        const sharesSold = totalSupply - pledge.treasuryShares;

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

              <p className="text-sm text-base-content/60 line-clamp-2">
                {pledge.ticker ? `$p${pledge.ticker}` : "No ticker"}
              </p>

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Raised</span>
                  <span>
                    {formatEther(pledge.totalRaised)} / {formatEther(pledge.fundingGoal)} ETH
                  </span>
                </div>
                <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <div>
                  <span className="text-base-content/60">Shares Sold</span>
                  <p className="font-semibold">{Number(sharesSold / BigInt(1e18)).toLocaleString()} / 1M</p>
                </div>
                <div>
                  <span className="text-base-content/60">Treasury</span>
                  <p className="font-semibold">{formatEther(pledge.vaultBalance)} ETH</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
