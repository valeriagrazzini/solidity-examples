const { expect } = require("chai");

describe("RockPaperScissors", function() {
  let owner, addr1, addr2, addr3, token, RockPaperScissors, contract;
  
  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const VGToken = await ethers.getContractFactory("VGToken");
    
    token = await VGToken.deploy();

    RockPaperScissors = await ethers.getContractFactory("RockPaperScissors");
    contract = await RockPaperScissors.deploy(token.address);
    
    await contract.startNewGame();
    
    const seedTokenBalance = async(account, _amount) => {
      await token.transfer(account.address, _amount);
      await token.connect(account).approve(
          contract.address,
          _amount,
          {from: account.address}
      )
    }

    // send some token to the addresses
    const tokenAmount = 600;
    await Promise.all([
      seedTokenBalance(addr1, tokenAmount),
      seedTokenBalance(addr2, tokenAmount)
    ]);

  });
  
  it("Should NOT enroll if player is manager", async () => {
    await expect(
      contract.enroll(100, {from: owner.address})
    ).to.be.revertedWith('The manager can not play');
  });

  it("Should enroll player when amount is 0", async () => {
    await contract.connect(addr1).enroll(0, {from: addr1.address});
    const game = await contract.game();

    expect(await game.player1.isEnrolled).to.be.true;
    expect(await game.player1.playerAddress).to.equal(addr1.address);
    expect(await game.player1.bet).to.equal(0);
    expect(await game.totalAmount).to.equal(0);
  });

  it("Should enroll player when amount is greather than 0", async () => {
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    const game = await contract.game();

    expect(await game.player1.isEnrolled).to.be.true;
    expect(await game.player1.playerAddress).to.equal(addr1.address);
    expect(await game.player1.bet).to.equal(100);
    expect(await game.totalAmount).to.equal(100);
    expect(await token.balanceOf(addr1.address)).to.equal(500);
    expect(await token.balanceOf(contract.address)).to.equal(100);
  });

  it("Should enroll player 1 and player 2", async () => {
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    const game = await contract.game();
    
    expect(await token.balanceOf(contract.address)).to.equal(300);
    expect(await game.totalAmount).to.equal(300);
  });

  it("Should NOT enroll player if there are already 2 players", async () => {
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});

    await expect(
      contract.connect(addr3).enroll(0, {from: addr3.address})
    ).to.be.revertedWith('Max 2 players per game');
  });

  it("Should NOT play if both players are not enrolled", async () => {
    await contract.connect(addr1).enroll(100, {from: addr1.address});

    await expect(
      contract.connect(addr2).play(1), {from: addr2.address}
    ).to.be.revertedWith('Both players must be enrolled to start playing');
  });

  it("Should play PLAYER 1 (first time)", async () => {
    
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    await contract.connect(addr1).play(0, {from: addr1.address});

    const game = await contract.game();

    expect(await game.player1.selectedRps).to.equal(0);
    expect(await game.player1.roundsPlayed).to.equal(1);
  });

  it("Should NOT play when one has to wait for the other player to play (PLAYER 1)", async () => {
    
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}),
    
    //PLAYER 1 TRYES TO PLAY 2 TIMES IN A ROW
    await expect(
      contract.connect(addr1).play(1), {from: addr1.address}
    ).to.be.revertedWith('PLAYER HAS ALREADY PLAYED');
  });

  it("Should NOT play when one has to wait for the other player to play (PLAYER 2)", async () => {
    
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr2).play(0, {from: addr2.address}),
    
    //PLAYER 2 TRYES TO PLAY 2 TIMES IN A ROW
    await expect(
      contract.connect(addr2).play(1), {from: addr2.address}
    ).to.be.revertedWith('PLAYER HAS ALREADY PLAYED');
  });

  it("Should calculate correct round winner - CASE ROCK / PAPER", async () => {
    
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}); // ROCK
    await contract.connect(addr2).play(1, {from: addr2.address}); // PAPER

    const game = await contract.game();

    expect(await game.numRound).to.equal(1);
    expect(await game.player1.roundsWon).to.equal(0);
    expect(await game.player2.roundsWon).to.equal(1); // PAPER WINS
    expect(await game.player1.roundsPlayed).to.equal(0);
    expect(await game.player2.roundsPlayed).to.equal(0); 
  });

  it("Should calculate correct round winner - CASE ROCK / ROCK", async () => {
    
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}); // ROCK
    await contract.connect(addr2).play(0, {from: addr2.address}); // ROCK

    const game = await contract.game();

    expect(await game.isTie).to.be.true; // TIE
  });

  it("Should calculate correct round winner - CASE ROCK / SCISSORS", async () => {
    
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}); // ROCK
    await contract.connect(addr2).play(2, {from: addr2.address}); // SCISSORS

    const game = await contract.game();

    expect(await game.player1.roundsWon).to.equal(1); // ROCK WINS
    expect(await game.player2.roundsWon).to.equal(0); 
  });

  it("Should calculate correct round winner - CASE PAPER / PAPER", async () => {
    
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(1, {from: addr1.address}); // PAPER
    await contract.connect(addr2).play(1, {from: addr2.address}); // PAPER

    const game = await contract.game();

    expect(await game.isTie).to.be.true; // TIE
  });

  it("Should calculate correct round winner - CASE PAPER / SCISSORS", async () => {
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(1, {from: addr1.address}); // PAPER
    await contract.connect(addr2).play(2, {from: addr2.address}); // SCISSORS

    const game = await contract.game();

    expect(await game.player1.roundsWon).to.equal(0); 
    expect(await game.player2.roundsWon).to.equal(1); // SCISSORS WINS
  });

  it("Should calculate correct round winner - CASE PAPER / ROCK", async () => {
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(1, {from: addr1.address}); // PAPER
    await contract.connect(addr2).play(0, {from: addr2.address}); // ROCK

    const game = await contract.game();

    expect(await game.player1.roundsWon).to.equal(1); // PAPER WINS
    expect(await game.player2.roundsWon).to.equal(0); 
  });

  it("Should calculate correct round winner - CASE SCISSORS / SCISSORS", async () => {
    
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(2, {from: addr1.address}); // SCISSORS
    await contract.connect(addr2).play(2, {from: addr2.address}); // SCISSORS

    const game = await contract.game();

    expect(await game.isTie).to.be.true; // TIE
  });

  it("Should calculate correct round winner - CASE SCISSORS / ROCK", async () => {
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(2, {from: addr1.address}); // SCISSORS
    await contract.connect(addr2).play(0, {from: addr2.address}); // ROCK

    const game = await contract.game();

    expect(await game.player1.roundsWon).to.equal(0); 
    expect(await game.player2.roundsWon).to.equal(1); // ROCK WINS
  });

  it("Should calculate correct round winner - CASE SCISSORS / PAPER", async () => {
    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(2, {from: addr1.address}); // SCISSORS
    await contract.connect(addr2).play(1, {from: addr2.address}); // PAPER

    const game = await contract.game();

    expect(await game.player1.roundsWon).to.equal(1); // SCISSORS WINS
    expect(await game.player2.roundsWon).to.equal(0); 
  });

  
  it("Should calculate GAME WINNER when players have reached the maxNumRounds", async () => {
    const maxNumRounds = 3

    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}); // ROCK
    await contract.connect(addr2).play(1, {from: addr2.address}); // PAPER

    await contract.connect(addr1).play(1, {from: addr1.address}); // PAPER
    await contract.connect(addr2).play(2, {from: addr2.address}); // SCISSORS

    await contract.connect(addr1).play(2, {from: addr1.address}); // SCISSORS
    await contract.connect(addr2).play(0, {from: addr2.address}); // ROCK

    const game = await contract.game();

    expect(await game.numRound).to.equal(maxNumRounds);
    expect(await game.player1.roundsWon).to.equal(0);
    expect(await game.player2.roundsWon).to.equal(3); // PLAYER 2 WINS GAME
    expect(await game.hasWinner).to.be.true;
    expect(await game.winner).to.equal(game.player2.playerAddress); 
    expect(await game.state).to.equal(2); // CLOSED
    expect(await game.totalAmount).to.equal(300);
  });

  it("Should allow GAME WINNER to withdraw the price", async () => {

    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}); // ROCK
    await contract.connect(addr2).play(1, {from: addr2.address}); // PAPER

    await contract.connect(addr1).play(1, {from: addr1.address}); // PAPER
    await contract.connect(addr2).play(2, {from: addr2.address}); // SCISSORS

    await contract.connect(addr1).play(2, {from: addr1.address}); // SCISSORS
    await contract.connect(addr2).play(0, {from: addr2.address}); // ROCK

    await contract.connect(addr2).winnerWithDrawal({from: addr2.address})
    
    const game = await contract.game();

    expect(await token.balanceOf(game.player2.playerAddress)).to.equal(700);
    expect(await game.winner).to.equal(game.player2.playerAddress); 
  });

  it("Should NOT allow to withdraw the price if the game is not closed", async () => {

    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});

    await expect(
      contract.connect(addr2).winnerWithDrawal(), {from: addr2.address}
    ).to.be.revertedWith('The Game is not closed yet');
  });

  it("Should NOT allow to withdraw the price if is 0", async () => {

    await contract.connect(addr1).enroll(0, {from: addr1.address});
    await contract.connect(addr2).enroll(0, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}); // ROCK
    await contract.connect(addr2).play(1, {from: addr2.address}); // PAPER

    await contract.connect(addr1).play(1, {from: addr1.address}); // PAPER
    await contract.connect(addr2).play(2, {from: addr2.address}); // SCISSORS

    await contract.connect(addr1).play(2, {from: addr1.address}); // SCISSORS
    await contract.connect(addr2).play(0, {from: addr2.address}); // ROCK

    await expect(
      contract.connect(addr2).winnerWithDrawal(), {from: addr2.address}
    ).to.be.revertedWith('The total price must be greater than 0');
  });

  it("Should NOT allow to withdraw the price the sender is not the winner", async () => {

    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}); // ROCK
    await contract.connect(addr2).play(1, {from: addr2.address}); // PAPER

    await contract.connect(addr1).play(1, {from: addr1.address}); // PAPER
    await contract.connect(addr2).play(2, {from: addr2.address}); // SCISSORS

    await contract.connect(addr1).play(2, {from: addr1.address}); // SCISSORS
    await contract.connect(addr2).play(0, {from: addr2.address}); // ROCK

    await expect(
      contract.connect(addr1).winnerWithDrawal(), {from: addr1.address}
    ).to.be.revertedWith('Only the winner can withdraw');
  });

  it("Should NOT allow GAME WINNER to withdraw again the price", async () => {

    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.connect(addr1).play(0, {from: addr1.address}); // ROCK
    await contract.connect(addr2).play(1, {from: addr2.address}); // PAPER

    await contract.connect(addr1).play(1, {from: addr1.address}); // PAPER
    await contract.connect(addr2).play(2, {from: addr2.address}); // SCISSORS

    await contract.connect(addr1).play(2, {from: addr1.address}); // SCISSORS
    await contract.connect(addr2).play(0, {from: addr2.address}); // ROCK

    await contract.connect(addr2).winnerWithDrawal({from: addr2.address})
    
    await expect(
      contract.connect(addr2).winnerWithDrawal(), {from: addr2.address}
    ).to.be.revertedWith('You already got the price');
  });

  it.only("Should cancel the game if the game is running and sendback bets amount to players", async () => {

    await contract.connect(addr1).enroll(100, {from: addr1.address});
    await contract.connect(addr2).enroll(200, {from: addr2.address});
    
    await contract.cancelGame({from: owner.address})
    
    const game = await contract.game();

    game.state = 3 // CANCELED
    expect(await token.balanceOf(game.player1.playerAddress)).to.equal(600);
    expect(await token.balanceOf(game.player2.playerAddress)).to.equal(600);
  });
});
