"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCampaignStore } from "~~/services/store/campaignStore";

export const CampaignFilters = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { statusFilter, setStatusFilter, searchQuery, setSearchQuery, sortBy, setSortBy, resetFilters } =
    useCampaignStore();

  // Helper to update URL params
  const updateUrlParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all" && value !== "newest" && value !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.push(newUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleStatusChange = (filter: typeof statusFilter) => {
    setStatusFilter(filter);
    updateUrlParams("status", filter);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    updateUrlParams("q", query);
  };

  const handleSortChange = (sort: typeof sortBy) => {
    setSortBy(sort);
    updateUrlParams("sort", sort);
  };

  const handleReset = () => {
    resetFilters();
    router.push(pathname, { scroll: false });
  };

  return (
    <div className="bg-base-200 rounded-box p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="form-control flex-1">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search campaigns..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="form-control">
          <select
            className="select select-bordered"
            value={statusFilter}
            onChange={e => handleStatusChange(e.target.value as typeof statusFilter)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Sort */}
        <div className="form-control">
          <select
            className="select select-bordered"
            value={sortBy}
            onChange={e => handleSortChange(e.target.value as typeof sortBy)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostFunded">Most Funded</option>
            <option value="endingSoon">Ending Soon</option>
          </select>
        </div>

        {/* Reset */}
        <button className="btn btn-ghost btn-sm" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
};
