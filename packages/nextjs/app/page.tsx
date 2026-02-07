"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        {/* Hero Section */}
        <div className="px-5 text-center max-w-4xl">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Pledge</span>
          </h1>
          <p className="text-2xl mb-2">Decentralized Stock Exchange for Startups</p>
          <p className="text-base-content/60 mb-8 max-w-2xl mx-auto">
            Equity-based crowdfunding with Aave-backed yields. Every share is an asset-backed claim on the treasury.
            Earn passive yield and active dividends.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/pledges" className="btn btn-primary btn-lg gap-2">
              <RocketLaunchIcon className="h-5 w-5" />
              Explore Pledges
            </Link>
            <Link href="/pledges" className="btn btn-outline btn-lg gap-2">
              <BanknotesIcon className="h-5 w-5" />
              Create Pledge
            </Link>
          </div>

          {connectedAddress && (
            <div className="flex justify-center items-center space-x-2 flex-col mt-8">
              <p className="my-2 font-medium text-base-content/60">Connected:</p>
              <Address
                address={connectedAddress}
                chain={targetNetwork}
                blockExplorerAddressLink={
                  targetNetwork.id === hardhat.id ? `/blockexplorer/address/${connectedAddress}` : undefined
                }
              />
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="bg-base-300 w-full mt-16 px-8 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

            <div className="grid md:grid-cols-4 gap-8">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <RocketLaunchIcon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="card-title text-lg">1. Create</h3>
                  <p className="text-sm text-base-content/60">Launch your pledge with 0.01 ETH listing tax</p>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-secondary/10 p-4 rounded-full mb-4">
                    <CurrencyDollarIcon className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="card-title text-lg">2. Fund</h3>
                  <p className="text-sm text-base-content/60">Contributors buy shares at ICO price</p>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-success/10 p-4 rounded-full mb-4">
                    <ChartBarIcon className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="card-title text-lg">3. Goal Met</h3>
                  <p className="text-sm text-base-content/60">Shares unlock for trading and yield starts accruing</p>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-warning/10 p-4 rounded-full mb-4">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-warning" />
                  </div>
                  <h3 className="card-title text-lg">4. Earn</h3>
                  <p className="text-sm text-base-content/60">Passive Aave yield + active dividends</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="w-full px-8 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Asset-Backed Equity</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6">
                <h4 className="font-semibold mb-2">Floor Price</h4>
                <p className="text-sm text-base-content/60">
                  Every share can be redeemed for pro-rata treasury value. No zero exits.
                </p>
              </div>
              <div className="p-6">
                <h4 className="font-semibold mb-2">Dual Income</h4>
                <p className="text-sm text-base-content/60">
                  Earn 80% of Aave yield plus dividends from project revenue.
                </p>
              </div>
              <div className="p-6">
                <h4 className="font-semibold mb-2">Fixed Cap</h4>
                <p className="text-sm text-base-content/60">
                  1M shares per pledge. No dilution, transparent ownership.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
