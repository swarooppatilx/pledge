import { DebugContracts } from "./_components/DebugContracts";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Debug Contracts",
  description: "Debug your deployed Scaffold-ETH 2 contracts in an easy way",
});

const Debug: NextPage = () => {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <div className="text-center py-10 px-6 bg-[#131313] border-b border-[#222222]">
        <h1 className="text-2xl font-semibold text-white mb-2">Debug Contracts</h1>
        <p className="text-[#5E5E5E] text-sm">
          Interact with your deployed contracts.{" "}
          <code className="text-[#9B9B9B] bg-[#1B1B1B] px-2 py-1 rounded text-xs font-mono">
            packages/nextjs/app/debug/page.tsx
          </code>
        </p>
      </div>
      <DebugContracts />
    </div>
  );
};

export default Debug;
