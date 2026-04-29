async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying NexusDonate with:", deployer.address);

  const NexusDonate = await ethers.getContractFactory("NexusDonate");
  const contract = await NexusDonate.deploy();
  await contract.waitForDeployment();

  const address = contract.target;
  console.log("NexusDonate deployed to:", address);
  console.log("");
  console.log("─── Add this to your .env.local ───");
  console.log(`NEXT_PUBLIC_DONATE_CONTRACT=${address}`);

  // Create a test campaign so there's something to donate to
  const tx = await contract.createCampaign("demo-event-001");
  await tx.wait();
  console.log("");
  console.log("Test campaign created with ID: 0");
  console.log("Linked to Firebase event: demo-event-001");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
