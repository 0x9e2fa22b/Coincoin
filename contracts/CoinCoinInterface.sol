// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <=0.8.0;

interface CoinCoinInterface {
    function transferFromCoinCoinLendingContract(
        address _sender,
        uint256 _amount
    ) external;

    function transferToAddress(address _borrower, uint256 _amount) external;
}
