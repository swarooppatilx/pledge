/**
 * Pledge Protocol - React Hooks
 * Unified hooks for interacting with Pledge contracts
 */
import { useEffect, useRef } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { PledgeAbi, PledgeTokenAbi } from "~~/contracts/implementationContracts";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import type { HolderInfo, PledgeStatus, PledgeSummary } from "~~/types/pledge";

// ============ Factory Hooks ============

/**
 * Get all pledge addresses from the factory
 */
export const useAllPledges = () => {
  const { data, isLoading, refetch } = useScaffoldReadContract({
    contractName: "PledgeFactory",
    functionName: "getAllPledges",
  });

  return {
    pledges: (data as `0x${string}`[] | undefined) ?? [],
    isLoading,
    refetch,
  };
};

/**
 * Get pledge count
 */
export const usePledgeCount = () => {
  const { data, isLoading } = useScaffoldReadContract({
    contractName: "PledgeFactory",
    functionName: "pledgeCount",
  });

  return {
    count: data as bigint | undefined,
    isLoading,
  };
};

/**
 * Get pledges by creator
 */
export const useMyPledges = () => {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useScaffoldReadContract({
    contractName: "PledgeFactory",
    functionName: "getPledgesByCreator",
    args: [address],
  });

  return {
    pledges: (data as `0x${string}`[] | undefined) ?? [],
    isLoading,
    refetch,
  };
};

/**
 * Get bulk summaries for multiple pledges
 */
export const usePledgeSummaries = (addresses: `0x${string}`[]) => {
  const { data, isLoading, refetch } = useScaffoldReadContract({
    contractName: "PledgeFactory",
    functionName: "getSummaries",
    args: [addresses],
  });

  const summaries: PledgeSummary[] = data
    ? (data as readonly any[]).map((s: any) => ({
        address: s.pledge as `0x${string}`,
        creator: s.creator as `0x${string}`,
        token: s.token as `0x${string}`,
        name: s.name as string,
        ticker: s.ticker as string,
        fundingGoal: s.fundingGoal as bigint,
        deadline: s.deadline as bigint,
        totalRaised: s.totalRaised as bigint,
        founderShareBps: s.founderShareBps as bigint,
        status: Number(s.status) as PledgeStatus,
        vaultBalance: s.vaultBalance as bigint,
        treasuryShares: s.treasuryShares as bigint,
        circulatingSupply: s.circulatingSupply as bigint,
      }))
    : [];

  return { summaries, isLoading, refetch };
};

/**
 * Get all pledge summaries
 */
export const useAllPledgeSummaries = () => {
  const { data, isLoading, refetch } = useScaffoldReadContract({
    contractName: "PledgeFactory",
    functionName: "getAllSummaries",
  });

  const summaries: PledgeSummary[] = data
    ? (data as readonly any[]).map((s: any) => ({
        address: s.pledge as `0x${string}`,
        creator: s.creator as `0x${string}`,
        token: s.token as `0x${string}`,
        name: s.name as string,
        ticker: s.ticker as string,
        fundingGoal: s.fundingGoal as bigint,
        deadline: s.deadline as bigint,
        totalRaised: s.totalRaised as bigint,
        founderShareBps: s.founderShareBps as bigint,
        status: Number(s.status) as PledgeStatus,
        vaultBalance: s.vaultBalance as bigint,
        treasuryShares: s.treasuryShares as bigint,
        circulatingSupply: s.circulatingSupply as bigint,
      }))
    : [];

  return { summaries, isLoading, refetch };
};

// ============ Create Pledge ============

/**
 * Create a new pledge (requires 0.01 ETH listing tax)
 */
export const useCreatePledge = () => {
  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "PledgeFactory",
  });

  const createPledge = async (params: {
    name: string;
    ticker: string;
    description: string;
    imageUrl: string;
    fundingGoal: bigint;
    durationDays: bigint;
    founderShareBps: bigint;
  }) => {
    const tx = await writeContractAsync({
      functionName: "createPledge",
      args: [
        params.name,
        params.ticker,
        params.description,
        params.imageUrl,
        params.fundingGoal,
        params.durationDays,
        params.founderShareBps,
      ],
      value: 10000000000000000n, // 0.01 ETH listing tax
    });
    return tx;
  };

  return { createPledge, isPending };
};

// ============ Pledge Detail Hooks ============

/**
 * Get detailed pledge info (for detail page)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const usePledgeDetails = (pledgeAddress: `0x${string}`) => {
  const { data: contractInfo } = useDeployedContractInfo("PledgeFactory");

  // We need to call the pledge contract directly for full details
  // This would require setting up a dynamic contract call
  // For now, return mock structure
  return {
    isLoading: !contractInfo,
  };
};

/**
 * Get holder position info
 */
