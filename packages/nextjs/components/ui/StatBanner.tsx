"use client";

import React from "react";

type StatBannerItem = {
  label: string;
  value: string;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
};

type StatBannerProps = {
  items: StatBannerItem[];
  className?: string;
};

/**
 * Stat Banner Component
 * Displays key protocol metrics in a horizontal banner
 * Based on the Explore Market page blueprint
 */
export const StatBanner = ({ items, className = "" }: StatBannerProps) => {
  return (
    <div className={`stat-banner ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="stat-banner-item">
          <span className="stat-banner-label">{item.label}</span>
          <span className="stat-banner-value">{item.value}</span>
          {item.trend && (
            <span
              className={`stat-banner-trend ${
                item.trendType === "positive"
                  ? "positive"
                  : item.trendType === "negative"
                    ? "negative"
                    : "text-text-body"
              }`}
            >
              {item.trend}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Single Stat Card for grid layouts
 */
export const StatCard = ({
  label,
  value,
  trend,
  trendType = "neutral",
  icon,
  className = "",
}: StatBannerItem & { icon?: React.ReactNode; className?: string }) => {
  return (
    <div className={`card-pledge p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-label">{label}</span>
          <span className="text-h1 text-mono">{value}</span>
          {trend && (
            <span
              className={`text-sm font-medium ${
                trendType === "positive"
                  ? "text-success"
                  : trendType === "negative"
                    ? "text-danger"
                    : "text-text-body"
              }`}
            >
              {trend}
            </span>
          )}
        </div>
        {icon && <div className="text-text-muted">{icon}</div>}
      </div>
    </div>
  );
};

export default StatBanner;
