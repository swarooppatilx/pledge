// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { BeforeSwapDelta, BeforeSwapDeltaLibrary } from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";

import "./Pledge.sol";
import "./PledgeFactory.sol";

/**
 * @title PledgeHook
 * @author Pledge Protocol
 * @notice Uniswap V4 Hook for Pledge Token Trading
 * @dev Enforces trading rules for pledge tokens:
 *      - Trading gating: Only allows swaps after ICO success (Status.Active)
 *      - Floor price awareness: Can enforce minimum sell prices
 *      - Volume tracking: Tracks trading activity per pledge
 *
 * Hook Flags Used (bits from address):
 * - beforeSwap (bit 7): Validate trading is allowed
 * - afterSwap (bit 6): Track trading volume
 * - beforeAddLiquidity (bit 11): Gate liquidity provision
 *
 * Deployment Requirements:
 * - Must be deployed to an address where the last 14 bits match permissions
 * - Use CREATE2 with salt mining to get correct address
 * - Required flags: BEFORE_SWAP (0x80) | AFTER_SWAP (0x40) | BEFORE_ADD_LIQUIDITY (0x800)
 */
contract PledgeHook is IHooks {
    using BeforeSwapDeltaLibrary for BeforeSwapDelta;

    // ============ Errors ============
    error TradingNotActive();
    error BelowFloorPrice();
    error InvalidPledge();
    error PoolNotRegistered();
    error OnlyPoolManager();

    // ============ Events ============
    event PoolRegistered(address indexed pledge, bytes32 indexed poolId);
    event TradeExecuted(address indexed pledge, address indexed trader, bool isBuy, int256 amount0, int256 amount1);

    // ============ State ============

    /// @notice The Uniswap V4 PoolManager
    IPoolManager public immutable poolManager;

    /// @notice Mapping from pool ID to pledge address
    mapping(bytes32 => address) public poolToPledge;

    /// @notice Mapping from pledge address to whether pool is registered
    mapping(address => bool) public pledgeRegistered;

    /// @notice Trading volume per pledge (in wei)
    mapping(address => uint256) public tradingVolume;

    /// @notice PledgeFactory for validation
    address public immutable pledgeFactory;

    // ============ Modifiers ============

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();
        _;
    }

    // ============ Constructor ============

    constructor(IPoolManager _poolManager, address _pledgeFactory) {
        poolManager = _poolManager;
        pledgeFactory = _pledgeFactory;

        // Validate hook address has correct permission flags
        Hooks.validateHookPermissions(
            IHooks(address(this)),
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: true,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: true,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            })
        );
    }

    // ============ Registration ============

    /**
     * @notice Register a pool for a pledge
     * @param pledge The pledge address
     * @param key The Uniswap V4 pool key
     * @dev Can be called by anyone, but validates pledge is from factory
     */
    function registerPool(address pledge, PoolKey calldata key) external {
        // Validate pledge is from factory
        if (!PledgeFactory(pledgeFactory).isPledge(pledge)) {
            revert InvalidPledge();
        }

        bytes32 poolId = _getPoolId(key);
        poolToPledge[poolId] = pledge;
        pledgeRegistered[pledge] = true;

        emit PoolRegistered(pledge, poolId);
    }

    // ============ Hook Callbacks ============

    /// @notice Not used - returns empty selector
    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) {
        return bytes4(0);
    }

    /// @notice Not used - returns empty selector
    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) {
        return bytes4(0);
    }

    /**
     * @notice Called before adding liquidity
     * @dev Only allows liquidity addition when pledge is active
     */
    function beforeAddLiquidity(
        address,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external view override onlyPoolManager returns (bytes4) {
        bytes32 poolId = _getPoolId(key);
        address pledge = poolToPledge[poolId];

        // If pool is registered, enforce trading rules
        if (pledge != address(0)) {
            Pledge p = Pledge(payable(pledge));
            if (p.status() != Pledge.Status.Active) {
                revert TradingNotActive();
            }
        }

        return this.beforeAddLiquidity.selector;
    }

    /// @notice Not used
    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (bytes4(0), BalanceDelta.wrap(0));
    }

    /// @notice Not used
    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return bytes4(0);
    }

    /// @notice Not used
    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        return (bytes4(0), BalanceDelta.wrap(0));
    }

    /**
     * @notice Called before every swap - enforces trading rules
     * @dev Checks:
     *      1. Pledge is in Active status (ICO successful)
     *      2. (Optional) Sell price is above floor price
     */
    function beforeSwap(address, PoolKey calldata key, IPoolManager.SwapParams calldata, bytes calldata)
        external
        view
        override
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        bytes32 poolId = _getPoolId(key);
        address pledge = poolToPledge[poolId];

        // If pool is not registered, allow (not a pledge token pool)
        if (pledge == address(0)) {
            return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        Pledge p = Pledge(payable(pledge));

        // Check: Trading must be active (ICO successful)
        if (p.status() != Pledge.Status.Active) {
            revert TradingNotActive();
        }

        // Floor price protection could be added here:
        // uint256 floorPrice = p.floorPricePerShare();
        // Enforce minimum sell price based on intrinsic value

        return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /**
     * @notice Called after every swap - tracks volume and emits events
     */
    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) external override onlyPoolManager returns (bytes4, int128) {
        bytes32 poolId = _getPoolId(key);
        address pledge = poolToPledge[poolId];

        if (pledge != address(0)) {
            // Track trading volume (absolute value of swap)
            uint256 amount =
                params.amountSpecified > 0 ? uint256(params.amountSpecified) : uint256(-params.amountSpecified);

            tradingVolume[pledge] += amount;

            emit TradeExecuted(pledge, sender, params.zeroForOne, delta.amount0(), delta.amount1());
        }

        return (this.afterSwap.selector, 0);
    }

    /// @notice Not used
    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return bytes4(0);
    }

    /// @notice Not used
    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return bytes4(0);
    }

    // ============ View Functions ============

    /**
     * @notice Get pledge address for a pool
     */
    function getPledgeForPool(PoolKey calldata key) external view returns (address) {
        return poolToPledge[_getPoolId(key)];
    }

    /**
     * @notice Check if trading is allowed for a pledge
     */
    function isTradingAllowed(address pledge) external view returns (bool) {
        if (!pledgeRegistered[pledge]) return false;
        return Pledge(payable(pledge)).status() == Pledge.Status.Active;
    }

    /**
     * @notice Get trading volume for a pledge
     */
    function getTradingVolume(address pledge) external view returns (uint256) {
        return tradingVolume[pledge];
    }

    // ============ Internal ============

    function _getPoolId(PoolKey calldata key) internal pure returns (bytes32) {
        return keccak256(abi.encode(key));
    }
}
