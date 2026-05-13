// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title NexusReputation
 * @notice Soulbound Token (SBT) system for NexusAid platform.
 *         Non-transferable ERC-721 tokens serve as verifiable on-chain credentials
 *         for volunteers, donors, and organizers.
 *
 * Badge Tier Hierarchy:
 *   bronze    — First contribution milestone (0.01 MATIC / 5 volunteer hours)
 *   silver    — Growing contributor (0.05 MATIC / 20 hours)
 *   gold      — Established contributor (0.1 MATIC / 35 hours)
 *   platinum  — Dedicated contributor (0.5 MATIC / 60 hours)
 *   master    — Elite contributor (1.0 MATIC / 100 hours)
 *   diamond   — Exceptional / manually awarded by admin
 */
contract NexusReputation is ERC721URIStorage {
    using Counters for Counters.Counter;

    address public owner;
    Counters.Counter private _tokenIdCounter;

    struct Badge {
        string  badgeType;
        address recipient;
        uint256 mintedAt;
    }

    mapping(uint256 => Badge)      public badges;       // tokenId => Badge
    mapping(address => uint256[]) public walletBadges; // wallet => tokenIds

    // ─── Events ──────────────────────────────────────────
    event BadgeMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        string  badgeType,
        uint256 timestamp
    );

    // ─── Modifiers ───────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() ERC721("NexusAid Reputation", "NREP") {
        owner = msg.sender;
    }

    // ─── Soulbound: Block All Transfers ──────────────────
    /**
     * @dev Override _beforeTokenTransfer to block all transfers except minting.
     *      from == address(0) means it's a mint operation, which is allowed.
     *      OZ v4 hook used for pre-transfer validation.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        // Allow minting (from == address(0)), block all other transfers
        require(from == address(0), "NexusReputation: Soulbound - transfers disabled");
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // ─── Minting ─────────────────────────────────────────
    /**
     * @notice Mint a reputation badge to a recipient wallet.
     * @param _recipient   Wallet address to receive the badge
     * @param _badgeType   Badge type string (e.g. "bronze", "diamond", "organizer")
     * @param _metadataURI JSON metadata URI (data URI or IPFS)
     * @return tokenId     The minted token's ID
     */
    function mintBadge(
        address _recipient,
        string calldata _badgeType,
        string calldata _metadataURI
    ) external onlyOwner returns (uint256) {
        require(_recipient != address(0), "Cannot mint to zero address");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(_recipient, tokenId);
        _setTokenURI(tokenId, _metadataURI);

        badges[tokenId] = Badge({
            badgeType: _badgeType,
            recipient: _recipient,
            mintedAt:  block.timestamp
        });

        walletBadges[_recipient].push(tokenId);

        emit BadgeMinted(_recipient, tokenId, _badgeType, block.timestamp);
        return tokenId;
    }

    // ─── Read Helpers ─────────────────────────────────────
    /**
     * @notice Get all badge token IDs held by a wallet.
     */
    function getBadgesByOwner(address _wallet) external view returns (uint256[] memory) {
        return walletBadges[_wallet];
    }

    /**
     * @notice Get badge metadata for a token.
     */
    function getBadgeInfo(uint256 _tokenId)
        external view returns (string memory badgeType, address recipient, uint256 mintedAt)
    {
        Badge storage b = badges[_tokenId];
        return (b.badgeType, b.recipient, b.mintedAt);
    }

    /**
     * @notice Get total badges minted.
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
}
