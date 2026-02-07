"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { ArrowPathIcon, CurrencyDollarIcon, RocketLaunchIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
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
          <p className="text-2xl mb-2">Decentralized Crowdfunding Protocol</p>
          <p className="text-base-content/60 mb-8 max-w-2xl mx-auto">
            A trust-minimized crowdfunding platform where funds are escrowed entirely on-chain. No custody, no
            intermediaries, full transparency.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/campaigns" className="btn btn-primary btn-lg gap-2">
              <RocketLaunchIcon className="h-5 w-5" />
              Explore Campaigns
            </Link>
            <Link href="/campaigns/create" className="btn btn-outline btn-lg">
              Start a Campaign
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
                  <p className="text-sm text-base-content/60">Launch your campaign with a funding goal and deadline</p>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-secondary/10 p-4 rounded-full mb-4">
                    <CurrencyDollarIcon className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="card-title text-lg">2. Fund</h3>
                  <p className="text-sm text-base-content/60">Backers contribute ETH directly to smart contracts</p>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-success/10 p-4 rounded-full mb-4">
                    <ShieldCheckIcon className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="card-title text-lg">3. Escrow</h3>
                  <p className="text-sm text-base-content/60">
                    Funds are held securely on-chain until conditions are met
                  </p>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                  <div className="bg-warning/10 p-4 rounded-full mb-4">
                    <ArrowPathIcon className="h-8 w-8 text-warning" />
                  </div>
                  <h3 className="card-title text-lg">4. Release</h3>
                  <p className="text-sm text-base-content/60">Success = creator withdraws. Failure = backers refund.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="w-full px-8 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Trust-Minimized by Design</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6">
                <h4 className="font-semibold mb-2">No Custody</h4>
                <p className="text-sm text-base-content/60">
                  Funds are never held by any third party. Smart contracts manage everything.
                </p>
              </div>
              <div className="p-6">
                <h4 className="font-semibold mb-2">No Admin Keys</h4>
                <p className="text-sm text-base-content/60">No owner privileges, no emergency drains, no backdoors.</p>
              </div>
              <div className="p-6">
                <h4 className="font-semibold mb-2">Automatic Refunds</h4>
                <p className="text-sm text-base-content/60">
                  If a campaign fails, backers can claim refunds without any approval.
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
