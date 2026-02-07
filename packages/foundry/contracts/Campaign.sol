//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Campaign
 * @author Pledge Protocol
 * @notice A trust-minimized crowdfunding campaign contract
 * @dev Each campaign is deployed as a separate immutable contract via CampaignFactory
 */
contract Campaign is ReentrancyGuard {
    // ============ Enums ============

    enum CampaignStatus {
        Active,
        Successful,
        Failed,
        Cancelled
    }

    // ============ Immutable State Variables ============

    address public immutable creator;
    uint256 public immutable fundingGoal;
    uint256 public immutable deadline;
    uint256 public immutable createdAt;
    string public title;
    string public description;
    string public imageUrl;

    // ============ Mutable State Variables ============

    uint256 public totalRaised;
    CampaignStatus public status;
    mapping(address => uint256) public contributions;
    address[] public contributors;
    mapping(address => bool) private hasContributed;

    // ============ Events ============

    event ContributionMade(address indexed contributor, uint256 amount, uint256 totalRaised);
    event FundsWithdrawn(address indexed creator, uint256 amount);
    event RefundClaimed(address indexed contributor, uint256 amount);
    event CampaignCancelled(address indexed creator);
    event CampaignStatusUpdated(CampaignStatus newStatus);

    // ============ Errors ============

    error CampaignNotActive();
    error CampaignStillActive();
    error CampaignNotFailed();
    error CampaignNotSuccessful();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error NotCreator();
    error ZeroContribution();
    error ContributionTooSmall();
    error NoContribution();
    error TransferFailed();
    error InvalidParameters();

    // ============ Modifiers ============

    modifier onlyCreator() {
        if (msg.sender != creator) revert NotCreator();
        _;
    }

    modifier onlyActive() {
        if (status != CampaignStatus.Active) revert CampaignNotActive();
        _;
    }

    modifier onlyBeforeDeadline() {
        if (block.timestamp >= deadline) revert DeadlinePassed();
        _;
    }

    modifier onlyAfterDeadline() {
        if (block.timestamp < deadline) revert DeadlineNotPassed();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Creates a new crowdfunding campaign
     * @param _creator Address of the campaign creator
     * @param _fundingGoal Minimum amount of ETH to raise (in wei)
     * @param _durationDays Campaign duration in days
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _imageUrl Optional image URL for the campaign
     */
    constructor(
        address _creator,
        uint256 _fundingGoal,
        uint256 _durationDays,
        string memory _title,
        string memory _description,
        string memory _imageUrl
    ) {
        if (_creator == address(0)) revert InvalidParameters();
        if (_fundingGoal == 0) revert InvalidParameters();
        if (_durationDays == 0 || _durationDays > 365) revert InvalidParameters();
        if (bytes(_title).length == 0) revert InvalidParameters();

        creator = _creator;
        fundingGoal = _fundingGoal;
        deadline = block.timestamp + (_durationDays * 1 days);
        createdAt = block.timestamp;
        title = _title;
        description = _description;
        imageUrl = _imageUrl;
        status = CampaignStatus.Active;
    }

    // ============ Constants ============

    uint256 public constant MIN_CONTRIBUTION = 0.001 ether;

    // ============ External Functions ============

    /**
     * @notice Contribute ETH to the campaign
     * @dev Contributions allowed before deadline. Overfunding is permitted (like Kickstarter).
     *      Campaign becomes Successful when goal is first reached but contributions continue.
     */
    function contribute() external payable onlyBeforeDeadline nonReentrant {
        // Can't contribute if cancelled
        if (status == CampaignStatus.Cancelled) revert CampaignNotActive();
        if (msg.value == 0) revert ZeroContribution();
        if (msg.value < MIN_CONTRIBUTION) revert ContributionTooSmall();

        // Effects
        if (!hasContributed[msg.sender]) {
            contributors.push(msg.sender);
            hasContributed[msg.sender] = true;
        }
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit ContributionMade(msg.sender, msg.value, totalRaised);

        // Mark as successful when goal is first reached (but keep accepting contributions)
        if (status == CampaignStatus.Active && totalRaised >= fundingGoal) {
            status = CampaignStatus.Successful;
            emit CampaignStatusUpdated(CampaignStatus.Successful);
        }
    }

    /**
     * @notice Finalize the campaign after deadline
     * @dev Anyone can call this to update status after deadline
     */
    function finalize() external onlyActive onlyAfterDeadline {
        if (totalRaised >= fundingGoal) {
            status = CampaignStatus.Successful;
            emit CampaignStatusUpdated(CampaignStatus.Successful);
        } else {
            status = CampaignStatus.Failed;
            emit CampaignStatusUpdated(CampaignStatus.Failed);
        }
    }

    /**
     * @notice Creator withdraws funds after successful campaign
     * @dev Only callable by creator when campaign is Successful
     */
    function withdraw() external onlyCreator nonReentrant {
        if (status != CampaignStatus.Successful) revert CampaignNotSuccessful();

        uint256 amount = address(this).balance;
        if (amount == 0) revert TransferFailed();

        // Interactions
        (bool success,) = creator.call{ value: amount }("");
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(creator, amount);
    }

    /**
     * @notice Backer claims refund after failed campaign
     * @dev Only callable when campaign is Failed
     */
    function refund() external nonReentrant {
        if (status != CampaignStatus.Failed && status != CampaignStatus.Cancelled) {
            revert CampaignNotFailed();
        }

        uint256 amount = contributions[msg.sender];
        if (amount == 0) revert NoContribution();

        // Effects
        contributions[msg.sender] = 0;

        // Interactions
        (bool success,) = msg.sender.call{ value: amount }("");
        if (!success) revert TransferFailed();

        emit RefundClaimed(msg.sender, amount);
    }

    /**
     * @notice Creator cancels campaign before deadline
     * @dev Only callable by creator while campaign is Active and before deadline
     */
    function cancel() external onlyCreator onlyActive onlyBeforeDeadline {
        status = CampaignStatus.Cancelled;
        emit CampaignCancelled(creator);
        emit CampaignStatusUpdated(CampaignStatus.Cancelled);
    }

    // ============ View Functions ============

    /**
     * @notice Get contribution amount for a specific address
     * @param _contributor Address to check
     * @return Amount contributed in wei
     */
    function getContribution(address _contributor) external view returns (uint256) {
        return contributions[_contributor];
    }

    /**
     * @notice Get all contributors
     * @return Array of contributor addresses
     */
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    /**
     * @notice Get number of contributors
     * @return Number of unique contributors
     */
    function getContributorCount() external view returns (uint256) {
        return contributors.length;
    }

    /**
     * @notice Get time remaining until deadline
     * @return Seconds remaining, or 0 if deadline passed
     */
    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    /**
     * @notice Get funding progress as percentage (0-100+)
     * @return Percentage of goal reached (can exceed 100)
     */
    function getFundingProgress() external view returns (uint256) {
        if (fundingGoal == 0) return 0;
        return (totalRaised * 100) / fundingGoal;
    }

    /**
     * @notice Get campaign details
     * @return _creator Campaign creator address
     * @return _fundingGoal Funding goal in wei
     * @return _deadline Campaign deadline timestamp
     * @return _totalRaised Total amount raised in wei
     * @return _status Current campaign status
     * @return _title Campaign title
     * @return _description Campaign description
     * @return _createdAt Campaign creation timestamp
     * @return _contributorCount Number of unique contributors
     * @return _imageUrl Campaign image URL
     */
    function getCampaignDetails()
        external
        view
        returns (
            address _creator,
            uint256 _fundingGoal,
            uint256 _deadline,
            uint256 _totalRaised,
            CampaignStatus _status,
            string memory _title,
            string memory _description,
            uint256 _createdAt,
            uint256 _contributorCount,
            string memory _imageUrl
        )
    {
        return (
            creator,
            fundingGoal,
            deadline,
            totalRaised,
            status,
            title,
            description,
            createdAt,
            contributors.length,
            imageUrl
        );
    }

    /**
     * @notice Check if campaign goal was reached
     * @return True if totalRaised >= fundingGoal
     */
    function isGoalReached() external view returns (bool) {
        return totalRaised >= fundingGoal;
    }

    /**
     * @notice Check if deadline has passed
     * @return True if current time >= deadline
     */
    function isDeadlinePassed() external view returns (bool) {
        return block.timestamp >= deadline;
    }
}
