// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Pledge.sol";

/**
 * @title PledgeFactory
 * @author Pledge Protocol
 * @notice Factory for deploying Pledge proxies with 0.01 ETH listing tax
 * @dev Uses EIP-1167 minimal proxy pattern for gas-efficient deployments
 *
 * Key Features:
 * - Listing Tax: 0.01 ETH per project, routed to PledgeTreasury
 * - Permanent Registry: Single source of truth for all projects
 * - Deterministic Addresses: CREATE2 for predictable addresses
 * - Bulk View: getSummaries for efficient frontend queries (RSC)
 *
 * Base Sepolia Aave V3 Integration:
 * - Pool: 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b
 * - WETH: 0x4200000000000000000000000000000000000006
 * - aWETH: 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f
 */
contract PledgeFactory {
    using Clones for address;

    // ============ Constants ============

    /// @notice Listing tax: 0.01 ETH per project
    uint256 public constant LISTING_TAX = 0.01 ether;

    // ============ Immutables ============

    /// @notice Implementation contract for cloning (EIP-1167)
    address public immutable PLEDGE_IMPLEMENTATION;

    /// @notice Aave V3 Pool
    address public immutable AAVE_POOL;

    /// @notice WETH token
    address public immutable WETH;

    /// @notice aWETH token
    address public immutable AWETH;

    /// @notice Pledge Treasury for listing tax and protocol spread
    address public immutable PLEDGE_TREASURY;

    // ============ State ============

    /// @notice Owner (can update settings)
    address public owner;

    /// @notice All deployed pledges (permanent registry)
    address[] public pledges;

    /// @notice Mapping to check if address is a pledge
    mapping(address => bool) public isPledge;

    /// @notice Pledges by creator
    mapping(address => address[]) public pledgesByCreator;

    // ============ Events ============

    event PledgeCreated(
        address indexed pledge,
        address indexed creator,
        address indexed token,
        string name,
        string ticker,
        uint256 fundingGoal,
        uint256 deadline,
        uint256 founderShareBps
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ Errors ============

    error InsufficientListingTax();
    error OnlyOwner();
    error TransferFailed();
    error ZeroAddress();

    // ============ Constructor ============

    /**
     * @notice Deploy factory with Aave V3 configuration
     * @param _aavePool Aave V3 Pool address
     * @param _weth WETH address
     * @param _aweth aWETH address
     * @param _treasury Pledge Treasury address for tax collection
     */
    constructor(address _aavePool, address _weth, address _aweth, address _treasury) {
        if (_aavePool == address(0) || _weth == address(0) || _aweth == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }

        AAVE_POOL = _aavePool;
        WETH = _weth;
        AWETH = _aweth;
        PLEDGE_TREASURY = _treasury;
        owner = msg.sender;

        // Deploy implementation contract (EIP-1167 pattern)
        PLEDGE_IMPLEMENTATION = address(new Pledge());
    }

    // ============ Factory Functions ============

    /**
     * @notice Create a new pledge with 0.01 ETH listing tax
     * @param name Project name (e.g., "ACME Corp")
     * @param ticker Token ticker (e.g., "ACME")
     * @param description Project description
     * @param imageUrl Project image URL
     * @param fundingGoal Funding goal in wei
     * @param durationDays Campaign duration in days
     * @param founderShareBps Founder's share in basis points (max 9900 = 99%)
     * @return pledge Address of the new pledge
     */
    function createPledge(
        string memory name,
        string memory ticker,
        string memory description,
        string memory imageUrl,
        uint256 fundingGoal,
        uint256 durationDays,
        uint256 founderShareBps
    ) external payable returns (address pledge) {
        // Enforce 0.01 ETH listing tax
        if (msg.value < LISTING_TAX) revert InsufficientListingTax();

        // Route listing tax to Pledge Treasury immediately
        (bool taxSuccess,) = PLEDGE_TREASURY.call{ value: LISTING_TAX }("");
        if (!taxSuccess) revert TransferFailed();

        // Refund excess
        uint256 excess = msg.value - LISTING_TAX;
        if (excess > 0) {
            (bool refundSuccess,) = msg.sender.call{ value: excess }("");
            if (!refundSuccess) revert TransferFailed();
        }

        // Deploy minimal proxy (EIP-1167)
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, pledges.length, block.timestamp));
        pledge = PLEDGE_IMPLEMENTATION.cloneDeterministic(salt);

        // Initialize the pledge
        Pledge(payable(pledge))
            .initialize(
                msg.sender,
                name,
                ticker,
                description,
                imageUrl,
                fundingGoal,
                durationDays,
                founderShareBps,
                AAVE_POOL,
                WETH,
                AWETH,
                PLEDGE_TREASURY
            );

        // Register in permanent registry
        pledges.push(pledge);
        isPledge[pledge] = true;
        pledgesByCreator[msg.sender].push(pledge);

        // Get token address for event
        address token = address(Pledge(payable(pledge)).token());
        uint256 deadline = block.timestamp + (durationDays * 1 days);

        emit PledgeCreated(pledge, msg.sender, token, name, ticker, fundingGoal, deadline, founderShareBps);
    }

    // ============ View Functions ============

    /**
     * @notice Get total number of pledges
     */
    function pledgeCount() external view returns (uint256) {
        return pledges.length;
    }

    /**
     * @notice Get all pledges
     */
    function getAllPledges() external view returns (address[] memory) {
        return pledges;
    }

    /**
     * @notice Get pledges by creator
     */
    function getPledgesByCreator(address creator) external view returns (address[] memory) {
        return pledgesByCreator[creator];
    }

    /**
     * @notice Get paginated pledges
     */
    function getPledges(uint256 offset, uint256 limit) external view returns (address[] memory result) {
        uint256 total = pledges.length;
        if (offset >= total) return new address[](0);

        uint256 remaining = total - offset;
        uint256 count = remaining < limit ? remaining : limit;

        result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = pledges[offset + i];
        }
    }

    // ============ Bulk View (RSC Optimization) ============

    /**
     * @notice Summary struct for bulk queries (Server Component friendly)
     */
    struct PledgeSummary {
        address pledge;
        address creator;
        address token;
        string name;
        string ticker;
        uint256 fundingGoal;
        uint256 deadline;
        uint256 totalRaised;
        uint256 founderShareBps;
        Pledge.Status status;
        uint256 vaultBalance;
        uint256 treasuryShares;
        uint256 circulatingSupply;
    }

    /**
     * @notice Bulk view for efficient frontend queries (Zero RPC Loops)
     * @dev Use this for RSC pre-rendering
     * @param pledgeAddresses Array of pledge addresses to query
     * @return summaries Array of pledge summaries
     */
    function getSummaries(address[] calldata pledgeAddresses) external view returns (PledgeSummary[] memory summaries) {
        uint256 length = pledgeAddresses.length;
        summaries = new PledgeSummary[](length);

        for (uint256 i = 0; i < length; i++) {
            Pledge p = Pledge(payable(pledgeAddresses[i]));

            (
                address _creator,
                address _token,
                string memory _name,
                string memory _ticker,, // description
                , // imageUrl
                uint256 _fundingGoal,
                uint256 _deadline,
                uint256 _totalRaised,
                uint256 _founderShareBps,
                Pledge.Status _status,, // accruedYield
                uint256 _vaultBalance,
                uint256 _treasuryShares,
                uint256 _circulatingSupply
            ) = p.getSummary();

            summaries[i] = PledgeSummary({
                pledge: pledgeAddresses[i],
                creator: _creator,
                token: _token,
                name: _name,
                ticker: _ticker,
                fundingGoal: _fundingGoal,
                deadline: _deadline,
                totalRaised: _totalRaised,
                founderShareBps: _founderShareBps,
                status: _status,
                vaultBalance: _vaultBalance,
                treasuryShares: _treasuryShares,
                circulatingSupply: _circulatingSupply
            });
        }
    }

    /**
     * @notice Get all pledge summaries in one call
     * @dev For small deployments, fetch everything at once
     */
    function getAllSummaries() external view returns (PledgeSummary[] memory) {
        return this.getSummaries(pledges);
    }

    // ============ Admin Functions ============

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (newOwner == address(0)) revert ZeroAddress();

        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
