const Dai = artifacts.require('mocks/Dai.sol');
const Bat = artifacts.require('mocks/Bat.sol');
const Rep = artifacts.require('mocks/Rep.sol');
const Zrx = artifacts.require('mocks/Zrx.sol');
const Dex = artifacts.require('Dex.sol');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

const SIDE = {
    BUY: 0,
    SELL: 1
}

contract('Dex', (accounts)=>{
    let dai, bat, rep, zrx;

    const [DAI, BAT, REP, ZRX] = ['DAI', 'BAT', 'REP', 'ZRX'].map(x => web3.utils.fromAscii(x))

    const [trader1, trader2] = [accounts[1], accounts[2]];
    let dex;
    beforeEach(async ()=> {
      ([dai, bat, rep, zrx] = await Promise.all([
          Dai.new(),
          Bat.new(),
          Rep.new(),
          Zrx.new()
      ]));
      
      dex = await Dex.new();
      
      await Promise.all([
          dex.addToken(DAI, dai.address),
          dex.addToken(BAT, bat.address),
          dex.addToken(REP, rep.address),
          dex.addToken(ZRX, zrx.address),
      ]);

      const amount = web3.utils.toWei('1000');

      // ADD TOKENS TO ADDRESSES
      const seedTokenBalance = async(token, trader) => {
          await token.faucet(trader, amount);
          await token.approve(
              dex.address,
              amount,
              {from: trader}
          )
      }

      await Promise.all(
          [dai, bat, rep, zrx].map(token => seedTokenBalance(token, trader1))
      );
      await Promise.all(
        [dai, bat, rep, zrx].map(token => seedTokenBalance(token, trader2))
      )

    });

    it('sould return tokens', async ()=> {
        const tokens = await dex.getTokens()
        assert(tokens.length === 4)
    })

    it('sould deposit tokens', async ()=> {
        const amount = web3.utils.toWei('100');
        await dex.deposit(
            amount,
            DAI,
            {from: trader1}
        );
        const balance = await dex. traderBalances(trader1, DAI);
        assert(balance.toString() === amount);
    })

    it('sould NOT deposit tokens if ticker does not exist', async ()=> {
        const amount = web3.utils.toWei('100');
        await expectRevert(
            dex.deposit(
                amount,
                web3.utils.fromAscii('DAO'),
                {from: trader1}
        ), 'this token does not exist');
    })

    it('should withdraw tokens', async ()=> {

        await dex.deposit(
            web3.utils.toWei('100'),
            DAI,
            {from: trader1}
        );

        await dex.withdraw(
            web3.utils.toWei('50'),
            DAI,
            {from: trader1}
        );

        const [balanceDex, balanceDai] = await Promise.all([
            dex.traderBalances(trader1, DAI),
            dai.balanceOf(trader1)
        ]);

        assert(balanceDex.toString() === web3.utils.toWei('50'));
        assert(balanceDai.toString() === web3.utils.toWei('950'))
    })

    it('sould NOT withdraw tokens if ticker does not exist', async ()=> {
        const amount = web3.utils.toWei('100');

        await dex.deposit(
            amount,
            DAI,
            {from: trader1}
        );

        await expectRevert(
            dex.withdraw(
                amount,
                web3.utils.fromAscii('DAO'),
                {from: trader1}
            ), 'this token does not exist');
    })

    it('sould NOT withdraw tokens if balance is too low', async ()=> {
     
        await expectRevert(
            dex.withdraw(
                web3.utils.toWei('100'),
                DAI,
                {from: trader1}
            ), 'balance too low');
    })

    it('should create limit order', async ()=> {

        await dex.deposit(
            web3.utils.toWei('100'),
            DAI,
            {from: trader1}
        ); 

        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'),
            10,
            SIDE.BUY,
            {from: trader1}
        ) 
        let buyOrders = await dex.getOrders(REP, SIDE.BUY)
        let sellOrders = await dex.getOrders(REP, SIDE.SELL)

        assert(buyOrders.length === 1)
        assert(buyOrders[0].trader === trader1)
        assert(buyOrders[0].ticker === web3.utils.padRight(REP, 64))
        assert(buyOrders[0].price === '10')
        assert(buyOrders[0].amount === web3.utils.toWei('10'))
        assert(sellOrders.length === 0)

        await dex.deposit(
            web3.utils.toWei('200'),
            DAI,
            {from: trader2}
        ); 

        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'),
            11,
            SIDE.BUY, 
            {from: trader2}
        ) 

        buyOrders = await dex.getOrders(REP, SIDE.BUY)
        sellOrders = await dex.getOrders(REP, SIDE.SELL)

        assert(buyOrders.length === 2)
        assert(buyOrders[0].trader === trader2) 
        assert(buyOrders[1].trader === trader1)
        assert(sellOrders.length === 0)

        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'),
            9,
            SIDE.BUY, 
            {from: trader2}
        ) 

        buyOrders = await dex.getOrders(REP, SIDE.BUY)
        sellOrders = await dex.getOrders(REP, SIDE.SELL)

        assert(buyOrders.length === 3)
        assert(buyOrders[0].trader === trader2) 
        assert(buyOrders[1].trader === trader1)
        assert(buyOrders[2].trader === trader2)
        assert(buyOrders[2].price === '9')
        assert(sellOrders.length === 0)
    })

    it('should not create limit order if token does not exist', async () => {
        await expectRevert(
            dex.createLimitOrder(
                web3.utils.fromAscii('DAO'),
                web3.utils.toWei('10'),
                9,
                SIDE.BUY, 
                {from: trader2}
            ), 'this token does not exist');
    })

    it('should not create limit order if token is DAI', async () => {
        await expectRevert(
            dex.createLimitOrder(
                DAI,
                web3.utils.toWei('10'),
                9,
                SIDE.BUY, 
                {from: trader2}
            ), 'cannot trade DAI');
    })

    it('should not create limit order side is SELL and trader balance is lower than the amount', async () => {

        await dex.deposit(
            web3.utils.toWei('99'),
            DAI,
            {from: trader1}
        ); 

        await expectRevert(
            dex.createLimitOrder(
                REP,
                web3.utils.toWei('100'),
                10,
                SIDE.SELL,  
                {from: trader1}
            ), 'token balance too low');
    })

    it('should not create limit order side is BUY and DAI balance is lower than the amount * price', async () => {

        await dex.deposit(
            web3.utils.toWei('99'),
            DAI,
            {from: trader1}
        ); 

        await expectRevert(
            dex.createLimitOrder(
                REP,
                web3.utils.toWei('10'),
                10,
                SIDE.BUY,  
                {from: trader1}
            ), 'dai balance too low');
    })

    it('should create a market order && match against limit order', async () => {
        
        await dex.deposit(
            web3.utils.toWei('100'),
            DAI,
            {from: trader1}
        ); 

        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'),
            10,
            SIDE.BUY, 
            {from: trader1}
        ) 

        await dex.deposit(
            web3.utils.toWei('100'),
            REP,
            {from: trader2}
        ); 

        await dex.createMarketOrder(
            REP,
            web3.utils.toWei('5'),
            SIDE.SELL, 
            {from: trader2}
        ) 

        const balances = await Promise.all([
            dex.traderBalances(trader1, DAI),
            dex.traderBalances(trader1, REP),
            dex.traderBalances(trader2, DAI),
            dex.traderBalances(trader2, REP),
            dai.balanceOf(trader1)
        ]);

        const orders = await dex.getOrders(REP, SIDE.BUY)

        assert(orders.length === 1)
        assert(orders[0].filled === web3.utils.toWei('5'))
        assert(balances[0].toString() === web3.utils.toWei('50'))
        assert(balances[1].toString() === web3.utils.toWei('5'))
        assert(balances[2].toString() === web3.utils.toWei('50'))
        assert(balances[3].toString() === web3.utils.toWei('95'))
    }) 

    it('should not create market order if token does not exist', async () => {
        await expectRevert(
            dex.createMarketOrder(
                web3.utils.fromAscii('DAO'),
                web3.utils.toWei('10'),
                SIDE.BUY, 
                {from: trader2}
            ), 'this token does not exist');
    })

    it('should not create market order if token is DAI', async () => {
        await expectRevert(
            dex.createMarketOrder(
                DAI,
                web3.utils.toWei('10'),
                SIDE.BUY, 
                {from: trader2}
            ), 'cannot trade DAI');
    })

    it('should NOT create a market order if SIDE is BUY and the dai balance is too low', async () => {
        
        await dex.deposit(
            web3.utils.toWei('100'),
            REP,
            {from: trader1}
        ); 

        await dex.createLimitOrder(
            REP,
            web3.utils.toWei('10'),
            10,
            SIDE.SELL, 
            {from: trader1}
        ) 

        await expectRevert(
            dex.createMarketOrder(
                REP,
                web3.utils.toWei('10'),
                SIDE.BUY, 
                {from: trader2}
            ), 'dai balance too low');
    }) 

    it('should NOT create a market order if SIDE is SELL and the token balance is too low', async () => {

        await dex.deposit(
            web3.utils.toWei('99'),
            REP,
            {from: trader2}
        );

        await expectRevert(
            dex.createMarketOrder(
                REP,
                web3.utils.toWei('101'),
                SIDE.SELL, 
                {from: trader2}
            ), 'token balance too low');
    }) 
}); 