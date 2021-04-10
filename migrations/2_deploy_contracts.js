const CoinCoin = artifacts.require('CoinCoin');

module.exports = function(deployer) {
  deployer.deploy(CoinCoin);
};
