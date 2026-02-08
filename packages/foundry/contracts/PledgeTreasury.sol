// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PledgeTreasury
 * @author Pledge Protocol
 * @notice Protocol treasury for listing taxes and protocol spread
 * @dev Receives:
 *      - 0.01 ETH listing tax from each new ShareMarket
 *      - 20% protocol spread from Aave yield harvests
 *
 * Features:
 * - Multi-sig ready: Can be owned by a Gnosis Safe
 * - Token recovery: Rescue any accidentally sent tokens
 * - ETH withdrawal: Owner can withdraw accumulated funds
 */
contract PledgeTreasury is Ownable {
    using SafeERC20 for IERC20;

    // ============ Events ============

    event ETHReceived(address indexed from, uint256 amount);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event TokenRecovered(address indexed token, address indexed to, uint256 amount);

    // ============ Errors ============

    error TransferFailed();
    error ZeroAmount();
    error ZeroAddress();

    // ============ Constructor ============

    /**
     * @notice Deploy treasury with owner
     * @param _owner Treasury owner (could be a multisig)
     */
    constructor(address _owner) Ownable(_owner) { }

    // ============ Receive ============

    /**
     * @notice Receive ETH from listing taxes and protocol spread
     */
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    /**
     * @notice Fallback for any ETH sent with data
     */
    fallback() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    // ============ Owner Functions ============

    /**
     * @notice Withdraw ETH from treasury
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawETH(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > address(this).balance) revert ZeroAmount();

        (bool success,) = to.call{ value: amount }("");
        if (!success) revert TransferFailed();

        emit ETHWithdrawn(to, amount);
    }

    /**
     * @notice Withdraw all ETH from treasury
     * @param to Recipient address
     */
    function withdrawAllETH(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();

        uint256 currentBalance = address(this).balance;
        if (currentBalance == 0) revert ZeroAmount();

        (bool success,) = to.call{ value: currentBalance }("");
        if (!success) revert TransferFailed();

        emit ETHWithdrawn(to, currentBalance);
    }

    /**
     * @notice Recover any ERC20 tokens accidentally sent to treasury
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to recover
     */
    function recoverToken(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(to, amount);

        emit TokenRecovered(token, to, amount);
    }

    /**
     * @notice Recover all of a specific token
     * @param token Token address
     * @param to Recipient address
     */
    function recoverAllToken(address token, address to) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();

        uint256 tokenBal = IERC20(token).balanceOf(address(this));
        if (tokenBal == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(to, tokenBal);

        emit TokenRecovered(token, to, tokenBal);
    }

    // ============ View Functions ============

    /**
     * @notice Get treasury ETH balance
     */
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get treasury token balance
     * @param token Token address
     */
    function tokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
