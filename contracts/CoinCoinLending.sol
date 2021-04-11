// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <=0.8.0;

import "./CoinCoinInterface.sol";

contract CoinCoinLending {
    struct Offer {
        uint256 amount;
        uint256 ltvRate;
        uint256 amountETH;
        uint256 duration;
        uint256 dailyInterestRate;
        address creator;
        bool isTaken;
        uint256 currentInterest;
        uint256 loanExpDate; // Ngày hết hạn vay
    }

    address public coincoinContractAddress;

    uint256 private offerId;

    mapping(uint256 => Offer) public offer;

    event OfferCreated(
        uint256 _id,
        uint256 _amount,
        uint256 _ltvRate,
        uint256 _amountETH,
        address _creator
    );
    event OfferTaken(
        uint256 _id,
        address _borrower,
        uint256 _amountETH,
        uint256 _loanExpDate
    );
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
        uint256 _amountETH = _amount / _ltvRate; // TODO: change

        CoinCoinInterface(coincoinContractAddress)
            .transferFromCoinCoinLendingContract(msg.sender, _amount);

        offer[_id] = Offer({
            amount: _amount,
            ltvRate: _ltvRate,
            amountETH: _amountETH,
            duration: _duration,
            dailyInterestRate: _dailyInterestRate,
            creator: msg.sender,
            isTaken: false,
            currentInterest: 0,
            loanExpDate: 0
        });

        emit OfferCreated(_id, _amount, _ltvRate, _amountETH, msg.sender);

        return _id;
    }

    function borrow(uint256 _id) public payable {
        Offer storage myOffer = offer[_id];
        require(myOffer.isTaken == false, "Offer was borrowed");
        require(msg.value >= myOffer.amountETH, "You do not have enough ETH"); //TODO: Nếu người dùng gửi nhiều ETH hơn yêu cầu thì trả lại tiền thừa

        myOffer.isTaken = true;
        myOffer.loanExpDate = block.timestamp + myOffer.duration;

        emit OfferTaken(_id, msg.sender, msg.value, myOffer.loanExpDate);
    }

    //TODO: Update
    function repay(uint256 _id) public {
        emit OfferRepaid(_id);
    }

    function getInterest(uint256 _id) public view returns (uint256) {
        return offer[_id].currentInterest;
    }
}
