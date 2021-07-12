// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import './VGToken.sol';
import "hardhat/console.sol";


contract RockPaperScissors {
    using SafeMath for uint;
    
    VGToken public token;
    
    address public manager;

    uint constant public maxNumRounds = 3;
    
    enum State {NotRunning, Running, Closed, Canceled}
    
    enum RPS  {ROCK, PAPER, SCISSORS}
    
    event GameStarted();
    event HasWinner(address playerAddress, uint amount);
    event WinnerWithdrewPrice(address playerAddress, uint amount);
    event GameCanceled();
    
    struct Player {
        address playerAddress;
        bool isEnrolled;
        uint bet;
        RPS selectedRps;
        uint roundsPlayed;
        uint roundsWon;
    }
    
    struct Game {
        State state;
        Player player1;
        Player player2;
        uint numRound;
        uint totalAmount;
        bool isTie;
        address winner;
        bool hasWinner;
        bool winnerWithdrewPrice;
    } 
    
    
    Game public game;

    constructor(VGToken _token) {
        token = VGToken(_token);
        manager = msg.sender;
        game.state = State.NotRunning;
    }
   
    
    // initialise the game
    function startNewGame() external isManager {
        Game memory _game;
        game = _game;
        game.state = State.Running;
        emit GameStarted();
    }

    function cancelGame() external isManager {
        require(game.state == State.Running, "Can not cancel game at this game state");
        game.state = State.Canceled;
        
        if(game.player1.bet > 0) {
            token.transfer(game.player1.playerAddress, game.player1.bet);
        }
        
        if(game.player2.bet > 0) {
            token.transfer(game.player2.playerAddress, game.player2.bet);
        }
        emit GameCanceled();
    }
    
    function enroll(uint amount) external isNotManager isGameRunning {
        require(!(game.player1.isEnrolled && game.player2.isEnrolled), 'Max 2 players per game');
        
        Player memory player;
        
        if(amount > 0) {
            token.transferFrom(msg.sender, address(this), amount);
            player.bet = amount;
            game.totalAmount = game.totalAmount.add(player.bet);
        }
        player.playerAddress = msg.sender;
        player.isEnrolled = true;
        
        if(!game.player1.isEnrolled) {
            game.player1 = player;
        } else  {
             game.player2 = player;
        }
        
    }
    
    function getBalance() public view isManager returns(uint) {
        return address(this).balance;
    }
    
    function play(RPS rps) external isNotManager isGameRunning {
        require(game.player1.isEnrolled && game.player2.isEnrolled, 'Both players must be enrolled to start playing');
        
        Player storage player = _getCurrentPlayer();
        
        // CHECK IF THE PLAYER HAS ALREADY PLAYED THE ROUND
        require(player.roundsPlayed == 0, 'PLAYER HAS ALREADY PLAYED');
        
        player.selectedRps = rps;
        player.roundsPlayed++;
       
        if(game.player1.roundsPlayed == game.player2.roundsPlayed) {
            
             game.numRound++;
             game.player1.roundsPlayed = 0;
             game.player2.roundsPlayed = 0;

             if(game.player1.roundsWon < maxNumRounds && game.player2.roundsWon < maxNumRounds) {
                _setRounWinner();
             }
        }
        
        if(game.player1.roundsWon == maxNumRounds || game.player2.roundsWon == maxNumRounds) {
            
             game.state = State.Closed;
             game.winner = game.player1.roundsWon == 3 ? game.player1.playerAddress : game.player2.playerAddress;
             game.hasWinner = true;
             game.isTie = false;
             emit HasWinner(game.winner, game.totalAmount);
        }
    }
    
   function _getCurrentPlayer() private view returns(Player storage) {
       require(game.player1.playerAddress == msg.sender || game.player2.playerAddress == msg.sender, "Current player is not registered");
       
       if(game.player1.playerAddress == msg.sender) {
           return game.player1;
       } 
       
       return game.player2;
   }
    
    function _setRounWinner() private  {
        if(game.player1.selectedRps == RPS.ROCK) {
            
            if(game.player2.selectedRps == RPS.ROCK) {
                game.isTie = true;
            }
            
            else if(game.player2.selectedRps == RPS.PAPER) {
                game.isTie = false;
                game.player2.roundsWon++;
            }
            
            else if(game.player2.selectedRps == RPS.SCISSORS) {
                game.isTie = false;
                game.player1.roundsWon++;
            }
        } 
        
        else if(game.player1.selectedRps == RPS.PAPER) {
            
            if(game.player2.selectedRps == RPS.PAPER) {
                game.isTie = true;
            }
            
            else if(game.player2.selectedRps == RPS.SCISSORS) {
                game.isTie = false;
                game.player2.roundsWon++;
            }
            
            else if(game.player2.selectedRps == RPS.ROCK) {
                game.isTie = false;
                game.player1.roundsWon++;
            }
        }
        
        else if(game.player1.selectedRps == RPS.SCISSORS) {
            
            if(game.player2.selectedRps == RPS.SCISSORS) {
                game.isTie = true;
            }
            
            else if(game.player2.selectedRps == RPS.PAPER) {
                game.isTie = false;
                game.player1.roundsWon++;
            }
            
            else if(game.player2.selectedRps == RPS.ROCK) {
                game.isTie = false;
                game.player2.roundsWon++;
            }
        }
    }
    
    function winnerWithDrawal() external isNotManager {
        require(game.state == State.Closed, "The Game is not closed yet");
        require(game.totalAmount > 0, "The total price must be greater than 0");
        require(game.hasWinner, "There is no winner yet");
        require(game.winner == msg.sender, "Only the winner can withdraw");
        require(!game.winnerWithdrewPrice, "You already got the price");
        
        game.winnerWithdrewPrice = true;
        token.transfer(game.winner, game.totalAmount);
    
        emit WinnerWithdrewPrice(game.winner, game.totalAmount);
        //_startNewGame();
    }
    
    modifier isGameRunning() {
        require(game.state == State.Running, "The Game is not running yet, please Start the Game");
        _;
    }
    
    
    modifier isNotManager() {
        require(msg.sender != manager, 'The manager can not play');
        _;
    }
    
    modifier isManager() {
        require(msg.sender == manager, 'Only the manager can run this function');
        _;
    }
    

}