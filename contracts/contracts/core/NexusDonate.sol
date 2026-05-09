// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract NexusDonate {
    address public owner;

    struct Campaign {
        string firebaseEventId;
        string metadataCID;      // IPFS CID of campaign metadata JSON
        address organizer;
        uint256 totalRaised;
        bool active;
    }

    struct DonationRecord {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => DonationRecord[]) public donationHistory;

    event CampaignCreated(uint256 indexed id, string firebaseEventId, address organizer, string metadataCID);
    event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event FundsWithdrawn(uint256 indexed campaignId, uint256 amount);
    event MetadataUpdated(uint256 indexed campaignId, string newMetadataCID);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Create a campaign linked to a Firebase event ───
    /**
     * @param _firebaseEventId  Firestore document ID for the event
     * @param _metadataCID      IPFS CID of the campaign metadata JSON
     */
    function createCampaign(
        string calldata _firebaseEventId,
        string calldata _metadataCID
    ) external returns (uint256) {
        uint256 id = campaignCount++;
        campaigns[id] = Campaign({
            firebaseEventId: _firebaseEventId,
            metadataCID:     _metadataCID,
            organizer:       msg.sender,
            totalRaised:     0,
            active:          true
        });
        emit CampaignCreated(id, _firebaseEventId, msg.sender, _metadataCID);
        return id;
    }

    // ─── Organizer can update the IPFS metadata CID ─────
    function updateMetadataCID(uint256 _campaignId, string calldata _newCID) external {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.organizer, "Not organizer");
        c.metadataCID = _newCID;
        emit MetadataUpdated(_campaignId, _newCID);
    }

    // ─── Donate ETH/MATIC to a campaign ─────────────────
    function donate(uint256 _campaignId) external payable {
        require(msg.value > 0, "Send some ETH");
        Campaign storage c = campaigns[_campaignId];
        require(c.active, "Campaign not active");

        c.totalRaised += msg.value;
        donationHistory[_campaignId].push(DonationRecord({
            donor:     msg.sender,
            amount:    msg.value,
            timestamp: block.timestamp
        }));

        emit DonationMade(_campaignId, msg.sender, msg.value);
    }

    // ─── Organizer withdraws funds ──────────────────────
    function withdraw(uint256 _campaignId) external {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.organizer, "Not organizer");

        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");

        c.active = false;
        (bool ok, ) = payable(c.organizer).call{value: balance}("");
        require(ok, "Transfer failed");

        emit FundsWithdrawn(_campaignId, balance);
    }

    // ─── Read helpers for the frontend ──────────────────
    function getCampaign(uint256 _campaignId)
        external view returns (
            string memory firebaseEventId,
            string memory metadataCID,
            address organizer,
            uint256 totalRaised,
            bool active
        )
    {
        Campaign storage c = campaigns[_campaignId];
        return (c.firebaseEventId, c.metadataCID, c.organizer, c.totalRaised, c.active);
    }

    function getDonationCount(uint256 _campaignId) external view returns (uint256) {
        return donationHistory[_campaignId].length;
    }

    function getDonation(uint256 _campaignId, uint256 _index)
        external view returns (address donor, uint256 amount, uint256 timestamp)
    {
        DonationRecord storage d = donationHistory[_campaignId][_index];
        return (d.donor, d.amount, d.timestamp);
    }
}
