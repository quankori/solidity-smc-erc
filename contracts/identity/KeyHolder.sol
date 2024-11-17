// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "../interfaces/IERC725.sol";

contract KeyHolder is IERC725 {
    uint256 executionNonce;
    uint256 constant MANAGEMENT_KEY = 1;
    uint256 constant ACTION_KEY = 2;
    uint256 constant CLAIM_SIGNER_KEY = 3;
    uint256 constant ENCRYPTION_KEY = 4;
    uint256 constant ECDSA = 1; // Elliptic Curve Digital Signature Algorithm

    struct Execution {
        address to;
        uint256 value;
        bytes data;
        bool approved;
        bool executed;
    }

    mapping(bytes32 => Key) keys;
    mapping(uint256 => bytes32[]) keysByPurpose;
    mapping(uint256 => Execution) executions;

    event ExecutionFailed(
        uint256 indexed executionId,
        address indexed to,
        uint256 indexed value,
        bytes data
    );

    constructor() {
        bytes32 _key = keccak256(abi.encodePacked(msg.sender));
        keys[_key].key = _key;
        keys[_key].purpose = MANAGEMENT_KEY;
        keys[_key].keyType = ECDSA;
        keysByPurpose[MANAGEMENT_KEY].push(_key);
        emit KeyAdded(_key, keys[_key].purpose, MANAGEMENT_KEY);
    }

    function getKey(bytes32 _key)
        public
        view
        override
        returns (
            uint256 purpose,
            uint256 keyType,
            bytes32 key
        )
    {
        return (keys[_key].purpose, keys[_key].keyType, keys[_key].key);
    }

    function getKeyPurpose(bytes32 _key)
        public
        view
        override
        returns (uint256 purpose)
    {
        return (keys[_key].purpose);
    }

    function getKeysByPurpose(uint256 _purpose)
        public
        view
        override
        returns (bytes32[] memory _keys)
    {
        return keysByPurpose[_purpose];
    }

    function addKey(
        address _address,
        uint256 _purpose,
        uint256 _type
    ) public override returns (bool success) {
        bytes32 _key = keccak256(abi.encodePacked(_address));
        require(keys[_key].key != _key, "Key already exists");
        if (msg.sender != address(this)) {
            require(
                keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), 1),
                "Sender does not have management key"
            );
        }

        keys[_key].key = _key;
        keys[_key].purpose = _purpose;
        keys[_key].keyType = _type;

        keysByPurpose[_purpose].push(_key);

        emit KeyAdded(_key, _purpose, _type);

        return true;
    }

    function approve(uint256 _id, bool _approve)
        public
        override
        returns (bool success)
    {
        require(
            keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), 2),
            "Sender does not have action key"
        );

        emit Approved(_id, _approve);

        if (_approve == true) {
            executions[_id].approved = true;
            (bool status, bytes memory ret) = executions[_id].to.call{
                value: executions[_id].value
            }(executions[_id].data);
            success = status;
            if (success) {
                executions[_id].executed = true;
                emit Executed(
                    _id,
                    executions[_id].to,
                    executions[_id].value,
                    executions[_id].data
                );
                return success;
            } else {
                emit ExecutionFailed(
                    _id,
                    executions[_id].to,
                    executions[_id].value,
                    executions[_id].data
                );
                return success;
            }
        } else {
            executions[_id].approved = false;
        }
        return true;
    }

    function execute(
        address _to,
        uint256 _value,
        bytes memory _data
    ) external payable override returns (uint256 executionId) {
        require(!executions[executionNonce].executed, "Already executed");
        executions[executionNonce].to = _to;
        executions[executionNonce].value = _value;
        executions[executionNonce].data = _data;

        emit ExecutionRequested(executionNonce, _to, _value, _data);

        if (
            keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), 1) ||
            keyHasPurpose(keccak256(abi.encodePacked(msg.sender)), 2)
        ) {
            approve(executionNonce, true);
        }

        executionNonce++;
        return executionNonce - 1;
    }

    function removeKey(bytes32 _key) public returns (bool success) {
        require(keys[_key].key == _key, "No such key");
        emit KeyRemoved(keys[_key].key, keys[_key].purpose, keys[_key].keyType);
        delete keys[_key];
        return true;
    }

    function keyHasPurpose(bytes32 _key, uint256 _purpose)
        public
        view
        returns (bool result)
    {
        bool isThere;
        if (keys[_key].key == 0) return false;
        isThere = keys[_key].purpose <= _purpose;
        return isThere;
    }
}
