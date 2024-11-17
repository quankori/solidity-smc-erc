// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * Users can purchase tokens after sale started and claim after sale ended
 */

contract KoriIDO is AccessControl, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");
    // user address => whitelisted status
    mapping(address => bool) public whitelist;
    // user address => purchased token amount
    mapping(address => uint256) public purchasedAmounts;
    // user address => ido token amount
    mapping(address => uint256) public idoAmounts;
    // user address => claimed token amount
    mapping(address => uint256) public claimedAmounts;
    // Once-whitelisted user address array, even removed users still remain
    address[] private _whitelistedUsers;
    // IDO token price
    uint256 public idoPrice;
    // IDO token address
    IERC20 public ido;
    // The cap amount each user can purchase IDO up to
    uint256 public purchaseCapMax;
    // The cap limit amount each user can purchase IDO up to
    uint256 public purchaseCapLimit;
    // The total purchased amount
    uint256 public totalPurchasedAmount;
    // Status claim
    bool public claimStatus;
    // Admin address
    address private _admin;
    // Sweep address
    address private _sweep;
    // Percentage claim
    uint8 public percentageClaim;
    // The cap limit amount each user can purchase IDO up to
    uint256 public maxPurchasedToken;

    // Time zone
    uint256 public startTime;
    uint256 public endTime;
    uint256 public claimTime;

    constructor(
        IERC20 _ido,
        address admin,
        uint256 _idoPrice,
        uint256 _purchaseCapMax,
        uint256 _purchaseCapLimit,
        uint256 _maxPurchasedToken,
        address _sweepAddress
    ) {
        require(
            address(_ido) != address(0),
            "Kori IDO: IDO address invalid"
        );
        require(_idoPrice > 0, "Kori IDO: Token price invalid");
        require(_purchaseCapMax > 0, "Kori IDO: Purchase cap max invalid");
        require(
            _purchaseCapLimit > 0,
            "Kori IDO: Purchase cap limit invalid"
        );

        _setupRole(ADMIN_ROLE, admin);
        _admin = admin;

        ido = _ido;
        idoPrice = _idoPrice;
        purchaseCapMax = _purchaseCapMax;
        purchaseCapLimit = _purchaseCapLimit;
        percentageClaim = 100;
        claimStatus = false;
        maxPurchasedToken = _maxPurchasedToken;
        _sweep = _sweepAddress;
    }

    // Used for returning purchase history
    struct Purchase {
        address account;
        uint256 amount;
    }

    struct Phase {
        string title;
        uint256 startTime;
        uint256 endTime;
    }

    event IdoPriceChanged(uint256 idoPrice);

    event PurchaseCapChanged(uint256 purchaseCap);

    event WhitelistAdded(address indexed account);

    event WhitelistRemoved(address indexed account);

    event Deposited(address indexed sender, uint256 amount);

    event Claimed(address indexed sender, uint256 amount);

    event Purchased(address indexed sender, uint256 amount);

    event Swept(address indexed sender, uint256 amount);

    function setIDOToken(address _ido) external onlyAdmin {
        ido = IERC20(_ido);
    }

    function setSweepWallet(address userWallet) external onlyAdmin {
        _sweep = userWallet;
    }

    function setMaxPurchasedToken(uint256 _maxPrice) external onlyAdmin {
        maxPurchasedToken = _maxPrice;
    }

    function setClaimStatus(bool status) external onlyAdmin {
        claimStatus = status;
    }

    function setStartTime(uint256 time) external onlyAdmin {
        startTime = time;
    }

    function setEndTime(uint256 time) external onlyAdmin {
        endTime = time;
    }

    function setClaimTime(uint256 time) external onlyAdmin {
        claimTime = time;
    }

    function changeAdmin(address account) external virtual onlyAdmin {
        grantRole(ADMIN_ROLE, account);
        revokeRole(ADMIN_ROLE, _msgSender());
        _admin = account;
    }

    /**
     * @dev Set ido token price in
     */
    function setIdoPrice(uint256 _idoPrice) external onlyAdmin {
        idoPrice = _idoPrice;

        emit IdoPriceChanged(_idoPrice);
    }

    /**
     * @dev Set purchase cap for each user
     */
    function setPurchaseCap(uint256 _purchaseCap) external onlyAdmin {
        purchaseCapMax = _purchaseCap;

        emit PurchaseCapChanged(_purchaseCap);
    }

    /**
     * @dev Set purchase cap for each user
     */
    function setPurchaseCapLimit(uint256 _purchaseCap) external onlyAdmin {
        purchaseCapLimit = _purchaseCap;
    }

    /**
     * @dev Set purchase cap for each user
     */
    function setPercentageClaim(uint8 percentage) external onlyAdmin {
        uint8 totalPercentageClaim = percentageClaim + percentage;
        require(totalPercentageClaim <= 100, "Value invalid");
        percentageClaim = totalPercentageClaim;
    }

    /**
     * @dev Restricted to members of the operator role.
     */
    modifier onlyAdmin() {
        require(
            hasRole(ADMIN_ROLE, _msgSender()),
            "Kori IDO: must have admin role to action"
        );
        _;
    }

    modifier onlyClaim() {
        require(
            claimTime <= block.timestamp && claimStatus == true,
            "Kori IDO: must excute is claim active"
        );
        _;
    }

    modifier onlyDeposit() {
        require(
            startTime != 0 && endTime != 0,
            "Kori IDO: must excute is deposit active"
        );
        _;
    }

    /**
     * @dev Return whitelisted users
     * The result array can include zero address
     */
    function whitelistedUsers() external view returns (address[] memory) {
        address[] memory __whitelistedUsers = new address[](
            _whitelistedUsers.length
        );
        for (uint256 i = 0; i < _whitelistedUsers.length; i++) {
            if (!whitelist[_whitelistedUsers[i]]) {
                continue;
            }
            __whitelistedUsers[i] = _whitelistedUsers[i];
        }

        return __whitelistedUsers;
    }

    /**
     * @dev Add wallet to whitelist
     * If wallet is added, removed and added to whitelist, the account is repeated
     */
    function addWhitelist(address[] memory accounts) external onlyAdmin {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Kori IDO: Zero address");
            if (!whitelist[accounts[i]]) {
                whitelist[accounts[i]] = true;
                _whitelistedUsers.push(accounts[i]);

                emit WhitelistAdded(accounts[i]);
            }
        }
    }

    /**
     * @dev Remove wallet from whitelist
     * Removed wallets still remain in `_whitelistedUsers` array
     */
    function removeWhitelist(address[] memory accounts) external onlyAdmin {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Kori IDO: Zero address");
            if (whitelist[accounts[i]]) {
                whitelist[accounts[i]] = false;

                emit WhitelistRemoved(accounts[i]);
            }
        }
    }

    /**
     * @dev Return purchase history (wallet address, amount)
     * The result array can include zero amount item
     */
    function purchaseHistory() external view returns (Purchase[] memory) {
        Purchase[] memory purchases = new Purchase[](_whitelistedUsers.length);
        for (uint256 i = 0; i < _whitelistedUsers.length; i++) {
            purchases[i].account = _whitelistedUsers[i];
            purchases[i].amount = purchasedAmounts[_whitelistedUsers[i]];
        }

        return purchases;
    }

    /**
     * @dev Return list phase
     * The result array can include zero amount item
     */
    function listPhase() external view returns (Phase memory) {
        Phase memory phase;
        phase.title = "Whitelist";
        phase.startTime = startTime;
        phase.endTime = endTime;
        return phase;
    }

    /**
     * @dev Purchase IDO token
     * Only whitelisted users can purchase within `purchcaseCap` amount
     */
    function purchase() external payable nonReentrant onlyDeposit {
        require(whitelist[_msgSender()], "Kori IDO: Caller not whitelist");
        require(
            purchasedAmounts[_msgSender()] + msg.value <= purchaseCapMax,
            "Kori IDO: Amount must not bigger than purchase cap"
        );
        require(msg.value > 0, "Kori IDO: Purchase invalid");

        // Validate day
        if (block.timestamp < endTime) {
            require(
                startTime <= block.timestamp,
                "Kori IDO: Sale not started"
            );
        }
        require(endTime > block.timestamp, "Kori IDO: Sale is ended");
        require(
            msg.value >= purchaseCapLimit,
            "Kori IDO: Purchase not smaller than cap"
        );
        require(
            totalPurchasedAmount.add(msg.value) <= maxPurchasedToken,
            "Kori IDO: Amount invalid"
        );
        payable(_sweep).transfer(msg.value);
        // Convert to power token
        uint256 idoTokenAmount = ((msg.value * 10**18).div(idoPrice));
        purchasedAmounts[_msgSender()] += msg.value;
        idoAmounts[_msgSender()] += idoTokenAmount;
        totalPurchasedAmount += msg.value;

        emit Purchased(_msgSender(), msg.value);
    }

    /**
     * @dev Users claim purchased tokens after token sale ended
     */
    function claim() external nonReentrant onlyClaim {
        uint256 amountClaim = 0;
        uint256 idoAmountsUser = idoAmounts[_msgSender()];
        amountClaim = (percentageClaim * idoAmountsUser).div(100);
        amountClaim = amountClaim - claimedAmounts[_msgSender()];
        require(amountClaim > 0, "Kori IDO: Amount claim invalid");
        claimedAmounts[_msgSender()] += amountClaim;
        ido.safeTransfer(_msgSender(), amountClaim);

        emit Claimed(_msgSender(), amountClaim);
    }

    /**
     * @dev `Operator` sweeps `ido` from the sale contract to `to` address
     */
    function sweep() external onlyAdmin {
        uint256 bal = ido.balanceOf(address(this));
        ido.safeTransfer(_sweep, bal);

        emit Swept(_sweep, bal);
    }
}
