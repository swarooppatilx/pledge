"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ContributorList } from "./_components";
import { Address } from "@scaffold-ui/components";
import { formatEther, parseEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ArrowLeftIcon, PhotoIcon, ShareIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { withTransactionNotification } from "~~/hooks/useTransactionNotification";
import { CampaignStatus, contributeSchema, getStatusColor, getStatusLabel } from "~~/utils/campaign";
import { notification } from "~~/utils/scaffold-eth";

type CampaignStatusType = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignAddress = params.address as `0x${string}`;
  const { address: userAddress, isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeError, setContributeError] = useState("");

  // Get Campaign ABI from externalContracts
  const { data: campaignContractInfo } = useDeployedContractInfo({ contractName: "Campaign" });
  const campaignAbi = campaignContractInfo?.abi;

  // Read campaign details
  const {
    data: campaignDetails,
    isLoading,
    refetch,
  } = useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "getCampaignDetails",
    query: { enabled: !!campaignAbi },
  });

  // Read user's contribution
  const { data: userContribution } = useReadContract({
    address: campaignAddress,
    abi: campaignAbi,
    functionName: "getContribution",
    args: [userAddress],
    query: { enabled: !!campaignAbi && !!userAddress },
  });

  // Write contract hook
  const { writeContractAsync, isPending } = useWriteContract();

  if (isLoading || !campaignDetails || !campaignAbi) {
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
    string, // imageUrl
  ];

  const [
    creator,
    fundingGoal,
    deadline,
    totalRaised,
    status,
    title,
    description,
    createdAt,
    contributorCount,
    imageUrl,
  ] = details;

  const progress = fundingGoal > 0n ? Number((totalRaised * 100n) / fundingGoal) : 0;
  const deadlineDate = new Date(Number(deadline) * 1000);
  const createdDate = new Date(Number(createdAt) * 1000);
  const isExpired = Date.now() > Number(deadline) * 1000;
  const isCreator = userAddress?.toLowerCase() === creator.toLowerCase();
  const hasContributed = userContribution && (userContribution as bigint) > 0n;
  const currentStatus = status as CampaignStatusType;

  const handleContribute = async () => {
    if (!campaignAbi) return;
    setContributeError("");
    const result = contributeSchema.safeParse({ amount: contributeAmount });
    if (!result.success) {
      setContributeError(result.error.errors[0].message);
      return;
    }

    const txResult = await withTransactionNotification(
      `Contributing ${contributeAmount} ETH...`,
      "Contribution successful! 🎉",
      "Contribution failed",
      () =>
        writeContractAsync({
          address: campaignAddress,
          abi: campaignAbi,
          functionName: "contribute",
          value: parseEther(contributeAmount),
        }),
    );

    if (txResult) {
      setContributeAmount("");
      refetch();
    }
  };

  const handleWithdraw = async () => {
    if (!campaignAbi) return;
    const txResult = await withTransactionNotification(
      "Withdrawing funds...",
      "Withdrawal successful! 💰",
      "Withdrawal failed",
      () =>
        writeContractAsync({
          address: campaignAddress,
          abi: campaignAbi,
          functionName: "withdraw",
        }),
    );

    if (txResult) refetch();
  };

  const handleRefund = async () => {
    if (!campaignAbi) return;
    const txResult = await withTransactionNotification(
      "Claiming refund...",
      "Refund claimed! 💸",
      "Refund failed",
      () =>
        writeContractAsync({
          address: campaignAddress,
          abi: campaignAbi,
          functionName: "refund",
        }),
    );

    if (txResult) refetch();
  };

  const handleFinalize = async () => {
    if (!campaignAbi) return;
    const txResult = await withTransactionNotification(
      "Finalizing campaign...",
      "Campaign finalized! ✅",
      "Finalize failed",
      () =>
        writeContractAsync({
          address: campaignAddress,
          abi: campaignAbi,
          functionName: "finalize",
        }),
    );

    if (txResult) refetch();
  };

  const handleCancel = async () => {
    if (!campaignAbi) return;
    const txResult = await withTransactionNotification(
      "Cancelling campaign...",
      "Campaign cancelled",
      "Cancel failed",
      () =>
        writeContractAsync({
          address: campaignAddress,
          abi: campaignAbi,
          functionName: "cancel",
        }),
    );

    if (txResult) refetch();
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
          {/* Campaign Image */}
          {imageUrl ? (
            <div className="card bg-base-100 shadow-xl overflow-hidden">
              <figure className="relative h-64 md:h-80">
                <Image src={imageUrl} alt={title} fill className="object-cover" />
              </figure>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-xl overflow-hidden">
              <figure className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <PhotoIcon className="h-20 w-20 text-base-content/20" />
              </figure>
            </div>
          )}

          {/* Title & Status */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <h1 className="text-3xl font-bold">{title}</h1>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => {
                      const url = window.location.href;
                      if (navigator.share) {
                        navigator.share({ title, text: description, url });
                      } else {
                        navigator.clipboard.writeText(url);
                        notification.success("Link copied to clipboard!");
                      }
                    }}
                    title="Share campaign"
                  >
                    <ShareIcon className="h-5 w-5" />
                  </button>
                  <span className={`badge badge-lg ${getStatusColor(currentStatus)}`}>
                    {getStatusLabel(currentStatus)}
                  </span>
                </div>
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

          {/* Contributors List */}
          <ContributorList campaignAddress={campaignAddress} />
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
