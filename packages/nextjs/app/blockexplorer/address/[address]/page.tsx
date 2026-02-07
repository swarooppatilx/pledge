import { Address, createPublicClient, http } from "viem";
import { foundry } from "viem/chains";
import { AddressComponent } from "~~/app/blockexplorer/_components/AddressComponent";
import deployedContracts from "~~/contracts/deployedContracts";
import { isZeroAddress } from "~~/utils/scaffold-eth/common";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

type PageProps = {
  params: Promise<{ address: Address }>;
};

/**
 * Get bytecode using Viem instead of fs (works in Vercel/browser)
 */
const getContractData = async (address: Address) => {
  const contracts = deployedContracts as GenericContractsDeclaration | null;
  const chainId = foundry.id;

  if (!contracts || !contracts[chainId] || Object.keys(contracts[chainId]).length === 0) {
    return null;
  }

  // Check if this address is a known contract
  const deployedContractsOnChain = contracts[chainId];
  let isKnownContract = false;

  for (const [, contractInfo] of Object.entries(deployedContractsOnChain)) {
    if (contractInfo.address.toLowerCase() === address.toLowerCase()) {
      isKnownContract = true;
      break;
    }
  }

  if (!isKnownContract) {
    return null;
  }

  try {
    // Use Viem to fetch bytecode from the chain
    const client = createPublicClient({
      chain: foundry,
      transport: http(),
    });

    const bytecode = await client.getBytecode({ address });

    if (!bytecode) {
      return null;
    }

    return {
      bytecode: bytecode.slice(2), // Remove 0x prefix
      assembly: "Assembly not available in production build",
    };
  } catch (error) {
    console.error("Failed to fetch bytecode:", error);
    return null;
  }
};

export function generateStaticParams() {
  // An workaround to enable static exports in Next.js, generating single dummy page.
  return [{ address: "0x0000000000000000000000000000000000000000" }];
}

const AddressPage = async (props: PageProps) => {
  const params = await props.params;
  const address = params?.address as Address;

  if (isZeroAddress(address)) return null;

  const contractData: { bytecode: string; assembly: string } | null = await getContractData(address);
  return <AddressComponent address={address} contractData={contractData} />;
};

export default AddressPage;
