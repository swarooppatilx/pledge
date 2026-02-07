"use client";

import { useEffect, useState } from "react";
import { Address } from "@scaffold-ui/components";
import { Abi, formatEther } from "viem";
import { hardhat } from "viem/chains";
import { usePublicClient } from "wagmi";
import { ChevronDownIcon, ChevronUpIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";

type ContributorListProps = {
  campaignAddress: `0x${string}`;
};

type ContributorData = {
  address: `0x${string}`;
  amount: bigint;
};

export const ContributorList = ({ campaignAddress }: ContributorListProps) => {
  const publicClient = usePublicClient();
  const { targetNetwork } = useTargetNetwork();
  const { data: campaignContractInfo } = useDeployedContractInfo({ contractName: "Campaign" });

  const [contributors, setContributors] = useState<ContributorData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchContributors = async () => {
      if (!campaignContractInfo?.abi || !publicClient) return;

      setIsLoading(true);
      try {
        // Get all contributor addresses
        const contributorAddresses = await publicClient.readContract({
          address: campaignAddress,
          abi: campaignContractInfo.abi as Abi,
          functionName: "getContributors",
        });

        const addresses = contributorAddresses as `0x${string}`[];

        // Get contribution amount for each
        const contributorData: ContributorData[] = await Promise.all(
          addresses.map(async addr => {
            const amount = await publicClient.readContract({
              address: campaignAddress,
              abi: campaignContractInfo.abi as Abi,
              functionName: "getContribution",
              args: [addr],
            });
            return { address: addr, amount: amount as bigint };
          }),
        );

        // Sort by contribution amount descending
        contributorData.sort((a, b) => (b.amount > a.amount ? 1 : -1));
        setContributors(contributorData);
      } catch (error) {
        console.error("Failed to fetch contributors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContributors();
  }, [campaignAddress, campaignContractInfo?.abi, publicClient]);

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title gap-2">
            <UsersIcon className="h-5 w-5" />
            Contributors
          </h2>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </div>
    );
  }

  if (contributors.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title gap-2">
            <UsersIcon className="h-5 w-5" />
            Contributors
          </h2>
          <p className="text-base-content/60">No contributors yet. Be the first!</p>
        </div>
      </div>
    );
  }

  const displayedContributors = isExpanded ? contributors : contributors.slice(0, 5);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title gap-2">
          <UsersIcon className="h-5 w-5" />
          Contributors ({contributors.length})
        </h2>

        <div className="overflow-x-auto mt-2">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayedContributors.map((contributor, index) => (
                <tr key={contributor.address}>
                  <td className="text-base-content/50">{index + 1}</td>
                  <td>
                    <Address
                      address={contributor.address}
                      chain={targetNetwork}
                      blockExplorerAddressLink={
                        targetNetwork.id === hardhat.id ? `/blockexplorer/address/${contributor.address}` : undefined
                      }
                    />
                  </td>
                  <td className="text-right font-mono">{formatEther(contributor.amount)} ETH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {contributors.length > 5 && (
          <button className="btn btn-ghost btn-sm mt-2 gap-1" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <>
                <ChevronUpIcon className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4" />
                Show All ({contributors.length - 5} more)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
