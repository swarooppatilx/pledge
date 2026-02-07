//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./CampaignV2.sol";

/**
 * @title CampaignFactoryV2
 * @author Pledge Protocol
 * @notice Factory contract using EIP-1167 minimal proxies for gas-efficient campaign deployment
 * @dev Reduces deployment cost by ~10x compared to deploying full contracts
 */
contract CampaignFactoryV2 {
    using Clones for address;

    // ============ State Variables ============

    address public immutable campaignImplementation;
    address[] public campaigns;
    mapping(address => address[]) public campaignsByCreator;
    mapping(address => bool) public isCampaign;

    // ============ Structs ============

    /**
     * @notice Campaign summary for multicall responses (simplified to avoid stack depth)
     */
    struct CampaignSummary {
        address campaignAddress;
        address creator;
        uint256 fundingGoal;
        uint256 deadline;
        uint256 totalRaised;
        uint8 status;
        string title;
        uint256 createdAt;
        uint256 contributorCount;
    }

    // ============ Events ============

    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        uint256 fundingGoal,
        uint256 deadline,
        string title,
        address acceptedToken
    );

    // ============ Errors ============

    error InvalidFundingGoal();
    error InvalidDuration();
    error InvalidTitle();
    error InvalidDescription();
    error InvalidCap();

    // ============ Constructor ============

    constructor() {
        // Deploy the implementation contract (template for clones)
        // Using dummy values - this contract is never used directly
        campaignImplementation = address(
            new CampaignV2(
                address(1), // dummy creator
                1 ether,    // dummy goal
                30,         // dummy duration
                "Template", // dummy title
                "Template", // dummy description
                ""          // no image
            )
        );
    }

    // ============ External Functions ============

    /**
     * @notice Create a new crowdfunding campaign using minimal proxy
     * @param _fundingGoal Minimum amount to raise (in wei for ETH)
     * @param _durationDays Campaign duration in days (1-365)
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _imageUrl Optional image URL for the campaign
     * @return campaignAddress Address of the newly created campaign
     */
    function createCampaign(
        uint256 _fundingGoal,
        uint256 _durationDays,
        string calldata _title,
        string calldata _description,
        string calldata _imageUrl
    ) external returns (address campaignAddress) {
        return createCampaignAdvanced(
            _fundingGoal,
            _durationDays,
            _title,
            _description,
            _imageUrl,
            0,          // no funding cap
            address(0), // ETH
            ""          // no IPFS CID
        );
    }

    /**
     * @notice Create a campaign with advanced options (funding cap, ERC20 support, IPFS)
     * @param _fundingGoal Minimum amount to raise
     * @param _durationDays Campaign duration in days (1-365)
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _imageUrl Optional image URL
     * @param _fundingCap Maximum funding allowed (0 = no cap)
     * @param _acceptedToken Token address (address(0) for ETH)
     * @param _metadataCID IPFS CID for off-chain metadata
     * @return campaignAddress Address of the newly created campaign
     */
    function createCampaignAdvanced(
        uint256 _fundingGoal,
        uint256 _durationDays,
        string memory _title,
        string memory _description,
        string memory _imageUrl,
        uint256 _fundingCap,
        address _acceptedToken,
        string memory _metadataCID
    ) public returns (address campaignAddress) {
        if (_fundingGoal == 0) revert InvalidFundingGoal();
        if (_durationDays == 0 || _durationDays > 365) revert InvalidDuration();
        if (bytes(_title).length == 0 && bytes(_metadataCID).length == 0) revert InvalidTitle();
        if (bytes(_description).length == 0 && bytes(_metadataCID).length == 0) revert InvalidDescription();
        if (_fundingCap != 0 && _fundingCap < _fundingGoal) revert InvalidCap();

        // Deploy minimal proxy clone
        campaignAddress = campaignImplementation.clone();

        // Initialize the clone
        CampaignV2(payable(campaignAddress)).initialize(
            msg.sender,
            _fundingGoal,
            _durationDays,
            _title,
            _description,
            _imageUrl,
            _fundingCap,
            _acceptedToken,
            _metadataCID
        );

        campaigns.push(campaignAddress);
        campaignsByCreator[msg.sender].push(campaignAddress);
        isCampaign[campaignAddress] = true;

        emit CampaignCreated(
            campaignAddress,
            msg.sender,
            _fundingGoal,
            block.timestamp + (_durationDays * 1 days),
            _title,
            _acceptedToken
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

    /**
     * @notice MULTICALL: Get campaign summaries in bulk to reduce RPC calls
     * @dev Fixes the N+1 dashboard lag by returning all data in one call
     * @param _campaignAddresses Array of campaign addresses to query
     * @return summaries Array of campaign summaries
     */
    function getCampaignSummaries(address[] calldata _campaignAddresses) 
        external 
        view 
        returns (CampaignSummary[] memory summaries) 
    {
        summaries = new CampaignSummary[](_campaignAddresses.length);
        
        for (uint256 i = 0; i < _campaignAddresses.length; i++) {
            summaries[i] = _fetchCampaignSummary(_campaignAddresses[i]);
        }
    }

    /**
     * @notice Internal helper to fetch a single campaign summary
     */
    function _fetchCampaignSummary(address addr) internal view returns (CampaignSummary memory summary) {
        CampaignV2 campaign = CampaignV2(payable(addr));
        
        try campaign.getCampaignDetails() returns (
            address _creator,
            uint256 _fundingGoal,
            uint256 _deadline,
            uint256 _totalRaised,
            CampaignV2.CampaignStatus _status,
            string memory _title,
            string memory, // description - unused
            uint256 _createdAt,
            uint256 _contributorCount,
            string memory // imageUrl - unused
        ) {
            summary.campaignAddress = addr;
            summary.creator = _creator;
            summary.fundingGoal = _fundingGoal;
            summary.deadline = _deadline;
            summary.totalRaised = _totalRaised;
            summary.status = uint8(_status);
            summary.title = _title;
            summary.createdAt = _createdAt;
            summary.contributorCount = _contributorCount;
        } catch {
            summary.campaignAddress = addr;
            summary.status = uint8(CampaignV2.CampaignStatus.Failed);
        }
    }

    /**
     * @notice MULTICALL: Get all campaign summaries
     * @dev Convenience function to fetch all campaigns with details in one call
     * @return summaries Array of all campaign summaries
     */
    function getAllCampaignSummaries() external view returns (CampaignSummary[] memory summaries) {
        summaries = new CampaignSummary[](campaigns.length);
        
        for (uint256 i = 0; i < campaigns.length; i++) {
            summaries[i] = _fetchCampaignSummary(campaigns[i]);
        }
    }

    /**
     * @notice MULTICALL: Get paginated campaign summaries
     * @param _offset Starting index
     * @param _limit Maximum number to return
     * @return summaries Array of campaign summaries
     */
    function getCampaignSummariesPaginated(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (CampaignSummary[] memory summaries) 
    {
        uint256 totalCampaigns = campaigns.length;

        if (_offset >= totalCampaigns) {
            return new CampaignSummary[](0);
        }

        uint256 end = _offset + _limit;
        if (end > totalCampaigns) {
            end = totalCampaigns;
        }

        uint256 resultLength = end - _offset;
        summaries = new CampaignSummary[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            summaries[i] = _fetchCampaignSummary(campaigns[_offset + i]);
        }
    }
}
