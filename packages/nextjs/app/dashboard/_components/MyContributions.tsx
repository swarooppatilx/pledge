"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { Abi } from "viem";
import { usePublicClient } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { CampaignStatus, getStatusColor, getStatusLabel } from "~~/utils/campaign";

type CampaignStatusType = (typeof CampaignStatus)[keyof typeof CampaignStatus];

type CampaignDetails = readonly [
  `0x${string}`, // creator
  bigint, // fundingGoal
  bigint, // deadline
  bigint, // totalRaised
  number, // status
  string, // title
  string, // description
  bigint, // createdAt
  bigint, // contributorCount
];

type ContributionData = {
  address: string;
  details: CampaignDetails;
  contribution: bigint;
};

type MyContributionsProps = {
  userAddress: `0x${string}`;
  onCampaignClick: (address: string) => void;
};

export const MyContributions = ({ userAddress, onCampaignClick }: MyContributionsProps) => {
  const publicClient = usePublicClient();
  const [contributions, setContributions] = useState<ContributionData[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Get all campaigns
  const { data: allCampaigns, isLoading: isLoadingCampaigns } = useScaffoldReadContract({
    contractName: "CampaignFactory",
    functionName: "getAllCampaigns",
    watch: true,
  });

  const { data: campaignContractInfo } = useDeployedContractInfo({ contractName: "Campaign" });

  // Check each campaign for user's contribution
  useEffect(() => {
    const fetchContributions = async () => {
      if (!allCampaigns || allCampaigns.length === 0 || !campaignContractInfo?.abi || !publicClient) {
        setContributions([]);
        return;
      }

      setIsLoadingDetails(true);
      try {
        const contributionPromises = allCampaigns.map(async address => {
          try {
            const [details, contribution] = await Promise.all([
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: campaignContractInfo.abi as Abi,
                functionName: "getCampaignDetails",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: campaignContractInfo.abi as Abi,
                functionName: "getContribution",
                args: [userAddress],
              }),
            ]);

            const contrib = contribution as bigint;
            if (contrib > 0n) {
              return {
                address,
                details: details as CampaignDetails,
                contribution: contrib,
              };
            }
            return null;
          } catch {
            return null;
          }
        });

        const results = await Promise.all(contributionPromises);
        setContributions(results.filter((r): r is NonNullable<typeof r> => r !== null));
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchContributions();
  }, [allCampaigns, campaignContractInfo?.abi, publicClient, userAddress]);

  if (isLoadingCampaigns || isLoadingDetails) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="text-center py-20 bg-base-200 rounded-box">
        <h3 className="text-xl font-semibold mb-2">No contributions yet</h3>
        <p className="text-base-content/60 mb-4">Back a campaign to get started</p>
      </div>
    );
  }

  // Calculate summary stats
  const totalContributed = contributions.reduce((sum, c) => sum + c.contribution, 0n);
  const refundable = contributions.filter(
    c => c.details[4] === CampaignStatus.Failed || c.details[4] === CampaignStatus.Cancelled,
  );
  const refundableAmount = refundable.reduce((sum, c) => sum + c.contribution, 0n);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="stats stats-vertical md:stats-horizontal shadow w-full bg-base-100">
        <div className="stat">
          <div className="stat-title">Campaigns Backed</div>
          <div className="stat-value">{contributions.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Contributed</div>
          <div className="stat-value text-primary">{formatEther(totalContributed)} ETH</div>
        </div>
        <div className="stat">
          <div className="stat-title">Refundable</div>
          <div className="stat-value text-warning">{formatEther(refundableAmount)} ETH</div>
          <div className="stat-desc">{refundable.length} campaign(s)</div>
        </div>
      </div>

      {/* Contribution List */}
      <div className="overflow-x-auto">
        <table className="table table-zebra bg-base-100">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Your Contribution</th>
              <th>Progress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map(({ address, details, contribution }) => {
              const [, fundingGoal, deadline, raised, status, title] = details;
              const progress = fundingGoal > 0n ? Number((raised * 100n) / fundingGoal) : 0;
              const isExpired = Date.now() > Number(deadline) * 1000;
              const canRefund = status === CampaignStatus.Failed || status === CampaignStatus.Cancelled;

              return (
                <tr key={address} className="hover cursor-pointer" onClick={() => onCampaignClick(address)}>
                  <td>
                    <div className="font-medium">{title}</div>
                    <div className="text-xs text-base-content/50 font-mono">
                      {address.slice(0, 8)}...{address.slice(-6)}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusColor(status as CampaignStatusType)}`}>
                      {status === CampaignStatus.Active && isExpired
                        ? "Awaiting Finalization"
                        : getStatusLabel(status as CampaignStatusType)}
                    </span>
                  </td>
                  <td className="font-semibold">{formatEther(contribution)} ETH</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-sm">{progress}% funded</span>
                      <progress
                        className={`progress w-24 ${progress >= 100 ? "progress-success" : "progress-primary"}`}
                        value={Math.min(progress, 100)}
                        max="100"
                      />
                    </div>
                  </td>
                  <td>
                    {canRefund ? (
                      <span className="badge badge-warning">Claim Refund</span>
                    ) : (
                      <button className="btn btn-ghost btn-sm">View</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
