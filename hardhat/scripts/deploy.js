const { ethers } = require("hardhat");
const { fs } = require('fs');

async function main() {
  const whitelistContract = await ethers.getContractFactory("Whitelist");

  const deployedWhitelistContract = await whitelistContract.deploy(10);

  await deployedWhitelistContract.deployed();

  let addrs = [];

  addrs.push("Whitelist Contract Address:" + deployedWhitelistContract.address);

  for (const addr in addrs) { 
    fs.appendFile('./addrs.log', addr, err => { 
	  if (err) {
        console.error(err);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
