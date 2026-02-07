"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignCard } from "./CampaignCard";
import { Abi } from "viem";
import { usePublicClient } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";
import { CampaignStatus } from "~~/utils/campaign";

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
  string, // imageUrl
];

type CampaignWithDetails = {
  address: string;
  details: CampaignDetails;
};

type CampaignListProps = {
  statusFilter?: "all" | "active" | "successful" | "failed" | "cancelled";
  searchQuery?: string;
  sortBy?: "newest" | "oldest" | "mostFunded" | "endingSoon";
};

export const CampaignList = ({ statusFilter = "all", searchQuery = "", sortBy = "newest" }: CampaignListProps) => {
  const router = useRouter();
  const publicClient = usePublicClient();
  const [campaignsWithDetails, setCampaignsWithDetails] = useState<CampaignWithDetails[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get all campaign addresses from factory
  const {
    data: campaignAddresses,
    isLoading: isLoadingAddresses,
    refetch: refetchAddresses,
  } = useScaffoldReadContract({
    contractName: "CampaignFactory",
    functionName: "getAllCampaigns",
    watch: true,
  });

  // Get Campaign ABI from deployedContracts
  const { data: campaignContractInfo } = useDeployedContractInfo({ contractName: "Campaign" });

  // Watch for new campaign creation events - triggers automatic refresh
  useScaffoldWatchContractEvent({
    contractName: "CampaignFactory",
    eventName: "CampaignCreated",
    onLogs: logs => {
      console.log("New campaign created:", logs);
      refetchAddresses();
      setRefreshTrigger(prev => prev + 1);
    },
  });

  // Memoized fetch function
  const fetchCampaignDetails = useCallback(async () => {
    if (!campaignAddresses || campaignAddresses.length === 0 || !campaignContractInfo?.abi || !publicClient) {
      setCampaignsWithDetails([]);
      return;
    }

    setIsLoadingDetails(true);

    try {
      // Filter out the template campaign (title = "Template")
      const results: CampaignWithDetails[] = [];

      // Fetch details for each campaign
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

      const allDetails = await Promise.all(detailsPromises);

      for (const item of allDetails) {
        if (item && item.details) {
          // Filter out template campaign
          if (item.details[5] !== "Template") {
            results.push(item);
          }
        }
      }

      setCampaignsWithDetails(results);
    } catch (error) {
      console.error("Failed to fetch campaign details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [campaignAddresses, campaignContractInfo?.abi, publicClient]);

  // Fetch all campaign details using multicall pattern
  useEffect(() => {
    fetchCampaignDetails();

    // Set up polling for updates (backup to events, less frequent)
    const interval = setInterval(fetchCampaignDetails, 15000);
    return () => clearInterval(interval);
  }, [fetchCampaignDetails, refreshTrigger]);

  // Filter and sort campaigns
  const filteredCampaigns = filterAndSortCampaigns(campaignsWithDetails, statusFilter, searchQuery, sortBy);

  if (isLoadingAddresses || isLoadingDetails) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!campaignAddresses || campaignAddresses.length === 0 || campaignsWithDetails.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
        <p className="text-base-content/60">Be the first to create a campaign!</p>
      </div>
    );
  }

  if (filteredCampaigns.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-2">No matching campaigns</h3>
        <p className="text-base-content/60">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredCampaigns.map(campaign => (
        <CampaignCard
          key={campaign.address}
          address={campaign.address}
          title={campaign.details[5]}
          description={campaign.details[6]}
          fundingGoal={campaign.details[1]}
          totalRaised={campaign.details[3]}
          deadline={campaign.details[2]}
          status={campaign.details[4] as (typeof CampaignStatus)[keyof typeof CampaignStatus]}
          contributorCount={campaign.details[8]}
          imageUrl={campaign.details[9] || undefined}
          onClick={() => router.push(`/campaigns/${campaign.address}`)}
        />
      ))}
    </div>
  );
};

function filterAndSortCampaigns(
  campaigns: CampaignWithDetails[],
  statusFilter: string,
  searchQuery: string,
  sortBy: string,
): CampaignWithDetails[] {
  let filtered = [...campaigns];

  // Status filter
  if (statusFilter !== "all") {
    const statusMap: Record<string, number> = {
      active: CampaignStatus.Active,
      successful: CampaignStatus.Successful,
      failed: CampaignStatus.Failed,
      cancelled: CampaignStatus.Cancelled,
    };
    filtered = filtered.filter(c => c.details[4] === statusMap[statusFilter]);
  }

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      c =>
        c.details[5].toLowerCase().includes(query) ||
        c.details[6].toLowerCase().includes(query) ||
        c.address.toLowerCase().includes(query),
    );
  }

  // Sort
  switch (sortBy) {
    case "newest":
      filtered.sort((a, b) => Number(b.details[7] - a.details[7]));
      break;
    case "oldest":
      filtered.sort((a, b) => Number(a.details[7] - b.details[7]));
      break;
    case "mostFunded":
      filtered.sort((a, b) => Number(b.details[3] - a.details[3]));
      break;
    case "endingSoon":
      filtered.sort((a, b) => Number(a.details[2] - b.details[2]));
      break;
  }

  return filtered;
}
