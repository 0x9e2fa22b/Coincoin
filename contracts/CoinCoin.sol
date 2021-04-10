// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <=0.8.0;

contract CoinCoin {
    address public owner;
    address public coincoinLendingContract;

    mapping(address => uint256) balances;

    event Transfer(address _sender, address _receiver, uint256 _amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    modifier onlyCoinCoinLendingContract() {
        require(
            msg.sender == coincoinLendingContract,
            "Ownable: caller is not CoinCoinLedingContract"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setCoinCoinLendingContractAddress(address _address) public {
        coincoinLendingContract = _address;
    }

    function getBalance(address _address) public view returns (uint256) {
        return balances[_address];
    }

    function mint(address _address, uint256 _amount) public onlyOwner {
        balances[_address] += _amount;
    }

    function _send(
        address _sender,
        address _receiver,
        uint256 _amount
    ) private {
        require(balances[_sender] >= _amount, "You do not have enough money");
        balances[_sender] -= _amount;
        balances[_receiver] += _amount;
        emit Transfer(_sender, _receiver, _amount);
    }

    function transfer(address _receiver, uint256 _amount) public {
        _send(msg.sender, _receiver, _amount);
    }

    function transferFromCoinCoinLendingContract(
        address _sender,
        uint256 _amount
    ) public onlyCoinCoinLendingContract {
        _send(_sender, coincoinLendingContract, _amount);
    }
}
