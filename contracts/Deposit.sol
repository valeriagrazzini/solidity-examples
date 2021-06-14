// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Deposit {
    address owner;
    
    constructor() {
        owner = msg.sender;
    }
    receive() external payable {
        
    }
    
    fallback() external payable {
        
    }
    
    function getBalance() public view returns(uint){
        return address(this).balance;
    }
    
    function sendEther() public payable {
        uint x;
        x++;
    }
    
    modifier onlyowner() {
        require (msg.sender == owner, 'Only accessible to the owner');
        _;
    }
    
    function transferEther(address payable reciepient, uint amount) public onlyowner returns(bool) {
        if(amount <= getBalance()) {
            reciepient.transfer(amount);
            return true;
        }
        return false;
    }
}