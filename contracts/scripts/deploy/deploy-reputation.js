const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`\nDeploying NexusReputation to [${network}]`);
  console.log("Deployer address:", deployer.address);

  const NexusReputation = await hre.ethers.getContractFactory("NexusReputation");
  const contract = await NexusReputation.deploy();
  await contract.waitForDeployment();

  const address = contract.target;
  console.log("\n✅ NexusReputation deployed to:", address);
  console.log("\n─── Add to your .env.local ────────────────────────────");
  console.log(`NEXT_PUBLIC_REPUTATION_CONTRACT=${address}`);
  console.log("────────────────────────────────────────────────────────");

  if (network === "hardhat" || network === "localhost") {
    // Mint a demo badge for the deployer
    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify({
      name: "NexusAid Diamond Badge",
      description: "Awarded to exceptional NexusAid contributors",
      badgeType: "diamond",
      issuer: "NexusAid Platform",
    })).toString("base64")}`;

    const tx = await contract.mintBadge(deployer.address, "diamond", metadataUri);
    await tx.wait();
    console.log(`\nDemo diamond badge minted to deployer: ${deployer.address}`);
  } else {
    console.log(`\nView on PolygonScan: https://amoy.polygonscan.com/address/${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
