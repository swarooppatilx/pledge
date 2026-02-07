"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";

type YieldTickerProps = {
  value: bigint;
  /** Optional: how often to check for updates (ms) */
  pollInterval?: number;
  /** Show full precision or truncated */
  precision?: number;
  className?: string;
  showPrefix?: boolean;
};

/**
 * Animated Yield Ticker Component
 * Visualizes real-time Aave yield accrual with smooth number transitions
 * Critical UX Feature: Numbers animate upward when the value changes
 */
export const YieldTicker = ({
  value,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pollInterval = 5000,
  precision = 8,
  className = "",
  showPrefix = true,
}: YieldTickerProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setIsUpdating(true);
      setDisplayValue(value);
      prevValueRef.current = value;

      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setIsUpdating(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [value]);

  // Format the value to show wei precision
  const formattedValue = formatEther(displayValue);
  const [whole, decimal] = formattedValue.split(".");
  const truncatedDecimal = decimal?.slice(0, precision) || "0".repeat(precision);

  return (
    <div className={`yield-ticker ${isUpdating ? "updating" : ""} ${className}`}>
      {showPrefix && <span className="text-text-muted mr-1">Ξ</span>}
      <span className="yield-ticker-value">
        <span className="text-text-hero">{whole}</span>
        <span className="text-text-muted">.</span>
        <span className="text-text-body">{truncatedDecimal}</span>
      </span>
    </div>
  );
};

/**
 * Simulated Yield Ticker that shows increasing values over time
 * Used for demo purposes when actual on-chain data isn't available
 */
export const SimulatedYieldTicker = ({
  baseValue,
  ratePerSecond = 0.00000001,
  precision = 8,
  className = "",
}: {
  baseValue: bigint;
  ratePerSecond?: number;
  precision?: number;
  className?: string;
}) => {
  const [currentValue, setCurrentValue] = useState(baseValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentValue(prev => {
        // Add a small amount each tick to simulate yield accrual
        const increment = BigInt(Math.floor(ratePerSecond * 1e18));
        return prev + increment;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [ratePerSecond]);

  return <YieldTicker value={currentValue} precision={precision} className={className} />;
};

export default YieldTicker;
