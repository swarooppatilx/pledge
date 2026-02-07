"use client";

import { useRouter } from "next/navigation";
import { CampaignCard } from "./CampaignCard";
import { useReadContract } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { CampaignStatus } from "~~/utils/campaign";
import { CampaignAbi } from "~~/utils/campaign/campaignAbi";

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

  // Get all campaign addresses from factory
  const { data: campaignAddresses, isLoading: isLoadingAddresses } = useScaffoldReadContract({
    contractName: "CampaignFactory",
    functionName: "getAllCampaigns",
  });

  // Fetch details for each campaign
  const campaignsWithDetails = useCampaignDetails(campaignAddresses as `0x${string}`[] | undefined, CampaignAbi);

  // Filter and sort campaigns
  const filteredCampaigns = filterAndSortCampaigns(campaignsWithDetails, statusFilter, searchQuery, sortBy);

  if (isLoadingAddresses) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!campaignAddresses || campaignAddresses.length === 0) {
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
          onClick={() => router.push(`/campaigns/${campaign.address}`)}
        />
      ))}
    </div>
  );
};

// Custom hook to fetch campaign details
function useCampaignDetails(addresses: `0x${string}`[] | undefined, abi: readonly unknown[]): CampaignWithDetails[] {
  const results: CampaignWithDetails[] = [];

  // We need to fetch each campaign's details
  // Using individual useReadContract calls for each campaign
  const campaign0 = useReadContract({
    address: addresses?.[0],
    abi: abi,
    functionName: "getCampaignDetails",
    query: { enabled: !!addresses?.[0] },
  });

  const campaign1 = useReadContract({
    address: addresses?.[1],
    abi: abi,
    functionName: "getCampaignDetails",
    query: { enabled: !!addresses?.[1] },
  });

  const campaign2 = useReadContract({
    address: addresses?.[2],
    abi: abi,
    functionName: "getCampaignDetails",
    query: { enabled: !!addresses?.[2] },
  });

  const campaign3 = useReadContract({
    address: addresses?.[3],
    abi: abi,
    functionName: "getCampaignDetails",
    query: { enabled: !!addresses?.[3] },
  });

  const campaign4 = useReadContract({
    address: addresses?.[4],
    abi: abi,
    functionName: "getCampaignDetails",
    query: { enabled: !!addresses?.[4] },
  });

  const campaign5 = useReadContract({
    address: addresses?.[5],
    abi: abi,
    functionName: "getCampaignDetails",
    query: { enabled: !!addresses?.[5] },
  });

  const campaign6 = useReadContract({
    address: addresses?.[6],
    abi: abi,
    functionName: "getCampaignDetails",
    query: { enabled: !!addresses?.[6] },
  });

  const campaign7 = useReadContract({
    address: addresses?.[7],
    abi: abi,
    functionName: "getCampaignDetails",
    query: { enabled: !!addresses?.[7] },
  });

  const campaignResults = [campaign0, campaign1, campaign2, campaign3, campaign4, campaign5, campaign6, campaign7];

  if (addresses) {
    for (let i = 0; i < Math.min(addresses.length, 8); i++) {
      if (campaignResults[i].data) {
        results.push({
          address: addresses[i],
          details: campaignResults[i].data as CampaignDetails,
        });
      }
    }
  }

  return results;
}

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
