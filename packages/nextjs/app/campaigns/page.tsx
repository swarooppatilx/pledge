"use client";

import Link from "next/link";
import { CampaignFilters, CampaignList } from "./_components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useCampaignStore } from "~~/services/store/campaignStore";

const CampaignsPage: NextPage = () => {
  const { isConnected } = useAccount();
  const { statusFilter, searchQuery, sortBy } = useCampaignStore();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-base-content/60 mt-1">Discover and support decentralized crowdfunding campaigns</p>
        </div>

        {isConnected && (
          <Link href="/campaigns/create" className="btn btn-primary gap-2">
            <PlusIcon className="h-5 w-5" />
            Create Campaign
          </Link>
        )}
      </div>

      {/* Filters */}
      <CampaignFilters />

      {/* Campaign Grid */}
      <CampaignList statusFilter={statusFilter} searchQuery={searchQuery} sortBy={sortBy} />
    </div>
  );
};

export default CampaignsPage;
