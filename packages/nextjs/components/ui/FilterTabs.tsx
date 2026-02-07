"use client";

import React from "react";

type FilterTab = {
  id: string;
  label: string;
};

type FilterTabsProps = {
  tabs: FilterTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
};

/**
 * Filter Tabs Component
 * Used for filtering content on Explore Market page
 * Syncs to URL via Zustand state management
 */
export const FilterTabs = ({ tabs, activeTab, onChange, className = "" }: FilterTabsProps) => {
  return (
    <div className={`filter-tabs ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`filter-tab ${activeTab === tab.id ? "active" : ""}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

/**
 * Search Bar Component
 * Header search with hotkey hint
 */
export const SearchBar = ({
  placeholder = "Search projects, tickets, or ENS...",
  value,
  onChange,
  onSubmit,
  className = "",
  showHotkey = true,
}: {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
  showHotkey?: boolean;
}) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onSubmit?.()}
        className="search-bar-pledge w-full pr-10"
      />
      {showHotkey && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-base-300 text-text-muted text-xs px-1.5 py-0.5 rounded">
          /
        </kbd>
      )}
    </div>
  );
};

export default FilterTabs;
