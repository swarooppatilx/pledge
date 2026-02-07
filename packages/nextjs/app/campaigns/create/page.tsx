"use client";

import Link from "next/link";
import { CreateCampaignForm } from "../_components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

const CreateCampaignPage: NextPage = () => {
  const { isConnected } = useAccount();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/campaigns" className="btn btn-ghost btn-sm gap-2 mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Campaigns
        </Link>
        <h1 className="text-3xl font-bold">Create Campaign</h1>
        <p className="text-base-content/60 mt-1">Launch your crowdfunding campaign on the blockchain</p>
      </div>

      {/* Connect Wallet Message */}
      {!isConnected ? (
        <div className="card bg-base-200">
          <div className="card-body items-center text-center">
            <h2 className="card-title">Connect Your Wallet</h2>
            <p className="text-base-content/60 mb-4">You need to connect your wallet to create a campaign</p>
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <CreateCampaignForm onCancel={() => window.history.back()} />
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 bg-base-200 rounded-box p-6">
        <h3 className="font-semibold mb-4">How it works</h3>
        <ul className="space-y-3 text-sm text-base-content/70">
          <li className="flex gap-2">
            <span className="badge badge-primary badge-sm">1</span>
            <span>Set your funding goal and campaign duration</span>
          </li>
          <li className="flex gap-2">
            <span className="badge badge-primary badge-sm">2</span>
            <span>Backers contribute ETH directly to your campaign contract</span>
          </li>
          <li className="flex gap-2">
            <span className="badge badge-primary badge-sm">3</span>
            <span>If goal is reached before deadline, you can withdraw funds</span>
          </li>
          <li className="flex gap-2">
            <span className="badge badge-primary badge-sm">4</span>
            <span>If goal is not reached, backers can claim full refunds</span>
          </li>
        </ul>

        <div className="alert alert-info mt-4">
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
          <span>All funds are held in smart contracts - no intermediaries, no custody risk.</span>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignPage;
