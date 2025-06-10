// debugInsuranceAgent.js
const { ethers } = require("ethers");
require("dotenv").config();

const CONTRACT_ADDRESS = process.env.CHAINLINK_CONSUMER_ADDRESS;
const ABI = require("./public/Agent").abi;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const insuranceAgent = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// Store request ID for verification
let currentRequestId = null;

async function debugContract() {
  console.log("=== Contract Debug Information ===");
  
  try {
    // Check contract state
    const subscriptionId = await insuranceAgent.subscriptionId();
    const gasLimit = await insuranceAgent.gasLimit();
    const donId = await insuranceAgent.donId();
    
    console.log("Contract State:");
    console.log("- Subscription ID:", subscriptionId.toString());
    console.log("- Gas Limit:", gasLimit.toString());
    console.log("- DON ID:", donId);
    
    // Check wallet balance
    const balance = await wallet.getBalance();
    console.log("- Wallet Balance:", ethers.utils.formatEther(balance), "ETH");
    
    // Check if subscription ID is valid (not 0)
    if (subscriptionId.toString() === "0") {
      console.log("❌ ERROR: Subscription ID is 0 - contract not properly initialized");
      return;
    }
    
    if (donId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      console.log("❌ ERROR: DON ID is empty - contract not properly initialized");
      return;
    }
    
  } catch (error) {
    console.log("❌ ERROR reading contract state:", error.message);
    return;
  }
  
  console.log("\n=== Testing Transaction ===");
  
  // Test with different gas limits and smaller values
  const testParams = {
    loanAmount: 800,
    btcPurchasePrice: 100000,
    premiumInEth: 0.01
  };
  
  try {
    // First, try to estimate gas
    console.log("Estimating gas...");
    const gasEstimate = await insuranceAgent.estimateGas.requestInsurance(
      testParams.loanAmount,
      testParams.btcPurchasePrice,
      {
        value: ethers.utils.parseEther(testParams.premiumInEth.toString())
      }
    );
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Try the actual transaction with higher gas limit
    console.log("Submitting transaction...");
    const tx = await insuranceAgent.requestInsurance(
      testParams.loanAmount,
      testParams.btcPurchasePrice,
      {
        value: ethers.utils.parseEther(testParams.premiumInEth.toString()),
        gasLimit: gasEstimate.mul(2), // Use 2x estimated gas
      }
    );
    
    console.log("✅ Transaction submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // Extract request ID from events
    const requestEvent = receipt.events?.find(e => e.event === 'InsuranceRequested');
    if (requestEvent) {
      currentRequestId = requestEvent.args.requestId;
      console.log("✅ Request ID extracted:", currentRequestId);
    } else {
      console.log("⚠️  Warning: Could not extract request ID from events");
    }
    
  } catch (error) {
    console.log("❌ Transaction failed:");
    console.log("Error message:", error.message);
    
    if (error.reason) {
      console.log("Reason:", error.reason);
    }
    
    if (error.code) {
      console.log("Code:", error.code);
    }
    
    // Try to get more details from the error
    if (error.transaction) {
      console.log("Transaction data:", error.transaction);
    }
  }
}

async function testContractDeployment() {
  console.log("\n=== Checking Contract Deployment ===");
  
  try {
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === "0x") {
      console.log("❌ ERROR: No contract found at address", CONTRACT_ADDRESS);
      console.log("Make sure the contract is deployed to Base Sepolia");
    } else {
      console.log("✅ Contract found at address");
    }
  } catch (error) {
    console.log("❌ ERROR checking contract:", error.message);
  }
}

// ========== VERIFICATION FUNCTIONS ==========

async function verifyFulfillRequest(requestId) {
  console.log("\n=== Verifying Fulfill Request ===");
  
  if (!requestId) {
    console.log("❌ No request ID provided for verification");
    return false;
  }
  
  try {
    // Check if request exists and get its details
    const request = await insuranceAgent.requests(requestId);
    console.log("Request Details:");
    console.log("- User:", request.user);
    console.log("- Loan Amount:", request.loanAmount.toString());
    console.log("- BTC Purchase Price:", request.btcPurchasePrice.toString());
    console.log("- Premium:", ethers.utils.formatEther(request.premium), "ETH");
    console.log("- Processed:", request.processed);
    console.log("- Option Details:", request.optionDetails);
    
    // Check if request was processed
    if (!request.processed) {
      console.log("⏳ Request not yet processed by Chainlink Functions");
      return false;
    }
    
    // Check if option details are populated (successful fulfillment)
    if (request.optionDetails && request.optionDetails.length > 0) {
      console.log("✅ Request successfully fulfilled with option details");
      
      // Try to parse option details as JSON
      try {
        const optionData = JSON.parse(request.optionDetails);
        console.log("Parsed Option Data:");
        console.log("- Order ID:", optionData.orderId);
        console.log("- Instrument Name:", optionData.instrumentName);
        console.log("- Strike Price:", optionData.strikePrice);
        console.log("- Quantity:", optionData.quantity);
        console.log("- Premium Paid:", optionData.premium);
      } catch (parseError) {
        console.log("⚠️  Option details present but not valid JSON:", request.optionDetails);
      }
      
      return true;
    } else {
      console.log("⚠️  Request processed but no option details found");
      return false;
    }
    
  } catch (error) {
    console.log("❌ Error verifying request:", error.message);
    return false;
  }
}

