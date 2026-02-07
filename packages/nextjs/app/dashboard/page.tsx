"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MyContributions, MyPledges } from "./_components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { PlusIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

type TabType = "pledges" | "contributions";

const DashboardPage: NextPage = () => {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("pledges");

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-200 max-w-md mx-auto">
          <div className="card-body items-center text-center">
            <UserCircleIcon className="h-16 w-16 text-base-content/40 mb-4" />
            <h2 className="card-title">Connect Your Wallet</h2>
            <p className="text-base-content/60 mb-4">View your pledges and contributions</p>
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
          <p className="text-base-content/60 mt-1">Manage your pledges and view your contributions</p>
        </div>

        <Link href="/pledges" className="btn btn-primary gap-2">
          <PlusIcon className="h-5 w-5" />
          Create Pledge
        </Link>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 mb-8 w-fit">
        <button
          className={`tab tab-lg ${activeTab === "pledges" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("pledges")}
        >
          My Pledges
        </button>
        <button
          className={`tab tab-lg ${activeTab === "contributions" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("contributions")}
        >
          My Holdings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "pledges" ? (
        <MyPledges
          userAddress={address as `0x${string}`}
          onPledgeClick={(addr: string) => router.push(`/pledges/${addr}`)}
        />
      ) : (
        <MyContributions
          userAddress={address as `0x${string}`}
          onPledgeClick={(addr: string) => router.push(`/pledges/${addr}`)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
