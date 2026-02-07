import { create } from "zustand";

type CampaignUIState = {
  // Campaign list filters
  statusFilter: "all" | "active" | "successful" | "failed" | "cancelled";
  searchQuery: string;
  sortBy: "newest" | "oldest" | "mostFunded" | "endingSoon";

  // Campaign creation form state
  isCreating: boolean;

  // Selected campaign for detail view
  selectedCampaignAddress: string | null;

  // Actions
  setStatusFilter: (filter: CampaignUIState["statusFilter"]) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: CampaignUIState["sortBy"]) => void;
  setIsCreating: (isCreating: boolean) => void;
  setSelectedCampaign: (address: string | null) => void;
  resetFilters: () => void;
};

const initialState = {
  statusFilter: "all" as const,
  searchQuery: "",
  sortBy: "newest" as const,
  isCreating: false,
  selectedCampaignAddress: null,
};

/**
 * Zustand store for campaign UI state
 * Does NOT duplicate blockchain state - only manages UI interactions
 */
export const useCampaignStore = create<CampaignUIState>(set => ({
  ...initialState,

  setStatusFilter: filter => set({ statusFilter: filter }),

  setSearchQuery: query => set({ searchQuery: query }),

  setSortBy: sort => set({ sortBy: sort }),

  setIsCreating: isCreating => set({ isCreating }),

  setSelectedCampaign: address => set({ selectedCampaignAddress: address }),

  resetFilters: () =>
    set({
      statusFilter: "all",
      searchQuery: "",
      sortBy: "newest",
    }),
}));
