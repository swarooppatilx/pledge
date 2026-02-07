"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CampaignFilters, CampaignList } from "./_components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useCampaignStore } from "~~/services/store/campaignStore";

function CampaignsContent() {
  const { isConnected } = useAccount();
  const searchParams = useSearchParams();
  const { statusFilter, searchQuery, sortBy, setStatusFilter, setSearchQuery, setSortBy } = useCampaignStore();

  // Sync URL params to store on mount
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    const urlSearch = searchParams.get("q");
    const urlSort = searchParams.get("sort");

    if (urlStatus && ["all", "active", "successful", "failed", "cancelled"].includes(urlStatus)) {
      setStatusFilter(urlStatus as typeof statusFilter);
    }
    if (urlSearch !== null) {
      setSearchQuery(urlSearch);
    }
    if (urlSort && ["newest", "oldest", "mostFunded", "endingSoon"].includes(urlSort)) {
      setSortBy(urlSort as typeof sortBy);
    }
  }, [searchParams, setStatusFilter, setSearchQuery, setSortBy]);

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
}

const CampaignsPage: NextPage = () => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      }
    >
      <CampaignsContent />
    </Suspense>
  );
};

export default CampaignsPage;
