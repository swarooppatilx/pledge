"use client";

import Link from "next/link";
import type { NextPage } from "next";
import {
  ArrowPathIcon,
  BanknotesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const AboutPage: NextPage = () => {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Hero */}
      <section className="pt-16 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[40px] font-semibold text-white mb-4">Pledge Protocol</h1>
          <p className="text-xl text-[#9B9B9B] mb-4">Decentralized Stock Exchange for Startups</p>
          <p className="text-[#5E5E5E] max-w-2xl mx-auto">
            Equity-based crowdfunding with Aave-backed yields. Every share is an asset-backed claim on the treasury with
            guaranteed floor price.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">How It Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-pledge p-6 text-center">
              <div className="bg-[rgba(255,0,122,0.08)] rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <RocketLaunchIcon className="h-7 w-7 text-[#FF007A]" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">1. Create a Pledge</h3>
              <p className="text-[#5E5E5E] text-sm">
                Founders create a pledge with a funding goal and deadline. Set your desired founder share and launch
                your ICO.
              </p>
            </div>

            <div className="card-pledge p-6 text-center">
              <div className="bg-[rgba(255,0,122,0.08)] rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <BanknotesIcon className="h-7 w-7 text-[#FF007A]" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">2. Contribute ETH</h3>
              <p className="text-[#5E5E5E] text-sm">
                Backers contribute ETH during the funding phase and receive shares proportional to their contribution.
              </p>
            </div>

            <div className="card-pledge p-6 text-center">
              <div className="bg-[rgba(39,174,96,0.1)] rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <ChartBarIcon className="h-7 w-7 text-[#27AE60]" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">3. Earn Rewards</h3>
              <p className="text-[#5E5E5E] text-sm">
                ETH is deposited into Aave to generate yield. Shareholders earn passive yield and dividends from the
                business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 px-6 bg-[#131313]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">Key Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-pledge p-6 border-l-4 border-l-[#FF007A]">
              <div className="flex items-center gap-3 mb-3">
                <SparklesIcon className="h-6 w-6 text-[#FF007A]" />
                <h3 className="text-lg font-medium text-white">Aave-Backed Yield</h3>
              </div>
              <p className="text-[#5E5E5E] text-sm">
                All pledged ETH is automatically deposited into Aave V3 to generate passive yield. 80% goes to
                shareholders, 20% to the protocol.
              </p>
            </div>

            <div className="card-pledge p-6 border-l-4 border-l-[#27AE60]">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheckIcon className="h-6 w-6 text-[#27AE60]" />
                <h3 className="text-lg font-medium text-white">Guaranteed Floor Price</h3>
              </div>
              <p className="text-[#5E5E5E] text-sm">
                Every share has a minimum redeemable value backed by the vault&apos;s ETH. You can always exit at the
                floor price.
              </p>
            </div>

            <div className="card-pledge p-6 border-l-4 border-l-[#9B9B9B]">
              <div className="flex items-center gap-3 mb-3">
                <CurrencyDollarIcon className="h-6 w-6 text-[#9B9B9B]" />
                <h3 className="text-lg font-medium text-white">Revenue Dividends</h3>
              </div>
              <p className="text-[#5E5E5E] text-sm">
                Founders can deposit dividends from business revenue. Distributions are proportional to share ownership.
              </p>
            </div>

            <div className="card-pledge p-6 border-l-4 border-l-[#F2994A]">
              <div className="flex items-center gap-3 mb-3">
                <ArrowPathIcon className="h-6 w-6 text-[#F2994A]" />
                <h3 className="text-lg font-medium text-white">Treasury Stock</h3>
              </div>
              <p className="text-[#5E5E5E] text-sm">
                When shareholders redeem, shares go to treasury. Anyone can buy treasury stock at floor price.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lifecycle */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">Pledge Lifecycle</h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="card-pledge p-6 w-full md:w-56 text-center border-t-4 border-t-[#F2994A]">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[rgba(242,153,74,0.1)] text-[#F2994A] mb-3">
                Phase 1
              </span>
              <h3 className="font-medium text-white mb-2">Funding</h3>
              <p className="text-xs text-[#5E5E5E]">ICO is open. Contributors receive shares based on contribution.</p>
            </div>

            <div className="text-2xl text-[#333333] hidden md:block">→</div>

            <div className="card-pledge p-6 w-full md:w-56 text-center border-t-4 border-t-[#27AE60]">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[rgba(39,174,96,0.1)] text-[#27AE60] mb-3">
                Phase 2
              </span>
              <h3 className="font-medium text-white mb-2">Active</h3>
              <p className="text-xs text-[#5E5E5E]">Goal reached! Shares tradeable. Yield and dividends flow.</p>
            </div>

            <div className="text-2xl text-[#333333] hidden md:block">or</div>

            <div className="card-pledge p-6 w-full md:w-56 text-center border-t-4 border-t-[#EB5757]">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[rgba(235,87,87,0.1)] text-[#EB5757] mb-3">
                Failed
              </span>
              <h3 className="font-medium text-white mb-2">Refund</h3>
              <p className="text-xs text-[#5E5E5E]">Deadline passed. Contributors claim full refund.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tokenomics */}
      <section className="py-12 px-6 bg-[#131313]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">Tokenomics</h2>

          <div className="card-pledge p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <p className="text-xs text-[#5E5E5E] mb-1">Total Supply</p>
                <p className="text-xl font-mono text-white">1M</p>
                <p className="text-xs text-[#5E5E5E]">per pledge</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#5E5E5E] mb-1">Founder Share</p>
                <p className="text-xl font-mono text-white">1-99%</p>
                <p className="text-xs text-[#5E5E5E]">configurable</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#5E5E5E] mb-1">Yield Split</p>
                <p className="text-xl font-mono text-white">80/20</p>
                <p className="text-xs text-[#5E5E5E]">holders / protocol</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#5E5E5E] mb-1">Listing Fee</p>
                <p className="text-xl font-mono text-white">0.01 ETH</p>
                <p className="text-xs text-[#5E5E5E]">one-time</p>
              </div>
            </div>

            <div className="border-t border-[#222222] pt-6">
              <h4 className="text-sm font-medium text-white mb-3">Distribution Example</h4>
              <p className="text-xs text-[#5E5E5E] mb-2">For a pledge with 51% founder share and 10 ETH goal:</p>
              <ul className="text-xs text-[#5E5E5E] space-y-1">
                <li>• Founder receives: 510,000 shares (51%)</li>
                <li>• Public ICO: 490,000 shares (49%)</li>
                <li>• ICO Price: 0.0000204 ETH/share</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-10">Security</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-pledge p-6 text-center">
              <ShieldCheckIcon className="h-10 w-10 text-[#27AE60] mx-auto mb-3" />
              <h3 className="font-medium text-white mb-2">Reentrancy Guards</h3>
              <p className="text-xs text-[#5E5E5E]">
                All state-changing functions protected by OpenZeppelin ReentrancyGuard
              </p>
            </div>

            <div className="card-pledge p-6 text-center">
              <ShieldCheckIcon className="h-10 w-10 text-[#27AE60] mx-auto mb-3" />
              <h3 className="font-medium text-white mb-2">Slippage Protection</h3>
              <p className="text-xs text-[#5E5E5E]">
                Redemptions include minReceived parameter to prevent frontrunning
              </p>
            </div>

            <div className="card-pledge p-6 text-center">
              <ShieldCheckIcon className="h-10 w-10 text-[#27AE60] mx-auto mb-3" />
              <h3 className="font-medium text-white mb-2">Minimal Proxies</h3>
              <p className="text-xs text-[#5E5E5E]">EIP-1167 clones for gas-efficient, battle-tested deployments</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[#131313]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-[#5E5E5E] mb-8">Explore existing pledges or create your own startup equity vault.</p>
          <div className="flex justify-center gap-4">
            <Link href="/pledges" className="btn-brand-outline px-6 py-3">
              Explore Pledges
            </Link>
            <Link href="/pledges" className="btn-brand px-6 py-3">
              Create Pledge
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
