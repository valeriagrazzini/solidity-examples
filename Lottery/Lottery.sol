// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract Lottery {
    address payable[] public players;
    address public manager;
    
    constructor() {
        manager = msg.sender;
    }
    
    receive() external payable {
        require(msg.sender != manager, 'The Manager can not patecipate to the Lottery!');
        require(msg.value == 0.1 ether, 'The value must be 0.1 Eth');
        players.push(payable(msg.sender));
    }
    
    function getBalance() public view returns(uint) {
        require(msg.sender == manager, 'Only the manager can check the Balance');
        return address(this).balance;
    }
    
    function random() public view returns(uint) {
        return uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, players.length)));
    }
    
    function pickWinner() public  {
        require(msg.sender == manager, 'Only the manager can pick the winner');
        require(players.length >= 3);
        
        address payable winner;
        uint randomNumber = random();
        uint index = randomNumber % players.length;
        winner = players[index];
        
        winner.transfer(getBalance());
        players = new address payable[](0);
        
    }
}