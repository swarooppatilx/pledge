"use client";

import { useCampaignStore } from "~~/services/store/campaignStore";

export const CampaignFilters = () => {
  const { statusFilter, setStatusFilter, searchQuery, setSearchQuery, sortBy, setSortBy, resetFilters } =
    useCampaignStore();

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
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="form-control">
          <select
            className="select select-bordered"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
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
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostFunded">Most Funded</option>
            <option value="endingSoon">Ending Soon</option>
          </select>
        </div>

        {/* Reset */}
        <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
          Reset
        </button>
      </div>
    </div>
  );
};