export const useHolderInfo = (pledgeAddress: `0x${string}`) => {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: pledgeAddress,
    abi: PledgeAbi,
    functionName: "getHolderInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!pledgeAddress,
    },
  });

  const holderInfo: HolderInfo | null = data
    ? {
        shareBalance: data[0],
        contribution: data[1],
        pendingRewards: data[2],
        redeemableValue: data[3],
        ownershipPercent: data[4],
      }
    : null;

  return {
    holderInfo,
    isLoading,
    refetch,
  };
};

/**
 * Get yield-related stats from a pledge
 */
export const usePledgeYieldStats = (pledgeAddress: `0x${string}`) => {
  const {
    data: accruedYield,
    isLoading: accruedLoading,
    refetch: refetchAccrued,
  } = useReadContract({
    address: pledgeAddress,
    abi: PledgeAbi,
    functionName: "getAccruedYield",
    query: {
      enabled: !!pledgeAddress,
    },
  });

  const {
    data: totalYieldHarvested,
    isLoading: harvestedLoading,
    refetch: refetchHarvested,
  } = useReadContract({
    address: pledgeAddress,
    abi: PledgeAbi,
    functionName: "totalYieldHarvested",
    query: {
      enabled: !!pledgeAddress,
    },
  });

  const {
    data: totalPrincipal,
    isLoading: principalLoading,
    refetch: refetchPrincipal,
  } = useReadContract({
    address: pledgeAddress,
    abi: PledgeAbi,
    functionName: "totalPrincipal",
    query: {
      enabled: !!pledgeAddress,
    },
  });

  const {
    data: floorPrice,
    isLoading: floorLoading,
    refetch: refetchFloor,
  } = useReadContract({
    address: pledgeAddress,
    abi: PledgeAbi,
    functionName: "floorPricePerShare",
    query: {
      enabled: !!pledgeAddress,
    },
  });

  const {
    data: icoPrice,
    isLoading: icoLoading,
    refetch: refetchIco,
  } = useReadContract({
    address: pledgeAddress,
    abi: PledgeAbi,
    functionName: "icoPrice",
    query: {
      enabled: !!pledgeAddress,
    },
  });

  const refetch = () => {
    refetchAccrued();
    refetchHarvested();
    refetchPrincipal();
    refetchFloor();
    refetchIco();
  };

  return {
    accruedYield: (accruedYield as bigint) ?? 0n,
    totalYieldHarvested: (totalYieldHarvested as bigint) ?? 0n,
    totalPrincipal: (totalPrincipal as bigint) ?? 0n,
    floorPrice: (floorPrice as bigint) ?? 0n,
    icoPrice: (icoPrice as bigint) ?? 0n,
    isLoading: accruedLoading || harvestedLoading || principalLoading || floorLoading || icoLoading,
    refetch,
  };
};

/**
 * Get public shares remaining for ICO
 */
export const usePublicSharesRemaining = (pledgeAddress: `0x${string}`) => {
  const { data, isLoading, refetch } = useReadContract({
    address: pledgeAddress,
    abi: PledgeAbi,
    functionName: "publicSharesRemaining",
    query: {
      enabled: !!pledgeAddress,
    },
  });

  return {
    sharesRemaining: (data as bigint) ?? 0n,
    isLoading,
    refetch,
  };
};

/**
 * Finalize a failed ICO (emits ICOFailed event)
 */
export const useFinalizeICO = () => {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const finalize = async (pledgeAddress: `0x${string}`) => {
    const tx = await writeContractAsync({
      address: pledgeAddress,
      abi: PledgeAbi,
      functionName: "finalizeICO",
    });
    return tx;
  };

  return { finalize, isPending, isConfirming, isSuccess, hash };
};

/**
 * Harvest yield (80% to holders, 20% to protocol)
 */
export const useHarvestYield = () => {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const harvest = async (pledgeAddress: `0x${string}`) => {
    const tx = await writeContractAsync({
      address: pledgeAddress,
      abi: PledgeAbi,
      functionName: "harvestYield",
    });
    return tx;
  };

  return { harvest, isPending, isConfirming, isSuccess, hash };
};

// ============ Write Hooks (require pledge address) ============

/**
 * Contribute ETH to a pledge during ICO
 * Calls the payable contribute() function on the Pledge contract
 */
