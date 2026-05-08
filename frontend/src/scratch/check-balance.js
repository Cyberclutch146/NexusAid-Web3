const { ethers } = require("ethers");
require("dotenv").config({ path: ".env.local" });

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("No DEPLOYER_PRIVATE_KEY in .env.local");
    return;
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log("Deployer Address:", wallet.address);

  // Use a fallback RPC or the one from env if set (but wait, .env.local points to localhost right now, so let's use the real Amoy RPC for this check)
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance on Amoy:", ethers.formatEther(balance), "MATIC");
  } catch (error) {
    console.error("Error fetching balance:", error.message);
  }
}

main();
