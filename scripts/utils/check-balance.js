const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Key in .env.local address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Key in .env.local balance (MATIC):", ethers.formatEther(balance));

  const userKey = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const userWallet = new ethers.Wallet(userKey, ethers.provider);
  console.log("User-provided key address:", userWallet.address);
  const userBalance = await ethers.provider.getBalance(userWallet.address);
  console.log("User-provided key balance (MATIC):", ethers.formatEther(userBalance));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
