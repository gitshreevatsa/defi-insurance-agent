# DeFi Insurance Agent

A sophisticated automated insurance solution for lending and borrowing protocols, powered by Chainlink Functions and Deribit options trading. This tool provides seamless protection for cryptocurrency loans by automatically purchasing put options to hedge against price volatility.

## 🚀 Overview

The DeFi Insurance Agent revolutionizes how users protect their cryptocurrency loans by automating the entire insurance process. When you take out a loan against Bitcoin collateral, this agent automatically calculates the optimal insurance coverage and purchases put options on Deribit to protect against downside risk.

### Key Features

- **Automated Risk Assessment**: Calculates optimal insurance coverage based on loan parameters
- **Real-time Price Integration**: Fetches current BTC prices using Chainlink oracles
- **Seamless Options Trading**: Automatically executes put option orders on Deribit
- **Smart Contract Integration**: Fully on-chain execution with transparent tracking
- **Event-driven Architecture**: Complete audit trail of all insurance activities

## 🎯 How It Works

1. **Input Parameters**: Specify loan amount (USD), BTC purchase price, and premium budget
2. **Price Discovery**: Chainlink Functions fetch current BTC market price
3. **Risk Calculation**: Algorithm determines optimal put option parameters
4. **Option Execution**: Automatically places put option order on Deribit
5. **Confirmation**: Returns detailed order information and coverage details

### Example Workflow

```
Loan Amount: $800 USD
BTC Purchase Price: $100,000
Premium Budget: 0.01 ETH

→ Current BTC Price: $99,000 (fetched via Chainlink)
→ Put Option Created: BTC-13JUN25-99000-P
→ Coverage: 0.1 BTC quantity
→ Premium Paid: 0.015 BTC
→ Order ID: 49753783149
```

## 🛠 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Ethereum wallet with testnet funds
- Deribit account (testnet recommended for development)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd defi-insurance-agent
npm install
```

### Step 2: Environment Configuration

Create a `.env` file in the root directory by using the provided `.env.example` as a template.

### Step 3: Account Setup

#### 3.1 Create Deribit Account
1. Visit [Deribit](https://test.deribit.com) (testnet) or [Deribit Live](https://www.deribit.com)
2. Complete account registration and verification
3. Navigate to API settings and generate API credentials
4. Enable options trading permissions

#### 3.2 Setup Chainlink Functions
1. Visit [Chainlink Functions](https://functions.chain.link)
2. Create a new subscription
3. Fund your subscription with LINK tokens
4. Note your subscription ID for environment variables

### Step 4: Deploy and Setup Smart Contract

```bash
# Add Deribit API secrets to Chainlink Functions
npx hardhat functions-upload-insurance-secrets-don --network base-sepolia

# Deploy the insurance contract
npx hardhat run scripts/deploy.js --network base-sepolia

# Note the deployed contract address for your .env file
```

### Step 5: Configure Chainlink Consumer

1. Go to your Chainlink Functions subscription dashboard
2. Add your deployed contract address to the consumers list
3. Ensure sufficient LINK balance for function calls

### Step 6: Test Insurance Agent

```bash
# Run the insurance agent
node callInsuranceAgent.js

