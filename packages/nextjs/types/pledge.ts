/**
 * Pledge Protocol - TypeScript Types
 * Unified types for the Pledge Protocol frontend
 */

// ============ Pledge Status ============

export enum PledgeStatus {
  Funding = 0,
  Active = 1,
  Failed = 2,
}

// ============ Core Types ============

export type PledgeSummary = {
  address: `0x${string}`;
  creator: `0x${string}`;
  token: `0x${string}`;
  name: string;
  ticker: string;
  fundingGoal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  founderShareBps: bigint;
  status: PledgeStatus;
  vaultBalance: bigint;
  treasuryShares: bigint;
  circulatingSupply: bigint;
};

export type PledgeDetails = PledgeSummary & {
  description: string;
  imageUrl: string;
  accruedYield: bigint;
};

export type HolderInfo = {
  shareBalance: bigint;
  contribution: bigint;
  pendingRewards: bigint;
  redeemableValue: bigint;
  ownershipPercent: bigint;
};

// ============ Form Types ============

export type CreatePledgeParams = {
  name: string;
  ticker: string;
  description: string;
  imageUrl: string;
  fundingGoal: bigint;
  durationDays: bigint;
  founderShareBps: bigint;
};

// ============ Display Helpers ============

export const statusToString = (status: PledgeStatus): string => {
  switch (status) {
    case PledgeStatus.Funding:
      return "Funding";
    case PledgeStatus.Active:
      return "Active";
    case PledgeStatus.Failed:
      return "Failed";
    default:
      return "Unknown";
  }
};

export const statusToColor = (status: PledgeStatus): string => {
  switch (status) {
    case PledgeStatus.Funding:
      return "badge-warning";
    case PledgeStatus.Active:
      return "badge-success";
    case PledgeStatus.Failed:
      return "badge-error";
    default:
      return "badge-neutral";
  }
};

// ============ Calculation Helpers ============

export const calculateProgress = (raised: bigint, goal: bigint): number => {
  if (goal === 0n) return 0;
  return Number((raised * 100n) / goal);
};

export const calculateOwnership = (shares: bigint, circulating: bigint): number => {
  if (circulating === 0n) return 0;
  return Number((shares * 10000n) / circulating) / 100;
};

export const formatBps = (bps: bigint): string => {
  return `${Number(bps) / 100}%`;
};

export const isDeadlinePassed = (deadline: bigint): boolean => {
  return BigInt(Math.floor(Date.now() / 1000)) >= deadline;
};

export const timeRemaining = (deadline: bigint): string => {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= deadline) return "Ended";

  const remaining = Number(deadline - now);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return "< 1h";
};

// ============ Phase Helpers (for dashboard) ============

export const getPhaseColor = (phase: number): string => {
  switch (phase) {
    case PledgeStatus.Funding:
      return "badge-warning";
    case PledgeStatus.Active:
      return "badge-success";
    case PledgeStatus.Failed:
      return "badge-error";
    default:
      return "badge-neutral";
  }
};

export const getPhaseLabel = (phase: number): string => {
  switch (phase) {
    case PledgeStatus.Funding:
      return "Funding";
    case PledgeStatus.Active:
      return "Active";
    case PledgeStatus.Failed:
      return "Failed";
    default:
      return "Unknown";
  }
};
