const { JsonRpcProvider, formatEther } = require("ethers");

async function main() {
  console.log("Checking balance on http://127.0.0.1:8545...");
  try {
    const provider = new JsonRpcProvider("http://127.0.0.1:8545");
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const balance = await provider.getBalance(address);
    console.log(`Balance of ${address}: ${formatEther(balance)} ETH`);
    
    const network = await provider.getNetwork();
    console.log(`Connected to Chain ID: ${network.chainId}`);
  } catch (error) {
    console.error("Failed to connect to local node. Is it running?");
    console.error(error.message);
  }
}

main();