# Expected output: Transaction confirmation and option details
=== Checking Contract Deployment ===
✅ Contract found at address
=== Contract Debug Information ===
Contract State:
- Subscription ID: 338
- Gas Limit: 300000
- DON ID: 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000
- Wallet Balance: 1.655809815006714371 ETH
=== Testing Transaction ===
Estimating gas...
Gas estimate: 592671
Submitting transaction...
✅ Transaction submitted: 0x998d92ebc044de1ffcf0bf9ebd725bf752708e3b8fbaa636e0a86a348763a83a
✅ Transaction confirmed in block: 26909920
✅ Request ID extracted: 0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484
Waiting 30 seconds before running verifications...
=== Comprehensive Verification ===
=== Checking Last Response ===
Last Function Call Details:
- Last Request ID: 0x0000000000000000000000000000000000000000000000000000000000000000
- Last Response: 0x7b226f726465724964223a223439373533373833313439222c22696e73747275
- Last Error: 0x0000000000000000000000000000000000000000000000000000000000000000
- Response Length: 115
- Error Length: 0
❌ Error checking last response: lastErrorLength.toNumber is not a function
=== Monitoring Contract Events ===
Found 4 events since block 26909838
Event 1: RequestSent
- Args: [
  '0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484',
  id: '0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484'
]
Event 2: InsuranceRequested
- Args: [
  '0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484',
  '0x788Bbf4fC1aCd8878486429de7B204fFaA949090',
  BigNumber { *hex: '0x0186a0', *isBigNumber: true },
  requestId: '0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484',
  user: '0x788Bbf4fC1aCd8878486429de7B204fFaA949090',
  btcPrice: BigNumber { *hex: '0x0186a0', *isBigNumber: true }
]
Event 3: InsurancePurchased
- Args: [
  '0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484',
  '{"orderId":"49753783149","instrumentName":"BTC-13JUN25-99000-P","strikePrice":99000,"quantity":0.1,"premium":0.015}',
  requestId: '0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484',
  optionDetails: '{"orderId":"49753783149","instrumentName":"BTC-13JUN25-99000-P","strikePrice":99000,"quantity":0.1,"premium":0.015}'
]
Event 4: RequestFulfilled
- Args: [
  '0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484',
  id: '0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484'
]
Verifying specific request: 0x188499b0850097715deec3ee986778d0ed562a7e41ad0fd02c8f8f1ec4b67484
=== Verifying Fulfill Request ===
Request Details:
- User: 0x788Bbf4fC1aCd8878486429de7B204fFaA949090
- Loan Amount: 800
- BTC Purchase Price: 100000
- Premium: 0.01 ETH
- Processed: true
- Option Details: {"orderId":"49753783149","instrumentName":"BTC-13JUN25-99000-P","strikePrice":99000,"quantity":0.1,"premium":0.015}
✅ Request successfully fulfilled with option details
Parsed Option Data:
- Order ID: 49753783149
- Instrument Name: BTC-13JUN25-99000-P
- Strike Price: 99000
- Quantity: 0.1
- Premium Paid: 0.015
🎉 Debug and verification complete
```

## 📋 Usage

### Basic Usage

Modify the test parameters in your debug contract function inside callInsuranceAgent.js:

```javascript
// Example parameters
const loanAmount = 800;        // USD amount of loan
const btcPriceWhenBought = 100000;  // BTC price when position opened
const premium = 0.01;          // Maximum premium willing to pay (BTC)

// Execute insurance purchase
node callInsuranceAgent.js
```


## 🔍 Monitoring & Verification

The system provides comprehensive logging and event tracking:

### Event Types

- **RequestSent**: Insurance request initiated
- **InsuranceRequested**: Parameters validated and processed
- **InsurancePurchased**: Put option successfully created
- **RequestFulfilled**: Complete process confirmation

## 💡 Use Cases

### Lending Protocol Integration

- **Collateral Protection**: Automatically insure Bitcoin collateral in lending protocols
- **Liquidation Prevention**: Put options provide downside protection to avoid liquidation
- **Risk Management**: Standardized insurance for institutional lending platforms

### DeFi Portfolio Management  

- **Automated Hedging**: Set-and-forget protection for long-term positions
- **Cost-Effective Insurance**: Programmatic options trading reduces manual overhead
- **Transparent Coverage**: On-chain verification of all insurance activities

### Institutional Applications

- **Treasury Management**: Protect corporate Bitcoin holdings
- **Fund Operations**: Automated risk management for crypto funds
- **Compliance**: Auditable insurance processes for regulatory requirements

## 🔧 Technical Architecture

### Smart Contract Components

- **Insurance.sol**: Main contract handling Chainlink Functions integration
- **FunctionsClient**: Chainlink Functions consumer implementation
- **Event System**: Comprehensive logging and state tracking

### External Integrations

- **Chainlink Price Feeds**: Real-time BTC price data
- **Deribit API**: Options trading execution
- **Ethereum Network**: Smart contract deployment and execution

### Security Features

- **Access Control**: Owner-only administrative functions
- **Input Validation**: Parameter sanitization and bounds checking
- **Error Handling**: Graceful failure modes and recovery mechanisms

## 🚨 Important Notes

### Testnet vs Mainnet

- **Development**: Use Deribit testnet and Ethereum testnets
- **Production**: Ensure proper testing before mainnet deployment
- **API Keys**: Never commit real API credentials to version control

### Risk Considerations

- **Smart Contract Risk**: Code audits recommended for production use
- **Options Risk**: Put options have expiration dates and premium costs
- **Oracle Risk**: Price feed dependencies on Chainlink network health

### Cost Management

- **LINK Tokens**: Maintain sufficient balance for Chainlink Functions
- **Gas Optimization**: Monitor and optimize transaction costs
- **Premium Budgets**: Set appropriate limits for options premiums

## 📞 Support

For technical support or integration assistance:

- Review event logs for detailed error information
- Verify all environment variables are correctly set
- Ensure sufficient balances in all accounts (ETH, LINK, options margin)
- Check Chainlink Functions subscription status

## 🔗 Resources

- [Chainlink Functions Documentation](https://docs.chain.link/chainlink-functions)
- [Deribit API Documentation](https://docs.deribit.com/)
- [Ethereum Development Tools](https://ethereum.org/en/developers/)

---

*This tool is designed for educational and development purposes. Please ensure proper testing and risk assessment before using in production environments.*