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
  CubeIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  return (
    <div className="min-h-screen bg-[#0D0D0D] page-enter">
      {/* Background Glow Effect */}
      <div className="glow-bg fixed top-[-200px] right-[-100px] opacity-10"></div>
      <div className="glow-bg fixed bottom-[-200px] left-[-100px] opacity-10" style={{ background: "#27AE60" }}></div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[48px] leading-[56px] mb-6 font-semibold text-white">Pledge Protocol</h1>
          <p className="text-h1 text-[#9B9B9B] mb-4">Decentralized Stock Exchange for Startups</p>
          <p className="text-[#5E5E5E] mb-10 max-w-2xl mx-auto leading-relaxed">
            Equity-based crowdfunding with Aave-backed yields. Every share is an asset-backed claim on the treasury.
            Earn passive yield and active dividends.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/pledges" className="btn-brand flex items-center gap-2 text-lg px-8 py-4">
              <RocketLaunchIcon className="h-5 w-5" />
              Explore Pledges
            </Link>
            <Link href="/pledges" className="btn-brand-outline flex items-center gap-2 text-lg px-8 py-4">
              <BanknotesIcon className="h-5 w-5" />
              Create Pledge
            </Link>
          </div>

          {connectedAddress && (
            <div className="mt-12 inline-flex items-center gap-3 bg-[#131313] px-4 py-2 rounded-[16px] border border-[#222222]">
              <span className="text-[#5E5E5E] text-sm">Connected:</span>
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
      </section>

      {/* Stats Banner */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto stat-banner justify-center">
          <div className="stat-banner-item text-center">
            <span className="stat-banner-label">Market Cap</span>
            <span className="stat-banner-value">$1.2B</span>
            <span className="stat-banner-trend positive">+2.4%</span>
          </div>
          <div className="stat-banner-item text-center">
            <span className="stat-banner-label">Yield Pool (Aave)</span>
            <span className="stat-banner-value">420 ETH</span>
            <span className="stat-banner-trend text-[#27AE60]">Active</span>
          </div>
          <div className="stat-banner-item text-center">
            <span className="stat-banner-label">Protocol Revenue</span>
            <span className="stat-banner-value">12.4 ETH</span>
            <span className="stat-banner-trend text-[#9B9B9B]">All time</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#131313] py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-display text-center mb-16">How It Works</h2>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="card-pledge p-8 text-center group hover:border-[#FF007A] transition-all">
              <div className="bg-[rgba(255,0,122,0.08)] p-4 rounded-full mb-6 inline-flex mx-auto group-hover:shadow-[0_0_20px_rgba(255,0,122,0.15)] transition-all">
                <RocketLaunchIcon className="h-8 w-8 text-[#FF007A]" />
              </div>
              <h3 className="text-h2 mb-3">1. Create</h3>
              <p className="text-[#5E5E5E] text-sm">Launch your pledge with 0.01 ETH listing tax</p>
            </div>

            <div className="card-pledge p-8 text-center group hover:border-[#FF007A] transition-all">
              <div className="bg-[rgba(255,0,122,0.08)] p-4 rounded-full mb-6 inline-flex mx-auto group-hover:shadow-[0_0_20px_rgba(255,0,122,0.15)] transition-all">
                <CurrencyDollarIcon className="h-8 w-8 text-[#FF007A]" />
              </div>
              <h3 className="text-h2 mb-3">2. Fund</h3>
              <p className="text-[#5E5E5E] text-sm">Contributors buy shares at ICO price</p>
            </div>

            <div className="card-pledge p-8 text-center group hover:border-[#27AE60] transition-all">
              <div className="bg-[rgba(39,174,96,0.1)] p-4 rounded-full mb-6 inline-flex mx-auto group-hover:shadow-[0_0_20px_rgba(39,174,96,0.15)] transition-all">
                <ChartBarIcon className="h-8 w-8 text-[#27AE60]" />
              </div>
              <h3 className="text-h2 mb-3">3. Goal Met</h3>
              <p className="text-[#5E5E5E] text-sm">Shares unlock for trading and yield starts accruing</p>
            </div>

            <div className="card-pledge p-8 text-center group hover:border-[#27AE60] transition-all">
              <div className="bg-[rgba(39,174,96,0.1)] p-4 rounded-full mb-6 inline-flex mx-auto group-hover:shadow-[0_0_20px_rgba(39,174,96,0.15)] transition-all">
                <ArrowTrendingUpIcon className="h-8 w-8 text-[#27AE60]" />
              </div>
              <h3 className="text-h2 mb-3">4. Earn</h3>
              <p className="text-[#5E5E5E] text-sm">Passive Aave yield + active dividends</p>
            </div>
          </div>
        </div>
      </section>

      {/* Asset-Backed Equity Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-display text-center mb-16">Asset-Backed Equity</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-pledge p-8 border-l-4 border-l-[#FF007A]">
              <ShieldCheckIcon className="h-8 w-8 text-[#FF007A] mb-4" />
              <h4 className="text-h2 mb-3">Floor Price</h4>
              <p className="text-[#5E5E5E] text-sm leading-relaxed">
                Every share can be redeemed for pro-rata treasury value. No zero exits.
              </p>
            </div>

            <div className="card-pledge p-8 border-l-4 border-l-[#27AE60]">
              <SparklesIcon className="h-8 w-8 text-[#27AE60] mb-4" />
              <h4 className="text-h2 mb-3">Dual Income</h4>
              <p className="text-[#5E5E5E] text-sm leading-relaxed">
                Earn 80% of Aave yield plus dividends from project revenue.
              </p>
            </div>

            <div className="card-pledge p-8 border-l-4 border-l-[#9B9B9B]">
              <CubeIcon className="h-8 w-8 text-[#9B9B9B] mb-4" />
              <h4 className="text-h2 mb-3">Fixed Cap</h4>
              <p className="text-[#5E5E5E] text-sm leading-relaxed">
                1M shares per pledge. No dilution, transparent ownership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#131313] py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-display mb-6">Ready to Start?</h2>
          <p className="text-[#5E5E5E] mb-8">Join the decentralized future of startup investing.</p>
          <Link href="/pledges" className="btn-brand inline-flex items-center gap-2 text-lg px-10 py-4 glow-primary">
            <RocketLaunchIcon className="h-5 w-5" />
            Launch App
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
