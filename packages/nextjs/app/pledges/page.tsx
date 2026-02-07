"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useAllPledgeSummaries, useCreatePledge } from "~~/hooks/usePledge";
import { calculateProgress, formatBps, statusToColor, statusToString, timeRemaining } from "~~/types/pledge";

const PledgesPage: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { summaries, isLoading, refetch } = useAllPledgeSummaries();
  const { createPledge, isPending } = useCreatePledge();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ticker: "",
    description: "",
    imageUrl: "",
    fundingGoal: "",
    durationDays: "30",
    founderShareBps: "5100",
  });

  const handleCreate = async () => {
    try {
      await createPledge({
        name: formData.name,
        ticker: formData.ticker.toUpperCase(),
        description: formData.description,
        imageUrl: formData.imageUrl,
        fundingGoal: parseEther(formData.fundingGoal),
        durationDays: BigInt(formData.durationDays),
        founderShareBps: BigInt(formData.founderShareBps),
      });
      setIsModalOpen(false);
      setFormData({
        name: "",
        ticker: "",
        description: "",
        imageUrl: "",
        fundingGoal: "",
        durationDays: "30",
        founderShareBps: "5100",
      });
      refetch();
    } catch (error) {
      console.error("Failed to create pledge:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Pledge Protocol</h1>
          <p className="text-base-content/60 mt-2">Decentralized Stock Exchange for Startups</p>
        </div>
        {connectedAddress && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Create Pledge
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats shadow mb-8 w-full">
        <div className="stat">
          <div className="stat-title">Total Pledges</div>
          <div className="stat-value">{summaries.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Raised</div>
          <div className="stat-value">{formatEther(summaries.reduce((acc, s) => acc + s.totalRaised, 0n))} ETH</div>
        </div>
        <div className="stat">
          <div className="stat-title">Listing Tax</div>
          <div className="stat-value text-sm">0.01 ETH</div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && summaries.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No pledges yet</h3>
          <p className="text-base-content/60 mb-4">Be the first to create a pledge!</p>
          {connectedAddress && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              Create First Pledge
            </button>
          )}
        </div>
      )}

      {/* Pledge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {summaries.map(pledge => {
          const progress = calculateProgress(pledge.totalRaised, pledge.fundingGoal);
          const hasYield = pledge.vaultBalance > pledge.totalRaised;

          return (
            <div key={pledge.address} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="card-title">{pledge.name}</h2>
                    <p className="text-sm text-base-content/60">p{pledge.ticker}</p>
                  </div>
                  <span className={`badge ${statusToColor(pledge.status)}`}>{statusToString(pledge.status)}</span>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{formatEther(pledge.totalRaised)} ETH</span>
                    <span>{formatEther(pledge.fundingGoal)} ETH goal</span>
                  </div>
                  <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div>
                    <span className="text-base-content/60">Founder Share</span>
                    <p className="font-semibold">{formatBps(pledge.founderShareBps)}</p>
                  </div>
                  <div>
                    <span className="text-base-content/60">Time Left</span>
                    <p className="font-semibold">{timeRemaining(pledge.deadline)}</p>
                  </div>
                  <div>
                    <span className="text-base-content/60">Vault</span>
                    <p className="font-semibold text-success">{formatEther(pledge.vaultBalance)} ETH</p>
                  </div>
                  <div>
                    <span className="text-base-content/60">Circulating</span>
                    <p className="font-semibold">{Number(pledge.circulatingSupply / BigInt(1e15)) / 1000}M</p>
                  </div>
                </div>

                {/* Yield indicator for active pledges */}
                {pledge.status === 1 && hasYield && (
                  <div className="badge badge-success badge-sm gap-1 mt-2">📈 Earning yield</div>
                )}

                {/* Creator */}
                <div className="mt-4 pt-4 border-t border-base-300">
                  <span className="text-xs text-base-content/60">Created by</span>
                  <Address address={pledge.creator} />
                </div>

                {/* Actions */}
                <div className="card-actions justify-end mt-4">
                  <a href={`/pledges/${pledge.address}`} className="btn btn-sm btn-primary">
                    View Details →
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-4">🚀 Create New Pledge</h3>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Project Name *</span>
              </label>
              <input
                type="text"
                placeholder="ACME Corp"
                className="input input-bordered"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Ticker Symbol *</span>
                <span className="label-text-alt text-base-content/60">3-6 characters</span>
              </label>
              <div className="join">
                <span className="join-item btn btn-disabled">p</span>
                <input
                  type="text"
                  placeholder="ACME"
                  className="input input-bordered join-item w-full"
                  maxLength={6}
                  minLength={3}
                  value={formData.ticker}
                  onChange={e =>
                    setFormData({ ...formData, ticker: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
                  }
                />
              </div>
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                placeholder="Describe your project and what you're building..."
                className="textarea textarea-bordered h-24"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Image URL (optional)</span>
              </label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                className="input input-bordered"
                value={formData.imageUrl}
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Funding Goal (ETH) *</span>
              </label>
              <input
                type="number"
                placeholder="10"
                min="0.01"
                step="0.01"
                className="input input-bordered"
                value={formData.fundingGoal}
                onChange={e => setFormData({ ...formData, fundingGoal: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Duration (days)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="input input-bordered"
                  value={formData.durationDays}
                  onChange={e => setFormData({ ...formData, durationDays: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Founder Share (%)</span>
                  <span className="label-text-alt text-base-content/60">max 99%</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  className="input input-bordered"
                  value={Number(formData.founderShareBps) / 100}
                  onChange={e => {
                    const value = Math.min(99, Math.max(0, Number(e.target.value)));
                    setFormData({ ...formData, founderShareBps: String(value * 100) });
                  }}
                />
              </div>
            </div>

            <div className="alert alert-info mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <p className="font-semibold">Listing requires 0.01 ETH tax</p>
                <p className="text-xs">
                  You&apos;ll receive {100 - Number(formData.founderShareBps) / 100}% of shares available for public
                  sale
                </p>
              </div>
            </div>

            {/* Summary */}
            {formData.fundingGoal && formData.founderShareBps && (
              <div className="bg-base-200 rounded-lg p-3 mb-4 text-sm">
                <p className="font-semibold mb-2">Summary:</p>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Your shares (founder):</span>
                  <span>
                    {Number(formData.founderShareBps) / 100}% (=
                    {((1_000_000 * Number(formData.founderShareBps)) / 10000).toLocaleString()} shares)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Public ICO shares:</span>
                  <span>
                    {100 - Number(formData.founderShareBps) / 100}% (=
                    {((1_000_000 * (10000 - Number(formData.founderShareBps))) / 10000).toLocaleString()} shares)
                  </span>
                </div>
                {formData.fundingGoal && (
                  <div className="flex justify-between mt-1">
                    <span className="text-base-content/60">ICO price per share:</span>
                    <span>
                      {(
                        Number(formData.fundingGoal) /
                        ((1_000_000 * (10000 - Number(formData.founderShareBps))) / 10000)
                      ).toFixed(8)}{" "}
                      ETH
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={
                  isPending ||
                  !formData.name ||
                  !formData.ticker ||
                  formData.ticker.length < 3 ||
                  !formData.fundingGoal ||
                  Number(formData.fundingGoal) <= 0
                }
              >
                {isPending ? <span className="loading loading-spinner"></span> : "Create Pledge (0.01 ETH)"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default PledgesPage;
