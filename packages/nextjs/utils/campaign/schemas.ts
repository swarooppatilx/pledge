import { isAddress, parseEther } from "viem";
import { z } from "zod";

/**
 * Campaign Status enum matching Solidity
 */
export const CampaignStatus = {
  Active: 0,
  Successful: 1,
  Failed: 2,
  Cancelled: 3,
} as const;

export type CampaignStatusType = (typeof CampaignStatus)[keyof typeof CampaignStatus];

/**
 * Campaign creation form schema
 */
export const createCampaignSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters")
    .trim(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be at most 2000 characters")
    .trim(),
  fundingGoal: z
    .string()
    .refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Funding goal must be a positive number")
    .refine(val => {
      const num = parseFloat(val);
      return num >= 0.001;
    }, "Minimum funding goal is 0.001 ETH"),
  durationDays: z
    .number()
    .int("Duration must be a whole number")
    .min(1, "Duration must be at least 1 day")
    .max(365, "Duration must be at most 365 days"),
  imageUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

/**
 * Contribution form schema
 */
export const contributeSchema = z.object({
  amount: z
    .string()
    .refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Amount must be a positive number")
    .refine(val => {
      const num = parseFloat(val);
      return num >= 0.0001;
    }, "Minimum contribution is 0.0001 ETH"),
});

export type ContributeInput = z.infer<typeof contributeSchema>;

/**
 * Ethereum address validation schema
 */
export const addressSchema = z.string().refine(val => isAddress(val), "Invalid Ethereum address");

/**
 * Campaign data from contract
 */
export const campaignDataSchema = z.object({
  address: addressSchema,
  creator: addressSchema,
  fundingGoal: z.bigint(),
  deadline: z.bigint(),
  totalRaised: z.bigint(),
  status: z.number().min(0).max(3),
  title: z.string(),
  description: z.string(),
  createdAt: z.bigint(),
  contributorCount: z.bigint(),
});

export type CampaignData = z.infer<typeof campaignDataSchema>;

/**
 * Helper to convert form input to contract params
 */
export function toContractParams(input: CreateCampaignInput) {
  return {
    fundingGoal: parseEther(input.fundingGoal),
    durationDays: BigInt(input.durationDays),
    title: input.title,
    description: input.description,
  };
}

/**
 * Helper to get status label from status number
 */
export function getStatusLabel(status: CampaignStatusType): string {
  switch (status) {
    case CampaignStatus.Active:
      return "Active";
    case CampaignStatus.Successful:
      return "Successful";
    case CampaignStatus.Failed:
      return "Failed";
    case CampaignStatus.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
}

/**
 * Helper to get status color class
 */
export function getStatusColor(status: CampaignStatusType): string {
  switch (status) {
    case CampaignStatus.Active:
      return "badge-primary";
    case CampaignStatus.Successful:
      return "badge-success";
    case CampaignStatus.Failed:
      return "badge-error";
    case CampaignStatus.Cancelled:
      return "badge-warning";
    default:
      return "badge-ghost";
  }
}
