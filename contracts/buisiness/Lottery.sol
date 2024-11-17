// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

// Library
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


contract KoriLottery is ReentrancyGuard, Ownable, AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;
    Counters.Counter private _wheelIdTracker;

    address private _admin;

    /*
     * Constructor
     */
    constructor(address admin, address _tokenContract) {
        _setupRole(ADMIN_ROLE, admin);
        _admin = admin;
        _communityFeePercentage = 10;
        tokenAddress = _tokenContract;
        price = 1000000000000000000;
    }

    struct Bet {
        uint8 choose;
        address userAddress;
    }
    event WheelCreated(uint256 indexed wheelId, address dealer);

    event WheelStopped(
        uint256 indexed wheelId,
        uint256 indexed timestamp,
        address indexed tokenContract,
        uint8 result,
        address winner,
        uint256 totalAmount
    );

    event WheelBetting(
        uint256 indexed wheelId,
        address indexed tokenContract,
        uint8 choose,
        address userBetting,
        uint256 amount
    );

    /* *******
     * Variable
     * *******
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");

    // A mapping of all of the auctions currently running.
    mapping(uint256 => Bet[]) public bettings;

    // Mapping from winner address of wheel
    mapping(uint256 => address[]) public winnerAddress;

    // Mapping from bet address of wheel
    mapping(uint256 => address[]) public bettingAddress;

    // Mapping from result of wheel
    mapping(uint256 => uint8) public resultWheel;

    // Mapping from token to boolean
    mapping(uint256 => bool) public wheelActive;

    // The sale percentage to send to the galery
    uint8 private _communityFeePercentage;

    // The address of the token contract
    address public tokenAddress;

    // Price to play
    uint256 public price;

    /* *********
     * Modifier
     * *********
     */
    modifier wheelExists() {
        require(
            wheelActive[_wheelIdTracker.current()] == true,
            "Tiki Game: Wheel doesn't active"
        );
        _;
    }

    modifier checkBettingExists(address addressBetting) {
        bool isExists = false;
        for (
            uint256 i;
            i < bettingAddress[_wheelIdTracker.current()].length;
            i++
        ) {
            if (
                bettingAddress[_wheelIdTracker.current()][i] == addressBetting
            ) {
                isExists = true;
                break;
            }
        }
        require(!isExists, "Tiki Game: User was bet");
        _;
    }

    modifier onlyAdmin() {
        require(
            hasRole(ADMIN_ROLE, _msgSender()),
            "Tiki Game: must have admin role to action"
        );
        _;
    }

    modifier checkCorrectPrice() {
        IERC20 token = IERC20(tokenAddress);
        require(
            token.balanceOf(msg.sender) >= price,
            "Tiki Game: insufficient token balance"
        );
        _;
    }

    /* *********
     * Role access
     * *********
     */
    function setAdmin(address newAdmin) external onlyAdmin {
        address oldAdmin = _admin;
        _setupRole(ADMIN_ROLE, newAdmin);
        renounceRole(ADMIN_ROLE, oldAdmin);
        _admin = newAdmin;
    }

    function setCommunityFeePercentage(uint8 percentage) external onlyAdmin {
        require(percentage < 100, "Tiki Game: Percentage not smaller than 100");
        _communityFeePercentage = percentage;
    }

    function communityFeePercentage() public view returns (uint8) {
        return _communityFeePercentage;
    }

    /* *********
     * Betting
     * *********
     */

    /**
     * @notice Create an wheel.
     */
    function createWheel() public nonReentrant onlyAdmin returns (uint256) {
        require(
            wheelActive[_wheelIdTracker.current()] == false,
            "Tiki Game: Current wheel is active"
        );
        _wheelIdTracker.increment();
        wheelActive[_wheelIdTracker.current()] = true;
        emit WheelCreated(_wheelIdTracker.current(), _admin);
        return _wheelIdTracker.current();
    }

    /**
     * @notice Get an wheel.
     */
    function currentWheel() public view returns (uint256) {
        return _wheelIdTracker.current();
    }

    /**
     * @notice Create a betting on a token, with a given amount.
     */
    function betWheel(uint8 choose)
        external
        wheelExists
        checkBettingExists(_msgSender())
        nonReentrant
    {
        require(
            choose >= 0 && choose < 100,
            "Tiki Game: Number bigger than 0 and smaller than 100"
        );
        require(
            bettingAddress[_wheelIdTracker.current()].length <= 100,
            "Tiki Game: Just 100 member join"
        );
        require(_msgSender() != _admin, "Tiki Game: Admin cannot play game");
        IERC20(tokenAddress).safeTransferFrom(
            _msgSender(),
            address(this),
            price
        );
        bettings[_wheelIdTracker.current()].push(
            Bet({choose: choose, userAddress: _msgSender()})
        );
        bettingAddress[_wheelIdTracker.current()].push(_msgSender());
        emit WheelBetting(
            _wheelIdTracker.current(),
            tokenAddress,
            choose,
            _msgSender(),
            price
        );
    }

    function list() external view returns (Bet[] memory) {
        uint256 betId = _wheelIdTracker.current();
        address[] memory listAddress = bettingAddress[betId];
        Bet[] memory bets = new Bet[](listAddress.length);
        for (uint256 i = 0; i < listAddress.length; i++) {
            bets[i] = bettings[betId][i];
        }
        return bets;
    }

    /**
     * @notice Stop wheel.
     */
    function stopWheel() external wheelExists onlyAdmin returns (uint8) {
        string memory currentTimestamp = Strings.toString(block.timestamp);
        uint8 resultSpin = stringToUint(substring(currentTimestamp, 8, 10));
        uint256 wheelId = _wheelIdTracker.current();
        address[] memory listAddress = bettingAddress[wheelId];
        uint256 totalReward = IERC20(tokenAddress).balanceOf(address(this));
        for (uint256 i = 0; i < listAddress.length; i++) {
            uint8 choose = bettings[wheelId][i].choose;
            if (choose == resultSpin) {
                winnerAddress[wheelId].push(bettings[wheelId][i].userAddress);
            }
        }
        if (winnerAddress[wheelId].length == 0) {
            IERC20(tokenAddress).safeTransfer(_admin, totalReward);
        } else {
            uint256 communityFee = totalReward.mul(_communityFeePercentage).div(
                100
            );
            IERC20(tokenAddress).safeTransfer(_admin, communityFee);
            uint256 totalRewardAfterFee = totalReward.sub(communityFee);
            uint256 totalRewardLast = totalRewardAfterFee.div(
                winnerAddress[wheelId].length
            );
            for (uint256 i = 0; i < winnerAddress[wheelId].length; i++) {
                address winner = winnerAddress[wheelId][i];
                IERC20(tokenAddress).safeTransfer(winner, totalRewardLast);
            }
        }
        wheelActive[wheelId] = false;
        resultWheel[wheelId] = resultSpin;
        return resultSpin;
    }

    function substring(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    ) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    function stringToUint(string memory s)
        internal
        pure
        returns (uint8 result)
    {
        bytes memory b = bytes(s);
        uint8 i;
        result = 0;
        for (i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
    }

    // TODO: consider reverting
    receive() external payable {}

    fallback() external payable {}
}
