// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <=0.8.0;

import "./CoinCoinInterface.sol";
import "./CoinCoin.sol";

contract CoinCoinLending {
    struct Offer {
        uint256 amount;
        uint256 ltvRate;
        uint256 amountETH;
        uint256 duration;
        uint256 dailyInterestRate; // 2: 0.2% per day
        address creator;
        bool isTaken;
        address borrower;
        uint256 loanDate; // Ngày vay
        uint256 loanExpDate; // Ngày hết hạn vay
    }

    CoinCoin public coincoin;

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
    event OfferRepaid(uint256 _id, uint256 _total);

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
            borrower: msg.sender, // TODO: change to inital value
            loanDate: 0,
            loanExpDate: 0
        });

        emit OfferCreated(_id, _amount, _ltvRate, _amountETH, msg.sender);

        return _id;
    }

    function borrow(uint256 _id) public payable {
        address _borrower = msg.sender;
        Offer storage myOffer = offer[_id];

        require(myOffer.isTaken == false, "Offer was borrowed");
        require(msg.value >= myOffer.amountETH, "You do not have enough ETH"); //TODO: Nếu người dùng gửi nhiều ETH hơn yêu cầu thì trả lại tiền thừa

        CoinCoinInterface(coincoinContractAddress).transferToAddress(
            _borrower,
            myOffer.amount
        );

        myOffer.isTaken = true;
        myOffer.loanDate = block.timestamp;
        myOffer.loanExpDate = block.timestamp + myOffer.duration;
        myOffer.borrower = _borrower;

        emit OfferTaken(_id, _borrower, msg.value, myOffer.loanExpDate);
    }

    function repay(uint256 _id) public {
        Offer storage myOffer = offer[_id];
        require(msg.sender == myOffer.borrower, "You are not borrower");

        uint256 totalAmount;
        if (block.timestamp - myOffer.loanDate >= myOffer.loanExpDate) {
            totalAmount = myOffer.amount + getInterest(_id);
        } else {
            totalAmount =
                myOffer.amount +
                getInterest(_id) +
                ((myOffer.amount * 5) / 100);
        }

        // Borrower tra coin cho contract
        CoinCoinInterface(coincoinContractAddress)
            .transferFromCoinCoinLendingContract(msg.sender, totalAmount);

        // Contract tra coin cho lender
        CoinCoinInterface(coincoinContractAddress).transferToAddress(
            myOffer.creator,
            totalAmount
        );

        // Transfer eth for borrower
        payable(msg.sender).transfer(myOffer.amountETH);

        emit OfferRepaid(_id, totalAmount);
    }

    function getInterest(uint256 _id) public view returns (uint256) {
        require(offer[_id].isTaken == true, "Offer chua co nguoi vay");
        uint256 dayToSeconds = 86400;
        uint256 numberOfLoanDate =
            (block.timestamp - offer[_id].loanDate) / dayToSeconds;

        return
            (offer[_id].amount *
                numberOfLoanDate *
                offer[_id].dailyInterestRate) / 1000;
    }

    function getOfferInfo(uint256 _id)
        public
        view
        returns (
            uint256,
            address,
            bool,
            uint256,
            uint256
        )
    {
        return (
            _id,
            offer[_id].borrower,
            offer[_id].isTaken,
            offer[_id].loanExpDate,
            offer[_id].amount
        );
    }
}
