const CoinCoin = artifacts.require('CoinCoin');
const CoinCoinLending = artifacts.require('CoinCoinLending');
const truffleAssert = require('truffle-assertions');
const { assert } = require('chai');
const Web3 = require('web3');
const web3Utils = require('web3-utils');

const web3 = new Web3('http://127.0.0.1:8545');

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
      const _duration = 1296000; // 15 days
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
    it('should error if borrower does not have enough ETH', async () => {
      const _offerId = 0;
      const _borrower = accounts[1];
      const _amountETH = 0;

      return truffleAssert.reverts(
        coincoinLendingInstance.borrow(
          _offerId,
          {
            from: _borrower,
            value: web3Utils.toWei(`${_amountETH}`, 'ether')
          }
        ),
        'You do not have enough ETH'
      );
    });

    it('should borrow success', async () => {
      const _offerId = 0;
      const _borrower = accounts[1];
      const _amountETH = 1;

      // Check lending contract receive eth
      const balanceEthOfContract = Number(await web3.eth.getBalance(coincoinLendingInstance.address));
      const balanceOfBorrower = Number(await coincoinInstance.getBalance(_borrower));

      const tx = await coincoinLendingInstance.borrow(_offerId, {
        from: _borrower,
        value: web3Utils.toWei(`${_amountETH}`, 'ether')
      });

      // Check offer after borrower borrow
      const offer = await coincoinLendingInstance.getOfferInfo(_offerId);
      const offerId = offer['0'];
      const borrower = offer['1'];
      const isTaken = offer['2'];
      const loanExpDate = offer['3'];
      const amountOfBorrow = Number(offer['4']);

      assert.equal(offerId, _offerId);
      assert.equal(borrower, _borrower);
      assert.equal(isTaken, true);
      assert.isNotNull(new Date(Number(loanExpDate.toString()) * 1000));

      // Check lending contract receive eth
      const balanceEthOfContractAfter = await web3.eth.getBalance(coincoinLendingInstance.address);
      assert.equal(
        balanceEthOfContractAfter,
        balanceEthOfContract + Number(web3Utils.toWei(`${_amountETH}`, 'ether')),
        'Lending contract increase ETH'
      );

      // Check borrower receive coin
      const balanceOfBorrowerAfter = Number(await coincoinInstance.getBalance(_borrower));
      assert.equal(
        balanceOfBorrowerAfter,
        balanceOfBorrower + amountOfBorrow,
        'Borrower increase coin'
      );

      // Check event
      truffleAssert.eventEmitted(tx, 'OfferTaken', (ev) => {
        return ev._id.toNumber() === 0
          && ev._borrower === _borrower
          && ev._amountETH.toString() === web3Utils.toWei(`${_amountETH}`, 'ether')
          && new Date(Number(ev._loanExpDate.toString()) * 1000) instanceof Date;
      });
    });

    it('should error if offer was borrowed', async () => {
      const _offerId = 0;
      const _borrower = accounts[2];
      const _amountETH = 1;
      
      return truffleAssert.reverts(
        coincoinLendingInstance.borrow(
          _offerId,
          {
            from: _borrower,
            value: web3Utils.toWei(`${_amountETH}`, 'ether')
          }
        ),
        'Offer was borrowed'
      );
    });
  });

  describe('function getInterest()', () => {
    it('should interest = 0', async () => {
      const _offerId = 0;
      const interest = await coincoinLendingInstance.getInterest(_offerId);
      assert.equal(interest, 0);
    });
  });

  describe('function repay()', () => {
    it('should erorr if is not borrower', () => {
      const _offerId = 0;
      const _borrower = accounts[8];

      return truffleAssert.reverts(
        coincoinLendingInstance.repay(_offerId, {
            from: _borrower
          }
        ),
        'You are not borrower'
      );
    });

    it('should error if borrower does not enough money', async () => {
      const _lender = accounts[2];
      const _borrower = accounts[3];
      const _offerId = 1;
      const _amount = 10000;
      const _amountETH = 1;

      // Step 1: Mint for _lender
      await coincoinInstance.mint(_lender, _amount, {
        from: ownerAddress
      });

      // Step 2: Create offer
      await coincoinLendingInstance.createOffer(
        _amount,
        _ltvRate = 10000,
        _duration = 1,
        _dailyInterestRate = 1,
        {
          from: _lender
        }
      );

      // Step 3: _borrower borrow offer (id = 1)
      await coincoinLendingInstance.borrow(_offerId, {
        from: _borrower,
        value: web3Utils.toWei(`${_amountETH}`, 'ether')
      });

      // Step 4: Minus balance _borrower
      await coincoinInstance.transfer(_lender, _amount, {
        from: _borrower
      });

      // Step 5: _borrower repay offer (id = 1)
      return truffleAssert.reverts(
        coincoinLendingInstance.repay(_offerId, {
            from: _borrower,
          }
        ),
        'You do not have enough money'
      );
    });

    it('should repay success', async () => {
      const _offerId = 0;
      const _lender = accounts[0];
      const _borrower = accounts[1];

      const balanceEthOfBorrower = await web3.eth.getBalance(_borrower);
      console.log(balanceEthOfBorrower)
      
      const tx = await coincoinLendingInstance.repay(_offerId, {
        from: _borrower
      });

      const balanceEthOfBorrowerAfter = await web3.eth.getBalance(_borrower);
      console.log(balanceEthOfBorrowerAfter)


      // Check event
      truffleAssert.eventEmitted(tx, 'OfferRepaid', (ev) => {
        return ev._id.toNumber() === _offerId;
      });
    });
  });
  
});