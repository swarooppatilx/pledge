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

type MyCampaignsProps = {
  userAddress: `0x${string}`;
  onCampaignClick: (address: string) => void;
};

export const MyCampaigns = ({ userAddress, onCampaignClick }: MyCampaignsProps) => {
  const publicClient = usePublicClient();
  const [campaignsWithDetails, setCampaignsWithDetails] = useState<{ address: string; details: CampaignDetails }[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Get campaigns created by this user
  const { data: campaignAddresses, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "CampaignFactory",
    functionName: "getCampaignsByCreator",
    args: [userAddress],
    watch: true,
  });

  const { data: campaignContractInfo } = useDeployedContractInfo({ contractName: "Campaign" });

  // Fetch campaign details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!campaignAddresses || campaignAddresses.length === 0 || !campaignContractInfo?.abi || !publicClient) {
        setCampaignsWithDetails([]);
        return;
      }

      setIsLoadingDetails(true);
      try {
        const detailsPromises = campaignAddresses.map(async address => {
          try {
            const details = await publicClient.readContract({
              address: address as `0x${string}`,
              abi: campaignContractInfo.abi as Abi,
              functionName: "getCampaignDetails",
            });
            return { address, details: details as CampaignDetails };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(detailsPromises);
        setCampaignsWithDetails(results.filter((r): r is NonNullable<typeof r> => r !== null));
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [campaignAddresses, campaignContractInfo?.abi, publicClient]);

  if (isLoadingAddresses || isLoadingDetails) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!campaignsWithDetails || campaignsWithDetails.length === 0) {
    return (
      <div className="text-center py-20 bg-base-200 rounded-box">
        <h3 className="text-xl font-semibold mb-2">No campaigns created yet</h3>
        <p className="text-base-content/60 mb-4">Create your first campaign to get started</p>
      </div>
    );
  }

  // Calculate summary stats
  const totalRaised = campaignsWithDetails.reduce((sum, c) => sum + c.details[3], 0n);
  const activeCampaigns = campaignsWithDetails.filter(c => c.details[4] === CampaignStatus.Active).length;
  const successfulCampaigns = campaignsWithDetails.filter(c => c.details[4] === CampaignStatus.Successful).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="stats stats-vertical md:stats-horizontal shadow w-full bg-base-100">
        <div className="stat">
          <div className="stat-title">Total Campaigns</div>
          <div className="stat-value">{campaignsWithDetails.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Active</div>
          <div className="stat-value text-primary">{activeCampaigns}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Successful</div>
          <div className="stat-value text-success">{successfulCampaigns}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Raised</div>
          <div className="stat-value text-secondary">{formatEther(totalRaised)} ETH</div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="overflow-x-auto">
        <table className="table table-zebra bg-base-100">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Raised / Goal</th>
              <th>Backers</th>
              <th>Deadline</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {campaignsWithDetails.map(({ address, details }) => {
              const [, fundingGoal, deadline, raised, status, title] = details;
              const progress = fundingGoal > 0n ? Number((raised * 100n) / fundingGoal) : 0;
              const isExpired = Date.now() > Number(deadline) * 1000;

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
                        ? "Needs Finalization"
                        : getStatusLabel(status as CampaignStatusType)}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span>
                        {formatEther(raised)} / {formatEther(fundingGoal)} ETH
                      </span>
                      <progress
                        className={`progress w-24 ${progress >= 100 ? "progress-success" : "progress-primary"}`}
                        value={Math.min(progress, 100)}
                        max="100"
                      />
                    </div>
                  </td>
                  <td>{Number(details[8])}</td>
                  <td className={isExpired ? "text-error" : ""}>
                    {new Date(Number(deadline) * 1000).toLocaleDateString()}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm">View</button>
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
