// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <=0.8.0;

import "./CoinCoinInterface.sol";

contract CoinCoinLending {
    struct Offer {
        uint256 amount;
        uint256 ltvRate;
        uint256 duration;
        uint256 dailyInterestRate;
        address creator;
        bool isTaken;
        uint256 currentInterest;
    }

    address public coincoinContractAddress;

    uint256 private offerId;

    mapping(uint256 => Offer) public offer;

    event OfferCreated(uint256 _id);
    event OfferTaken(uint256 _id, address _borrower);
    event OfferRepaid(uint256 _id);

    constructor(address _coincoinContractAddress) {
        coincoinContractAddress = _coincoinContractAddress;
    }

    function createOffer(
        uint256 _amount,
        uint256 _ltvRate,
        uint256 _duration,
        uint256 _dailyInterestRate
    ) public returns (uint256) {
        uint256 _id = offerId++;

        CoinCoinInterface(coincoinContractAddress)
            .transferFromCoinCoinLendingContract(msg.sender, _amount);

        offer[_id] = Offer({
            amount: _amount,
            ltvRate: _ltvRate,
            duration: _duration,
            dailyInterestRate: _dailyInterestRate,
            creator: msg.sender,
            isTaken: false,
            currentInterest: 0
        });

        emit OfferCreated(_id);

        return _id;
    }

    function borrow(uint256 _id) public payable {
        emit OfferTaken(_id, msg.sender);
    }

    function getInterest(uint256 _id) public view returns (uint256) {
        return offer[_id].currentInterest;
    }
}
