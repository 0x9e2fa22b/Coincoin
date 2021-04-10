const CoinCoin = artifacts.require('CoinCoin');
const truffleAssert = require('truffle-assertions');
const { assert } = require('chai');

let contractInstance;

contract('CoinCoin', (account) => {
  before(async () => {
    contractInstance = await CoinCoin.deployed();
  });

  describe('Deploy', () => {
    it('should deploy success to Ganache network', async () => {
      const result = await CoinCoin.deployed();
      assert.isObject(result);
    });
  });

  describe('function getBalance()', () => {
    it('should return balance of account exists', async () => {
      const balance = await contractInstance.getBalance(account[0]);
      assert.equal(balance, 0);
    });
    
    it('should throw error invalid address if account does not exists', async () => {
      let errMsg;
      const invalidAddress = 'dsdd'
      try {
        await await contractInstance.getBalance(invalidAddress);
      }
      catch (e) {
        errMsg = e.message
      }

      assert.match(errMsg, /invalid address/i);
    });
  });

  describe('function mint()', () => {
    it('should success if owner mint', async () => {
      const _address = account[0];
      const _amount = 1000;

      const balanceOfAccountBeforeMint = Number(await contractInstance.getBalance(_address));
      await contractInstance.mint(_address, _amount);
      const balanceOfAccountAfterMint = Number(await contractInstance.getBalance(_address));

      assert.equal(balanceOfAccountAfterMint, balanceOfAccountBeforeMint + _amount); 
    });

    it('should faild if others mint', async () => {
      let errMsg;
      try {
        await contractInstance.mint(account[1], 1000, {
          from: account[2]
        });
      }
      catch (e) {
        errMsg = e.message;
      }

      assert.match(errMsg, /Ownable: caller is not the owner/i);
    });
  });

  describe('function transfer()', () => {
    it('should transfer fail if account does not have enough money', async () => {
      let errMsg;
      const _sender = account[8];
      const _receiver = account[9];
      const _amount = 1000000;
      try {
        await contractInstance.transfer(_receiver, _amount, {
          from: _sender
        });
      }
      catch (e) {
        errMsg = e.message;
      }
      assert.match(errMsg, /You do not have enough money/i);
    });

    it('should tranfer success if account have enough money', async () => {
      const _sender = account[0];
      const _receiver = account[9];
      const _amount = 10;

      // Mint for sender
      await contractInstance.mint(_sender, _amount);

      const balanceOfSenderBeforeTransfer = Number(await contractInstance.getBalance(_sender));
      const balanceOfReceiverBeforeTransfer = Number(await contractInstance.getBalance(_receiver));

      // Transfer from _sender to _receiver
      const result = await contractInstance.transfer(_receiver, _amount, {
        from: _sender
      });

      truffleAssert.eventEmitted(result, 'Transfer', (ev) => {
        return ev._sender === _sender
          && ev._receiver === _receiver
          && ev._amount.toNumber() === _amount
      });

      const balanceOfSenderAfterTransfer = Number(await contractInstance.getBalance(_sender));
      const balanceOfReceiverAfterTransfer = Number(await contractInstance.getBalance(_receiver));

      assert.equal(
        balanceOfSenderAfterTransfer,
        balanceOfSenderBeforeTransfer - _amount,
        'Minus balance of sender'
      );
      assert.equal(
        balanceOfReceiverAfterTransfer,
        balanceOfReceiverBeforeTransfer + _amount,
        'Add balance of receiver'
      );
    });
  });



});