// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/CampaignFactory.sol";

/**
 * @notice Deploy script for CampaignFactory contract
 * @dev Deploys the factory which is used to create individual campaigns
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
        new CampaignFactory();
    }
}
