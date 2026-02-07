"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import { formatEther, parseEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { CampaignStatus, contributeSchema, getStatusColor, getStatusLabel } from "~~/utils/campaign";
import { CampaignAbi } from "~~/utils/campaign/campaignAbi";
import { notification } from "~~/utils/scaffold-eth";

type CampaignStatusType = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignAddress = params.address as `0x${string}`;
  const { address: userAddress, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeError, setContributeError] = useState("");

  // Read campaign details
  const {
    data: campaignDetails,
    isLoading,
    refetch,
  } = useReadContract({
    address: campaignAddress,
    abi: CampaignAbi,
    functionName: "getCampaignDetails",
  });

  // Read user's contribution
  const { data: userContribution } = useReadContract({
    address: campaignAddress,
    abi: CampaignAbi,
    functionName: "getContribution",
    args: [userAddress],
    query: { enabled: !!userAddress },
  });

  // Write contract hook
  const { writeContractAsync, isPending } = useWriteContract();

  if (isLoading || !campaignDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  const details = campaignDetails as readonly [
    `0x${string}`, // creator
    bigint, // fundingGoal
    bigint, // deadline
    bigint, // totalRaised
    number, // status
    string, // title
    string, // description
    bigint, // createdAt
    bigint, // contributorCount
  ];

  const [creator, fundingGoal, deadline, totalRaised, status, title, description, createdAt, contributorCount] =
    details;

  const progress = fundingGoal > 0n ? Number((totalRaised * 100n) / fundingGoal) : 0;
  const deadlineDate = new Date(Number(deadline) * 1000);
  const createdDate = new Date(Number(createdAt) * 1000);
  const isExpired = Date.now() > Number(deadline) * 1000;
  const isCreator = userAddress?.toLowerCase() === creator.toLowerCase();
  const hasContributed = userContribution && (userContribution as bigint) > 0n;
  const currentStatus = status as CampaignStatusType;

  const handleContribute = async () => {
    setContributeError("");
    const result = contributeSchema.safeParse({ amount: contributeAmount });
    if (!result.success) {
      setContributeError(result.error.errors[0].message);
      return;
    }

    try {
      await writeContractAsync({
        address: campaignAddress,
        abi: CampaignAbi,
        functionName: "contribute",
        value: parseEther(contributeAmount),
      });
      setContributeAmount("");
      notification.success("Contribution successful!");
      refetch();
    } catch (error) {
      console.error("Contribution failed:", error);
      notification.error("Contribution failed");
    }
  };

  const handleWithdraw = async () => {
    try {
      await writeContractAsync({
        address: campaignAddress,
        abi: CampaignAbi,
        functionName: "withdraw",
      });
      notification.success("Withdrawal successful!");
      refetch();
    } catch (error) {
      console.error("Withdrawal failed:", error);
      notification.error("Withdrawal failed");
    }
  };

  const handleRefund = async () => {
    try {
      await writeContractAsync({
        address: campaignAddress,
        abi: CampaignAbi,
        functionName: "refund",
      });
      notification.success("Refund claimed!");
      refetch();
    } catch (error) {
      console.error("Refund failed:", error);
      notification.error("Refund failed");
    }
  };

  const handleFinalize = async () => {
    try {
      await writeContractAsync({
        address: campaignAddress,
        abi: CampaignAbi,
        functionName: "finalize",
      });
      notification.success("Campaign finalized!");
      refetch();
    } catch (error) {
      console.error("Finalize failed:", error);
      notification.error("Finalize failed");
    }
  };

  const handleCancel = async () => {
    try {
      await writeContractAsync({
        address: campaignAddress,
        abi: CampaignAbi,
        functionName: "cancel",
      });
      notification.success("Campaign cancelled!");
      refetch();
    } catch (error) {
      console.error("Cancel failed:", error);
      notification.error("Cancel failed");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Link href="/campaigns" className="btn btn-ghost btn-sm gap-2 mb-6">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Campaigns
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Status */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <h1 className="text-3xl font-bold">{title}</h1>
                <span className={`badge badge-lg ${getStatusColor(currentStatus)}`}>
                  {getStatusLabel(currentStatus)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-base-content/60 mt-2">
                <span>Created by</span>
                <Address
                  address={creator}
                  chain={targetNetwork}
                  blockExplorerAddressLink={
                    targetNetwork.id === hardhat.id ? `/blockexplorer/address/${creator}` : undefined
                  }
                />
              </div>

              <div className="divider"></div>

              <p className="whitespace-pre-wrap">{description}</p>
            </div>
          </div>

          {/* Campaign Details */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Campaign Details</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="stat bg-base-200 rounded-box p-4">
                  <div className="stat-title">Goal</div>
                  <div className="stat-value text-lg">{formatEther(fundingGoal)} ETH</div>
                </div>
                <div className="stat bg-base-200 rounded-box p-4">
                  <div className="stat-title">Raised</div>
                  <div className="stat-value text-lg text-primary">{formatEther(totalRaised)} ETH</div>
                </div>
                <div className="stat bg-base-200 rounded-box p-4">
                  <div className="stat-title">Backers</div>
                  <div className="stat-value text-lg">{Number(contributorCount)}</div>
                </div>
                <div className="stat bg-base-200 rounded-box p-4">
                  <div className="stat-title">{isExpired ? "Ended" : "Deadline"}</div>
                  <div className="stat-value text-lg">{deadlineDate.toLocaleDateString()}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">{progress}% funded</span>
                </div>
                <progress
                  className={`progress w-full h-4 ${progress >= 100 ? "progress-success" : "progress-primary"}`}
                  value={Math.min(progress, 100)}
                  max="100"
                />
              </div>

              <div className="text-sm text-base-content/60 mt-4">
                <p>Created: {createdDate.toLocaleDateString()}</p>
                <p className="flex items-center gap-2 mt-1">
                  Contract:
                  <Address
                    address={campaignAddress}
                    chain={targetNetwork}
                    blockExplorerAddressLink={
                      targetNetwork.id === hardhat.id ? `/blockexplorer/address/${campaignAddress}` : undefined
                    }
                  />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Contribute Section */}
          {currentStatus === CampaignStatus.Active && !isExpired ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Back this Campaign</h2>
                <p className="text-sm text-base-content/60">Support this campaign with ETH</p>

                {isConnected ? (
                  <div className="space-y-4 mt-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Amount (ETH)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="0.0"
                        className="input input-bordered w-full"
                        value={contributeAmount}
                        onChange={e => setContributeAmount(e.target.value)}
                      />
                      {contributeError && (
                        <label className="label">
                          <span className="label-text-alt text-error">{contributeError}</span>
                        </label>
                      )}
                    </div>
                    <button
                      className={`btn btn-primary w-full ${isPending ? "loading" : ""}`}
                      onClick={handleContribute}
                      disabled={isPending || !contributeAmount}
                    >
                      {isPending ? "Processing..." : "Contribute"}
                    </button>
                  </div>
                ) : (
                  <div className="alert mt-4">
                    <span>Connect your wallet to contribute</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Your Contribution */}
          {hasContributed ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Your Contribution</h2>
                <div className="stat p-0 mt-2">
                  <div className="stat-value text-primary">{formatEther(userContribution as bigint)} ETH</div>
                </div>

                {/* Refund Button */}
                {currentStatus === CampaignStatus.Failed || currentStatus === CampaignStatus.Cancelled ? (
                  <button
                    className={`btn btn-warning w-full mt-4 ${isPending ? "loading" : ""}`}
                    onClick={handleRefund}
                    disabled={isPending}
                  >
                    {isPending ? "Processing..." : "Claim Refund"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Creator Actions */}
          {isCreator ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Creator Actions</h2>

                {/* Withdraw */}
                {currentStatus === CampaignStatus.Successful ? (
                  <button
                    className={`btn btn-success w-full mt-4 ${isPending ? "loading" : ""}`}
                    onClick={handleWithdraw}
                    disabled={isPending}
                  >
                    {isPending ? "Processing..." : "Withdraw Funds"}
                  </button>
                ) : null}

                {/* Cancel */}
                {currentStatus === CampaignStatus.Active && !isExpired ? (
                  <button
                    className={`btn btn-error w-full mt-4 ${isPending ? "loading" : ""}`}
                    onClick={handleCancel}
                    disabled={isPending}
                  >
                    {isPending ? "Processing..." : "Cancel Campaign"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Finalize Action */}
          {currentStatus === CampaignStatus.Active && isExpired ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Finalize Campaign</h2>
                <p className="text-sm text-base-content/60">Deadline has passed. Anyone can finalize this campaign.</p>
                <button
                  className={`btn btn-primary w-full mt-4 ${isPending ? "loading" : ""}`}
                  onClick={handleFinalize}
                  disabled={isPending}
                >
                  {isPending ? "Processing..." : "Finalize Campaign"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
