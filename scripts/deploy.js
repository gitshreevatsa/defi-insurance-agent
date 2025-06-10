// simple-deploy.js
// This assumes you're using Hardhat or have compiled contracts

const { ethers } = require("hardhat"); // or require("ethers") if using standalone

async function main() {
  // Base Sepolia Configuration
  const ROUTER_ADDRESS = process.env.CHAINLINK_ROUTER_ADDRESS || "0xf9B8fc078197181C841c296C876945aaa425B278";
  const SUBSCRIPTION_ID = process.env.CHAINLINK_SUBSCRIPTION_ID || 338;
  const DON_ID = process.env.CHAINLINK_DON_ID || "0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000";

  console.log("Deploying Insurance Agent...");

  // Get the contract factory
  const InsuranceAgent = await ethers.getContractFactory("InsuranceAgent");

  // Deploy the contract
  const insuranceAgent = await InsuranceAgent.deploy(
    ROUTER_ADDRESS,
    SUBSCRIPTION_ID,
    DON_ID
  );

  await insuranceAgent.deployed();

  console.log("✅ Insurance Agent deployed to:", insuranceAgent.address);
  console.log("Transaction hash:", insuranceAgent.deployTransaction.hash);

  // Verify the deployment
  console.log("\nVerifying deployment...");
  console.log("Subscription ID:", await insuranceAgent.subscriptionId());
  console.log("DON ID:", await insuranceAgent.donId());
  console.log("Gas Limit:", await insuranceAgent.gasLimit());

  return insuranceAgent.address;
}

main()
  .then((address) => {
    console.log(`\n✅ Deployment successful!`);
    console.log(`New contract address: ${address}`);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });