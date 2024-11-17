// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

// Library
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// Interface
import "../interfaces/IWETH.sol";

contract KoriMarketplace is ReentrancyGuard, Ownable, AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;
    Counters.Counter private _auctionIdTracker;

    address private _admin;

    /*
     * Constructor
     */
    constructor(address admin, address _weth) {
        wethAddress = _weth;
        _setupRole(ADMIN_ROLE, admin);
    }

    /* *********
     * Structs Zone
     * *********
     */
    struct Sale {
        // ID for the ERC721 token
        uint256 tokenId;
        // Address for the ERC721 contract
        address tokenContract;
        // The time auction End
        uint256 endTime;
        // The minimum price of the first bid
        uint256 reservePrice;
        // The address that should receive the funds once the NFT is sold.
        address tokenOwner;
        // The address of the current highest bid
        address bidder;
        // The current highest bid amount
        uint256 amount;
        // The address of the ERC-20 currency to run the auction with.
        // If set to 0x0, the auction will be run in ETH
        address auctionCurrency;
    }

    /* *********
     * Events Zone
     * *********
     */
    event SaleCreated(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed tokenContract,
        uint256 endTime,
        uint256 reservePrice,
        address tokenOwner,
        address auctionCurrency
    );

    event SaleBid(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed tokenContract,
        address sender,
        uint256 value,
        bool firstBid
    );

    event SaleEnded(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed tokenContract,
        address tokenOwner,
        address winner,
        uint256 amount,
        address auctionCurrency
    );

    event SaleCanceled(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed tokenContract,
        address tokenOwner
    );

    event AcceptOffer(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed tokenContract,
        address sender,
        uint256 value
    );

    event CreateOffer(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed tokenContract,
        address sender,
        uint256 value
    );

    event CancelOffer(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed tokenContract,
        address sender
    );

    /* *******
     * Globals Zone
     * *******
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    // A mapping of all of the auctions currently running.
    mapping(uint256 => Sale) public auctions;

    bytes4 constant interfaceId = 0x80ac58cd; // 721 interface id

    // The address of the WETH contract, so that any ETH transferred can be handled as an ERC-20
    address public wethAddress;

    // Mapping from token to number of sale
    mapping(uint256 => uint8) public numberOfSale;

    // A mapping of all of the auctions currently running.
    mapping(uint256 => mapping(address => uint256)) public artworkOffers;

    mapping(uint256 => uint256) public artworkCountOffers;

    // Address for the auction
    address public _feeAddress;

    /* *********
     * Modifiers Zone
     * *********
     */
    modifier auctionExists(uint256 auctionId) {
        require(_exists(auctionId), "Auction doesn't exist");
        _;
    }

    /* *********
     * Functions Zone
     * *********
     */

    function setAdmin(address member) external onlyOwner {
        _setupRole(ADMIN_ROLE, member);
    }

    /**
     * @notice Create an auction.
     * @dev Store the auction details in the auctions mapping and emit an AuctionCreated event.
     * If there is no curator, or if the curator is the auction creator, automatically approve the auction.
     */
    function createSale(
        uint256 tokenId,
        address tokenContract,
        uint256 endTime,
        uint256 reservePrice,
        address auctionCurrency
    ) public nonReentrant returns (uint256) {
        uint256 auctionId = _createSale(
            tokenId,
            tokenContract,
            endTime,
            reservePrice,
            auctionCurrency
        );
        return auctionId;
    }

    /**
     * @notice Create a bid on a token, with a given amount.
     * @dev If provided a valid bid, transfers the provided amount to this contract.
     * If the auction is run in native ETH, the ETH is wrapped so it can be identically to other
     * auction currencies in this contract.
     */
    function createBid(uint256 auctionId, uint256 amount)
        external
        payable
        auctionExists(auctionId)
        nonReentrant
    {
        address lastBidder = auctions[auctionId].bidder;
        require(block.timestamp < auctions[auctionId].endTime, "Sale expired");
        require(
            amount == auctions[auctionId].reservePrice,
            "Sale need correct money"
        );
        _handleIncomingBid(amount, auctions[auctionId].auctionCurrency);
        auctions[auctionId].amount = amount;
        auctions[auctionId].bidder = msg.sender;
        _endSale(auctionId);
        emit SaleBid(
            auctionId,
            auctions[auctionId].tokenId,
            auctions[auctionId].tokenContract,
            msg.sender,
            amount,
            lastBidder == address(0)
        );
    }

    function cancelSale(uint256 auctionId)
        external
        nonReentrant
        auctionExists(auctionId)
    {
        require(
            auctions[auctionId].tokenOwner == msg.sender,
            "Can only be called by auction creator"
        );
        _cancelSale(auctionId);
    }

    function _createSale(
        uint256 tokenId,
        address tokenContract,
        uint256 endTime,
        uint256 reservePrice,
        address auctionCurrency
    ) internal returns (uint256) {
        require(
            IERC165(tokenContract).supportsInterface(interfaceId),
            "tokenContract does not support ERC721 interface"
        );
        require(reservePrice > 0, "ReservePrice need to be define!");
        require(endTime > 0, "Duration need to be define!");
        _auctionIdTracker.increment();
        address tokenOwner = IERC721(tokenContract).ownerOf(tokenId);
        require(
            msg.sender == IERC721(tokenContract).getApproved(tokenId) ||
                msg.sender == tokenOwner,
            "Caller must be approved or owner for token id"
        );
        uint256 auctionId = _auctionIdTracker.current();
        auctions[auctionId] = Sale({
            tokenId: tokenId,
            tokenContract: tokenContract,
            amount: 0,
            endTime: block.timestamp.add(endTime),
            reservePrice: reservePrice,
            tokenOwner: tokenOwner,
            bidder: address(0),
            auctionCurrency: auctionCurrency
        });

        IERC721(tokenContract).transferFrom(tokenOwner, address(this), tokenId);

        emit SaleCreated(
            auctionId,
            tokenId,
            tokenContract,
            endTime,
            reservePrice,
            tokenOwner,
            auctionCurrency
        );

        return auctionId;
    }

    /**
     * @notice End an auction, finalizing the bid on Zora if applicable and paying out the respective parties.
     * @dev If for some reason the auction cannot be finalized (invalid token recipient, for example),
     * The auction is reset and the NFT is transferred back to the auction creator.
     */
    function _endSale(uint256 auctionId) internal {
        Sale memory auctionInfo = auctions[auctionId];
        address currency = auctionInfo.auctionCurrency == address(0)
            ? wethAddress
            : auctionInfo.auctionCurrency;

        uint256 tokenProfit = auctionInfo.amount;
        try
            IERC721(auctionInfo.tokenContract).safeTransferFrom(
                address(this),
                auctionInfo.bidder,
                auctionInfo.tokenId
            )
        {} catch {
            _handleOutgoingBid(
                auctionInfo.bidder,
                auctionInfo.amount,
                auctionInfo.auctionCurrency
            );
            _cancelSale(auctionId);
            return;
        }
        _handleOutgoingBid(
            auctionInfo.tokenOwner,
            tokenProfit,
            auctionInfo.auctionCurrency
        );

        emit SaleEnded(
            auctionId,
            auctionInfo.tokenId,
            auctionInfo.tokenContract,
            auctionInfo.tokenOwner,
            auctionInfo.bidder,
            tokenProfit,
            currency
        );
        numberOfSale[auctionInfo.tokenId] += 1;
        delete auctions[auctionId];
    }

    function _cancelSale(uint256 auctionId) internal {
        address tokenOwner = auctions[auctionId].tokenOwner;
        IERC721(auctions[auctionId].tokenContract).safeTransferFrom(
            address(this),
            tokenOwner,
            auctions[auctionId].tokenId
        );
        emit SaleCanceled(
            auctionId,
            auctions[auctionId].tokenId,
            auctions[auctionId].tokenContract,
            tokenOwner
        );
        delete auctions[auctionId];
    }

    /**
     * @dev Given an amount and a currency, transfer the currency to this contract.
     * If the currency is ETH (0x0), attempt to wrap the amount as WETH
     */
    function _handleIncomingBid(uint256 amount, address currency) internal {
        // If this is an ETH bid, ensure they sent enough and convert it to WETH under the hood
        if (currency == address(0)) {
            require(
                msg.value == amount,
                "Sent ETH Value does not match specified bid amount"
            );
            IWETH(wethAddress).deposit{value: amount}();
        } else {
            // We must check the balance that was actually transferred to the auction,
            // as some tokens impose a transfer fee and would not actually transfer the
            // full amount to the market, resulting in potentally locked funds
            IERC20 token = IERC20(currency);
            uint256 beforeBalance = token.balanceOf(address(this));
            token.safeTransferFrom(msg.sender, address(this), amount);
            uint256 afterBalance = token.balanceOf(address(this));
            require(
                beforeBalance.add(amount) == afterBalance,
                "Token transfer call did not transfer expected amount"
            );
        }
    }

    function _handleOutgoingBid(
        address to,
        uint256 amount,
        address currency
    ) internal {
        // If the auction is in ETH, unwrap it from its underlying WETH and try to send it to the recipient.
        if (currency == address(0)) {
            IWETH(wethAddress).withdraw(amount);

            // If the ETH transfer fails (sigh), rewrap the ETH and try send it as WETH.
            if (!_safeTransferETH(to, amount)) {
                IWETH(wethAddress).deposit{value: amount}();
                IERC20(wethAddress).safeTransfer(to, amount);
            }
        } else {
            IERC20(currency).safeTransfer(to, amount);
        }
    }

    function _safeTransferETH(address to, uint256 value)
        internal
        returns (bool)
    {
        (bool success, ) = to.call{value: value}(new bytes(0));
        return success;
    }

    function _exists(uint256 auctionId) internal view returns (bool) {
        return auctions[auctionId].tokenOwner != address(0);
    }

    // TODO: consider reverting if the message sender is not WETH
    receive() external payable {}

    fallback() external payable {}
}
