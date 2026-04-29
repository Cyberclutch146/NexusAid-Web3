async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  const Contract = await ethers.getContractFactory("NexusAidTest");
  const contract = await Contract.deploy("Hello NexusAid");

  await contract.waitForDeployment();

  console.log("Deployed to:", contract.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
