// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/Pledge.sol";
import "../contracts/PledgeToken.sol";
import "../contracts/PledgeFactory.sol";
import "../contracts/PledgeTreasury.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PledgeTest
 * @notice Comprehensive tests for Pledge Share Market Protocol
 * @dev Tests against Base Sepolia fork for real Aave V3 integration
 *
 * Core Invariants (Must Pass):
 * 1. Sum(UserBalances) + VaultTreasuryBalance == 1,000,000
 * 2. ContractBalance >= (totalPrincipal + UnclaimedDividends)
 * 3. UserClaimable = (UserBalance * currentRewardIndex) - userRewardDebt
 */
contract PledgeTest is Test {
    // Base Sepolia Aave V3 addresses
    address constant AAVE_POOL = 0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant AWETH = 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f;

    PledgeTreasury treasury;
    PledgeFactory factory;

    address deployer;
    address creator;
    address contributor1;
    address contributor2;
    address contributor3;

    uint256 constant LISTING_TAX = 0.001 ether;
    uint256 constant GOAL = 10 ether;
    uint256 constant DURATION_DAYS = 30;
    uint256 constant FOUNDER_SHARE_BPS = 5100; // 51%

    function setUp() public {
        // Fork Base Sepolia
        string memory rpc = vm.envOr("BASE_SEPOLIA_RPC_URL", string("https://sepolia.base.org"));
        vm.createSelectFork(rpc);

        // Setup accounts
        deployer = makeAddr("deployer");
        creator = makeAddr("creator");
        contributor1 = makeAddr("contributor1");
        contributor2 = makeAddr("contributor2");
        contributor3 = makeAddr("contributor3");

        // Fund accounts
        vm.deal(deployer, 100 ether);
        vm.deal(creator, 100 ether);
        vm.deal(contributor1, 100 ether);
        vm.deal(contributor2, 100 ether);
        vm.deal(contributor3, 100 ether);

        // Deploy protocol
        vm.startPrank(deployer);
        treasury = new PledgeTreasury(deployer);
        factory = new PledgeFactory(AAVE_POOL, WETH, AWETH, address(treasury));
        vm.stopPrank();
    }

    // ============ Factory Tests ============

    function test_FactoryDeployment() public view {
        assertEq(factory.AAVE_POOL(), AAVE_POOL);
        assertEq(factory.WETH(), WETH);
        assertEq(factory.AWETH(), AWETH);
        assertEq(factory.PLEDGE_TREASURY(), address(treasury));
        assertEq(factory.LISTING_TAX(), LISTING_TAX);
        assertTrue(factory.PLEDGE_IMPLEMENTATION() != address(0));
    }

    function test_CreatePledge() public {
        uint256 treasuryBefore = address(treasury).balance;

        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp",
            "ACME",
            "A test venture",
            "https://example.com/image.png",
            GOAL,
            DURATION_DAYS,
            FOUNDER_SHARE_BPS
        );

        assertTrue(market != address(0));
        assertTrue(factory.isPledge(market));
        assertEq(factory.pledgeCount(), 1);

        // Listing tax should go to treasury
        assertEq(address(treasury).balance - treasuryBefore, LISTING_TAX);

        // Check market state
        Pledge m = Pledge(payable(market));
        assertEq(m.creator(), creator);
        assertEq(m.fundingGoal(), GOAL);
        assertEq(m.founderShareBps(), FOUNDER_SHARE_BPS);
        assertEq(uint256(m.status()), uint256(Pledge.Status.Funding));
    }

    function test_CreatePledgeInsufficientTax() public {
        vm.prank(creator);
        vm.expectRevert(PledgeFactory.InsufficientListingTax.selector);
        factory.createPledge{ value: 0.005 ether }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );
    }

    function test_CreatePledgeRefundExcess() public {
        uint256 balanceBefore = creator.balance;

        vm.prank(creator);
        factory.createPledge{ value: 1 ether }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        // Should only have paid listing tax
        assertEq(balanceBefore - creator.balance, LISTING_TAX);
    }

    // ============ Token Distribution Tests ============

    function test_TokenDistribution() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));
        PledgeToken token = m.token();

        // Creator should have 51% of tokens
        uint256 expectedCreatorTokens = (PledgeToken(token).TOTAL_SUPPLY() * FOUNDER_SHARE_BPS) / 10000;
        assertEq(token.balanceOf(creator), expectedCreatorTokens);

        // Market should hold remaining 49% for ICO
        uint256 expectedMarketTokens = PledgeToken(token).TOTAL_SUPPLY() - expectedCreatorTokens;
        assertEq(token.balanceOf(market), expectedMarketTokens);
    }

    // ============ INVARIANT 1: Sum(UserBalances) + TreasuryBalance == 1,000,000 ============

    function test_Invariant_TotalSupplyConservation() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));
        PledgeToken token = m.token();

        // Invariant: total supply should always equal TOTAL_SUPPLY
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());

        // Sum of balances should equal total supply
        uint256 creatorBalance = token.balanceOf(creator);
        uint256 marketBalance = token.balanceOf(market);
        assertEq(creatorBalance + marketBalance, token.TOTAL_SUPPLY());
    }

    // ============ Contribution Tests ============

    function test_Contribute() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));

        // Contribute 1 ETH
        vm.prank(contributor1);
        m.contribute{ value: 1 ether }();

        assertEq(m.totalRaised(), 1 ether);
        assertEq(m.contributions(contributor1), 1 ether);
        assertTrue(m.token().balanceOf(contributor1) > 0);

        // Check aWETH balance (should have the contribution)
        uint256 aWethBalance = IERC20(AWETH).balanceOf(market);
        assertApproxEqAbs(aWethBalance, 1 ether, 0.01 ether);
    }

    function test_ContributeMultipleUsers() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));
        PledgeToken token = m.token();

        // Multiple contributors
        vm.prank(contributor1);
        m.contribute{ value: 3 ether }();

        vm.prank(contributor2);
        m.contribute{ value: 4 ether }();

        vm.prank(contributor3);
        m.contribute{ value: 3 ether }();

        // Goal should be reached
        assertEq(m.totalRaised(), 10 ether);
        assertEq(uint256(m.status()), uint256(Pledge.Status.Active));

        // All contributors should have tokens
        assertTrue(token.balanceOf(contributor1) > 0);
        assertTrue(token.balanceOf(contributor2) > 0);
        assertTrue(token.balanceOf(contributor3) > 0);

        // Transfers should be enabled
        assertTrue(token.transfersEnabled());
    }

    function test_ContributeOverGoalRefundsExcess() public {
        // Create a pledge with 1 ETH goal for easy testing
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "Small Corp",
            "SMOL",
            "A small venture",
            "",
            1 ether, // 1 ETH goal
            DURATION_DAYS,
            5100 // 51% founder
        );

        Pledge m = Pledge(payable(market));

        // First contribute 0.3 ETH
        vm.prank(contributor1);
        m.contribute{ value: 0.3 ether }();
        assertEq(m.totalRaised(), 0.3 ether);

        // Second contribute 1 ETH - should only accept 0.7 ETH and refund 0.3 ETH
        uint256 balanceBefore = contributor1.balance;
        vm.prank(contributor1);
        m.contribute{ value: 1 ether }();

        // Should have hit goal exactly
        assertEq(m.totalRaised(), 1 ether, "Goal should be exactly met");

        // Contributor should have received 0.3 ETH refund (only accepted 0.7 ETH)
        assertApproxEqAbs(contributor1.balance, balanceBefore - 0.7 ether, 0.001 ether, "Should refund excess");

        // Status should be Active
        assertEq(uint256(m.status()), uint256(Pledge.Status.Active), "Should be active after goal");
    }

    function test_ContributeAfterGoalRefundsAll() public {
        // Create a pledge with 1 ETH goal
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "Small Corp", "SMOL", "A small venture", "", 1 ether, DURATION_DAYS, 5100
        );

        Pledge m = Pledge(payable(market));

        // Hit goal exactly
        vm.prank(contributor1);
        m.contribute{ value: 1 ether }();
        assertEq(m.totalRaised(), 1 ether);

        // Try to contribute more - should refund everything
        uint256 balanceBefore = contributor2.balance;
        vm.prank(contributor2);
        m.contribute{ value: 0.5 ether }();

        // Goal should still be 1 ETH
        assertEq(m.totalRaised(), 1 ether, "Goal should not increase");

        // Contributor2 should have received full refund
        assertEq(contributor2.balance, balanceBefore, "Should refund entire amount");

        // Contributor2 should have no tokens
        assertEq(m.token().balanceOf(contributor2), 0, "Should have no tokens");
    }

    // ============ Fixed Price ICO Tests ============

    function test_FixedPriceICO() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));
        PledgeToken token = m.token();

        // First contributor gets fixed price: 5 ETH = 50% of goal = 50% of public tokens
        vm.prank(contributor1);
        m.contribute{ value: 5 ether }();

        uint256 publicTokens = (token.TOTAL_SUPPLY() * (10000 - FOUNDER_SHARE_BPS)) / 10000;
        uint256 expectedTokens = (5 ether * publicTokens) / GOAL;

        assertApproxEqAbs(token.balanceOf(contributor1), expectedTokens, 1e15);
    }

    // NOTE: test_CreatorWithdraw removed - founders get value from shares, not by draining vault
    // This prevents the double-dipping bug where founders could drain vault AND hold shares.

    function test_RedemptionFairness() public {
        // Test that founder and public holders both get fair pro-rata redemption
        // 1 ETH goal, 51% founder, so public gets 49% of shares
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "Fair Corp",
            "FAIR",
            "Testing fairness",
            "",
            1 ether,
            DURATION_DAYS,
            5100 // 51% founder
        );

        Pledge m = Pledge(payable(market));
        PledgeToken token = m.token();

        // Fund the campaign fully
        vm.prank(contributor1);
        m.contribute{ value: 1 ether }();

        // Vault should have 1 ETH
        uint256 vaultBalance = IERC20(AWETH).balanceOf(market);
        assertApproxEqAbs(vaultBalance, 1 ether, 0.01 ether, "Vault should have 1 ETH");

        // Contributor1 has 49% of shares, founder has 51%
        uint256 contributor1Shares = token.balanceOf(contributor1);
        uint256 founderShares = token.balanceOf(creator);

        // If contributor redeems ALL their shares, they should get 49% of vault (0.49 ETH)
        uint256 balanceBefore = contributor1.balance;
        vm.prank(contributor1);
        m.redeem(contributor1Shares, 0);

        uint256 receivedEth = contributor1.balance - balanceBefore;
        // Should receive proportional share: (49% of shares) / (100% circulating) * 1 ETH = 0.49 ETH
        assertApproxEqAbs(receivedEth, 0.49 ether, 0.01 ether, "Contributor should get 49% of vault");

        // Founder can also redeem their shares
        uint256 founderBefore = creator.balance;
        vm.prank(creator);
        m.redeem(founderShares, 0);

        uint256 founderReceived = creator.balance - founderBefore;
        // Founder should receive the remaining ~51% (slightly less due to contributor redemption first)
        assertApproxEqAbs(founderReceived, 0.51 ether, 0.02 ether, "Founder should get ~51% of vault");
    }

    // ============ Redemption Tests (The Recycling Exit) ============

    function test_Redeem() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));
        PledgeToken token = m.token();

        // Fund the campaign
        vm.prank(contributor1);
        m.contribute{ value: 10 ether }();

        uint256 tokenBalance = token.balanceOf(contributor1);
        uint256 ethBefore = contributor1.balance;

        // Redeem half of tokens
        uint256 redeemAmount = tokenBalance / 2;
        vm.prank(contributor1);
        m.redeem(redeemAmount, 0);

        // Should have received ETH
        assertTrue(contributor1.balance > ethBefore);

        // Tokens should be recycled (not burned)
        assertEq(m.treasuryShares(), redeemAmount);

        // Total supply should remain the same (recycled, not burned)
        assertEq(token.totalSupply(), token.TOTAL_SUPPLY());
    }

    function test_BuyTreasuryStock() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));
        PledgeToken token = m.token();

        // Fund the campaign
        vm.prank(contributor1);
        m.contribute{ value: 10 ether }();

        uint256 tokenBalance = token.balanceOf(contributor1);

        // Redeem tokens (creates treasury stock)
        vm.prank(contributor1);
        m.redeem(tokenBalance, 0);

        // Contributor2 buys treasury stock
        uint256 treasuryBefore = m.treasuryShares();

        vm.prank(contributor2);
        m.buyTreasuryStock{ value: 5 ether }(treasuryBefore / 2);

        // Should have treasury stock now
        assertTrue(token.balanceOf(contributor2) > 0);
        assertEq(m.treasuryShares(), treasuryBefore / 2);
    }

    // ============ Refund Tests ============

    function test_Refund() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp",
            "ACME",
            "A test venture",
            "",
            GOAL,
            1, // 1 day duration
            FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));

        // Contribute less than goal
        vm.prank(contributor1);
        m.contribute{ value: 5 ether }();

        // Fast forward past deadline
        vm.warp(block.timestamp + 2 days);

        // Should be failed status
        assertEq(uint256(m.status()), uint256(Pledge.Status.Failed));

        // Get refund
        uint256 balanceBefore = contributor1.balance;

        vm.prank(contributor1);
        m.refund();

        // Should have received refund
        assertApproxEqAbs(contributor1.balance - balanceBefore, 5 ether, 0.01 ether);
    }

    // ============ Campaign Cancellation Tests ============

    function test_CancelCampaign() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "Cancel Corp", "CNCL", "A test venture to cancel", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));

        // Contribute some ETH
        vm.prank(contributor1);
        m.contribute{ value: 5 ether }();

        // Should be in funding status
        assertEq(uint256(m.status()), uint256(Pledge.Status.Funding));

        // Creator cancels the campaign
        vm.prank(creator);
        m.cancelCampaign();

        // Should now be cancelled
        assertEq(uint256(m.status()), uint256(Pledge.Status.Cancelled));
    }

    function test_CancelCampaign_OnlyCreator() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "Cancel Corp", "CNCL", "", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));

        // Non-creator cannot cancel
        vm.prank(contributor1);
        vm.expectRevert(Pledge.NotCreator.selector);
        m.cancelCampaign();
    }

    function test_CancelCampaign_NotAfterGoalReached() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "Cancel Corp", "CNCL", "", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));

        // Fund fully
        vm.prank(contributor1);
        m.contribute{ value: GOAL }();

        // Should be active
        assertEq(uint256(m.status()), uint256(Pledge.Status.Active));

        // Creator cannot cancel after goal reached
        vm.prank(creator);
        vm.expectRevert(Pledge.NotCancellable.selector);
        m.cancelCampaign();
    }

    function test_RefundAfterCancellation() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "Cancel Corp", "CNCL", "", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));

        // Contribute some ETH
        vm.prank(contributor1);
        m.contribute{ value: 5 ether }();

        // Creator cancels
        vm.prank(creator);
        m.cancelCampaign();

        // Contributor can get refund
        uint256 balanceBefore = contributor1.balance;

        vm.prank(contributor1);
        m.refund();

        // Should have received refund
        assertApproxEqAbs(contributor1.balance - balanceBefore, 5 ether, 0.01 ether);
    }

    // ============ Floor Price Tests ============

    function test_FloorPrice() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));

        // Fund the campaign
        vm.prank(contributor1);
        m.contribute{ value: 10 ether }();

        // Floor price should be non-zero
        uint256 floorPrice = m.floorPricePerShare();
        assertTrue(floorPrice > 0);

        // ICO price should match expected
        uint256 icoPrice = m.icoPrice();
        assertTrue(icoPrice > 0);
    }

    // ============ Bulk View Tests (RSC Optimization) ============

    function test_GetCampaignSummaries() public {
        // Create multiple markets
        vm.startPrank(creator);
        address market1 = factory.createPledge{ value: LISTING_TAX }(
            "Market 1", "M1", "", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );
        address market2 = factory.createPledge{ value: LISTING_TAX }(
            "Market 2", "M2", "", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );
        vm.stopPrank();

        // Get all summaries
        address[] memory markets = factory.getAllPledges();
        PledgeFactory.PledgeSummary[] memory summaries = factory.getSummaries(markets);

        assertEq(summaries.length, 2);
        assertEq(summaries[0].pledge, market1);
        assertEq(summaries[1].pledge, market2);
    }

    // ============ Dividend Distribution Tests ============

    function test_DividendDistribution() public {
        vm.prank(creator);
        address market = factory.createPledge{ value: LISTING_TAX }(
            "ACME Corp", "ACME", "A test venture", "", GOAL, DURATION_DAYS, FOUNDER_SHARE_BPS
        );

        Pledge m = Pledge(payable(market));
        PledgeToken token = m.token();

        // Fund the campaign
        vm.prank(contributor1);
        m.contribute{ value: 10 ether }();

        // Deposit dividends
        vm.prank(creator);
        m.depositDividend{ value: 1 ether }();

        // Contributor should have pending rewards
        uint256 pending = token.withdrawableRewardsOf(contributor1);
        assertTrue(pending > 0);

        // Creator should also have pending rewards (51% of tokens)
        uint256 creatorPending = token.withdrawableRewardsOf(creator);
        assertTrue(creatorPending > 0);

        // Claim rewards
        uint256 balanceBefore = contributor1.balance;
        vm.prank(contributor1);
        m.claimRewards();

        assertTrue(contributor1.balance > balanceBefore);
    }
}
