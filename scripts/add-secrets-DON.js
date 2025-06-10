const { SecretsManager } = require("@chainlink/functions-toolkit");
const { networks } = require("../networks");
const { task, types } = require("hardhat/config");
const dotenv = require("dotenv");
// const ethers = require("ethers");
dotenv.config();

/**
 * Usage example:
 * npx hardhat functions-upload-insurance-secrets-don --network base-sepolia
 */
task(
  "functions-upload-insurance-secrets-don",
  "Encrypts Deribit secrets and uploads them to the DON for InsuranceAgent contract"
)
  .addOptionalParam(
    "ttl",
    "Time to live - minutes until the secrets hosted on the DON expire (defaults to 10, and must be at least 5)",
    10,
    types.int
  )
  .setAction(async (taskArgs, hre) => {
    const networkName = hre.network.name;

    const { ethers } = hre;

    const signers = await ethers.getSigners();
    console.log(signers);
    const signer = signers[0];

    // const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`Using signer: ${signer.address} on network: ${networkName}`);
    const functionsRouterAddress = networks[networkName]["functionsRouter"];
    const donId = networks[networkName]["donId"];
    const gatewayUrls = networks[networkName]["gatewayUrls"];

    const slotId = 0;
    const minutesUntilExpiration = taskArgs.ttl;

    const secrets = {
      deribitClientSecret: process.env.DERIBIT_CLIENT_SECRET ,
      deribitClientId: process.env.DERIBIT_CLIENT_ID,
    };

    const secretsManager = new SecretsManager({
      signer,
      functionsRouterAddress,
      donId,
    });
    await secretsManager.initialize();

    console.log("Encrypting insurance secrets and uploading to DON...");
    const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

    console.log(
      `Encrypted secrets: ${encryptedSecretsObj.encryptedSecrets}`
    );

    const {
      version,
      success,
    } = await secretsManager.uploadEncryptedSecretsToDON({
      encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
      gatewayUrls,
      slotId,
      minutesUntilExpiration,
    });

    if (success) {
      console.log(
        `\nSuccess! Use slotId ${slotId} and version ${version} in your insurance contract requests.`
      );
    } else {
      console.error("Upload failed.");
    }
  });