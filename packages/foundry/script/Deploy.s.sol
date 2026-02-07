//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/Pledge.sol";
import "../contracts/PledgeToken.sol";
import "../contracts/PledgeFactory.sol";
import "../contracts/PledgeTreasury.sol";

/**
 * @title DeployPledge
 * @author Pledge Protocol
 * @notice Deployment script for Pledge Protocol on Base Sepolia
 * @dev Follows the "Carlos" standards for Base DeFi integration
 *
 * Base Sepolia Aave V3 Constants:
 * - Pool: 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b
 * - WETH: 0x4200000000000000000000000000000000000006
 * - aWETH: 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f
 *
 * Fork Testing:
 *   1. Set eth_rpc_url in foundry.toml to Base Sepolia RPC
 *   2. Run `yarn chain` (forks Base Sepolia)
 *   3. Run `yarn deploy`
 *
 * Live Deployment:
 *   yarn deploy --network baseSepolia
 */
contract DeployScript is ScaffoldETHDeploy {
    // ============ Base Mainnet Aave V3 Addresses (for future use) ============
    address constant AAVE_POOL_BASE = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address constant WETH_BASE = 0x4200000000000000000000000000000000000006;
    address constant AWETH_BASE = 0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7;

    // ============ Base Sepolia Aave V3 Addresses ============
    address constant AAVE_POOL_BASE_SEPOLIA = 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b;
    address constant WETH_BASE_SEPOLIA = 0x4200000000000000000000000000000000000006;
    address constant AWETH_BASE_SEPOLIA = 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f;

    function run() external ScaffoldEthDeployerRunner {
        address aavePool;
        address weth;
        address aWeth;

        // Local Fork (31337) or Base Sepolia (84532)
        if (block.chainid == 31337 || block.chainid == 84532) {
            aavePool = AAVE_POOL_BASE_SEPOLIA;
            weth = WETH_BASE_SEPOLIA;
            aWeth = AWETH_BASE_SEPOLIA;
            console.log("Deploying to Base Sepolia (or Base Sepolia fork)");
        }
        // Base Mainnet (8453) - reserved for future
        else if (block.chainid == 8453) {
            aavePool = AAVE_POOL_BASE;
            weth = WETH_BASE;
            aWeth = AWETH_BASE;
            console.log("Deploying to Base Mainnet");
        } else {
            revert("Unsupported chain - use Base Sepolia (84532) or local fork");
        }

        // God-mode: Give localhost deployer ETH on the fork
        if (block.chainid == 31337) {
            vm.deal(deployer, 100 ether);
        }

        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Aave Pool:", aavePool);
        console.log("WETH:", weth);
        console.log("aWETH:", aWeth);
        console.log("");

        // ============ Deploy PledgeTreasury ============
        PledgeTreasury treasury = new PledgeTreasury(deployer);
        console.log("PledgeTreasury deployed at:", address(treasury));

        deployments.push(Deployment({ name: "PledgeTreasury", addr: address(treasury) }));

        // ============ Deploy PledgeFactory ============
        PledgeFactory factory = new PledgeFactory(aavePool, weth, aWeth, address(treasury));

        console.log("PledgeFactory deployed at:", address(factory));
        console.log("Pledge Implementation:", factory.PLEDGE_IMPLEMENTATION());
        console.log("Listing Tax:", factory.LISTING_TAX(), "wei");

        deployments.push(Deployment({ name: "PledgeFactory", addr: address(factory) }));

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Treasury:", address(treasury));
        console.log("Factory:", address(factory));
        console.log("");
        console.log("Next steps:");
        console.log("1. Run `yarn start` to start the frontend");
        console.log("2. Create a pledge with 0.01 ETH listing tax");
    }
}
