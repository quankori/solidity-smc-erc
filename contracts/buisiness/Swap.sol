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
import "../pancake/interfaces/IPancakeRouter.sol";
import "hardhat/console.sol";

contract KoriSwap is ReentrancyGuard, Ownable, AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;
    Counters.Counter private _wheelIdTracker;

    /*
     * Constructor
     */
    constructor(
        address admin,
        address feeAddress,
        address swapAddress
    ) {
        _setupRole(ADMIN_ROLE, admin);
        _admin = admin;
        _communityFeePercentage = 10;
        _feeAddress = feeAddress;
        _swapAddress = swapAddress;
    }

    address private _admin;
    // Address for the auction
    address public _feeAddress;
    // Address for the pancake
    address public _swapAddress;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");

    // The sale percentage to send to the galery
    uint8 public _communityFeePercentage;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "PancakeRouter: EXPIRED");
        _;
    }

    modifier onlyAdmin() {
        require(
            hasRole(ADMIN_ROLE, _msgSender()),
            "Swap: must have admin role to action"
        );
        _;
    }

    function setCommunityFeePercentage(uint8 percentage) external onlyAdmin {
        require(percentage < 100, "Swap: Percentage not smaller than 100");
        _communityFeePercentage = percentage;
    }

    function setSwapAddress(address swapAddress) external onlyAdmin {
        _swapAddress = swapAddress;
    }

    function swap(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual ensure(deadline) {
        (bool success, ) = _swapAddress.delegatecall(
            abi.encodeWithSignature(
                "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                amountIn,
                amountOutMin,
                path,
                to,
                deadline
            )
        );
        require(success == true, "delegatecall failed");
    }

    // TODO: consider reverting
    receive() external payable {}

    fallback() external payable {}
}
