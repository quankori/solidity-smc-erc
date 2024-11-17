// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.1;

interface IERC725 {
    event KeyAdded(
        bytes32 indexed key,
        uint256 indexed purpose,
        uint256 indexed keyType
    );
    event KeyRemoved(
        bytes32 indexed key,
        uint256 indexed purpose,
        uint256 indexed keyType
    );
    event ExecutionRequested(
        uint256 indexed executionId,
        address indexed to,
        uint256 indexed value,
        bytes data
    );
    event Executed(
        uint256 indexed executionId,
        address indexed to,
        uint256 indexed value,
        bytes data
    );
    event Approved(uint256 indexed executionId, bool approved);

    struct Key {
        uint256 purpose; //e.g., MANAGEMENT_KEY = 1, ACTION_KEY = 2, etc.
        uint256 keyType; // e.g. 1 = ECDSA, 2 = RSA, etc.
        bytes32 key;
    }

    function getKey(bytes32 _key)
        external
        returns (
            uint256 purpose,
            uint256 keyType,
            bytes32 key
        );

    function getKeyPurpose(bytes32 _key) external returns (uint256 purpose);

    function getKeysByPurpose(uint256 _purpose)
        external
        returns (bytes32[] memory keys);

    function addKey(
        address _key,
        uint256 _purpose,
        uint256 _keyType
    ) external returns (bool success);

    function execute(
        address _to,
        uint256 _value,
        bytes memory _data
    ) external payable returns (uint256 executionId);

    function approve(uint256 _id, bool _approve)
        external
        returns (bool success);
}
