"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { hardhat } from "viem/chains";
import {
  Bars3Icon,
  BugAntIcon,
  ChartPieIcon,
  InformationCircleIcon,
  RocketLaunchIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Pledges",
    href: "/pledges",
    icon: <RocketLaunchIcon className="h-4 w-4" />,
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    icon: <ChartPieIcon className="h-4 w-4" />,
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: <TrophyIcon className="h-4 w-4" />,
  },
  {
    label: "About",
    href: "/about",
    icon: <InformationCircleIcon className="h-4 w-4" />,
  },
  {
    label: "Debug",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-base-300 text-white" : "text-[#9B9B9B]"
              } hover:bg-base-300 hover:text-white transition-all py-2 px-3 text-sm font-medium rounded-[12px] gap-2 flex items-center`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header - Uniswap Dark Aesthetic
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  // Keyboard shortcut for search (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isSearchFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && isSearchFocused) {
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchFocused]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/pledges?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="header-pledge">
      {/* Left section - Logo and Navigation */}
      <div className="flex items-center gap-6">
        {/* Mobile Menu */}
        <details className="dropdown lg:hidden" ref={burgerMenuRef}>
          <summary className="btn btn-ghost p-2 hover:bg-base-300">
            <Bars3Icon className="h-6 w-6" />
          </summary>
          <ul
            className="menu dropdown-content mt-3 p-2 bg-base-200 rounded-[16px] w-52 border border-[#222222] shadow-lg z-50"
            onClick={() => burgerMenuRef?.current?.removeAttribute("open")}
          >
            <HeaderMenuLinks />
          </ul>
        </details>

        {/* Logo */}
        <Link href="/" passHref className="flex items-center gap-3">
          <div className="flex relative w-8 h-8">
            <Image alt="Pledge logo" className="cursor-pointer" fill src="/logo.svg" />
          </div>
          <span className="font-semibold text-lg hidden sm:block text-white">Pledge</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden lg:flex items-center gap-1">
          <HeaderMenuLinks />
        </ul>
      </div>

      {/* Center section - Search Bar */}
      <div className="hidden md:block flex-1 max-w-[400px] mx-8">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5E5E5E]" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search projects, tickets, or ENS..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className={`w-full bg-[#131313] rounded-[16px] border ${
              isSearchFocused ? "border-[#222222]" : "border-transparent"
            } py-2.5 pl-10 pr-10 text-sm text-white placeholder-[#5E5E5E] transition-all focus:outline-none`}
          />
          {!isSearchFocused && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#1B1B1B] text-[#5E5E5E] text-xs px-1.5 py-0.5 rounded">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Right section - Network + Wallet */}
      <div className="flex items-center gap-3">
        {/* Network Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-[#131313] px-3 py-1.5 rounded-full text-sm font-medium text-[#9B9B9B]">
          <span className="w-2 h-2 rounded-full bg-[#27AE60]"></span>
          {targetNetwork.name}
        </div>
        
        {/* Connect Button */}
        <RainbowKitCustomConnectButton />
        
        {/* Faucet for local network */}
        {isLocalNetwork && <FaucetButton />}
      </div>
    </header>
  );
};
