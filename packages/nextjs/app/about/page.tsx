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
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Pledge Protocol
          </span>
        </h1>
        <p className="text-2xl text-base-content/80 mb-4">Decentralized Stock Exchange for Startups</p>
        <p className="text-base-content/60 max-w-2xl mx-auto">
          Equity-based crowdfunding with Aave-backed yields. Every share is an asset-backed claim on the treasury with
          guaranteed floor price.
        </p>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <RocketLaunchIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="card-title justify-center">1. Create a Pledge</h3>
              <p className="text-base-content/60">
                Founders create a pledge with a funding goal and deadline. Set your desired founder share (up to 99%)
                and launch your ICO.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <BanknotesIcon className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="card-title justify-center">2. Contribute ETH</h3>
              <p className="text-base-content/60">
                Backers contribute ETH during the funding phase and receive shares proportional to their contribution.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <div className="bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ChartBarIcon className="h-8 w-8 text-accent" />
              </div>
              <h3 className="card-title justify-center">3. Earn Rewards</h3>
              <p className="text-base-content/60">
                ETH is deposited into Aave to generate yield. Shareholders earn passive yield and active dividends from
                the business.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aave Yield */}
          <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <SparklesIcon className="h-8 w-8 text-primary" />
                <h3 className="card-title">Aave-Backed Yield</h3>
              </div>
              <p className="text-base-content/60">
                All pledged ETH is automatically deposited into Aave V3 to generate passive yield. 80% goes to
                shareholders, 20% to the protocol.
              </p>
            </div>
          </div>

          {/* Floor Price */}
          <div className="card bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-8 w-8 text-success" />
                <h3 className="card-title">Guaranteed Floor Price</h3>
              </div>
              <p className="text-base-content/60">
                Every share has a minimum redeemable value backed by the vault&apos;s ETH. You can always exit at the
                floor price with slippage protection.
              </p>
            </div>
          </div>

          {/* Dividends */}
          <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <CurrencyDollarIcon className="h-8 w-8 text-secondary" />
                <h3 className="card-title">Revenue Dividends</h3>
              </div>
              <p className="text-base-content/60">
                Founders can deposit dividends from business revenue. Distributions are proportional to share ownership
                and claimable anytime.
              </p>
            </div>
          </div>

          {/* Treasury Buyback */}
          <div className="card bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <ArrowPathIcon className="h-8 w-8 text-warning" />
                <h3 className="card-title">Treasury Stock</h3>
              </div>
              <p className="text-base-content/60">
                When shareholders redeem, shares go to treasury. Anyone can buy treasury stock at floor price,
                increasing circulating supply.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycle */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Pledge Lifecycle</h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="card bg-warning/10 border border-warning/30 w-full md:w-64">
            <div className="card-body items-center text-center">
              <span className="badge badge-warning badge-lg mb-2">Phase 1</span>
              <h3 className="font-bold">Funding</h3>
              <p className="text-sm text-base-content/60">
                ICO is open. Contributors receive shares based on contribution.
              </p>
            </div>
          </div>

          <div className="text-4xl text-base-content/40">→</div>

          <div className="card bg-success/10 border border-success/30 w-full md:w-64">
            <div className="card-body items-center text-center">
              <span className="badge badge-success badge-lg mb-2">Phase 2</span>
              <h3 className="font-bold">Active</h3>
              <p className="text-sm text-base-content/60">
                Goal reached! Shares are tradeable. Yield and dividends flow.
              </p>
            </div>
          </div>

          <div className="text-4xl text-base-content/40 md:hidden">or</div>

          <div className="card bg-error/10 border border-error/30 w-full md:w-64">
            <div className="card-body items-center text-center">
              <span className="badge badge-error badge-lg mb-2">Failed</span>
              <h3 className="font-bold">Refund</h3>
              <p className="text-sm text-base-content/60">
                Deadline passed without goal. Contributors can claim full refund.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tokenomics */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Tokenomics</h2>

        <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto">
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-base-content/60 mb-2">Total Supply</h4>
                <p className="text-2xl font-bold">1,000,000 shares</p>
                <p className="text-sm text-base-content/60">Per pledge</p>
              </div>

              <div>
                <h4 className="font-bold text-base-content/60 mb-2">Founder Share</h4>
                <p className="text-2xl font-bold">1% - 99%</p>
                <p className="text-sm text-base-content/60">Configurable</p>
              </div>

              <div>
                <h4 className="font-bold text-base-content/60 mb-2">Yield Split</h4>
                <p className="text-2xl font-bold">80% / 20%</p>
                <p className="text-sm text-base-content/60">Holders / Protocol</p>
              </div>

              <div>
                <h4 className="font-bold text-base-content/60 mb-2">Listing Fee</h4>
                <p className="text-2xl font-bold">0.01 ETH</p>
                <p className="text-sm text-base-content/60">One-time</p>
              </div>
            </div>

            <div className="divider"></div>

            <div>
              <h4 className="font-bold mb-2">Share Distribution Example</h4>
              <p className="text-sm text-base-content/60 mb-2">For a pledge with 51% founder share and 10 ETH goal:</p>
              <ul className="list-disc list-inside text-sm text-base-content/60">
                <li>Founder receives: 510,000 shares (51%)</li>
                <li>Public ICO: 490,000 shares (49%)</li>
                <li>ICO Price: 10 ETH / 490,000 = 0.0000204 ETH/share</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Security</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="card bg-base-200">
            <div className="card-body items-center text-center">
              <ShieldCheckIcon className="h-12 w-12 text-success mb-2" />
              <h3 className="font-bold">Reentrancy Guards</h3>
              <p className="text-sm text-base-content/60">
                All state-changing functions protected by OpenZeppelin ReentrancyGuard
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body items-center text-center">
              <ShieldCheckIcon className="h-12 w-12 text-success mb-2" />
              <h3 className="font-bold">Slippage Protection</h3>
              <p className="text-sm text-base-content/60">
                Redemptions include minReceived parameter to prevent frontrunning
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body items-center text-center">
              <ShieldCheckIcon className="h-12 w-12 text-success mb-2" />
              <h3 className="font-bold">Minimal Proxies</h3>
              <p className="text-sm text-base-content/60">
                EIP-1167 clones for gas-efficient, battle-tested deployments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content max-w-xl mx-auto">
          <div className="card-body items-center text-center">
            <h2 className="card-title text-2xl">Ready to Get Started?</h2>
            <p className="opacity-80">Explore existing pledges or create your own startup equity vault.</p>
            <div className="card-actions mt-4">
              <Link href="/pledges" className="btn btn-ghost bg-white/20 hover:bg-white/30">
                Explore Pledges
              </Link>
              <Link href="/pledges" className="btn bg-white text-primary hover:bg-white/90">
                Create Pledge
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
