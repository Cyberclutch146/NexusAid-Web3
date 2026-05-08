const { ethers } = require("hardhat");

async function main() {
  const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const balance = await ethers.provider.getBalance(address);
  console.log("Balance of", address, ":", ethers.formatEther(balance));
}

main().catch(console.error);