export const useContribute = () => {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const contribute = async (pledgeAddress: `0x${string}`, amount: bigint) => {
    const tx = await writeContractAsync({
      address: pledgeAddress,
      abi: PledgeAbi,
      functionName: "contribute",
      value: amount,
    });
    return tx;
  };

  return { contribute, isPending, isConfirming, isSuccess, hash };
};

/**
 * Redeem shares for pro-rata vault assets
 * @param amount Number of shares to redeem
 * @param minReceived Minimum ETH to receive (slippage protection, 0 for no protection)
 */
export const useRedeem = () => {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const redeem = async (pledgeAddress: `0x${string}`, amount: bigint, minReceived: bigint = 0n) => {
    const tx = await writeContractAsync({
      address: pledgeAddress,
      abi: PledgeAbi,
      functionName: "redeem",
      args: [amount, minReceived],
    });
    return tx;
  };

  return { redeem, isPending, isConfirming, isSuccess, hash };
};

/**
 * Claim pending rewards (yield + dividends)
 */
export const useClaimRewards = () => {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = async (pledgeAddress: `0x${string}`) => {
    const tx = await writeContractAsync({
      address: pledgeAddress,
      abi: PledgeAbi,
      functionName: "claimRewards",
    });
    return tx;
  };

  return { claim, isPending, isConfirming, isSuccess, hash };
};

/**
 * Deposit project revenue as dividends
 */
export const useDepositDividend = () => {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deposit = async (pledgeAddress: `0x${string}`, amount: bigint) => {
    const tx = await writeContractAsync({
      address: pledgeAddress,
      abi: PledgeAbi,
      functionName: "depositDividend",
      value: amount,
    });
    return tx;
  };

  return { deposit, isPending, isConfirming, isSuccess, hash };
};

/**
 * Request refund if ICO failed
 */
export const useRefund = () => {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const refund = async (pledgeAddress: `0x${string}`) => {
    const tx = await writeContractAsync({
      address: pledgeAddress,
      abi: PledgeAbi,
      functionName: "refund",
    });
    return tx;
  };

  return { refund, isPending, isConfirming, isSuccess, hash };
};

/**
 * Buy treasury stock (shares recycled from redemptions)
 */
export const useBuyTreasuryStock = () => {
  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const buyTreasuryStock = async (pledgeAddress: `0x${string}`, shares: bigint, cost: bigint) => {
    const tx = await writeContractAsync({
      address: pledgeAddress,
      abi: PledgeAbi,
      functionName: "buyTreasuryStock",
      args: [shares],
      value: cost,
    });
    return tx;
  };

  return { buyTreasuryStock, isPending, isConfirming, isSuccess, hash };
};

// ============ Founder Share Tracking ============

/**
 * Track founder's current share ownership and changes over time
 * Detects when founder sells shares and shows trend
 */
export const useFounderShare = (tokenAddress: `0x${string}`, creatorAddress: `0x${string}`) => {
  const previousBalance = useRef<bigint | null>(null);
  const previousPercentage = useRef<number | null>(null);

  const TOTAL_SUPPLY = BigInt(1_000_000) * BigInt(1e18);

  // Get founder's current token balance
  const { data: founderBalance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: PledgeTokenAbi,
    functionName: "balanceOf",
    args: [creatorAddress],
    query: {
      enabled: !!tokenAddress && !!creatorAddress,
      refetchInterval: 10000, // Poll every 10 seconds
    },
  });

  const currentBalance = (founderBalance as bigint) ?? 0n;
  const currentPercentage = Number((currentBalance * 10000n) / TOTAL_SUPPLY) / 100; // In percentage

  // Track previous value
  useEffect(() => {
    if (founderBalance !== undefined && previousBalance.current === null) {
      previousBalance.current = currentBalance;
      previousPercentage.current = currentPercentage;
    }
  }, [founderBalance, currentBalance, currentPercentage]);

  // Calculate trend
  const prevPct = previousPercentage.current ?? currentPercentage;
  const trend: "up" | "down" | "neutral" = currentPercentage > prevPct ? "up" : currentPercentage < prevPct ? "down" : "neutral";
  const changeAmount = currentPercentage - prevPct;

  // Update previous when there's a real change
  useEffect(() => {
    if (founderBalance !== undefined && previousBalance.current !== null && previousBalance.current !== currentBalance) {
      previousBalance.current = currentBalance;
      previousPercentage.current = currentPercentage;
    }
  }, [founderBalance, currentBalance, currentPercentage]);

  return {
    currentBalance,
    currentPercentage,
    previousPercentage: prevPct,
    trend,
    changeAmount,
    isLoading,
    refetch,
  };
};

