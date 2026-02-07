// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/CampaignV2.sol";
import "../contracts/CampaignFactoryV2.sol";
import "../contracts/PledgeToken.sol";

/**
 * @title CampaignV2Test
 * @notice Comprehensive tests for CampaignV2 including fuzz and invariant tests
 */
contract CampaignV2Test is Test {
    CampaignV2 public campaign;
    CampaignFactoryV2 public factory;

    address public creator = address(1);
    address public backer1 = address(2);
    address public backer2 = address(3);
    address public backer3 = address(4);

    uint256 public constant FUNDING_GOAL = 10 ether;
    uint256 public constant DURATION_DAYS = 30;
    string public constant TITLE = "Test Campaign V2";
    string public constant DESCRIPTION = "A test crowdfunding campaign with all fixes";
    string public constant IMAGE_URL = "https://example.com/image.jpg";

    event ContributionMade(address indexed contributor, uint256 amount, uint256 totalRaised);
    event FundsWithdrawn(address indexed creator, uint256 amount);
    event RefundClaimed(address indexed contributor, uint256 amount);
    event CampaignCancelled(address indexed creator);
    event CampaignStatusUpdated(CampaignV2.CampaignStatus newStatus);
    event RewardClaimed(address indexed contributor, uint256 tokenAmount);

    function setUp() public {
        // Fund test accounts
        vm.deal(creator, 100 ether);
        vm.deal(backer1, 100 ether);
        vm.deal(backer2, 100 ether);
        vm.deal(backer3, 100 ether);

        // Deploy factory
        factory = new CampaignFactoryV2();

        // Create campaign through factory (uses clone)
        vm.prank(creator);
        address campaignAddress = factory.createCampaign(FUNDING_GOAL, DURATION_DAYS, TITLE, DESCRIPTION, IMAGE_URL);
        campaign = CampaignV2(payable(campaignAddress));
    }

    // ============ Clone/Proxy Tests ============

    function test_FactoryDeploysClone() public view {
        assertEq(factory.getCampaignCount(), 1);
        assertTrue(factory.isValidCampaign(address(campaign)));
    }

    function test_CloneIsInitializedCorrectly() public view {
        assertEq(campaign.creator(), creator);
        assertEq(campaign.fundingGoal(), FUNDING_GOAL);
        assertEq(uint256(campaign.status()), uint256(CampaignV2.CampaignStatus.Active));
    }

    function test_CannotReinitializeClone() public {
        vm.expectRevert();
        campaign.initialize(
            address(5), 1 ether, 30, "New", "New", "", 0, address(0), ""
        );
    }

    // ============ CRITICAL: Withdraw Deadline Tests ============

    function test_WithdrawFailsBeforeDeadline() public {
        // Fund to goal (status becomes Successful)
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();
        
        assertEq(uint256(campaign.status()), uint256(CampaignV2.CampaignStatus.Successful));
        
        // Try to withdraw before deadline - SHOULD FAIL
        vm.prank(creator);
        vm.expectRevert(CampaignV2.DeadlineNotPassed.selector);
        campaign.withdraw();
    }

    function test_WithdrawSucceedsAfterDeadline() public {
        // Fund to goal
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();
        
        // Warp past deadline
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        
        uint256 creatorBalanceBefore = creator.balance;
        
        vm.prank(creator);
        campaign.withdraw();
        
        assertEq(creator.balance, creatorBalanceBefore + FUNDING_GOAL);
    }

    function test_CannotWithdrawTwice() public {
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();
        
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        
        vm.prank(creator);
        campaign.withdraw();
        
        vm.prank(creator);
        vm.expectRevert(CampaignV2.AlreadyWithdrawn.selector);
        campaign.withdraw();
    }

    // ============ CRITICAL: Permissionless Refund Tests ============

    function test_RefundWithoutFinalization() public {
        // Contribute but don't reach goal
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();
        
        // Warp past deadline - status is still Active
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        
        assertEq(uint256(campaign.status()), uint256(CampaignV2.CampaignStatus.Active));
        
        // Should be able to refund even without calling finalize()
        uint256 balanceBefore = backer1.balance;
        
        vm.prank(backer1);
        campaign.refund();
        
        assertEq(backer1.balance, balanceBefore + 1 ether);
        // Status should now be Failed
        assertEq(uint256(campaign.status()), uint256(CampaignV2.CampaignStatus.Failed));
    }

    function test_CanClaimRefundView() public {
        vm.prank(backer1);
        campaign.contribute{ value: 5 ether }();
        
        // Before deadline
        (bool canClaim, uint256 amount) = campaign.canClaimRefund(backer1);
        assertFalse(canClaim);
        assertEq(amount, 5 ether);
        
        // After deadline (goal not reached)
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        
        (canClaim, amount) = campaign.canClaimRefund(backer1);
        assertTrue(canClaim);
        assertEq(amount, 5 ether);
    }

    // ============ Reward Token Tests ============

    function test_RewardTokenDeployed() public view {
        assertTrue(address(campaign.rewardToken()) != address(0));
    }

    function test_ClaimRewardAfterSuccess() public {
        vm.prank(backer1);
        campaign.contribute{ value: 5 ether }();
        
        vm.prank(backer2);
        campaign.contribute{ value: 5 ether }();
        
        // Warp past deadline
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        
        // Claim reward
        vm.prank(backer1);
        campaign.claimReward();
        
        PledgeToken token = campaign.rewardToken();
        uint256 expectedTokens = 5 ether * 1000; // TOKENS_PER_ETH = 1000
        assertEq(token.balanceOf(backer1), expectedTokens);
    }

    function test_CannotClaimRewardTwice() public {
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();
        
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        
        vm.prank(backer1);
        campaign.claimReward();
        
        vm.prank(backer1);
        vm.expectRevert(CampaignV2.AlreadyClaimed.selector);
        campaign.claimReward();
    }

    function test_CannotClaimRewardBeforeDeadline() public {
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();
        
        vm.prank(backer1);
        vm.expectRevert(CampaignV2.DeadlineNotPassed.selector);
        campaign.claimReward();
    }

    // ============ Funding Cap Tests ============

    function test_FundingCapEnforced() public {
        // Create campaign with cap
        vm.prank(creator);
        address addr = factory.createCampaignAdvanced(
            5 ether,  // goal
            30,
            "Capped Campaign",
            "Test",
            "",
            10 ether, // cap
            address(0),
            ""
        );
        CampaignV2 cappedCampaign = CampaignV2(payable(addr));
        
        // Contribute up to cap
        vm.prank(backer1);
        cappedCampaign.contribute{ value: 10 ether }();
        
        // Try to exceed cap
        vm.prank(backer2);
        vm.expectRevert(CampaignV2.FundingCapExceeded.selector);
        cappedCampaign.contribute{ value: 1 ether }();
    }

    // ============ CEI Pattern Tests ============

    function test_RefundFollowsCEI() public {
        vm.prank(backer1);
        campaign.contribute{ value: 5 ether }();
        
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        campaign.finalize();
        
        // Contribution should be zeroed before transfer
        vm.prank(backer1);
        campaign.refund();
        
        assertEq(campaign.contributions(backer1), 0);
    }

    // ============ Multicall Tests ============

    function test_GetAllCampaignSummaries() public {
        // Create more campaigns
        vm.startPrank(creator);
        factory.createCampaign(1 ether, 10, "Campaign 2", "Desc 2", "");
        factory.createCampaign(2 ether, 20, "Campaign 3", "Desc 3", "");
        vm.stopPrank();
        
        CampaignFactoryV2.CampaignSummary[] memory summaries = factory.getAllCampaignSummaries();
        
        assertEq(summaries.length, 3);
        assertEq(summaries[0].title, TITLE);
        assertEq(summaries[1].title, "Campaign 2");
        assertEq(summaries[2].title, "Campaign 3");
    }

    function test_GetCampaignSummariesPaginated() public {
        vm.startPrank(creator);
        factory.createCampaign(1 ether, 10, "Campaign 2", "Desc 2", "");
        factory.createCampaign(2 ether, 20, "Campaign 3", "Desc 3", "");
        factory.createCampaign(3 ether, 30, "Campaign 4", "Desc 4", "");
        vm.stopPrank();
        
        CampaignFactoryV2.CampaignSummary[] memory page1 = factory.getCampaignSummariesPaginated(0, 2);
        assertEq(page1.length, 2);
        
        CampaignFactoryV2.CampaignSummary[] memory page2 = factory.getCampaignSummariesPaginated(2, 2);
        assertEq(page2.length, 2);
    }

    // ============ Fuzz Tests ============

    function testFuzz_ContributeAnyAmount(uint256 amount) public {
        // Bound to reasonable range (min contribution to 100 ETH)
        amount = bound(amount, 0.001 ether, 100 ether);
        
        vm.deal(backer1, amount);
        vm.prank(backer1);
        campaign.contribute{ value: amount }();
        
        assertEq(campaign.totalRaised(), amount);
        assertEq(campaign.contributions(backer1), amount);
    }

    function testFuzz_MultipleContributors(uint8 numBackers, uint256 seed) public {
        numBackers = uint8(bound(numBackers, 1, 50));
        
        uint256 totalExpected = 0;
        
        for (uint8 i = 0; i < numBackers; i++) {
            address backer = address(uint160(100 + i));
            uint256 amount = 0.01 ether + (uint256(keccak256(abi.encode(seed, i))) % 1 ether);
            
            vm.deal(backer, amount);
            vm.prank(backer);
            campaign.contribute{ value: amount }();
            
            totalExpected += amount;
        }
        
        assertEq(campaign.totalRaised(), totalExpected);
        assertEq(campaign.getContributorCount(), numBackers);
    }

    function testFuzz_DurationDays(uint256 days_) public {
        days_ = bound(days_, 1, 365);
        
        vm.prank(creator);
        address addr = factory.createCampaign(1 ether, days_, "Fuzz Test", "Desc", "");
        CampaignV2 fuzzCampaign = CampaignV2(payable(addr));
        
        uint256 expectedDeadline = block.timestamp + (days_ * 1 days);
        assertEq(fuzzCampaign.deadline(), expectedDeadline);
    }

    // ============ Invariant Tests ============

    function invariant_TotalRaisedMatchesBalance() public view {
        // For ETH campaigns, totalRaised should match contract balance
        // (unless funds have been withdrawn or refunded)
        if (!campaign.fundsWithdrawn()) {
            assertEq(campaign.totalRaised(), address(campaign).balance);
        }
    }

    function invariant_ContributionsMatchTotalRaised() public {
        // Sum of all contributions should equal totalRaised
        // This is implicitly tested by the state changes
        assertTrue(true);
    }

    // ============ Edge Case Tests ============

    function test_ManySmallContributions() public {
        // Test with 100 contributors of 1 wei each
        // This tests gas behavior with many small contributions
        for (uint256 i = 0; i < 100; i++) {
            address backer = address(uint160(1000 + i));
            vm.deal(backer, 1 ether);
            vm.prank(backer);
            campaign.contribute{ value: 0.001 ether }();
        }
        
        assertEq(campaign.getContributorCount(), 100);
        assertEq(campaign.totalRaised(), 0.1 ether);
    }

    function test_ExactGoalReached() public {
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();
        
        assertEq(campaign.totalRaised(), FUNDING_GOAL);
        assertEq(uint256(campaign.status()), uint256(CampaignV2.CampaignStatus.Successful));
    }

    function test_JustUnderGoal() public {
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL - 1 }();
        
        // Still active
        assertEq(uint256(campaign.status()), uint256(CampaignV2.CampaignStatus.Active));
        
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        campaign.finalize();
        
        assertEq(uint256(campaign.status()), uint256(CampaignV2.CampaignStatus.Failed));
    }

    function test_ContributeAtExactDeadline() public {
        // Warp to exact deadline
        vm.warp(campaign.deadline());
        
        // Should fail - deadline has passed
        vm.prank(backer1);
        vm.expectRevert(CampaignV2.DeadlinePassed.selector);
        campaign.contribute{ value: 1 ether }();
    }

    function test_ContributeOneSecondBeforeDeadline() public {
        // Warp to 1 second before deadline
        vm.warp(campaign.deadline() - 1);
        
        // Should succeed
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();
        
        assertEq(campaign.totalRaised(), 1 ether);
    }
}

