// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title NexusEscrow
 * @notice Milestone-based escrow for disaster relief campaigns.
 *         Funds are held on-chain and released to organizers only when
 *         milestones are approved by the contract owner (governance layer).
 *         Donors can claim a proportional refund if the campaign is abandoned.
 */
contract NexusEscrow {
    address public owner;

    // ─── Enums ───────────────────────────────────────────
    enum MilestoneStatus { Pending, Proposed, Approved }
    enum CampaignStatus  { Active, Completed, Abandoned }

    // ─── Structs ─────────────────────────────────────────
    struct Milestone {
        string  description;
        MilestoneStatus status;
        uint256 releasedAmount; // MATIC released when this milestone approved
    }

    struct Campaign {
        string         firebaseEventId;
        address        organizer;
        uint256        totalRaised;
        uint256        totalReleased;
        uint8          milestoneCount;
        CampaignStatus status;
    }

    // ─── State ───────────────────────────────────────────
    uint256 public campaignCount;

    mapping(uint256 => Campaign)              public campaigns;
    mapping(uint256 => Milestone[])           public milestones;
    mapping(uint256 => mapping(address => uint256)) public donorAmounts; // campaignId => donor => amount

    // ─── Events ──────────────────────────────────────────
    event CampaignCreated(uint256 indexed id, string firebaseEventId, address organizer, uint8 milestoneCount);
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event MilestoneProposed(uint256 indexed campaignId, uint8 milestoneIndex);
    event MilestoneApproved(uint256 indexed campaignId, uint8 milestoneIndex, uint256 released);
    event FundsReleased(uint256 indexed campaignId, address organizer, uint256 amount);
    event CampaignAbandoned(uint256 indexed campaignId);
    event RefundIssued(uint256 indexed campaignId, address donor, uint256 amount);

    // ─── Modifiers ───────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier campaignExists(uint256 _id) {
        require(_id < campaignCount, "Campaign does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Campaign Creation ────────────────────────────────
    /**
     * @notice Organizer creates a new escrow campaign linked to a Firebase event.
     * @param _firebaseEventId  Firestore document ID of the event
     * @param _milestoneDescs   Array of milestone descriptions (max 10)
     */
    function createCampaign(
        string calldata _firebaseEventId,
        string[] calldata _milestoneDescs
    ) external returns (uint256) {
        require(_milestoneDescs.length > 0 && _milestoneDescs.length <= 10, "1-10 milestones required");

        uint256 id = campaignCount++;
        campaigns[id] = Campaign({
            firebaseEventId: _firebaseEventId,
            organizer:       msg.sender,
            totalRaised:     0,
            totalReleased:   0,
            milestoneCount:  uint8(_milestoneDescs.length),
            status:          CampaignStatus.Active
        });

        for (uint8 i = 0; i < _milestoneDescs.length; i++) {
            milestones[id].push(Milestone({
                description:    _milestoneDescs[i],
                status:         MilestoneStatus.Pending,
                releasedAmount: 0
            }));
        }

        emit CampaignCreated(id, _firebaseEventId, msg.sender, uint8(_milestoneDescs.length));
        return id;
    }

    // ─── Donations ───────────────────────────────────────
    /**
     * @notice Donate MATIC to an active campaign. Funds are held in this contract.
     */
    function donate(uint256 _campaignId) external payable campaignExists(_campaignId) {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.Active, "Campaign not active");
        require(msg.value > 0, "Send some MATIC");

        c.totalRaised += msg.value;
        donorAmounts[_campaignId][msg.sender] += msg.value;

        emit DonationReceived(_campaignId, msg.sender, msg.value);
    }

    // ─── Milestone Management ─────────────────────────────
    /**
     * @notice Organizer proposes that a milestone has been completed.
     */
    function proposeMilestoneComplete(uint256 _campaignId, uint8 _milestoneIndex)
        external
        campaignExists(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.organizer, "Not organizer");
        require(c.status == CampaignStatus.Active, "Campaign not active");
        require(_milestoneIndex < c.milestoneCount, "Invalid milestone");

        Milestone storage m = milestones[_campaignId][_milestoneIndex];
        require(m.status == MilestoneStatus.Pending, "Milestone not pending");

        m.status = MilestoneStatus.Proposed;
        emit MilestoneProposed(_campaignId, _milestoneIndex);
    }

    /**
     * @notice Owner approves a proposed milestone and releases proportional funds.
     * @dev Funds released = totalRaised / milestoneCount (even split)
     */
    function approveMilestone(uint256 _campaignId, uint8 _milestoneIndex)
        external
        onlyOwner
        campaignExists(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.Active, "Campaign not active");
        require(_milestoneIndex < c.milestoneCount, "Invalid milestone");

        Milestone storage m = milestones[_campaignId][_milestoneIndex];
        require(m.status == MilestoneStatus.Proposed, "Milestone not proposed");

        // Release an even share of totalRaised for this milestone
        uint256 releaseAmount = c.totalRaised / c.milestoneCount;
        // For last milestone, release any remaining dust
        if (_milestoneIndex == c.milestoneCount - 1) {
            releaseAmount = address(this).balance; // sweep remaining
        }

        m.status         = MilestoneStatus.Approved;
        m.releasedAmount = releaseAmount;
        c.totalReleased += releaseAmount;

        emit MilestoneApproved(_campaignId, _milestoneIndex, releaseAmount);

        (bool ok, ) = payable(c.organizer).call{value: releaseAmount}("");
        require(ok, "Transfer failed");
        emit FundsReleased(_campaignId, c.organizer, releaseAmount);

        // Auto-complete if all milestones approved
        bool allDone = true;
        for (uint8 i = 0; i < c.milestoneCount; i++) {
            if (milestones[_campaignId][i].status != MilestoneStatus.Approved) {
                allDone = false;
                break;
            }
        }
        if (allDone) {
            c.status = CampaignStatus.Completed;
        }
    }

    // ─── Campaign Abandonment & Refunds ──────────────────
    /**
     * @notice Owner marks a campaign as abandoned, enabling refunds.
     */
    function abandonCampaign(uint256 _campaignId)
        external
        onlyOwner
        campaignExists(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.Active, "Campaign not active");
        c.status = CampaignStatus.Abandoned;
        emit CampaignAbandoned(_campaignId);
    }

    /**
     * @notice Donor claims a refund proportional to their contribution.
     *         Only available if campaign is abandoned.
     */
    function claimRefund(uint256 _campaignId) external campaignExists(_campaignId) {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.Abandoned, "Campaign not abandoned");

        uint256 donated = donorAmounts[_campaignId][msg.sender];
        require(donated > 0, "No donation to refund");

        // Refund proportional to remaining (unreleased) funds
        uint256 unreleased    = c.totalRaised - c.totalReleased;
        uint256 refundAmount  = (donated * unreleased) / c.totalRaised;

        donorAmounts[_campaignId][msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: refundAmount}("");
        require(ok, "Refund failed");
        emit RefundIssued(_campaignId, msg.sender, refundAmount);
    }

    // ─── Read Helpers ─────────────────────────────────────
    function getCampaign(uint256 _id)
        external view returns (
            string memory firebaseEventId,
            address organizer,
            uint256 totalRaised,
            uint256 totalReleased,
            uint8   milestoneCount,
            uint8   status
        )
    {
        Campaign storage c = campaigns[_id];
        return (
            c.firebaseEventId,
            c.organizer,
            c.totalRaised,
            c.totalReleased,
            c.milestoneCount,
            uint8(c.status)
        );
    }

    function getMilestone(uint256 _campaignId, uint8 _index)
        external view returns (string memory description, uint8 status, uint256 releasedAmount)
    {
        Milestone storage m = milestones[_campaignId][_index];
        return (m.description, uint8(m.status), m.releasedAmount);
    }

    function getDonorAmount(uint256 _campaignId, address _donor)
        external view returns (uint256)
    {
        return donorAmounts[_campaignId][_donor];
    }
}
