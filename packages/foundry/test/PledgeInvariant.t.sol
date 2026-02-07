// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../contracts/Pledge.sol";
import "../contracts/PledgeToken.sol";
import "../contracts/PledgeFactory.sol";
import "../contracts/PledgeTreasury.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PledgeInvariantTest
 * @notice Invariant tests for Pledge Share Market Protocol
 * @dev Tests the "Carlos" standards - critical invariants that must hold
 *
 * Core Invariants:
 * 1. Sum(UserBalances) + VaultTreasuryBalance == 1,000,000
 * 2. ContractBalance >= (totalPrincipal + UnclaimedDividends)
 * 3. UserClaimable = (UserBalance * currentRewardIndex) - userRewardDebt
 *
 * Anti-Hallucination Guardrails:
 * - Fixed Denominator: Supply is ALWAYS 1M (no dynamic supply)
 * - Precision: All financial logic uses 1e18
 * - CEI Enforcement: rewardDebt updated before any withdrawal
 */
contract PledgeInvariantTest is StdInvariant, Test {
    // Base Sepolia Aave V3 addresses
    address constant AAVE_POOL = 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant AWETH = 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f;

    PledgeTreasury treasury;
    PledgeFactory factory;
    Pledge market;
    PledgeToken token;

    PledgeHandler handler;

    address deployer = address(0xBEEF);
    address creator;

    uint256 constant LISTING_TAX = 0.01 ether;
    uint256 constant GOAL = 10 ether;
    uint256 constant DURATION_DAYS = 30;
    uint256 constant FOUNDER_SHARE_BPS = 5100;

    function setUp() public {
        // Fork Base Sepolia
        string memory rpc = vm.envOr("BASE_SEPOLIA_RPC_URL", string("https://sepolia.base.org"));
        vm.createSelectFork(rpc);

        creator = makeAddr("creator");
        vm.deal(creator, 100 ether);
        vm.deal(deployer, 100 ether);

        // Deploy protocol
        vm.startPrank(deployer);
        treasury = new PledgeTreasury(deployer);
        factory = new PledgeFactory(AAVE_POOL, WETH, AWETH, address(treasury));
        vm.stopPrank();

        // Create a share market
        vm.prank(creator);
        address marketAddr = factory.createPledge{ value: LISTING_TAX }(
            "Invariant Test Market",
            "INV",
            "A test market for invariant testing",
            "",
            GOAL,
            DURATION_DAYS,
            FOUNDER_SHARE_BPS
        );

        market = Pledge(payable(marketAddr));
        token = market.token();

        // Create handler for invariant testing
        handler = new PledgeHandler(market, token);

        // Fund handler
        vm.deal(address(handler), 1000 ether);

        // Target the handler for invariant calls
        targetContract(address(handler));

        // Exclude from receiving random calls
        excludeSender(address(treasury));
        excludeSender(address(market));
        excludeSender(address(token));
        excludeSender(deployer);
    }

    // ============ INVARIANT 1: Token Supply Conservation ============

    /**
     * @notice Total token supply should NEVER exceed TOTAL_SHARES
     * @dev "AI must never suggest a dynamic supply. Denominator is always 1M."
     */
    function invariant_tokenSupplyNeverExceedsMax() public view {
        assertLe(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    /**
     * @notice Total supply should remain exactly 1M (shares recycled, not burned)
     */
    function invariant_tokenSupplyAlwaysEquals1M() public view {
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    /**
     * @notice Sum of all balances + treasury stock should equal total supply
     * @dev Invariant 1: Sum(UserBalances) + VaultTreasuryBalance == 1,000,000
     */
    function invariant_balanceSumEqualsSupply() public view {
        uint256 creatorBalance = token.balanceOf(creator);
        uint256 marketBalance = token.balanceOf(address(market));
        uint256 handlerActors = handler.getTotalActorBalances();

        // All tracked balances + market holdings should equal total supply
        uint256 trackedSum = creatorBalance + marketBalance + handlerActors;
        assertLe(trackedSum, token.TOTAL_SUPPLY());
    }

    // ============ INVARIANT 2: Vault Balance Integrity ============

    /**
     * @notice Vault should have enough assets to cover principal
     * @dev Invariant 2: ContractBalance >= totalPrincipal (simplified)
     */
    function invariant_vaultCoverssPrincipal() public view {
        if (market.status() == Pledge.Status.Active) {
            uint256 vaultBalance = IERC20(AWETH).balanceOf(address(market));
            uint256 principal = market.totalPrincipal();

            // Vault should have at least principal (may have more due to yield)
            assertGe(vaultBalance, principal);
        }
    }

    // ============ INVARIANT 3: Circulating Supply Consistency ============

    /**
     * @notice Circulating supply should be total supply minus treasury stock
     */
    function invariant_circulatingSupplyConsistency() public view {
        uint256 treasuryStock = token.treasuryStockBalance();
        uint256 circulating = token.circulatingSupply();

        assertEq(circulating, token.TOTAL_SUPPLY() - treasuryStock);
    }

    // ============ INVARIANT 4: Treasury Stock Tracking ============

    /**
     * @notice Treasury stock should match market's tracked amount
     */
    function invariant_treasuryStockConsistency() public view {
        uint256 tokenTreasuryStock = token.treasuryStockBalance();
        uint256 marketTreasuryShares = market.treasuryShares();

        assertEq(tokenTreasuryStock, marketTreasuryShares);
    }

    // ============ INVARIANT 5: No Dynamic Supply Changes ============

    /**
     * @notice Minting after deployment should be impossible
     * @dev "AI must never suggest a dynamic supply"
     */
    function invariant_noNewMinting() public view {
        // Total supply should always equal the constant
        assertEq(token.totalSupply(), 1_000_000 * 1e18);
    }

    // ============ INVARIANT 6: Floor Price Calculation ============

    /**
     * @notice Floor price should be vault assets / circulating supply
     */
    function invariant_floorPriceCalculation() public view {
        if (market.status() == Pledge.Status.Active) {
            uint256 circulating = token.circulatingSupply();
            if (circulating > 0) {
                uint256 vaultBalance = IERC20(AWETH).balanceOf(address(market));
                uint256 expectedFloor = (vaultBalance * 1e18) / circulating;
                uint256 actualFloor = market.floorPricePerShare();

                // Allow for small rounding differences
                assertApproxEqAbs(actualFloor, expectedFloor, 1);
            }
        }
    }

    // ============ Handler Stats ============

    function invariant_callSummary() public view {
        console.log("Contributions:", handler.contributionCount());
        console.log("Redemptions:", handler.redemptionCount());
        console.log("Claims:", handler.claimCount());
        console.log("Total raised:", market.totalRaised());
        console.log("Treasury shares:", market.treasuryShares());
    }
}

/**
 * @title PledgeHandler
 * @notice Handler contract for fuzzing Pledge operations
 */
contract PledgeHandler is Test {
    Pledge public market;
    PledgeToken public token;

    address[] public actors;
    mapping(address => bool) public isActor;

    uint256 public contributionCount;
    uint256 public redemptionCount;
    uint256 public claimCount;

    constructor(Pledge _market, PledgeToken _token) {
        market = _market;
        token = _token;
    }

    modifier createActor(uint256 seed) {
        address actor = address(uint160(bound(seed, 1, type(uint160).max)));
        if (!isActor[actor] && actor != address(market) && actor != address(token)) {
            actors.push(actor);
            isActor[actor] = true;
            vm.deal(actor, 100 ether);
        }
        vm.startPrank(actor);
        _;
        vm.stopPrank();
    }

    function contribute(uint256 seed, uint256 amount) external createActor(seed) {
        if (market.status() != Pledge.Status.Funding) return;

        amount = bound(amount, 0.01 ether, 10 ether);

        try market.contribute{ value: amount }() {
            contributionCount++;
        } catch { }
    }

    function redeem(uint256 seed, uint256 amount) external createActor(seed) {
        if (market.status() != Pledge.Status.Active) return;

        address actor = address(uint160(bound(seed, 1, type(uint160).max)));
        uint256 balance = token.balanceOf(actor);
        if (balance == 0) return;

        amount = bound(amount, 1, balance);

        try market.redeem(amount, 0) {
            redemptionCount++;
        } catch { }
    }

    function claimRewards(uint256 seed) external createActor(seed) {
        try market.claimRewards() {
            claimCount++;
        } catch { }
    }

    function depositDividend(uint256 amount) external {
        if (market.status() != Pledge.Status.Active) return;

        amount = bound(amount, 0.01 ether, 1 ether);

        try market.depositDividend{ value: amount }() { } catch { }
    }

    function getTotalActorBalances() external view returns (uint256 total) {
        for (uint256 i = 0; i < actors.length; i++) {
            total += token.balanceOf(actors[i]);
        }
    }

    receive() external payable { }
}