async function checkLastResponse() {
  console.log("\n=== Checking Last Response ===");
  
  try {
    const lastRequestId = await insuranceAgent.s_lastRequestId();
    const lastResponse = await insuranceAgent.s_lastResponse();
    const lastError = await insuranceAgent.s_lastError();
    const lastResponseLength = await insuranceAgent.s_lastResponseLength();
    const lastErrorLength = await insuranceAgent.s_lastErrorLength();
    
    console.log("Last Function Call Details:");
    console.log("- Last Request ID:", lastRequestId);
    console.log("- Last Response:", lastResponse);
    console.log("- Last Error:", lastError);
    console.log("- Response Length:", lastResponseLength.toString());
    console.log("- Error Length:", lastErrorLength.toString());
    
    if (lastErrorLength.toNumber() > 0) {
      console.log("⚠️  Last request had errors");
      return false;
    }
    
    if (lastResponseLength.toNumber() > 0) {
      console.log("✅ Last request completed with response");
      return true;
    }
    
    console.log("⏳ No recent responses found");
    return false;
    
  } catch (error) {
    console.log("❌ Error checking last response:", error.message);
    return false;
  }
}

async function monitorEvents(fromBlock = "latest") {
  console.log("\n=== Monitoring Contract Events ===");
  
  try {
    // Listen for all events
    const filter = {
      address: CONTRACT_ADDRESS,
      fromBlock: fromBlock
    };
    
    const events = await provider.getLogs(filter);
    console.log(`Found ${events.length} events since block ${fromBlock}`);
    
    // Parse events using contract interface
    events.forEach((log, index) => {
      try {
        const parsedLog = insuranceAgent.interface.parseLog(log);
        console.log(`Event ${index + 1}: ${parsedLog.name}`);
        console.log("- Args:", parsedLog.args);
      } catch (error) {
        console.log(`Event ${index + 1}: Unable to parse log`);
      }
    });
    
  } catch (error) {
    console.log("❌ Error monitoring events:", error.message);
  }
}

async function waitForFulfillment(requestId, timeoutMinutes = 5) {
  console.log("\n=== Waiting for Request Fulfillment ===");
  console.log(`Waiting up to ${timeoutMinutes} minutes for request ${requestId} to be fulfilled...`);
  
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const startTime = Date.now();
  const checkInterval = 10000; // Check every 10 seconds
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const request = await insuranceAgent.requests(requestId);
      
      if (request.processed) {
        console.log("✅ Request has been processed!");
        
        if (request.optionDetails && request.optionDetails.length > 0) {
          console.log("✅ Request fulfilled successfully with option details");
          return true;
        } else {
          console.log("⚠️  Request processed but may have failed (no option details)");
          return false;
        }
      }
      
      console.log("⏳ Still waiting... Request not yet processed");
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
    } catch (error) {
      console.log("❌ Error checking request status:", error.message);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  console.log("⏰ Timeout reached - request may still be processing");
  return false;
}

async function comprehensiveVerification() {
  console.log("\n=== Comprehensive Verification ===");
  
  // Check last response first
  await checkLastResponse();
  
  // Monitor recent events
  const currentBlock = await provider.getBlockNumber();
  await monitorEvents(currentBlock - 100); // Check last 100 blocks
  
  // If we have a current request ID, verify it specifically
  if (currentRequestId) {
    console.log(`\nVerifying specific request: ${currentRequestId}`);
    await verifyFulfillRequest(currentRequestId);
    
    // Wait for fulfillment if not yet processed
    const request = await insuranceAgent.requests(currentRequestId);
    if (!request.processed) {
      await waitForFulfillment(currentRequestId, 5);
    }
  } else {
    console.log("No current request ID to verify");
  }
}

async function main() {
  await testContractDeployment();
  await debugContract();
  
  // Add delay to allow for any immediate processing
  console.log("\nWaiting 30 seconds before running verifications...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  await comprehensiveVerification();
}

// Export functions for individual use
module.exports = {
  verifyFulfillRequest,
  checkLastResponse,
  monitorEvents,
  waitForFulfillment,
  comprehensiveVerification
};

if (require.main === module) {
  main()
    .then(() => console.log("\n🎉 Debug and verification complete"))
    .catch(err => console.error("Debug error:", err));
}