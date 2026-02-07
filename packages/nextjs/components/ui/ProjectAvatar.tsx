"use client";

import React from "react";
import { blo } from "blo";

type ProjectAvatarProps = {
  /** ENS name or address to resolve avatar for */
  address: `0x${string}`;
  /** ENS avatar URL if available */
  ensAvatar?: string | null;
  /** Project name for fallback initials */
  name?: string;
  /** Size of the avatar */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

/**
 * Project Avatar Component
 * Uses ENS Avatar as primary, falls back to Identicon/Blo
 * Critical UX: ENS resolution with generated identicon fallback
 */
export const ProjectAvatar = ({ address, ensAvatar, name, size = "md", className = "" }: ProjectAvatarProps) => {
  const sizeClass = sizeClasses[size];

  // If ENS avatar is available, use it
  if (ensAvatar) {
    return (
      <img
        src={ensAvatar}
        alt={name || address}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={e => {
          // Fallback to blockie on error
          e.currentTarget.src = blo(address);
        }}
      />
    );
  }

  // Fallback to blockie/identicon
  return (
    <img src={blo(address)} alt={name || address} className={`${sizeClass} rounded-full object-cover ${className}`} />
  );
};

/**
 * Identicon Placeholder with initials
 * Used when no address is available
 */
export const IdenticonPlaceholder = ({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) => {
  const sizeClass = sizeClasses[size];
  const initials = name
    .split(" ")
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <div className={`identicon-placeholder ${sizeClass} ${className}`}>{initials}</div>;
};

export default ProjectAvatar;
