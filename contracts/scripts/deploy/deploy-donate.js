const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`\nDeploying NexusDonate to [${network}]`);
  console.log("Deployer address:", deployer.address);

  const NexusDonate = await hre.ethers.getContractFactory("NexusDonate");
  const contract = await NexusDonate.deploy();
  await contract.waitForDeployment();

  const address = contract.target;
  console.log("\n✅ NexusDonate deployed to:", address);
  console.log("\n─── Update your .env.local ───────────────────────────");
  console.log(`NEXT_PUBLIC_DONATE_CONTRACT=${address}`);
  console.log("──────────────────────────────────────────────────────");

  if (network === "hardhat" || network === "localhost") {
    // Create a test campaign on local node so there's something to donate to immediately
    const tx = await contract.createCampaign("demo-event-001", "");
    await tx.wait();
    console.log("\nTest campaign created with ID: 0 (linked to: demo-event-001)");
  } else {
    console.log(`\nView on PolygonScan: https://amoy.polygonscan.com/address/${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
