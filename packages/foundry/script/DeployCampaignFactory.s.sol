// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/CampaignFactory.sol";
import "../contracts/Campaign.sol";

/**
 * @notice Deploy script for CampaignFactory and Campaign contracts
 * @dev Deploys the factory and a template Campaign (for ABI generation)
 * The template Campaign is deployed with dummy values but its ABI is needed
 * for the frontend to interact with dynamically created campaigns.
 * Example:
 * yarn deploy --file DeployCampaignFactory.s.sol  # local anvil chain
 * yarn deploy --file DeployCampaignFactory.s.sol --network sepolia # live network
 */
contract DeployCampaignFactory is ScaffoldETHDeploy {
    /**
     * @dev Deployer setup based on `ETH_KEYSTORE_ACCOUNT` in `.env`:
     *      - "scaffold-eth-default": Uses Anvil's account #9
     *      - "scaffold-eth-custom": requires password
     */
    function run() external ScaffoldEthDeployerRunner {
        // Deploy the factory
        new CampaignFactory();

        // Deploy a template Campaign for ABI generation
        // This is a dummy deployment so the frontend can get the Campaign ABI
        // The actual campaigns are created via CampaignFactory.createCampaign()
        new Campaign(
            address(0xdead), // dummy creator
            1 ether, // dummy funding goal
            1, // 1 day duration
            "Template", // dummy title
            "ABI Template" // dummy description
        );
    }
}
