const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Whitelist", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployWhitelistFixture() {

    // Contracts are deployed using the first signer/account by default
    const maxWhitelistedAddresses = 255;
    const [owner, otherAccount] = await ethers.getSigners();

    const whitelistContract = await ethers.getContractFactory("Whitelist");
    const deployedWhitelistContract = await whitelistContract.deploy(maxWhitelistedAddresses);

    return { deployedWhitelistContract, maxWhitelistedAddresses, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the correct maximum number of whitelisted addresses", async function () {
      const { deployedWhitelistContract, maxWhitelistedAddresses } = await loadFixture(deployWhitelistFixture);

      expect(await deployedWhitelistContract.maxWhitelistedAddresses()).to.equal(maxWhitelistedAddresses);
    });
  });
  
  describe("addAddressToWhitelist", function () {
    it("Should fail if sender has already been whitelisted", async function () {
      const { deployedWhitelistContract, owner } = await loadFixture(deployWhitelistFixture);
      
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();

      await expect(deployedWhitelistContract.connect(owner).addAddressToWhitelist()).to.be.revertedWith(
          "Sender has already been whitelisted"
        );
    });
        
    it("Should fail if whitelist full", async function () {
      const { deployedWhitelistContract, owner } = await loadFixture(deployWhitelistFixture);
      
      // fill whitelist
      const slot = "0x0";
      const value = ethers.utils.hexlify(ethers.utils.zeroPad(255, 32));
      await ethers.provider.send("hardhat_setStorageAt", [deployedWhitelistContract.address, slot, value]);
      
      
      await expect(deployedWhitelistContract.connect(owner).addAddressToWhitelist()).to.be.revertedWith(
          "Whitelist full"
        );
    });

    it("Should succeed otherwise", async function () {
      const { deployedWhitelistContract, owner } = await loadFixture(deployWhitelistFixture);

	  await deployedWhitelistContract.addAddressToWhitelist();

	  expect(await deployedWhitelistContract.numAddressesWhitelisted()).to.equal(1);
      expect(await deployedWhitelistContract.whitelistedAddresses(owner.address)).to.equal(true);
	});
  });
});

