"use client";

import React from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T, index: number) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
};

/**
 * Data Table Component
 * Uniswap-style table with hover states and monospace numerics
 * Based on the data_table specification
 */
export function DataTable<T>({
  data,
  columns,
  onRowClick,
  isLoading = false,
  emptyState,
  className = "",
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <div className="py-12">{emptyState}</div>;
  }

  return (
    <table className={`table-pledge ${className}`}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} className={col.headerClassName}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index} onClick={() => onRowClick?.(item, index)} className={onRowClick ? "cursor-pointer" : ""}>
            {columns.map(col => (
              <td key={col.key} className={col.className}>
                {col.render(item, index)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Price Cell Component - Market Price with Floor Price below
 * Critical UX: Market Price dominant, Floor Price muted below
 */
export const PriceCell = ({
  marketPrice,
  floorPrice,
  symbol = "Ξ",
}: {
  marketPrice: string;
  floorPrice: string;
  symbol?: string;
}) => {
  return (
    <div className="flex flex-col">
      <span className="price-market">
        {symbol}
        {marketPrice}
      </span>
      <span className="price-floor">
        Floor: {symbol}
        {floorPrice}
      </span>
    </div>
  );
};

/**
 * Trend Cell Component - Shows percentage with color
 */
export const TrendCell = ({ value, prefix = "" }: { value: number; prefix?: string }) => {
  const isPositive = value >= 0;
  return (
    <span className={`cell-numeric ${isPositive ? "trend-up" : "trend-down"}`}>
      {prefix}
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
};

export default DataTable;
