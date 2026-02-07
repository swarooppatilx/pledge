//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title PledgeToken
 * @author Pledge Protocol
 * @notice ERC20 reward token minted to campaign backers upon successful campaign
 * @dev Each campaign mints tokens proportional to contribution amount
 */
contract PledgeToken is ERC20 {
    address public immutable campaign;
    uint256 public constant TOKENS_PER_ETH = 1000; // 1000 tokens per 1 ETH contributed

    error OnlyCampaign();

    modifier onlyCampaign() {
        if (msg.sender != campaign) revert OnlyCampaign();
        _;
    }

    constructor(string memory _name, string memory _symbol, address _campaign) ERC20(_name, _symbol) {
        campaign = _campaign;
    }

    /**
     * @notice Mint reward tokens to a backer
     * @dev Only callable by the associated campaign contract
     * @param to Address to receive tokens
     * @param contributionAmount The ETH contribution amount (used to calculate token amount)
     */
    function mintReward(address to, uint256 contributionAmount) external onlyCampaign {
        uint256 tokenAmount = (contributionAmount * TOKENS_PER_ETH);
        _mint(to, tokenAmount);
    }
}
