"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MyCampaigns } from "./_components/MyCampaigns";
import { MyContributions } from "./_components/MyContributions";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PlusIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

type TabType = "campaigns" | "contributions";

const DashboardPage: NextPage = () => {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("campaigns");

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-200 max-w-md mx-auto">
          <div className="card-body items-center text-center">
            <UserCircleIcon className="h-16 w-16 text-base-content/40 mb-4" />
            <h2 className="card-title">Connect Your Wallet</h2>
            <p className="text-base-content/60 mb-4">View your campaigns and contributions</p>
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-base-content/60 mt-1">Manage your campaigns and view your contributions</p>
        </div>

        <Link href="/campaigns/create" className="btn btn-primary gap-2">
          <PlusIcon className="h-5 w-5" />
          Create Campaign
        </Link>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 mb-8 w-fit">
        <button
          className={`tab tab-lg ${activeTab === "campaigns" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("campaigns")}
        >
          My Campaigns
        </button>
        <button
          className={`tab tab-lg ${activeTab === "contributions" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("contributions")}
        >
          My Contributions
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "campaigns" ? (
        <MyCampaigns
          userAddress={address as `0x${string}`}
          onCampaignClick={addr => router.push(`/campaigns/${addr}`)}
        />
      ) : (
        <MyContributions
          userAddress={address as `0x${string}`}
          onCampaignClick={addr => router.push(`/campaigns/${addr}`)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
