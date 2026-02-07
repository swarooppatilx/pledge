import React from "react";
import Link from "next/link";
import { useFetchNativeCurrencyPrice } from "@scaffold-ui/hooks";
import { hardhat } from "viem/chains";
import { CurrencyDollarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/outline";
import { BuidlGuidlLogo } from "~~/components/assets/BuidlGuidlLogo";
import { Faucet } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

/**
 * Site footer - Uniswap Dark Style
 */
export const Footer = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const { price: nativeCurrencyPrice } = useFetchNativeCurrencyPrice();

  return (
    <footer className="bg-[#0D0D0D] border-t border-[#222222] py-6 px-6 mt-auto">
      {/* Fixed Bottom Bar for Local Network */}
      <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
        <div className="flex flex-col md:flex-row gap-2 pointer-events-auto">
          {nativeCurrencyPrice > 0 && (
            <div className="bg-[#131313] border border-[#222222] rounded-[12px] px-3 py-1.5 flex items-center gap-2 text-sm">
              <CurrencyDollarIcon className="h-4 w-4 text-[#27AE60]" />
              <span className="text-[#9B9B9B] font-mono">{nativeCurrencyPrice.toFixed(2)}</span>
            </div>
          )}
          {isLocalNetwork && (
            <>
              <Faucet />
              <Link 
                href="/blockexplorer" 
                passHref 
                className="bg-[#131313] border border-[#222222] rounded-[12px] px-3 py-1.5 flex items-center gap-2 text-sm text-[#9B9B9B] hover:text-white hover:border-[#333333] transition-colors"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span>Block Explorer</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Footer Content */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-[#5E5E5E] text-sm">
            <span>© 2026 Pledge Protocol</span>
            <span>·</span>
            <a href="https://github.com/scaffold-eth/se-2" target="_blank" rel="noreferrer" className="hover:text-[#9B9B9B] transition-colors">
              GitHub
            </a>
            <span>·</span>
            <a href="https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA" target="_blank" rel="noreferrer" className="hover:text-[#9B9B9B] transition-colors">
              Support
            </a>
          </div>
          
          <div className="flex items-center gap-2 text-[#5E5E5E] text-sm">
            <span>Built with</span>
            <HeartIcon className="h-4 w-4 text-[#FF007A]" />
            <span>at</span>
            <a
              className="flex items-center gap-1 hover:text-[#9B9B9B] transition-colors"
              href="https://buidlguidl.com/"
              target="_blank"
              rel="noreferrer"
            >
              <BuidlGuidlLogo className="w-3 h-5" />
              <span>BuidlGuidl</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
