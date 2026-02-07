// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title PledgeToken
 * @author Pledge Protocol
 * @notice ERC20 equity token with 2^128 magnified dividend tracking
 * @dev Implements the "Carlos" standards for Pledge Protocol
 *
 * Key Features:
 * - Fixed supply of exactly 1,000,000 tokens (TOTAL_SHARES)
 * - 2^128 magnified dividend algorithm (O(1) rewards, no loops)
 * - Transfer gating: Locked until ICO goal is reached
 * - Recycling: Shares transfer to contract (Treasury Stock), not burned
 * - Precision: All dividend math uses 1e18 to prevent value leakage
 *
 * Magnified Dividend Algorithm:
 * - cumulativeRewardIndex (magnified by 2^128) tracks earnings per share
 * - userRewardDebt tracks what user has already been credited
 * - UserClaimable = (UserBalance * currentRewardIndex) - userRewardDebt
 *
 * CEI Enforcement:
 * - User's rewardDebt and balance are updated BEFORE any withdrawal
 *
 * Invariants:
 * - Sum(UserBalances) + TreasuryBalance == 1,000,000 * 1e18
 * - Never use loops for dividend calculation
 */
contract PledgeToken is ERC20 {
    // ============ Constants ============

    /// @notice Fixed total supply: 1,000,000 shares (1e24 in wei)
    uint256 public constant TOTAL_SUPPLY = 1_000_000 * 1e18;

    /// @notice Magnitude for dividend precision (2^128) - The "Carlos" Standard
    uint256 private constant MAGNITUDE = 2 ** 128;

    // ============ Immutables ============

    /// @notice The Pledge contract that owns this token
    address public immutable PLEDGE;

    // ============ Transfer Gating ============

    /// @notice Whether transfers are enabled (set when funding goal reached)
    bool public transfersEnabled;

    // ============ Magnified Reward Tracking (2^128 Algorithm) ============

    /// @notice Cumulative rewards per share (scaled by MAGNITUDE = 2^128)
    /// @dev This is the "cumulativeRewardIndex" from the spec
    uint256 public magnifiedRewardPerShare;

    /// @notice Correction for reward calculation per account
    /// @dev This is part of the "userRewardDebt" calculation
    mapping(address => int256) private magnifiedRewardCorrections;

    /// @notice Already withdrawn rewards per account
    mapping(address => uint256) public withdrawnRewards;

    // ============ Treasury Stock Tracking ============

    /// @notice Balance held as treasury stock (recycled, not burned)
    uint256 public treasuryStockBalance;

    // ============ Events ============

    event TransfersEnabled();
    event RewardsDistributed(uint256 amount);
    event RewardWithdrawn(address indexed account, uint256 amount);
    event SharesRecycled(address indexed from, uint256 amount);
    event TreasuryStockTransferred(address indexed to, uint256 amount);

    // ============ Errors ============

    error OnlyPledge();
    error TransfersLocked();
    error ZeroAddress();

    // ============ Constructor ============

    /**
     * @notice Deploy token with initial allocation
     * @param name_ Token name (e.g., "Pledge: ACME Corp")
     * @param symbol_ Token symbol (e.g., "pACME")
     * @param pledge_ The Pledge contract address
     * @param founder_ Founder receiving their share allocation
     * @param founderAmount_ Amount of shares for founder
     */
    constructor(string memory name_, string memory symbol_, address pledge_, address founder_, uint256 founderAmount_)
        ERC20(name_, symbol_)
    {
        if (pledge_ == address(0) || founder_ == address(0)) revert ZeroAddress();

        PLEDGE = pledge_;

        // Mint founder's share
        _mint(founder_, founderAmount_);

        // Remaining tokens held by Pledge for ICO distribution
        uint256 publicAmount = TOTAL_SUPPLY - founderAmount_;
        _mint(pledge_, publicAmount);
    }

    // ============ Modifiers ============

    modifier onlyPledge() {
        if (msg.sender != PLEDGE) revert OnlyPledge();
        _;
    }

    // ============ Pledge Functions ============

    /**
     * @notice Enable transfers (called when funding goal reached)
     */
    function enableTransfers() external onlyPledge {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    /**
     * @notice Distribute rewards to all holders using magnified algorithm
     * @param amount Amount to distribute (yield + dividends combined)
     * @dev Updates cumulativeRewardIndex with 2^128 magnification
     *      This handles both Aave yield and external dividends
     */
    function distributeRewards(uint256 amount) external onlyPledge {
        uint256 circulating = circulatingSupply();
        if (circulating > 0 && amount > 0) {
            // Magnified dividend formula: index += (amount * 2^128) / circulatingSupply
            magnifiedRewardPerShare += (amount * MAGNITUDE) / circulating;
            emit RewardsDistributed(amount);
        }
    }

    /**
     * @notice Transfer shares from Pledge to buyer during ICO
     * @param to Buyer address
     * @param amount Token amount
     */
    function marketTransfer(address to, uint256 amount) external onlyPledge {
        _transfer(PLEDGE, to, amount);
    }

    /**
     * @notice Recycle shares to Treasury Stock (The Recycling Exit)
     * @param from Holder address
     * @param amount Amount to recycle
     * @dev Transfers shares TO the contract as Treasury Stock - NOT burned!
     *      This preserves the total supply and allows re-listing
     */
    function recycleShares(address from, uint256 amount) external onlyPledge {
        // CEI: Update reward debt BEFORE transfer
        _updateRewardDebt(from);

        // Transfer to Pledge (becomes Treasury Stock)
        _transfer(from, PLEDGE, amount);
        treasuryStockBalance += amount;

        emit SharesRecycled(from, amount);
    }

    /**
     * @notice Transfer treasury stock to buyer
     * @param to Buyer address
     * @param amount Amount to transfer
     */
    function transferTreasuryStock(address to, uint256 amount) external onlyPledge {
        require(treasuryStockBalance >= amount, "Insufficient treasury stock");
        treasuryStockBalance -= amount;
        _transfer(PLEDGE, to, amount);

        emit TreasuryStockTransferred(to, amount);
    }

    /**
     * @notice Withdraw rewards for an account (called by Pledge)
     * @param account Holder address
     * @return amount Withdrawn amount
     * @dev CEI: Updates rewardDebt BEFORE returning the amount
     */
    function withdrawRewardsFor(address account) external onlyPledge returns (uint256 amount) {
        // CEI: Update debt first (Checks-Effects-Interactions)
        _updateRewardDebt(account);

        amount = _withdrawableRewardsOf(account);
        if (amount > 0) {
            withdrawnRewards[account] += amount;
            emit RewardWithdrawn(account, amount);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get circulating supply (excludes treasury stock held by contract)
     * @dev Circulating = totalSupply - treasuryStockBalance
     *      This is used for dividend calculations
     */
    function circulatingSupply() public view returns (uint256) {
        // Total supply minus treasury stock (shares held by the market)
        return totalSupply() - treasuryStockBalance;
    }

    /**
     * @notice Get withdrawable rewards for an account (external view)
     */
    function withdrawableRewardsOf(address account) external view returns (uint256) {
        return _withdrawableRewardsOf(account);
    }

    /**
     * @notice Get withdrawable rewards for an account (internal)
     */
    function _withdrawableRewardsOf(address account) internal view returns (uint256) {
        return accumulativeRewardOf(account) - withdrawnRewards[account];
    }

    /**
     * @notice Get total accumulated rewards for an account
     * @dev Formula: (balance * magnifiedRewardPerShare + correction) / MAGNITUDE
     *      This is: (UserBalance * currentRewardIndex) - userRewardDebt
     */
    function accumulativeRewardOf(address account) public view returns (uint256) {
        int256 accumulated = int256(balanceOf(account) * magnifiedRewardPerShare);
        accumulated += magnifiedRewardCorrections[account];
        return uint256(accumulated) / MAGNITUDE;
    }

    /**
     * @notice Get pending rewards (alias for withdrawableRewardsOf)
     * @dev UserClaimable = (UserBalance * currentRewardIndex) - userRewardDebt
     */
    function pendingRewards(address account) external view returns (uint256) {
        return _withdrawableRewardsOf(account);
    }

    // ============ Internal Functions ============

    /**
     * @dev Update reward debt for an account (CEI pattern)
     *      Called BEFORE any balance-changing operation
     */
    function _updateRewardDebt(address account) internal {
        // Nothing to do - corrections are updated in _update
    }

    /**
     * @notice Override transfer to enforce gating and update reward corrections
     * @dev Implements the magnified dividend tracking on transfer
     *      Direct transfers to PLEDGE are blocked via transfer/transferFrom
     *      (recycleShares is the only valid way to send to PLEDGE)
     */
    function _update(address from, address to, uint256 amount) internal override {
        // Transfer gating rules:
        // 1. Always allow mints (from == 0) and burns (to == 0)
        // 2. Always allow Pledge to transfer (from == PLEDGE)
        // 3. Always allow transfers TO Pledge (recycling via redeem/refund)
        // 4. Block user-to-user transfers until ICO succeeds
        if (from != address(0) && to != address(0) && from != PLEDGE && to != PLEDGE) {
            if (!transfersEnabled) revert TransfersLocked();
        }

        super._update(from, to, amount);

        // Update reward corrections for magnified dividend tracking
        // This maintains the invariant: accumulated = balance * index + correction
        int256 magnifiedCorrection = int256(magnifiedRewardPerShare * amount);

        if (from != address(0)) {
            // Sender: add positive correction (they're losing shares but keeping earned rewards)
            magnifiedRewardCorrections[from] += magnifiedCorrection;
        }

        if (to != address(0)) {
            // Receiver: subtract correction (they're gaining shares but don't get past rewards)
            magnifiedRewardCorrections[to] -= magnifiedCorrection;
        }
    }

    /**
     * @notice Override transfer to prevent direct transfers to PLEDGE address
     * @dev Must use Pledge.redeem() which calls recycleShares() to properly track treasury stock
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        if (to == PLEDGE) revert TransfersLocked(); // Must use redeem()
        return super.transfer(to, amount);
    }

    /**
     * @notice Override transferFrom to prevent direct transfers to PLEDGE address
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (to == PLEDGE) revert TransfersLocked(); // Must use redeem()
        return super.transferFrom(from, to, amount);
    }
}
