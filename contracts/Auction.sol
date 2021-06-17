// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract AuctionCreator {
    Auction[] public auctions;
    
    function createAuction() public {
        Auction newAuction = new Auction(msg.sender);
        auctions.push(newAuction);
    }
}

contract Auction {
    address payable public owner;
    
    uint public startBlock;
    uint public endBlock;
    string public ipfsHash;
    
    enum State {Started, Running, Endend, Canceled}
    State public auctionState;
    
    uint public highestBindingBid;
    address payable highetstBidder;
    
    mapping(address => uint) public bids;
    
    uint bidIncrement;
    
    constructor(address _owner) {
        owner = payable(_owner);
        auctionState = State.Running;
        startBlock = block.number;
        endBlock = startBlock + 40320; // running for a week = 60 * 60 * 24 * 7 / 15 (each block is mined every 15 seconds)
        ipfsHash = '';
        bidIncrement = 100;
    }
    
    modifier notOwner() {
        require(msg.sender != owner);
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier afterStart() {
        require(block.number >= startBlock);
        _;
    }
    
    modifier beforeEnd() {
        require(block.number <= endBlock);
        _;
    }
    
    function min(uint a, uint b) pure internal returns(uint) {
        if(a <= b) {
            return a;
        }
        return b;
    }
    
    function placeBid() payable public notOwner afterStart beforeEnd {
        require(auctionState == State.Running);
        require(msg.value >= bidIncrement);
        
        uint currentBid = bids[msg.sender] + msg.value;
       
        require(currentBid > highestBindingBid);
        
        bids[msg.sender] = currentBid;
        
        if(currentBid <= bids[highetstBidder]) {
            highestBindingBid = min(currentBid + bidIncrement, bids[highetstBidder]);
        } else {
            highestBindingBid = min(currentBid, bids[highetstBidder] + bidIncrement);
            highetstBidder = payable(msg.sender);
        }
    }
    
    function cancelAuction() public onlyOwner {
        auctionState = State.Canceled;
    }
    
    function finalizeAuction() public {
        require(auctionState == State.Canceled || block.number > endBlock);
        require(msg.sender == owner || bids[msg.sender] > 0);
        address payable recipient;
        uint value;
        
        if (auctionState == State.Canceled) {
            recipient = payable(msg.sender);
            value = bids[msg.sender];
        } 
        else { //auction endend
            if(msg.sender == owner) {
                recipient = owner;
                value = highestBindingBid;
            }
            else { //this is a bidder requesting funds
                if(msg.sender == highetstBidder) {
                    recipient = highetstBidder;
                    value = bids[highetstBidder] - highestBindingBid;
                }
                else {
                    recipient = payable(msg.sender);
                    value = bids[msg.sender];
                }
            }
        }
        recipient.transfer(value);
    }
}