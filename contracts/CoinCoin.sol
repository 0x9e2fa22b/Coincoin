// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <=0.8.0;

contract CoinCoin {
    address owner;
    mapping(address => uint256) balances;

    event Transfer(address _sender, address _receiver, uint256 _amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function getBalance(address _address) public view returns (uint256) {
        return balances[_address];
    }

    function mint(address _address, uint256 _amount) public onlyOwner {
        balances[_address] += _amount;
    }

    function transfer(address _receiver, uint256 _amount) public {
        require(
            balances[msg.sender] >= _amount,
            "You do not have enough money"
        );
        balances[msg.sender] -= _amount;
        balances[_receiver] += _amount;

        emit Transfer(msg.sender, _receiver, _amount);
    }
}
