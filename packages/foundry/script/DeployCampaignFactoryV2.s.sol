//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/CampaignFactoryV2.sol";
import "../contracts/CampaignV2.sol";

/**
 * @title DeployCampaignFactoryV2
 * @notice Deploy script for the upgraded CampaignFactoryV2 with EIP-1167 clones
 */
contract DeployCampaignFactoryV2 is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Deploy the factory (it deploys the implementation internally)
        CampaignFactoryV2 factory = new CampaignFactoryV2();
        
        console.logString("CampaignFactoryV2 deployed at:");
        console.logAddress(address(factory));
        
        console.logString("Campaign Implementation deployed at:");
        console.logAddress(factory.campaignImplementation());
    }
}
