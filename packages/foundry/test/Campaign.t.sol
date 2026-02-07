// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/Campaign.sol";
import "../contracts/CampaignFactory.sol";

contract CampaignTest is Test {
    Campaign public campaign;
    CampaignFactory public factory;

    address public creator = address(1);
    address public backer1 = address(2);
    address public backer2 = address(3);

    uint256 public constant FUNDING_GOAL = 10 ether;
    uint256 public constant DURATION_DAYS = 30;
    string public constant TITLE = "Test Campaign";
    string public constant DESCRIPTION = "A test crowdfunding campaign";
    string public constant IMAGE_URL = "https://example.com/image.jpg";

    event ContributionMade(address indexed contributor, uint256 amount, uint256 totalRaised);
    event FundsWithdrawn(address indexed creator, uint256 amount);
    event RefundClaimed(address indexed contributor, uint256 amount);
    event CampaignCancelled(address indexed creator);
    event CampaignStatusUpdated(Campaign.CampaignStatus newStatus);

    function setUp() public {
        // Fund test accounts
        vm.deal(creator, 100 ether);
        vm.deal(backer1, 100 ether);
        vm.deal(backer2, 100 ether);

        // Deploy factory
        factory = new CampaignFactory();

        // Create campaign through factory
        vm.prank(creator);
        address campaignAddress = factory.createCampaign(FUNDING_GOAL, DURATION_DAYS, TITLE, DESCRIPTION, IMAGE_URL);
        campaign = Campaign(payable(campaignAddress));
    }

    // ============ Factory Tests ============

    function test_FactoryCreatesCampaign() public view {
        assertEq(factory.getCampaignCount(), 1);
        assertTrue(factory.isValidCampaign(address(campaign)));
    }

    function test_FactoryTracksCampaignsByCreator() public view {
        address[] memory creatorCampaigns = factory.getCampaignsByCreator(creator);
        assertEq(creatorCampaigns.length, 1);
        assertEq(creatorCampaigns[0], address(campaign));
    }

    function test_FactoryRejectsZeroFundingGoal() public {
        vm.prank(creator);
        vm.expectRevert(CampaignFactory.InvalidFundingGoal.selector);
        factory.createCampaign(0, DURATION_DAYS, TITLE, DESCRIPTION, IMAGE_URL);
    }

    function test_FactoryRejectsInvalidDuration() public {
        vm.prank(creator);
        vm.expectRevert(CampaignFactory.InvalidDuration.selector);
        factory.createCampaign(FUNDING_GOAL, 0, TITLE, DESCRIPTION, IMAGE_URL);

        vm.prank(creator);
        vm.expectRevert(CampaignFactory.InvalidDuration.selector);
        factory.createCampaign(FUNDING_GOAL, 366, TITLE, DESCRIPTION, IMAGE_URL);
    }

    function test_FactoryRejectsEmptyTitle() public {
        vm.prank(creator);
        vm.expectRevert(CampaignFactory.InvalidTitle.selector);
        factory.createCampaign(FUNDING_GOAL, DURATION_DAYS, "", DESCRIPTION, IMAGE_URL);
    }

    // ============ Campaign Initialization Tests ============

    function test_CampaignInitialization() public view {
        assertEq(campaign.creator(), creator);
        assertEq(campaign.fundingGoal(), FUNDING_GOAL);
        assertEq(campaign.totalRaised(), 0);
        assertEq(uint256(campaign.status()), uint256(Campaign.CampaignStatus.Active));
        assertEq(campaign.title(), TITLE);
        assertEq(campaign.description(), DESCRIPTION);
        assertEq(campaign.imageUrl(), IMAGE_URL);
    }

    function test_CampaignDeadlineIsSet() public view {
        uint256 expectedDeadline = block.timestamp + (DURATION_DAYS * 1 days);
        assertEq(campaign.deadline(), expectedDeadline);
    }

    function test_CampaignWithEmptyImageUrl() public {
        vm.prank(creator);
        address campaignAddr = factory.createCampaign(FUNDING_GOAL, DURATION_DAYS, TITLE, DESCRIPTION, "");
        Campaign campaignNoImage = Campaign(payable(campaignAddr));
        assertEq(campaignNoImage.imageUrl(), "");
    }

    // ============ Contribution Tests ============

    function test_ContributeSuccess() public {
        uint256 contribution = 1 ether;

        vm.prank(backer1);
        vm.expectEmit(true, false, false, true);
        emit ContributionMade(backer1, contribution, contribution);
        campaign.contribute{ value: contribution }();

        assertEq(campaign.totalRaised(), contribution);
        assertEq(campaign.getContribution(backer1), contribution);
        assertEq(campaign.getContributorCount(), 1);
    }

    function test_MultipleContributions() public {
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();

        vm.prank(backer2);
        campaign.contribute{ value: 2 ether }();

        assertEq(campaign.totalRaised(), 3 ether);
        assertEq(campaign.getContributorCount(), 2);
    }

    function test_ContributorCanContributeMultipleTimes() public {
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();

        vm.prank(backer1);
        campaign.contribute{ value: 2 ether }();

        assertEq(campaign.getContribution(backer1), 3 ether);
        assertEq(campaign.getContributorCount(), 1); // Still only 1 contributor
    }

    function test_ContributeFailsWithZeroAmount() public {
        vm.prank(backer1);
        vm.expectRevert(Campaign.ZeroContribution.selector);
        campaign.contribute{ value: 0 }();
    }

    function test_ContributeFailsAfterDeadline() public {
        // Warp past deadline
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);

        vm.prank(backer1);
        vm.expectRevert(Campaign.DeadlinePassed.selector);
        campaign.contribute{ value: 1 ether }();
    }

    // ============ Goal Reached Tests ============

    function test_StatusChangesToSuccessfulWhenGoalReached() public {
        vm.prank(backer1);
        vm.expectEmit(false, false, false, true);
        emit CampaignStatusUpdated(Campaign.CampaignStatus.Successful);
        campaign.contribute{ value: FUNDING_GOAL }();

        assertEq(uint256(campaign.status()), uint256(Campaign.CampaignStatus.Successful));
        assertTrue(campaign.isGoalReached());
    }

    function test_OverfundingAllowed() public {
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL + 5 ether }();

        assertEq(campaign.totalRaised(), FUNDING_GOAL + 5 ether);
        assertTrue(campaign.getFundingProgress() > 100);
    }

    // ============ Finalize Tests ============

    function test_FinalizeToSuccessful() public {
        // Contribute enough to reach goal
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();

        // Already successful, no need to finalize
        assertEq(uint256(campaign.status()), uint256(Campaign.CampaignStatus.Successful));
    }

    function test_FinalizeToFailed() public {
        // Contribute less than goal
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();

        // Warp past deadline
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);

        // Finalize
        campaign.finalize();

        assertEq(uint256(campaign.status()), uint256(Campaign.CampaignStatus.Failed));
    }

    function test_FinalizeFailsBeforeDeadline() public {
        vm.expectRevert(Campaign.DeadlineNotPassed.selector);
        campaign.finalize();
    }

    // ============ Withdrawal Tests ============

    function test_CreatorWithdrawAfterSuccess() public {
        // Fund campaign to goal
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();

        uint256 creatorBalanceBefore = creator.balance;

        vm.prank(creator);
        vm.expectEmit(true, false, false, true);
        emit FundsWithdrawn(creator, FUNDING_GOAL);
        campaign.withdraw();

        assertEq(creator.balance, creatorBalanceBefore + FUNDING_GOAL);
        assertEq(address(campaign).balance, 0);
    }

    function test_WithdrawFailsIfNotSuccessful() public {
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();

        vm.prank(creator);
        vm.expectRevert(Campaign.CampaignNotSuccessful.selector);
        campaign.withdraw();
    }

    function test_WithdrawFailsIfNotCreator() public {
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();

        vm.prank(backer1);
        vm.expectRevert(Campaign.NotCreator.selector);
        campaign.withdraw();
    }

    // ============ Refund Tests ============

    function test_BackerRefundAfterFailure() public {
        uint256 contribution = 5 ether;

        vm.prank(backer1);
        campaign.contribute{ value: contribution }();

        // Warp past deadline
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);

        // Finalize to Failed
        campaign.finalize();

        uint256 balanceBefore = backer1.balance;

        vm.prank(backer1);
        vm.expectEmit(true, false, false, true);
        emit RefundClaimed(backer1, contribution);
        campaign.refund();

        assertEq(backer1.balance, balanceBefore + contribution);
        assertEq(campaign.getContribution(backer1), 0);
    }

    function test_RefundFailsIfCampaignNotFailed() public {
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();

        vm.prank(backer1);
        vm.expectRevert(Campaign.CampaignNotFailed.selector);
        campaign.refund();
    }

    function test_RefundFailsIfNoContribution() public {
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();

        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        campaign.finalize();

        vm.prank(backer2); // backer2 never contributed
        vm.expectRevert(Campaign.NoContribution.selector);
        campaign.refund();
    }

    function test_DoubleRefundFails() public {
        vm.prank(backer1);
        campaign.contribute{ value: 5 ether }();

        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        campaign.finalize();

        vm.prank(backer1);
        campaign.refund();

        vm.prank(backer1);
        vm.expectRevert(Campaign.NoContribution.selector);
        campaign.refund();
    }

    // ============ Cancel Tests ============

    function test_CreatorCanCancelCampaign() public {
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();

        vm.prank(creator);
        vm.expectEmit(true, false, false, false);
        emit CampaignCancelled(creator);
        campaign.cancel();

        assertEq(uint256(campaign.status()), uint256(Campaign.CampaignStatus.Cancelled));
    }

    function test_RefundAfterCancel() public {
        uint256 contribution = 1 ether;

        vm.prank(backer1);
        campaign.contribute{ value: contribution }();

        vm.prank(creator);
        campaign.cancel();

        uint256 balanceBefore = backer1.balance;

        vm.prank(backer1);
        campaign.refund();

        assertEq(backer1.balance, balanceBefore + contribution);
    }

    function test_CancelFailsIfNotCreator() public {
        vm.prank(backer1);
        vm.expectRevert(Campaign.NotCreator.selector);
        campaign.cancel();
    }

    function test_CancelFailsAfterDeadline() public {
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);

        vm.prank(creator);
        vm.expectRevert(Campaign.DeadlinePassed.selector);
        campaign.cancel();
    }

    // ============ View Function Tests ============

    function test_GetTimeRemaining() public view {
        uint256 timeRemaining = campaign.getTimeRemaining();
        assertGt(timeRemaining, 0);
    }

    function test_GetTimeRemainingAfterDeadline() public {
        vm.warp(block.timestamp + DURATION_DAYS * 1 days + 1);
        assertEq(campaign.getTimeRemaining(), 0);
    }

    function test_GetFundingProgress() public {
        vm.prank(backer1);
        campaign.contribute{ value: 5 ether }();

        assertEq(campaign.getFundingProgress(), 50); // 50%
    }

    function test_GetCampaignDetails() public {
        vm.prank(backer1);
        campaign.contribute{ value: 5 ether }();

        (
            address _creator,
            uint256 _fundingGoal,
            uint256 _deadline,
            uint256 _totalRaised,
            Campaign.CampaignStatus _status,
            string memory _title,
            string memory _description,
            uint256 _createdAt,
            uint256 _contributorCount,
            string memory _imageUrl
        ) = campaign.getCampaignDetails();

        assertEq(_creator, creator);
        assertEq(_fundingGoal, FUNDING_GOAL);
        assertGt(_deadline, block.timestamp);
        assertEq(_totalRaised, 5 ether);
        assertEq(uint256(_status), uint256(Campaign.CampaignStatus.Active));
        assertEq(_title, TITLE);
        assertEq(_description, DESCRIPTION);
        assertGt(_createdAt, 0);
        assertEq(_contributorCount, 1);
        assertEq(_imageUrl, IMAGE_URL);
    }

    function test_GetContributors() public {
        vm.prank(backer1);
        campaign.contribute{ value: 1 ether }();

        vm.prank(backer2);
        campaign.contribute{ value: 1 ether }();

        address[] memory contributors = campaign.getContributors();
        assertEq(contributors.length, 2);
        assertEq(contributors[0], backer1);
        assertEq(contributors[1], backer2);
    }

    // ============ Factory Pagination Tests ============

    function test_GetCampaignsPaginated() public {
        // Create more campaigns
        vm.startPrank(creator);
        factory.createCampaign(1 ether, 10, "Campaign 2", "Desc 2", "");
        factory.createCampaign(2 ether, 20, "Campaign 3", "Desc 3", "");
        factory.createCampaign(3 ether, 30, "Campaign 4", "Desc 4", "");
        vm.stopPrank();

        // Get first 2 campaigns
        address[] memory firstPage = factory.getCampaignsPaginated(0, 2);
        assertEq(firstPage.length, 2);

        // Get next 2 campaigns
        address[] memory secondPage = factory.getCampaignsPaginated(2, 2);
        assertEq(secondPage.length, 2);

        // Get last campaign with overflow limit
        address[] memory lastPage = factory.getCampaignsPaginated(3, 10);
        assertEq(lastPage.length, 1);
    }

    function test_GetCampaignsPaginatedWithInvalidOffset() public view {
        address[] memory result = factory.getCampaignsPaginated(100, 10);
        assertEq(result.length, 0);
    }

    // ============ New Edge Case Tests ============

    function test_ContributeAfterGoalReached() public {
        // Reach the goal
        vm.prank(backer1);
        campaign.contribute{ value: FUNDING_GOAL }();
        assertEq(uint256(campaign.status()), uint256(Campaign.CampaignStatus.Successful));

        // Should still be able to contribute (overfunding)
        vm.prank(backer2);
        campaign.contribute{ value: 5 ether }();

        assertEq(campaign.totalRaised(), FUNDING_GOAL + 5 ether);
        assertEq(campaign.getContribution(backer2), 5 ether);
    }

    function test_ContributeFailsIfCancelled() public {
        vm.prank(creator);
        campaign.cancel();

        vm.prank(backer1);
        vm.expectRevert(Campaign.CampaignNotActive.selector);
        campaign.contribute{ value: 1 ether }();
    }

    function test_ContributeFailsBelowMinimum() public {
        vm.prank(backer1);
        vm.expectRevert(Campaign.ContributionTooSmall.selector);
        campaign.contribute{ value: 0.0001 ether }();
    }

    function test_MinimumContributionAccepted() public {
        vm.prank(backer1);
        campaign.contribute{ value: 0.001 ether }();

        assertEq(campaign.getContribution(backer1), 0.001 ether);
    }

    function test_FactoryRejectsEmptyDescription() public {
        vm.prank(creator);
        vm.expectRevert(CampaignFactory.InvalidDescription.selector);
        factory.createCampaign(FUNDING_GOAL, DURATION_DAYS, TITLE, "", IMAGE_URL);
    }
}
