//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Campaign.sol";

/**
 * @title CampaignFactory
 * @author Pledge Protocol
 * @notice Factory contract for deploying and tracking crowdfunding campaigns
 * @dev Each campaign is deployed as a separate immutable contract
 */
contract CampaignFactory {
    // ============ State Variables ============

    address[] public campaigns;
    mapping(address => address[]) public campaignsByCreator;
    mapping(address => bool) public isCampaign;

    // ============ Events ============

    event CampaignCreated(
        address indexed campaignAddress, address indexed creator, uint256 fundingGoal, uint256 deadline, string title
    );

    // ============ Errors ============

    error InvalidFundingGoal();
    error InvalidDuration();
    error InvalidTitle();

    // ============ External Functions ============

    /**
     * @notice Create a new crowdfunding campaign
     * @param _fundingGoal Minimum amount of ETH to raise (in wei)
     * @param _durationDays Campaign duration in days (1-365)
     * @param _title Campaign title
     * @param _description Campaign description
     * @return campaignAddress Address of the newly created campaign
     */
    function createCampaign(
        uint256 _fundingGoal,
        uint256 _durationDays,
        string calldata _title,
        string calldata _description
    ) external returns (address campaignAddress) {
        if (_fundingGoal == 0) revert InvalidFundingGoal();
        if (_durationDays == 0 || _durationDays > 365) revert InvalidDuration();
        if (bytes(_title).length == 0) revert InvalidTitle();

        Campaign campaign = new Campaign(msg.sender, _fundingGoal, _durationDays, _title, _description);

        campaignAddress = address(campaign);
        campaigns.push(campaignAddress);
        campaignsByCreator[msg.sender].push(campaignAddress);
        isCampaign[campaignAddress] = true;

        emit CampaignCreated(
            campaignAddress, msg.sender, _fundingGoal, block.timestamp + (_durationDays * 1 days), _title
        );
    }

    // ============ View Functions ============

    /**
     * @notice Get all campaign addresses
     * @return Array of campaign addresses
     */
    function getAllCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    /**
     * @notice Get campaigns created by a specific address
     * @param _creator Creator address
     * @return Array of campaign addresses
     */
    function getCampaignsByCreator(address _creator) external view returns (address[] memory) {
        return campaignsByCreator[_creator];
    }

    /**
     * @notice Get total number of campaigns created
     * @return Number of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    /**
     * @notice Get paginated list of campaigns
     * @param _offset Starting index
     * @param _limit Maximum number of campaigns to return
     * @return Array of campaign addresses
     */
    function getCampaignsPaginated(uint256 _offset, uint256 _limit) external view returns (address[] memory) {
        uint256 totalCampaigns = campaigns.length;

        if (_offset >= totalCampaigns) {
            return new address[](0);
        }

        uint256 end = _offset + _limit;
        if (end > totalCampaigns) {
            end = totalCampaigns;
        }

        uint256 resultLength = end - _offset;
        address[] memory result = new address[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = campaigns[_offset + i];
        }

        return result;
    }

    /**
     * @notice Check if an address is a campaign deployed by this factory
     * @param _address Address to check
     * @return True if address is a campaign
     */
    function isValidCampaign(address _address) external view returns (bool) {
        return isCampaign[_address];
    }
}
