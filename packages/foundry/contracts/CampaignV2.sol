//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PledgeToken.sol";

/**
 * @title CampaignV2
 * @author Pledge Protocol
 * @notice A trust-minimized crowdfunding campaign contract with reward tokens
 * @dev Deployed as minimal proxies (EIP-1167) via CampaignFactory for gas efficiency
 */
contract CampaignV2 is ReentrancyGuard, Initializable {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum CampaignStatus {
        Active,
        Successful,
        Failed,
        Cancelled
    }

    // ============ State Variables ============

    // Immutable-like (set once in initialize, never changed)
    address public creator;
    uint256 public fundingGoal;
    uint256 public deadline;
    uint256 public createdAt;
    uint256 public fundingCap; // Maximum funding allowed (0 = no cap)
    address public acceptedToken; // address(0) for ETH, otherwise ERC20 token address
    
    // Metadata stored as IPFS CID for gas efficiency
    string public metadataCID; // IPFS CID containing title, description, imageUrl

    // For backwards compatibility (deprecated, use metadataCID)
    string public title;
    string public description;
    string public imageUrl;

    // ============ Mutable State Variables ============

    uint256 public totalRaised;
    CampaignStatus public status;
    mapping(address => uint256) public contributions;
    address[] internal _contributors;
    mapping(address => bool) private hasContributed;
    bool public fundsWithdrawn;
    
    // Reward token for backers
    PledgeToken public rewardToken;
    mapping(address => bool) public hasClaimedReward;

    // ============ Events ============

    event ContributionMade(address indexed contributor, uint256 amount, uint256 totalRaised);
    event FundsWithdrawn(address indexed creator, uint256 amount);
    event RefundClaimed(address indexed contributor, uint256 amount);
    event CampaignCancelled(address indexed creator);
    event CampaignStatusUpdated(CampaignStatus newStatus);
    event RewardClaimed(address indexed contributor, uint256 tokenAmount);
    event CampaignFinalized(CampaignStatus finalStatus);

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
    error FundingCapExceeded();
    error AlreadyWithdrawn();
    error AlreadyClaimed();
    error InvalidToken();
    error NotEligibleForRefund();

    // ============ Constants ============

    uint256 public constant MIN_CONTRIBUTION = 0.001 ether;

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

    // ============ Initializer (for Clones) ============

    /**
     * @notice Initialize the campaign (called by factory via clone)
     * @param _creator Address of the campaign creator
     * @param _fundingGoal Minimum amount to raise (in wei for ETH, or token decimals for ERC20)
     * @param _durationDays Campaign duration in days
     * @param _title Campaign title (for backwards compatibility)
     * @param _description Campaign description (for backwards compatibility)
     * @param _imageUrl Optional image URL (for backwards compatibility)
     * @param _fundingCap Maximum funding allowed (0 = no cap)
     * @param _acceptedToken Token address (address(0) for ETH)
     * @param _metadataCID IPFS CID for off-chain metadata
     */
    function initialize(
        address _creator,
        uint256 _fundingGoal,
        uint256 _durationDays,
        string memory _title,
        string memory _description,
        string memory _imageUrl,
        uint256 _fundingCap,
        address _acceptedToken,
        string memory _metadataCID
    ) external initializer {
        if (_creator == address(0)) revert InvalidParameters();
        if (_fundingGoal == 0) revert InvalidParameters();
        if (_durationDays == 0 || _durationDays > 365) revert InvalidParameters();
        if (bytes(_title).length == 0 && bytes(_metadataCID).length == 0) revert InvalidParameters();
        if (_fundingCap != 0 && _fundingCap < _fundingGoal) revert InvalidParameters();

        creator = _creator;
        fundingGoal = _fundingGoal;
        deadline = block.timestamp + (_durationDays * 1 days);
        createdAt = block.timestamp;
        title = _title;
        description = _description;
        imageUrl = _imageUrl;
        fundingCap = _fundingCap;
        acceptedToken = _acceptedToken;
        metadataCID = _metadataCID;
        status = CampaignStatus.Active;

        // Deploy reward token for this campaign
        string memory tokenName = string(abi.encodePacked("Pledge: ", _title));
        string memory tokenSymbol = "PLEDGE";
        rewardToken = new PledgeToken(tokenName, tokenSymbol, address(this));
    }

    // ============ Legacy Constructor (for non-clone deployments) ============

    /**
     * @notice Creates a new crowdfunding campaign (legacy, prefer using clones)
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
        fundingCap = 0; // No cap by default
        acceptedToken = address(0); // ETH by default
        status = CampaignStatus.Active;

        // Deploy reward token for this campaign
        string memory tokenName = string(abi.encodePacked("Pledge: ", _title));
        string memory tokenSymbol = "PLEDGE";
        rewardToken = new PledgeToken(tokenName, tokenSymbol, address(this));
    }

    // ============ External Functions ============

    /**
     * @notice Contribute ETH to the campaign
     * @dev Contributions allowed before deadline. Uses CEI pattern for reentrancy safety.
     */
    function contribute() external payable onlyBeforeDeadline nonReentrant {
        if (acceptedToken != address(0)) revert InvalidToken();
        _processContribution(msg.sender, msg.value);
    }

    /**
     * @notice Contribute ERC20 tokens to the campaign
     * @param amount Amount of tokens to contribute
     */
    function contributeToken(uint256 amount) external onlyBeforeDeadline nonReentrant {
        if (acceptedToken == address(0)) revert InvalidToken();
        
        // Transfer tokens from contributor to this contract
        IERC20(acceptedToken).safeTransferFrom(msg.sender, address(this), amount);
        
        _processContribution(msg.sender, amount);
    }

    /**
     * @notice Internal contribution processing (CEI pattern)
     */
    function _processContribution(address contributor, uint256 amount) internal {
        // Can't contribute if cancelled
        if (status == CampaignStatus.Cancelled) revert CampaignNotActive();
        if (amount == 0) revert ZeroContribution();
        
        // For ETH, enforce minimum. For tokens, minimum depends on decimals
        if (acceptedToken == address(0) && amount < MIN_CONTRIBUTION) {
            revert ContributionTooSmall();
        }

        // Check funding cap
        if (fundingCap > 0 && totalRaised + amount > fundingCap) {
            revert FundingCapExceeded();
        }

        // EFFECTS (state changes before any external calls)
        if (!hasContributed[contributor]) {
            _contributors.push(contributor);
            hasContributed[contributor] = true;
        }
        contributions[contributor] += amount;
        totalRaised += amount;

        emit ContributionMade(contributor, amount, totalRaised);

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
    function finalize() external onlyActive {
        if (block.timestamp < deadline) revert DeadlineNotPassed();
        
        if (totalRaised >= fundingGoal) {
            status = CampaignStatus.Successful;
            emit CampaignStatusUpdated(CampaignStatus.Successful);
        } else {
            status = CampaignStatus.Failed;
            emit CampaignStatusUpdated(CampaignStatus.Failed);
        }
        
        emit CampaignFinalized(status);
    }

    /**
     * @notice Creator withdraws funds after successful campaign AND after deadline
     * @dev CRITICAL FIX: Requires deadline to have passed to prevent early rug-pulls
     */
    function withdraw() external onlyCreator nonReentrant {
        // CRITICAL: Must be successful AND deadline passed
        if (status != CampaignStatus.Successful) revert CampaignNotSuccessful();
        if (block.timestamp < deadline) revert DeadlineNotPassed();
        if (fundsWithdrawn) revert AlreadyWithdrawn();

        uint256 amount;
        
        if (acceptedToken == address(0)) {
            amount = address(this).balance;
        } else {
            amount = IERC20(acceptedToken).balanceOf(address(this));
        }
        
        if (amount == 0) revert TransferFailed();

        // EFFECTS: Mark as withdrawn BEFORE transfer (CEI pattern)
        fundsWithdrawn = true;

        // INTERACTIONS: External call last
        if (acceptedToken == address(0)) {
            (bool success,) = creator.call{ value: amount }("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(acceptedToken).safeTransfer(creator, amount);
        }

        emit FundsWithdrawn(creator, amount);
    }

    /**
     * @notice Backer claims refund after failed/cancelled campaign
     * @dev CRITICAL FIX: Permissionless - checks deadline internally if status is still Active
     *      This prevents the "locked funds" trap where no one calls finalize()
     */
    function refund() external nonReentrant {
        // Permissionless refund logic: Allow refund if:
        // 1. Status is Failed or Cancelled, OR
        // 2. Deadline passed AND totalRaised < fundingGoal (even if status not updated)
        bool canRefund = (status == CampaignStatus.Failed || status == CampaignStatus.Cancelled);
        
        if (!canRefund) {
            // Check if we should allow refund even without finalization
            if (block.timestamp >= deadline && totalRaised < fundingGoal) {
                // Auto-finalize to Failed
                if (status == CampaignStatus.Active) {
                    status = CampaignStatus.Failed;
                    emit CampaignStatusUpdated(CampaignStatus.Failed);
                    emit CampaignFinalized(CampaignStatus.Failed);
                }
                canRefund = true;
            }
        }
        
        if (!canRefund) revert NotEligibleForRefund();

        uint256 amount = contributions[msg.sender];
        if (amount == 0) revert NoContribution();

        // EFFECTS: Zero out contribution BEFORE transfer (CEI pattern)
        contributions[msg.sender] = 0;

        // INTERACTIONS: External call last
        if (acceptedToken == address(0)) {
            (bool success,) = msg.sender.call{ value: amount }("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(acceptedToken).safeTransfer(msg.sender, amount);
        }

        emit RefundClaimed(msg.sender, amount);
    }

    /**
     * @notice Claim reward tokens after successful campaign
     * @dev Backers can claim ERC20 reward tokens proportional to their contribution
     */
    function claimReward() external nonReentrant {
        if (status != CampaignStatus.Successful) revert CampaignNotSuccessful();
        if (block.timestamp < deadline) revert DeadlineNotPassed();
        if (hasClaimedReward[msg.sender]) revert AlreadyClaimed();
        
        uint256 contribution = contributions[msg.sender];
        if (contribution == 0) revert NoContribution();

        // EFFECTS
        hasClaimedReward[msg.sender] = true;

        // INTERACTIONS
        rewardToken.mintReward(msg.sender, contribution);

        emit RewardClaimed(msg.sender, contribution);
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
     * @notice Get number of contributors
     * @return Number of unique contributors
     * @dev Frontend should use ContributionMade events for full contributor list (gas efficient)
     */
    function getContributorCount() external view returns (uint256) {
        return _contributors.length;
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
            _contributors.length,
            imageUrl
        );
    }

    /**
     * @notice Get extended campaign details including new fields
     */
    function getCampaignDetailsExtended()
        external
        view
        returns (
            address _creator,
            uint256 _fundingGoal,
            uint256 _fundingCap,
            uint256 _deadline,
            uint256 _totalRaised,
            CampaignStatus _status,
            string memory _metadataCID,
            uint256 _createdAt,
            uint256 _contributorCount,
            address _acceptedToken,
            address _rewardToken,
            bool _fundsWithdrawn
        )
    {
        return (
            creator,
            fundingGoal,
            fundingCap,
            deadline,
            totalRaised,
            status,
            metadataCID,
            createdAt,
            _contributors.length,
            acceptedToken,
            address(rewardToken),
            fundsWithdrawn
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

    /**
     * @notice Check if user can claim refund
     * @param user Address to check
     * @return canClaim True if refund is available
     * @return amount Amount that can be refunded
     */
    function canClaimRefund(address user) external view returns (bool canClaim, uint256 amount) {
        amount = contributions[user];
        if (amount == 0) return (false, 0);
        
        bool statusAllowsRefund = (status == CampaignStatus.Failed || status == CampaignStatus.Cancelled);
        bool deadlinePassedAndFailed = (block.timestamp >= deadline && totalRaised < fundingGoal);
        
        canClaim = statusAllowsRefund || deadlinePassedAndFailed;
    }

    /**
     * @notice Check if user can claim reward
     * @param user Address to check
     * @return canClaim True if reward is available
     * @return contribution User's contribution amount
     */
    function canClaimReward(address user) external view returns (bool canClaim, uint256 contribution) {
        contribution = contributions[user];
        canClaim = (
            status == CampaignStatus.Successful &&
            block.timestamp >= deadline &&
            !hasClaimedReward[user] &&
            contribution > 0
        );
    }
}
