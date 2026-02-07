"use client";

import { Address } from "@scaffold-ui/components";
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, MinusIcon } from "@heroicons/react/24/outline";

type FounderShareCardProps = {
  founderAddress: `0x${string}`;
  currentPercentage: number;
  previousPercentage: number;
  trend: "up" | "down" | "neutral";
  changeAmount: number;
  isLoading?: boolean;
};

/**
 * FounderShareCard Component
 * Displays founder's current share ownership with trend indicator
 * Uniswap v4 dark aesthetic
 */
export const FounderShareCard = ({
  founderAddress,
  currentPercentage,
  previousPercentage,
  trend,
  changeAmount,
  isLoading = false,
}: FounderShareCardProps) => {
  const TrendIcon = trend === "up" ? ArrowTrendingUpIcon : trend === "down" ? ArrowTrendingDownIcon : MinusIcon;
  const trendColor = trend === "up" ? "text-[#27AE60]" : trend === "down" ? "text-[#EB5757]" : "text-[#5E5E5E]";
  const trendBg = trend === "up" ? "bg-[#27AE60]/10" : trend === "down" ? "bg-[#EB5757]/10" : "bg-[#5E5E5E]/10";

  return (
    <div className="card-pledge p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-label text-muted mb-1">Founder Share</div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <span className="loading loading-spinner loading-sm text-[#FF007A]"></span>
            ) : (
              <>
                <span className="text-h2 font-mono text-white">{currentPercentage.toFixed(2)}%</span>
                {previousPercentage !== currentPercentage && (
                  <span className="text-xs text-[#5E5E5E] font-mono">was {previousPercentage.toFixed(2)}%</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Trend Indicator */}
        {trend !== "neutral" && !isLoading && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${trendBg}`}>
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <span className={`text-xs font-mono ${trendColor}`}>
              {changeAmount > 0 ? "+" : ""}
              {changeAmount.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Founder Address */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#5E5E5E]">Founder:</span>
        <Address address={founderAddress} format="short" />
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="h-2 bg-[#1B1B1B] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF007A] to-[#FF5CAA] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(currentPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-[#5E5E5E]">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

export default FounderShareCard;