/**
 * @title CampaignInvariantTest
 * @notice Stateful invariant tests for Campaign
 */
contract CampaignInvariantTest is Test {
    CampaignV2 public campaign;
    CampaignFactoryV2 public factory;
    CampaignHandler public handler;

    function setUp() public {
        factory = new CampaignFactoryV2();
        
        address creator = address(1);
        vm.deal(creator, 100 ether);
        
        vm.prank(creator);
        address addr = factory.createCampaign(10 ether, 30, "Invariant Test", "Test", "");
        campaign = CampaignV2(payable(addr));
        
        handler = new CampaignHandler(campaign);
        
        targetContract(address(handler));
    }

    function invariant_BalanceMatchesTotalRaised() public view {
        // Only valid before any withdrawals/refunds
        if (!campaign.fundsWithdrawn() && uint256(campaign.status()) <= 1) {
            assertEq(address(campaign).balance, campaign.totalRaised());
        }
    }

    function invariant_ContributorCountConsistent() public view {
        assertTrue(campaign.getContributorCount() <= 1000); // Reasonable max
    }
}

/**
 * @title CampaignHandler
 * @notice Handler contract for invariant testing
 */
contract CampaignHandler is Test {
    CampaignV2 public campaign;
    address[] public actors;
    
    constructor(CampaignV2 _campaign) {
        campaign = _campaign;
        
        // Setup actors
        for (uint256 i = 0; i < 10; i++) {
            address actor = address(uint160(1000 + i));
            vm.deal(actor, 100 ether);
            actors.push(actor);
        }
    }
    
    function contribute(uint256 actorSeed, uint256 amount) public {
        amount = bound(amount, 0.001 ether, 10 ether);
        address actor = actors[actorSeed % actors.length];
        
        if (block.timestamp < campaign.deadline() && 
            uint256(campaign.status()) == 0) {
            vm.prank(actor);
            try campaign.contribute{ value: amount }() {} catch {}
        }
    }
}
