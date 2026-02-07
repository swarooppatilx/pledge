"use client";

import { formatEther } from "viem";
import { CampaignStatus, getStatusColor, getStatusLabel } from "~~/utils/campaign";

type CampaignStatusType = (typeof CampaignStatus)[keyof typeof CampaignStatus];

type CampaignCardProps = {
  address: string;
  title: string;
  description: string;
  fundingGoal: bigint;
  totalRaised: bigint;
  deadline: bigint;
  status: CampaignStatusType;
  contributorCount: bigint;
  onClick?: () => void;
};

export const CampaignCard = ({
  title,
  description,
  fundingGoal,
  totalRaised,
  deadline,
  status,
  contributorCount,
  onClick,
}: CampaignCardProps) => {
  const progress = fundingGoal > 0n ? Number((totalRaised * 100n) / fundingGoal) : 0;
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = Date.now() > Number(deadline) * 1000;
  const timeRemaining = isExpired ? "Ended" : getTimeRemaining(Number(deadline));

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer" onClick={onClick}>
      <div className="card-body">
        <div className="flex justify-between items-start">
          <h2 className="card-title text-lg line-clamp-1">{title}</h2>
          <span className={`badge ${getStatusColor(status)}`}>{getStatusLabel(status)}</span>
        </div>

        <p className="text-sm text-base-content/70 line-clamp-2 min-h-[2.5rem]">{description}</p>

        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold">{formatEther(totalRaised)} ETH</span>
            <span className="text-base-content/60">of {formatEther(fundingGoal)} ETH</span>
          </div>
          <progress
            className={`progress w-full ${progress >= 100 ? "progress-success" : "progress-primary"}`}
            value={Math.min(progress, 100)}
            max="100"
          />
          <div className="flex justify-between text-xs text-base-content/60 mt-1">
            <span>{progress}% funded</span>
            <span>{Number(contributorCount)} backers</span>
          </div>
        </div>

        <div className="divider my-2"></div>

        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className={isExpired ? "text-error" : "text-base-content/70"}>{timeRemaining}</span>
          </div>
          <span className="text-xs text-base-content/50">
            {isExpired ? "Ended" : `Ends ${deadlineDate.toLocaleDateString()}`}
          </span>
        </div>
      </div>
    </div>
  );
};

function getTimeRemaining(deadline: number): string {
  const now = Date.now();
  const remaining = deadline * 1000 - now;

  if (remaining <= 0) return "Ended";

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}
