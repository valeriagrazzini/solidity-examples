// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

interface ERC20Interface {
    function totalSupply() external view returns (uint);
    function balanceOf(address tokenOwner) external view returns (uint balance);
    function transfer(address to, uint tokens) external returns (bool success);
    
    function allowance(address tokenOwner, address spender) external view returns (uint remaining);
    function approve(address spender, uint tokens) external returns (bool success);
    function transferFrom(address from, address to, uint tokens) external returns (bool success);
    
    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}


contract VGToken is ERC20Interface {
    string public name = "VGToken";
    string public symbol = "VGT";
    uint public decimals = 18;
    uint public override totalSupply;
    
    address public founder;
    mapping(address => uint) public balances;
    mapping(address => mapping(address => uint)) allowed;
    
    constructor() {
        totalSupply = 1000000;
        founder = msg.sender;
        balances[founder] = totalSupply;
    }
    
    function balanceOf(address tokenOwner) override public view returns (uint balance) {
        return balances[tokenOwner];
    }
    
    function transfer(address to, uint tokens) virtual override public returns (bool success) {
        require(balances[msg.sender] >= tokens);
        balances[to] += tokens;
        balances[msg.sender] -= tokens;
        emit Transfer(msg.sender, to, tokens);
        return true;
    }
    
    function allowance(address tokenOwner, address spender) public override view returns (uint remaining) {
        return allowed[tokenOwner][spender];
    }
    
    function approve(address spender, uint tokens) public override returns (bool success) {
        require(balances[msg.sender] >= tokens, 'Insufficient balance');
        require(tokens > 0, 'Tokens amount must be greater than 0');
        allowed[msg.sender][spender] = tokens;
        
        emit Approval(msg.sender, spender, tokens);
        return true;
        
    }
    
    function transferFrom(address from, address to, uint tokens) public virtual override returns (bool success) {
        require(allowed[from][to] >= tokens, 'Insufficient balance');
        require(balances[from] >= tokens, 'Not enough Tokens');
        balances[from] -= tokens;
        balances[to] += tokens;
        allowed[from][to] -= tokens;
        
        return true;
    }
}

contract VGTokenICO is VGToken {
        address public admin;
        address payable public  deposit;
        uint public tokenPrice = 0.001 ether;
        uint public hardCap = 300 ether;
        uint public raisedAmount;
        uint public saleStart = block.timestamp;
        uint public saleEnd = block.timestamp + 604800; // a week in seconds
        uint public tokendTradeStart = saleEnd + 604800; // a week after saleEnd
        uint public maxInvestment = 5 ether;
        uint public minInvestment = 0.1 ether;
        
        enum State {BeforeStart, Running, AfterEnd, Halted}
        State public icoState;
        
        constructor(address payable _deposit) {
            deposit = _deposit;
            admin = msg.sender;
            icoState = State.BeforeStart;
        }
        
        modifier onlyAdmin() {
            require(msg.sender == admin);
            _;
        }
        
        function halt()  public onlyAdmin {
            icoState = State.Halted;
        }
        
        function resum()  public onlyAdmin {
            icoState = State.Running;
        }
        
        function changeDepositAddress(address payable _newDeposit) public onlyAdmin {
            deposit = _newDeposit;
        }
        
        function getCurrentState() public view returns(State) {
            if(icoState == State.Halted) {
                return State.Halted;
            } 
            
            if (block.timestamp < saleStart) {
                return State.BeforeStart;
            }
            
            if(block.timestamp >= saleStart && block.timestamp <= saleEnd) {
                return State.Running;
            }
            
            return State.AfterEnd;
            
        }
        
        event Invest(address investor, uint value, uint tokens);
        
        
        function invest() payable public returns(bool) {
            
            icoState = getCurrentState();
            require(icoState == State.Running);
            
            require(msg.value >= minInvestment && msg.value <= maxInvestment);
            raisedAmount += msg.value;
            
            require(raisedAmount <= hardCap);
            
            uint tokens = msg.value / tokenPrice;
            balances[msg.sender] += tokens;
            balances[founder] -= tokens;
            deposit.transfer(msg.value);
            
            emit Invest(msg.sender, msg.value, tokens);
            return true;
        }
        
        receive() payable external {
            invest();
        }
        
        function transfer(address to, uint tokens) override public returns (bool success) {
            require(block.timestamp > tokendTradeStart);
             return super.transfer(to, tokens);
        }
        
        function transferFrom(address from, address to, uint tokens) public virtual override returns (bool success) {
            require(block.timestamp > tokendTradeStart);
            return super.transferFrom(from, to, tokens);
        }
        
        function burnTokens() public returns(bool) {
            icoState = getCurrentState();
            require(icoState == State.AfterEnd);
            balances[founder] = 0;
            return true;
        }
        
    }