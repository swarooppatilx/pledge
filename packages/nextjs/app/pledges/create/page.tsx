"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowPathIcon, CheckIcon, Cog6ToothIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useCreatePledge } from "~~/hooks/usePledge";

type FormData = {
  name: string;
  ticker: string;
  description: string;
  imageUrl: string;
  fundingGoal: string;
  durationDays: string;
  founderShareBps: string;
};

const INITIAL_FORM_DATA: FormData = {
  name: "",
  ticker: "",
  description: "",
  imageUrl: "",
  fundingGoal: "",
  durationDays: "30",
  founderShareBps: "5100",
};

const CreatePledgePage: NextPage = () => {
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const { createPledge, isPending } = useCreatePledge();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [showSettings, setShowSettings] = useState(false);

  // Validation
  const isStep1Valid = formData.name.length >= 2 && formData.ticker.length >= 3 && formData.ticker.length <= 6;

  const isStep2Valid =
    formData.fundingGoal &&
    Number(formData.fundingGoal) > 0 &&
    Number(formData.durationDays) >= 1 &&
    Number(formData.durationDays) <= 365;

  const canCreate = isStep1Valid && isStep2Valid && connectedAddress;

  const handleCreate = async () => {
    if (!canCreate) return;

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
      router.push("/pledges");
    } catch (error) {
      console.error("Failed to create pledge:", error);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setCurrentStep(1);
  };

  const publicSharePercent = 100 - Number(formData.founderShareBps) / 100;

  return (
    <div className="min-h-screen bg-[#0D0D0D] page-enter">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#5E5E5E] mb-6">
          <Link href="/pledges" className="hover:text-white transition-colors">
            Your pledges
          </Link>
          <span>{">"}</span>
          <span className="text-white">New pledge</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-[28px] font-semibold text-white">New pledge</h1>

          <div className="flex items-center gap-3">
            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#9B9B9B] hover:text-white hover:bg-[#1B1B1B] rounded-xl transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset
            </button>

            {/* Settings Button */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1B1B1B] text-white rounded-xl border border-[#222222] hover:border-[#333333] transition-colors"
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </button>

              {/* Settings Dropdown */}
              {showSettings && (
                <div className="absolute right-0 top-12 w-72 bg-[#1B1B1B] border border-[#222222] rounded-2xl p-4 z-50 shadow-xl">
                  {/* Listing Fee */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#9B9B9B]">Listing fee</span>
                      <InformationCircleIcon className="h-4 w-4 text-[#5E5E5E]" />
                    </div>
                    <span className="text-sm text-white font-mono">0.01 ETH</span>
                  </div>

                  {/* Duration Presets */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#9B9B9B]">Duration preset</span>
                    </div>
                    <div className="flex gap-1">
                      {["7", "14", "30", "90"].map(days => (
                        <button
                          key={days}
                          onClick={() => setFormData({ ...formData, durationDays: days })}
                          className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                            formData.durationDays === days
                              ? "bg-[#FF007A] text-white"
                              : "bg-[#131313] text-[#9B9B9B] hover:text-white"
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Founder Share Presets */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#9B9B9B]">Founder share</span>
                    </div>
                    <div className="flex gap-1">
                      {["10", "25", "51", "75"].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setFormData({ ...formData, founderShareBps: String(Number(pct) * 100) })}
                          className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                            formData.founderShareBps === String(Number(pct) * 100)
                              ? "bg-[#FF007A] text-white"
                              : "bg-[#131313] text-[#9B9B9B] hover:text-white"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Steps */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-[#131313] border border-[#222222] rounded-2xl p-6">
              {/* Step 1 */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    currentStep === 1
                      ? "bg-[#FF007A] text-white"
                      : isStep1Valid
                        ? "bg-[#27AE60] text-white"
                        : "bg-[#1B1B1B] text-[#5E5E5E]"
                  }`}
                >
                  {isStep1Valid && currentStep > 1 ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">1</span>
                  )}
                </div>
                <div>
                  <p
                    className={`text-xs uppercase tracking-wide ${
                      currentStep === 1 ? "text-[#FF007A]" : "text-[#5E5E5E]"
                    }`}
                  >
                    Step 1
                  </p>
                  <p className={`text-sm font-medium ${currentStep >= 1 ? "text-white" : "text-[#5E5E5E]"}`}>
                    Project identity
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              <div className="ml-4 w-px h-8 bg-[#222222] my-2" />

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    currentStep === 2
                      ? "bg-[#FF007A] text-white"
                      : isStep2Valid && currentStep > 2
                        ? "bg-[#27AE60] text-white"
                        : "bg-[#1B1B1B] text-[#5E5E5E]"
                  }`}
                >
                  {isStep2Valid && currentStep > 2 ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">2</span>
                  )}
                </div>
                <div>
                  <p
                    className={`text-xs uppercase tracking-wide ${
                      currentStep === 2 ? "text-[#FF007A]" : "text-[#5E5E5E]"
                    }`}
                  >
                    Step 2
                  </p>
                  <p className={`text-sm font-medium ${currentStep >= 2 ? "text-white" : "text-[#5E5E5E]"}`}>
                    Funding parameters
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              <div className="ml-4 w-px h-8 bg-[#222222] my-2" />

              {/* Step 3 - Review */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    currentStep === 3 ? "bg-[#FF007A] text-white" : "bg-[#1B1B1B] text-[#5E5E5E]"
                  }`}
                >
                  <span className="text-sm font-medium">3</span>
                </div>
                <div>
                  <p
                    className={`text-xs uppercase tracking-wide ${
                      currentStep === 3 ? "text-[#FF007A]" : "text-[#5E5E5E]"
                    }`}
                  >
                    Step 3
                  </p>
                  <p className={`text-sm font-medium ${currentStep >= 3 ? "text-white" : "text-[#5E5E5E]"}`}>
                    Review & create
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-[#131313] border border-[#222222] rounded-2xl p-6">
              {/* Step 1: Project Identity */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-white mb-1">Project identity</h2>
                    <p className="text-sm text-[#5E5E5E]">Define your project name and ticker symbol for the token.</p>
                  </div>

                  {/* Project Name */}
                  <div>
                    <label className="text-xs text-[#5E5E5E] uppercase tracking-wide block mb-2">Project Name</label>
                    <input
                      type="text"
                      placeholder="Enter project name"
                      className="w-full bg-[#1B1B1B] border border-[#222222] rounded-xl px-4 py-3 text-white placeholder-[#5E5E5E] focus:border-[#FF007A] focus:outline-none transition-colors"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Ticker Symbol */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-[#5E5E5E] uppercase tracking-wide">Ticker Symbol</label>
                      <span className="text-xs text-[#5E5E5E]">3-6 characters</span>
                    </div>
                    <div className="flex">
                      <span className="bg-[#0D0D0D] border border-[#222222] border-r-0 rounded-l-xl px-4 flex items-center text-[#FF007A] text-sm font-medium">
                        p
                      </span>
                      <input
                        type="text"
                        placeholder="TICKER"
                        className="flex-1 bg-[#1B1B1B] border border-[#222222] border-l-0 rounded-r-xl px-4 py-3 text-white placeholder-[#5E5E5E] focus:border-[#FF007A] focus:outline-none transition-colors font-mono uppercase"
                        maxLength={6}
                        minLength={3}
                        value={formData.ticker}
                        onChange={e =>
                          setFormData({ ...formData, ticker: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
                        }
                      />
                    </div>
                    {formData.ticker && (
                      <p className="text-xs text-[#5E5E5E] mt-2">
                        Token will be: <span className="text-white font-mono">p{formData.ticker}</span>
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs text-[#5E5E5E] uppercase tracking-wide block mb-2">
                      Description <span className="normal-case text-[#5E5E5E]">(optional)</span>
                    </label>
                    <textarea
                      placeholder="Describe your project..."
                      className="w-full bg-[#1B1B1B] border border-[#222222] rounded-xl px-4 py-3 text-white placeholder-[#5E5E5E] focus:border-[#FF007A] focus:outline-none transition-colors h-24 resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="text-xs text-[#5E5E5E] uppercase tracking-wide block mb-2">
                      Image URL <span className="normal-case text-[#5E5E5E]">(optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full bg-[#1B1B1B] border border-[#222222] rounded-xl px-4 py-3 text-white placeholder-[#5E5E5E] focus:border-[#FF007A] focus:outline-none transition-colors"
                      value={formData.imageUrl}
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Funding Parameters */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-white mb-1">Funding parameters</h2>
                    <p className="text-sm text-[#5E5E5E]">Set your funding goal, duration, and token distribution.</p>
                  </div>

                  {/* Funding Goal */}
                  <div>
                    <label className="text-xs text-[#5E5E5E] uppercase tracking-wide block mb-2">Funding Goal</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        min="0.01"
                        step="0.01"
                        className="w-full bg-[#1B1B1B] border border-[#222222] rounded-xl px-4 py-3 pr-16 text-white placeholder-[#5E5E5E] focus:border-[#FF007A] focus:outline-none transition-colors text-lg"
                        value={formData.fundingGoal}
                        onChange={e => setFormData({ ...formData, fundingGoal: e.target.value })}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-[#131313] px-2 py-1 rounded-lg">
                        <div className="w-5 h-5 rounded-full bg-[#627EEA] flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">Ξ</span>
                        </div>
                        <span className="text-sm text-white">ETH</span>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-[#5E5E5E] uppercase tracking-wide">Funding Duration</label>
                      <span className="text-xs text-[#5E5E5E]">1-365 days</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        className="w-full bg-[#1B1B1B] border border-[#222222] rounded-xl px-4 py-3 pr-16 text-white placeholder-[#5E5E5E] focus:border-[#FF007A] focus:outline-none transition-colors"
                        value={formData.durationDays}
                        onChange={e => setFormData({ ...formData, durationDays: e.target.value })}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5E5E5E] text-sm">days</span>
                    </div>
                  </div>

                  {/* Founder Share Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-[#5E5E5E] uppercase tracking-wide">Founder Share</label>
                      <span className="text-sm text-white font-mono">{Number(formData.founderShareBps) / 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="9900"
                      step="100"
                      className="w-full h-2 bg-[#1B1B1B] rounded-lg appearance-none cursor-pointer accent-[#FF007A]"
                      value={formData.founderShareBps}
                      onChange={e => setFormData({ ...formData, founderShareBps: e.target.value })}
                    />
                    <div className="flex justify-between text-xs text-[#5E5E5E] mt-1">
                      <span>1%</span>
                      <span>99%</span>
                    </div>
                  </div>

                  {/* Token Distribution Preview */}
                  <div className="bg-[#1B1B1B] rounded-xl p-4 border border-[#222222]">
                    <p className="text-xs text-[#5E5E5E] uppercase tracking-wide mb-3">Token Distribution</p>
                    <div className="h-4 bg-[#0D0D0D] rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-[#FF007A]"
                        style={{ width: `${Number(formData.founderShareBps) / 100}%` }}
                      />
                      <div className="h-full bg-[#27AE60]" style={{ width: `${publicSharePercent}%` }} />
                    </div>
                    <div className="flex justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#FF007A]" />
                        <span className="text-xs text-[#9B9B9B]">
                          Founder: {Number(formData.founderShareBps) / 100}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#27AE60]" />
                        <span className="text-xs text-[#9B9B9B]">Public: {publicSharePercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Create */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-white mb-1">Review & create</h2>
                    <p className="text-sm text-[#5E5E5E]">Confirm your pledge details before creating.</p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-[#1B1B1B] rounded-xl p-5 border border-[#222222] space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#5E5E5E]">Project Name</span>
                      <span className="text-sm text-white font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#5E5E5E]">Token Symbol</span>
                      <span className="text-sm text-white font-mono">p{formData.ticker}</span>
                    </div>
                    <div className="border-t border-[#222222]" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#5E5E5E]">Funding Goal</span>
                      <span className="text-sm text-white font-mono">{formData.fundingGoal} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#5E5E5E]">Duration</span>
                      <span className="text-sm text-white">{formData.durationDays} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#5E5E5E]">Founder Share</span>
                      <span className="text-sm text-white">{Number(formData.founderShareBps) / 100}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#5E5E5E]">Public Allocation</span>
                      <span className="text-sm text-[#27AE60]">{publicSharePercent}%</span>
                    </div>
                    <div className="border-t border-[#222222]" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#5E5E5E]">Listing Fee</span>
                      <span className="text-sm text-white font-mono">0.01 ETH</span>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-[#FF007A]/10 border border-[#FF007A]/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <InformationCircleIcon className="h-5 w-5 text-[#FF007A] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-white mb-1">This action is irreversible</p>
                        <p className="text-xs text-[#9B9B9B]">
                          Once created, the pledge parameters cannot be changed. The funding goal and duration are
                          final.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex gap-3">
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1 bg-[#1B1B1B] text-white font-medium py-3.5 px-6 rounded-xl border border-[#222222] hover:border-[#333333] transition-colors"
                  >
                    Back
                  </button>
                )}

                {currentStep < 3 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={currentStep === 1 ? !isStep1Valid : !isStep2Valid}
                    className="flex-1 bg-[#1B1B1B] text-white font-medium py-3.5 px-6 rounded-xl border border-[#222222] hover:border-[#333333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                ) : connectedAddress ? (
                  <button
                    onClick={handleCreate}
                    disabled={isPending || !canCreate}
                    className="flex-1 bg-[#FF007A] hover:bg-[#E5006D] disabled:bg-[#1B1B1B] disabled:text-[#5E5E5E] text-white font-medium py-3.5 px-6 rounded-xl transition-colors"
                  >
                    {isPending ? <span className="loading loading-spinner loading-sm"></span> : "Create Pledge"}
                  </button>
                ) : (
                  <div className="flex-1">
                    <RainbowKitCustomConnectButton />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePledgePage;
