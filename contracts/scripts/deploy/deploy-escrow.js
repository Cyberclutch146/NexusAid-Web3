const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`\nDeploying NexusEscrow to [${network}]`);
  console.log("Deployer address:", deployer.address);

  const NexusEscrow = await hre.ethers.getContractFactory("NexusEscrow");
  const contract = await NexusEscrow.deploy();
  await contract.waitForDeployment();

  const address = contract.target;
  console.log("\n✅ NexusEscrow deployed to:", address);
  console.log("\n─── Add to your .env.local ────────────────────────────");
  console.log(`NEXT_PUBLIC_ESCROW_CONTRACT=${address}`);
  console.log("────────────────────────────────────────────────────────");

  if (network === "hardhat" || network === "localhost") {
    // Create a demo campaign for local testing
    const tx = await contract.createCampaign(
      "demo-event-001",
      ["Purchase emergency supplies", "Distribute to affected areas", "Final report & audit"]
    );
    await tx.wait();
    console.log("\nDemo campaign created with ID: 0 (3 milestones)");
  } else {
    console.log(`\nView on PolygonScan: https://amoy.polygonscan.com/address/${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
