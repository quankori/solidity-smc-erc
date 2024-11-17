// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

// Library
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract KoriNFT is
    Context,
    ERC721Burnable,
    AccessControlEnumerable,
    ERC721Enumerable,
    ERC721URIStorage,
    Ownable
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address private _admin;
    string private _baseTokenURI;
    uint256 private _priceOne;
    uint256 private _max;

    constructor(
        string memory _name,
        string memory _symbol,
        address admin,
        uint256 priceOneFirst,
        uint256 max
    ) ERC721(_name, _symbol) {
        _admin = admin;
        _setupRole(ADMIN_ROLE, admin);
        _max = max;
        _priceOne = priceOneFirst;
    }

    event UserMinted(address user, uint256 tokenId);

    /* *******
     * Globals Zone
     * *******
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");

    /* *********
     * Modifiers Zone
     * *********
     */

    /* *********
     * Functions Zone
     * *********
     */

    function setAdmin(address member) external onlyOwner {
        _setupRole(ADMIN_ROLE, member);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function maxItem() public view returns (uint256) {
        return _max;
    }

    function setBaseURI(string memory baseURI) external {
        require(
            hasRole(ADMIN_ROLE, _msgSender()),
            "Kori: must have admin role to change base URI"
        );
        _baseTokenURI = baseURI;
    }

    function setPriceOne(uint256 mintPrice) external {
        require(
            hasRole(ADMIN_ROLE, _msgSender()),
            "Kori: must have admin role to change price"
        );
        _priceOne = mintPrice;
    }

    function priceOne() public view returns (uint256) {
        return _priceOne;
    }

    function mintOne(string calldata uri_) public payable {
        require(msg.value == _priceOne, "Kori: must send correct price");
        require(_tokenIds.current() < _max, "Kori: all token have been minted");
        _tokenIds.increment();
        _mint(msg.sender, _tokenIds.current());
        _setTokenURI(_tokenIds.current(), uri_);
        emit UserMinted(msg.sender, _tokenIds.current());
        payable(_admin).transfer(msg.value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return ERC721URIStorage.tokenURI(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        virtual
        override(ERC721, ERC721URIStorage)
    {
        return ERC721URIStorage._burn(tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerable, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
