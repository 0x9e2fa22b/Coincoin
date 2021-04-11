const CoinCoin = artifacts.require('CoinCoin');
const CoinCoinLending = artifacts.require('CoinCoinLending');
const truffleAssert = require('truffle-assertions');
const { assert } = require('chai');
const web3Utils = require('web3-utils');

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
      const balanefOfLendingContract = Number(await coincoinInstance.getBalance(coincoinLendingInstance.address));

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
        return ev._id.toNumber() === 0
          && ev._amount.toNumber() === _amount
          && ev._ltvRate.toNumber() === _ltvRate
          && ev._amountETH.toNumber() === (_amount / _ltvRate)
          && ev._creator === _lender;
      });

      // Check balance of _lender after create offer
      const balanceOfLenderAfterCreateOffer = Number(await coincoinInstance.getBalance(_lender));
      assert.equal(
        balanceOfLenderAfterCreateOffer,
        balanceOfLender - _amount,
        'Balance of lender decrease after create offer'
      );

      // Check balance of lending contract
      const balanefOfLendingContractAfter = Number(await coincoinInstance.getBalance(coincoinLendingInstance.address));
      assert.equal(
        balanefOfLendingContractAfter,
        balanefOfLendingContract + _amount,
        'Balance of lending contract increase after lender create offer'
      );
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
  });

  describe('function borrow()', () => {
    it('should borrow success', async () => {
      const _offerId = 0;
      const _borrower = accounts[1];

      const tx = await coincoinLendingInstance.borrow(_offerId, {
        from: _borrower,
        value: web3Utils.toWei('1', 'ether')
      });

      truffleAssert.eventEmitted(tx, 'OfferTaken', (ev) => {
        console.log(ev._amountETH.toString());
        console.log(new Date(Number(ev._loanExpDate.toString()) * 1000));
        return true;
      });

      const offer = await coincoinLendingInstance.

    });
  });
  
});