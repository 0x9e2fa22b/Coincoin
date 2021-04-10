const CoinCoin = artifacts.require('CoinCoin');
const CoinCoinLending = artifacts.require('CoinCoinLending');
const truffleAssert = require('truffle-assertions');
const { assert } = require('chai');

let coincoinLendingInstance;
let coincoinInstance;
let ownerAddress;

contract('CoinCoinLending', (accounts) => {
  before(() => {
    ownerAddress = accounts[0];
  });

  describe('Deploy', () => {
    it('should deploy success to Ganache network', async () => {
      // Step 1: Deploy CoinCoin
      coincoinInstance = await CoinCoin.deployed();
      assert.isObject(coincoinInstance);

      // Step 2: Deploy ConCoinLending with CoinCoin address
      coincoinLendingInstance = await CoinCoinLending.new(coincoinInstance.address);
      assert.isObject(coincoinLendingInstance);

      // Step 3: Set CoinCoinLending address for CoinCoin
      await coincoinInstance.setCoinCoinLendingContractAddress(coincoinLendingInstance.address);
      const currentCoincoinLendingContractAddress = await coincoinInstance.coincoinLendingContract.call();
      assert.equal(currentCoincoinLendingContractAddress, coincoinLendingInstance.address);
    });
  });

  describe('function createOffer()', () => {
    it('should create offer success', async () => {
      const _lender = accounts[0];
      const _amount = 1000;
      const _ltvRate = 1000; // Loan to rate: Coin <-> ETH
      const _duration = 86400; // 1 day
      const _dailyInterestRate = 2; // 0.2% per day

      // Step 1: Mint for _lender (mint >= _amount)
      await coincoinInstance.mint(_lender, _amount, {
        from: ownerAddress
      });
      const balanceOfLender = Number(await coincoinInstance.getBalance(_lender));

      // Step 2: Create offer
      const tx = await coincoinLendingInstance.createOffer(
        _amount,
        _ltvRate,
        _duration,
        _dailyInterestRate,
        {
          from: _lender
        }
      );

      // Check event
      truffleAssert.eventEmitted(tx, 'OfferCreated', (ev) => {
        return ev._id.toNumber() === 0;
      });

      // Check balance of _lender after create offer
      const balanceOfLenderAfterCreateOffer = Number(await coincoinInstance.getBalance(_lender));
      assert.equal(balanceOfLenderAfterCreateOffer, balanceOfLender - _amount);
    });

    it('should error if lender does not have enough money', async () => {
      const _lender = accounts[1];
      const _amount = 100000;
      const _ltvRate = 1;
      const _duration = 1;
      const _dailyInterestRate = 1;

      return truffleAssert.reverts(
        coincoinLendingInstance.createOffer(
          _amount,
          _ltvRate,
          _duration,
          _dailyInterestRate,
          {
            from: _lender
          }
        ),
        'You do not have enough money'
      );
    });

    
  })
});