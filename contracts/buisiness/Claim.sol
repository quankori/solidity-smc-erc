// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * Users can purchase tokens after sale started and claim after sale ended
 */

contract KoriClaim is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // user address => claimed token amount
    mapping(address => bool) public claimedAmounts;
    // IDO token price
    uint256 public claimPrice;
    // IDO token address
    IERC20 public token;

    constructor(IERC20 _token, uint256 _price) {
        require(address(_token) != address(0), "Tiki Game: Address invalid");
        claimPrice = _price;
        token = _token;
    }

    /**
     * @dev Users claim purchased tokens after token sale ended
     */
    function claim() external nonReentrant {
        require(!claimedAmounts[_msgSender()], "Tiki Game: User is claimed");
        claimedAmounts[_msgSender()] = true;
        token.safeTransfer(_msgSender(), claimPrice);
    }
}
