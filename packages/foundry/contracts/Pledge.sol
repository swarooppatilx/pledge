// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PledgeToken.sol";

/**
 * @notice Minimal interface for Aave V3 Pool
 */
interface IPoolV3 {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/**
 * @notice Minimal interface for WETH
 */
interface IWETH9 {
    function deposit() external payable;
    function withdraw(uint256) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title Pledge
 * @author Pledge Protocol
 * @notice Decentralized Stock Exchange for Startups - Liquid Equity Engine
 * @dev Deployed via EIP-1167 minimal proxy from PledgeFactory
 *
 * Core Philosophy:
 * - Asset-Backed Liquidity: Every share = 1/1,000,000th claim on Aave-backed vault
 * - Dual-Earning Engine: Passive Yield (Aave V3) + Active Dividends (Project Revenue)
 * - Recycling Exit: Redeemed shares become Treasury Stock, not burned
 * - Circuit Breaker: Pro-rata redemption ensures Floor Price
 *
 * Key Invariants:
 * 1. Sum(UserBalances) + VaultTreasuryBalance == 1,000,000
 * 2. ContractBalance >= (totalPrincipal + UnclaimedDividends)
 * 3. UserClaimable = (UserBalance * currentRewardIndex) - userRewardDebt
 *
 * Yield Split (80/20):
 * - 80% of Aave interest → Reward Index for holders
 * - 20% of Aave interest → Protocol Spread for Pledge Treasury
 */
contract Pledge is Initializable, ReentrancyGuard {
    // ============ Constants (The "Carlos" Standards) ============

    /// @notice Fixed 1,000,000 share cap table - NEVER dynamic
    uint256 public constant TOTAL_SHARES = 1_000_000 * 1e18;

    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BASIS_POINTS = 10_000;

    /// @notice Maximum founder share (99%)
    uint256 public constant MAX_FOUNDER_BPS = 9900;

    /// @notice Minimum yield to harvest (prevents griefing)
    uint256 public constant MIN_HARVEST_YIELD = 0.001 ether;

    /// @notice Holder yield percentage (80%)
    uint256 public constant HOLDER_YIELD_BPS = 8_000;

    /// @notice Protocol spread percentage (20%)
    uint256 public constant PROTOCOL_SPREAD_BPS = 2_000;

    /// @notice Precision for financial calculations (1e18)
    uint256 public constant PRECISION = 1e18;

    // ============ Protocol Configuration (Set by Factory) ============

    /// @notice Aave V3 Pool (Base: 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5)
    address public AAVE_POOL;

    /// @notice WETH (Base: 0x4200000000000000000000000000000000000006)
    address public WETH;

    /// @notice aWETH (Base: 0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7)
    address public AWETH;

    /// @notice Pledge Treasury for protocol spread
    address public PLEDGE_TREASURY;

    // ============ Campaign State ============

    enum Status {
        Funding,
        Active,
        Failed
    }

    /// @notice Project creator
    address public creator;

    /// @notice Equity token for this pledge
    PledgeToken public token;

    /// @notice Funding goal in wei
    uint256 public fundingGoal;

    /// @notice ICO deadline
    uint256 public deadline;

    /// @notice Founder shares in basis points (e.g., 5100 = 51%)
    uint256 public founderShareBps;

    /// @notice Total ETH raised during ICO
    uint256 public totalRaised;

    /// @notice Principal deposited to Aave (excludes yield)
    uint256 public totalPrincipal;

    /// @notice Total yield harvested
    uint256 public totalYieldHarvested;

    /// @notice Contribution tracking for refunds
    mapping(address => uint256) public contributions;

    // ============ Treasury Stock (The Recycling Exit) ============

    /// @notice Shares held by the contract (Treasury Stock - recycled, not burned)
    /// @dev Sum(UserBalances) + treasuryShares == TOTAL_SHARES always
    uint256 public treasuryShares;

    // ============ Metadata ============

    string public name;
    string public ticker;
    string public description;
    string public imageUrl;

    // ============ Events ============

    event Initialized(
        address indexed creator, address indexed token, uint256 fundingGoal, uint256 deadline, uint256 founderShareBps
    );
    event Contributed(address indexed contributor, uint256 amount, uint256 sharesReceived);
    event GoalReached(uint256 totalRaised);
    event ICOFailed(uint256 totalRaised);
    event Refunded(address indexed contributor, uint256 amount);
    event YieldHarvested(uint256 holderYield, uint256 protocolSpread);
    event DividendDeposited(address indexed depositor, uint256 amount);
    event RewardsClaimed(address indexed holder, uint256 amount);
    event SharesRedeemed(address indexed holder, uint256 sharesBurned, uint256 ethReceived);
    event SharesRecycled(address indexed holder, uint256 shares);
    event TreasuryStockPurchased(address indexed buyer, uint256 shares, uint256 cost);

    // ============ Errors ============

    error NotCreator();
    error NotActive();
    error NotSuccessful();
    error NotFailed();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error ZeroAmount();
    error GoalNotReached();
    error NoContribution();
    error InsufficientShares();
    error TransferFailed();
    error InvalidShare();
    error TradingLocked();
    error AlreadyInitialized();
    error InsufficientTreasuryStock();
    error SlippageExceeded();

    // ============ Constructor (Implementation Lock) ============

    constructor() {
        // Disable initializers on implementation contract
        _disableInitializers();
    }

    // ============ Initialization ============

    /**
     * @notice Initialize the share market (called by factory via proxy)
     * @param _creator Project creator
     * @param _name Project name
     * @param _ticker Token ticker (e.g., "ACME")
     * @param _description Project description
     * @param _imageUrl Project image URL
     * @param _fundingGoal Funding goal in wei
     * @param _durationDays Campaign duration in days
     * @param _founderShareBps Founder's share in basis points (max 9900 = 99%)
     * @param _aavePool Aave V3 Pool address
     * @param _weth WETH address
     * @param _aweth aWETH address
     * @param _treasury Pledge Treasury address
     */
    function initialize(
        address _creator,
        string memory _name,
        string memory _ticker,
        string memory _description,
        string memory _imageUrl,
        uint256 _fundingGoal,
        uint256 _durationDays,
        uint256 _founderShareBps,
        address _aavePool,
        address _weth,
        address _aweth,
        address _treasury
    ) external initializer {
        if (_founderShareBps > 9900) revert InvalidShare(); // Max 99%
        if (_fundingGoal == 0) revert ZeroAmount();
        if (_creator == address(0)) revert TransferFailed();

        creator = _creator;
        name = _name;
        ticker = _ticker;
        description = _description;
        imageUrl = _imageUrl;
        fundingGoal = _fundingGoal;
        deadline = block.timestamp + (_durationDays * 1 days);
        founderShareBps = _founderShareBps;

        AAVE_POOL = _aavePool;
        WETH = _weth;
        AWETH = _aweth;
        PLEDGE_TREASURY = _treasury;

        // Calculate founder's token allocation
        uint256 founderShares = (TOTAL_SHARES * _founderShareBps) / BASIS_POINTS;

        // Deploy the pledge token with 2^128 magnified dividend algorithm
        token = new PledgeToken(
            string(abi.encodePacked("Pledge: ", _name)),
            string(abi.encodePacked("p", _ticker)),
            address(this),
            _creator,
            founderShares
        );

        // Remaining shares are held by this contract for ICO distribution
        // Treasury shares initially = 0 (all public shares are in the contract for sale)
        treasuryShares = 0;

        emit Initialized(_creator, address(token), _fundingGoal, deadline, _founderShareBps);
    }

    // ============ Status ============

    /**
     * @notice Get current share market status
     */
    function status() public view returns (Status) {
        if (totalRaised >= fundingGoal) {
            return Status.Active;
        } else if (block.timestamp >= deadline) {
            return Status.Failed;
        }
        return Status.Funding;
    }

    /**
     * @notice Check if trading/redemption is allowed (for Uniswap v4 Hook)
     */
    function isTradeable() external view returns (bool) {
        return status() == Status.Active;
    }

    // ============ ICO Functions (Primary Market) ============

    /**
     * @notice Contribute ETH to buy shares at fixed ICO price
     * @dev Price = FundingGoal / PublicAllocation (fixed entry per spec)
     *      Excess contributions beyond goal are refunded
     */
    function contribute() external payable nonReentrant {
        if (block.timestamp >= deadline) revert DeadlinePassed();
        if (msg.value == 0) revert ZeroAmount();

        // Calculate remaining BEFORE status check to handle exact goal hit
        uint256 remaining = fundingGoal > totalRaised ? fundingGoal - totalRaised : 0;

        // If goal already reached, refund and return
        if (remaining == 0) {
            (bool refundSuccess,) = msg.sender.call{ value: msg.value }("");
            if (!refundSuccess) revert TransferFailed();
            return;
        }

        uint256 contribution = msg.value;
        uint256 excessAmount = 0;
        if (contribution > remaining) {
            excessAmount = contribution - remaining;
            contribution = remaining;
        }

        // If nothing left to contribute, refund everything
        if (contribution == 0) {
            (bool refundSuccess,) = msg.sender.call{ value: msg.value }("");
            if (!refundSuccess) revert TransferFailed();
            return;
        }

        // Calculate shares at fixed price: contribution * publicShares / fundingGoal
        uint256 publicShares = (TOTAL_SHARES * (BASIS_POINTS - founderShareBps)) / BASIS_POINTS;
        uint256 sharesAvailable = token.balanceOf(address(this));

        // Fixed price ICO: shares = contribution * publicShares / fundingGoal
        uint256 sharesToMint = (contribution * publicShares) / fundingGoal;

        // Cap at available shares (shouldn't happen if math is correct)
        if (sharesToMint > sharesAvailable) {
            sharesToMint = sharesAvailable;
        }

        // Update state
        contributions[msg.sender] += contribution;
        totalRaised += contribution;

        // Transfer shares to contributor
        token.marketTransfer(msg.sender, sharesToMint);

        // Wrap ETH to WETH and deposit to Aave
        IWETH9(WETH).deposit{ value: contribution }();
        IWETH9(WETH).approve(AAVE_POOL, contribution);
        IPoolV3(AAVE_POOL).supply(WETH, contribution, address(this), 0);
        totalPrincipal += contribution;

        emit Contributed(msg.sender, contribution, sharesToMint);

        // Refund excess contribution
        if (excessAmount > 0) {
            (bool refundSuccess,) = msg.sender.call{ value: excessAmount }("");
            if (!refundSuccess) revert TransferFailed();
        }

        // Check if goal reached → unlock trading
        if (totalRaised >= fundingGoal && status() == Status.Active) {
            token.enableTransfers();
            emit GoalReached(totalRaised);
        }
    }

    /**
     * @notice Finalize ICO if deadline passed without reaching goal
     * @dev Emits ICOFailed event. Status is derived from state, this is for event emission only.
     */
    function finalizeICO() external {
        // Check that deadline has passed AND goal wasn't reached
        if (block.timestamp >= deadline && totalRaised < fundingGoal) {
            emit ICOFailed(totalRaised);
        }
    }

    // ============ Creator Functions ============

    // NOTE: Founders get value from their SHARES, not by withdrawing vault assets.
    // This prevents the double-dipping bug where founders could drain vault AND hold shares.
    // Founders can: 1) Redeem shares for pro-rata vault value, 2) Claim yield/dividends

    // ============ Yield Functions (80/20 Split) ============

    /**
     * @notice Get current claimable yield (Aave interest accrued)
     */
    function getAccruedYield() public view returns (uint256) {
        uint256 aWethBalance = IERC20(AWETH).balanceOf(address(this));
        if (aWethBalance > totalPrincipal) {
            return aWethBalance - totalPrincipal;
        }
        return 0;
    }

    /**
     * @notice Harvest yield and distribute 80/20 to holders/treasury
     * @dev 80% to cumulativeRewardIndex for holders, 20% to Pledge Treasury
     */
    function harvestYield() external nonReentrant {
        if (status() != Status.Active) revert NotSuccessful();

        uint256 yield = getAccruedYield();
        if (yield == 0) revert ZeroAmount();
        if (yield < MIN_HARVEST_YIELD) revert ZeroAmount(); // Prevent griefing with tiny harvests

        // Calculate 80/20 split
        uint256 holderYield = (yield * HOLDER_YIELD_BPS) / BASIS_POINTS;
        uint256 protocolSpread = yield - holderYield;

        totalYieldHarvested += yield;

        // Withdraw yield from Aave
        IPoolV3(AAVE_POOL).withdraw(WETH, yield, address(this));
        IWETH9(WETH).withdraw(yield);

        // Distribute to token holders via magnified dividend (2^128 precision)
        token.distributeRewards(holderYield);

        // Send protocol spread to Pledge Treasury
        if (protocolSpread > 0) {
            (bool success,) = PLEDGE_TREASURY.call{ value: protocolSpread }("");
            if (!success) revert TransferFailed();
        }

        emit YieldHarvested(holderYield, protocolSpread);
    }

    // ============ Dividend Functions ============

    /**
     * @notice Deposit project revenue as dividends
     * @dev External revenue deposits added directly to Reward Index
     */
    function depositDividend() external payable {
        if (status() != Status.Active) revert NotSuccessful();
        if (msg.value == 0) revert ZeroAmount();

        // Add dividends to the same reward index as yield
        token.distributeRewards(msg.value);

        emit DividendDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Claim all pending rewards (yield + dividends)
     */
    function claimRewards() external nonReentrant {
        uint256 rewards = token.withdrawRewardsFor(msg.sender);

        if (rewards == 0) revert ZeroAmount();

        (bool success,) = msg.sender.call{ value: rewards }("");
        if (!success) revert TransferFailed();

        emit RewardsClaimed(msg.sender, rewards);
    }

    // ============ Redemption (The Recycling Exit) ============

    /**
     * @notice Redeem shares for pro-rata vault assets (Floor Price mechanism)
     * @param amount Number of shares to redeem
     * @dev CRITICAL: Shares are recycled to Treasury Stock, NOT burned
     *      This allows creator to buy back or re-list them
     *      Floor Price = vaultAssets / totalSupply (never goes to zero)
     */
    function redeem(uint256 amount, uint256 minReceived) external nonReentrant {
        if (status() != Status.Active) revert NotSuccessful();
        if (amount == 0) revert ZeroAmount();
        if (token.balanceOf(msg.sender) < amount) revert InsufficientShares();

        // Calculate redemption value: (sharesBurned / circulatingSupply) * vaultAssets
        uint256 circulatingSupply = token.circulatingSupply();
        uint256 vaultAssets = IERC20(AWETH).balanceOf(address(this));

        // Pro-rata calculation (Circuit Breaker - Floor Price guarantee)
        uint256 redeemValue = (amount * vaultAssets) / circulatingSupply;

        // Slippage protection
        if (redeemValue < minReceived) revert SlippageExceeded();

        // RECYCLING EXIT: Transfer shares to contract as Treasury Stock (not burn!)
        token.recycleShares(msg.sender, amount);
        treasuryShares += amount;

        // Update principal tracking
        if (redeemValue > totalPrincipal) {
            totalPrincipal = 0;
        } else {
            totalPrincipal -= redeemValue;
        }

        // Withdraw from Aave
        uint256 withdrawn = IPoolV3(AAVE_POOL).withdraw(WETH, redeemValue, address(this));
        IWETH9(WETH).withdraw(withdrawn);

        (bool success,) = msg.sender.call{ value: withdrawn }("");
        if (!success) revert TransferFailed();

        emit SharesRedeemed(msg.sender, amount, withdrawn);
        emit SharesRecycled(msg.sender, amount);
    }

    /**
     * @notice Buy treasury stock (shares recycled from redemptions)
     * @param amount Number of treasury shares to purchase
     * @dev Allows creator or anyone to buy back recycled shares
     */
    function buyTreasuryStock(uint256 amount) external payable nonReentrant {
        if (status() != Status.Active) revert NotSuccessful();
        if (amount == 0) revert ZeroAmount();
        if (amount > treasuryShares) revert InsufficientTreasuryStock();

        // Price based on current floor (intrinsic value)
        uint256 vaultAssets = IERC20(AWETH).balanceOf(address(this));
        uint256 circulatingSupply = token.circulatingSupply();
        uint256 cost = circulatingSupply > 0 ? (amount * vaultAssets) / circulatingSupply : 0;

        require(msg.value >= cost, "Insufficient payment");

        // Update treasury stock
        treasuryShares -= amount;

        // Transfer shares from treasury to buyer
        token.transferTreasuryStock(msg.sender, amount);

        // Refund excess FIRST (before depositing to Aave)
        uint256 excess = msg.value - cost;
        if (excess > 0) {
            (bool success,) = msg.sender.call{ value: excess }("");
            if (!success) revert TransferFailed();
        }

        // Deposit only the cost to Aave (not the excess)
        if (cost > 0) {
            IWETH9(WETH).deposit{ value: cost }();
            IWETH9(WETH).approve(AAVE_POOL, cost);
            IPoolV3(AAVE_POOL).supply(WETH, cost, address(this), 0);
            totalPrincipal += cost;
        }

        emit TreasuryStockPurchased(msg.sender, amount, cost);
    }

    // ============ Refund Functions ============

    /**
     * @notice Refund contribution if ICO failed
     * @dev Also recycles any shares the user received back to treasury
     */
    function refund() external nonReentrant {
        if (status() != Status.Failed) revert NotFailed();

        uint256 contribution = contributions[msg.sender];
        if (contribution == 0) revert NoContribution();

        // CEI: Effects first
        contributions[msg.sender] = 0;

        // Recycle any shares the user received back to treasury
        uint256 userShares = token.balanceOf(msg.sender);
        if (userShares > 0) {
            token.recycleShares(msg.sender, userShares);
            treasuryShares += userShares;
        }

        // Withdraw from Aave
        uint256 withdrawn = IPoolV3(AAVE_POOL).withdraw(WETH, contribution, address(this));
        totalPrincipal -= contribution;
        IWETH9(WETH).withdraw(withdrawn);

        (bool success,) = msg.sender.call{ value: withdrawn }("");
        if (!success) revert TransferFailed();

        emit Refunded(msg.sender, contribution);
    }

    // ============ View Functions ============

    /**
     * @notice Calculate intrinsic value per share (Floor Price)
     * @return Value in wei per share (1e18)
     */
    function floorPricePerShare() external view returns (uint256) {
        uint256 circulatingSupply = token.circulatingSupply();
        if (circulatingSupply == 0) return 0;

        uint256 vaultAssets = IERC20(AWETH).balanceOf(address(this));
        return (vaultAssets * PRECISION) / circulatingSupply;
    }

    /**
     * @notice Get ICO price per share (fixed entry price)
     */
    function icoPrice() external view returns (uint256) {
        uint256 publicShares = (TOTAL_SHARES * (BASIS_POINTS - founderShareBps)) / BASIS_POINTS;
        return (fundingGoal * PRECISION) / publicShares;
    }

    /**
     * @notice Get public shares remaining for ICO
     */
    function publicSharesRemaining() external view returns (uint256) {
        return token.balanceOf(address(this)) - treasuryShares;
    }

    /**
     * @notice Get share market summary for frontend
     */
    function getSummary()
        external
        view
        returns (
            address _creator,
            address _token,
            string memory _name,
            string memory _ticker,
            string memory _description,
            string memory _imageUrl,
            uint256 _fundingGoal,
            uint256 _deadline,
            uint256 _totalRaised,
            uint256 _founderShareBps,
            Status _status,
            uint256 _accruedYield,
            uint256 _vaultBalance,
            uint256 _treasuryShares,
            uint256 _circulatingSupply
        )
    {
        return (
            creator,
            address(token),
            name,
            ticker,
            description,
            imageUrl,
            fundingGoal,
            deadline,
            totalRaised,
            founderShareBps,
            status(),
            getAccruedYield(),
            IERC20(AWETH).balanceOf(address(this)),
            treasuryShares,
            token.circulatingSupply()
        );
    }

    /**
     * @notice Get holder position info
     */
    function getHolderInfo(address holder)
        external
        view
        returns (
            uint256 shareBalance,
            uint256 contribution,
            uint256 pendingRewards,
            uint256 redeemableValue,
            uint256 ownershipPercent
        )
    {
        shareBalance = token.balanceOf(holder);
        contribution = contributions[holder];
        pendingRewards = token.withdrawableRewardsOf(holder);

        uint256 circulatingSupply = token.circulatingSupply();
        if (circulatingSupply > 0 && shareBalance > 0) {
            uint256 vaultAssets = IERC20(AWETH).balanceOf(address(this));
            redeemableValue = (shareBalance * vaultAssets) / circulatingSupply;
            ownershipPercent = (shareBalance * BASIS_POINTS) / circulatingSupply;
        }
    }

    // ============ Receive ============

    receive() external payable { }
}
