//SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import {IReferenceModule} from "@aave/lens-protocol/contracts/interfaces/IReferenceModule.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract TimedPromoteModule is IReferenceModule {
    struct Reward {
        address token;
        uint256 amount;
        uint256 endTimestamp;
        bool collected;
    }

    address public immutable hub;
    mapping(uint256 => mapping(uint256 => Reward)) public rewards;

    event Promoted(
        uint256 indexed pubId,
        uint256 indexed profileId,
        uint256 indexed collectorProfileId,
        address token,
        uint256 amount,
        uint64 endTimestamp
    );

    event RewardCollected(uint256 indexed pubId, uint256 indexed collectorProfileId, uint256 indexed profileId, address token, uint256 amount);

    constructor(address _hub) {
        hub = _hub;
    }

    function initializeReferenceModule(
        uint256 _profileId,
        uint256 _pubId,
        bytes calldata _data
    ) external override returns (bytes memory) {
        // TODO: handles multiple redeemers with different amounts ecc ecc ...
        (address token, uint256 amount, uint256 collectorProfileId, uint64 endTimestamp) = abi.decode(_data, (address, uint256, uint256, uint64));
        IERC20(token).transferFrom(IERC721(hub).ownerOf(_profileId), address(this), amount);

        rewards[collectorProfileId][_pubId] = Reward(token, amount, endTimestamp, false);
        emit Promoted(_pubId, _profileId, collectorProfileId, token, amount, endTimestamp);
        return new bytes(0);
    }

    function processComment(
        uint256, /*_profileId*/
        uint256, /*_profileIdPointed*/
        uint256, /*_pubIdPointed*/
        bytes calldata /*_data*/
    ) external override {}

    function processMirror(
        uint256 _profileId,
        uint256 _profileIdPointed,
        uint256 _pubIdPointed,
        bytes calldata /*_data*/
    ) external override {
        Reward storage reward = rewards[_profileId][_pubIdPointed];
        if (block.timestamp <= reward.endTimestamp && reward.collected == false) {
            reward.collected = true;
            address token = reward.token;
            uint256 amount = reward.amount;
            IERC20(token).transfer(IERC721(hub).ownerOf(_profileId), amount);
            emit RewardCollected(_pubIdPointed, _profileId, _profileIdPointed, token, amount);
        }
    }
}
