// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract CrowdFunding {
    mapping(address => uint) public contributors;
    address public admin;
    uint public numberOfContributotors;
    uint public minimumContribution;
    uint public deadline;
    uint public goal;
    uint public raisedAmount;
    
    struct Request {
        string description;
        address payable recipient;
        uint value;
        bool completed;
        uint numberOfVoters;
        mapping (address => bool) voters;
    }
    
    mapping (uint => Request) requests;
    uint public numRequests;
    
    constructor(uint _goal, uint _deadline) {
        goal = _goal;
        deadline = block.timestamp + _deadline; // seconds
        minimumContribution = 100 wei;
        admin = msg.sender;
    }
    
    event ContributeEvent(address _sender, uint _value);
    event CreateRequestEvent(string description, address _recipient, uint _value);
    event MakePayment(address _recipient, uint _value);
    
    
    function contribute() public payable {
        require(block.timestamp < deadline, "Deadline has passed");
        require(msg.value >= minimumContribution, "MinimumContribution not met");
        
        if(contributors[msg.sender] == 0) {
            numberOfContributotors++;
        }
        
        contributors[msg.sender] += msg.value;
        raisedAmount += msg.value;
        
        emit ContributeEvent(msg.sender, msg.value);
    }
    
    receive() payable external {
        contribute();
    }
    
    function getBalance() public view returns(uint) {
        return address(this).balance;
    }
    
    function getRefund() public {
        require(block.timestamp > deadline && raisedAmount < goal);
        require(contributors[msg.sender] > 0);
        address payable recipient = payable(msg.sender);
        uint value = contributors[msg.sender];
        recipient.transfer(value);
        contributors[msg.sender] = 0;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }
     
    function createRequest(string memory _description, address payable _recipient, uint _value) public onlyAdmin {
        Request storage newRequest = requests[numRequests];
        numRequests++;
        newRequest.description = _description;
        newRequest.recipient = _recipient;
        newRequest.value = _value;
        newRequest.completed = false;
        newRequest.numberOfVoters = 0;
        
        emit CreateRequestEvent(_description, _recipient, _value);
    }
    
    function voteRequest(uint _requestNumber) public {
        require(contributors[msg.sender] > 0, "Only contributors can vote");
        Request storage request = requests[_requestNumber];
        require(request.voters[msg.sender] == false, "You have already voted");
        request.voters[msg.sender] = true;
        request.numberOfVoters++;
    }
    
    function makePayment(uint _requestNumber) public onlyAdmin {
        require(raisedAmount >= goal);
        Request storage request = requests[_requestNumber];
        require(request.completed == false, "The request has been completed");
        require(request.numberOfVoters > numberOfContributotors / 2); // the 50% of contributors has voted
        request.recipient.transfer(request.value);
        request.completed = true;
        
        emit MakePayment(request.recipient, request.value);
    }
}