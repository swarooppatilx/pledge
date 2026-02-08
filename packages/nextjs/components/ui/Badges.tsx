"use client";

import React from "react";
import { ArrowPathIcon, ExclamationTriangleIcon, LockClosedIcon } from "@heroicons/react/24/outline";

/**
 * ICO Lock Badge
 * Shown when trading is locked during ICO phase
 */
export const IcoLockBadge = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`tag-ico-lock flex items-center gap-1 ${className}`}>
      <LockClosedIcon className="w-3 h-3" />
      <span>ICO Phase</span>
    </div>
  );
};

/**
 * Redeem Warning Overlay
 * Critical UX: Warns users about permanent exit
 */
export const RedeemWarning = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`warning-overlay flex items-start gap-3 ${className}`}>
      <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <strong>Warning:</strong> Redeeming permanently exits your position and burns your claim to future dividends.
      </div>
    </div>
  );
};

/**
 * Recycled Tag
 * Shows when a project has high treasury recycling
 */
export const RecycledTag = ({ treasuryPercent, className = "" }: { treasuryPercent: number; className?: string }) => {
  if (treasuryPercent < 10) return null;

  return (
    <div className={`tag-recycled flex items-center gap-1 ${className}`}>
      <ArrowPathIcon className="w-3 h-3" />
      <span>{treasuryPercent.toFixed(0)}% Recycled</span>
    </div>
  );
};

/**
 * Status Badge
 * Generic status indicator
 */
export const StatusBadge = ({
  status,
  variant = "default",
  className = "",
}: {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
  className?: string;
}) => {
  const variantClasses = {
    default: "bg-base-300 text-text-body",
    success: "tag-success",
    warning: "tag-ico-lock",
    danger: "bg-[rgba(255,67,67,0.1)] text-danger",
    primary: "tag-primary",
  };

  return <span className={`tag ${variantClasses[variant]} ${className}`}>{status}</span>;
};

/**
 * Tooltip component
 */
export const Tooltip = ({
  children,
  content,
  position = "top",
}: {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}) => {
  const positionClasses = {
    top: "tooltip-top",
    bottom: "tooltip-bottom",
    left: "tooltip-left",
    right: "tooltip-right",
  };

  return (
    <div className={`tooltip ${positionClasses[position]}`} data-tip={content}>
      {children}
    </div>
  );
};

export { IcoLockBadge as IcoLock };
