const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Token", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTokenFixture() {

    // Contracts are deployed using the first signer/account by default
    const maxWhitelistedAddresses = 1;
    const [owner, otherAccount] = await ethers.getSigners();

    const whitelistContract = await ethers.getContractFactory("Whitelist");
    const deployedWhitelistContract = await whitelistContract.deploy(maxWhitelistedAddresses);
    const whitelistAddress = deployedWhitelistContract.address;

    const baseURI = ""

    const NFTContract = await ethers.getContractFactory("NFT");
    const deployedNFTContract = await NFTContract.deploy(baseURI, whitelistAddress);
    
    const TokenContract = await ethers.getContractFactory("Token");
    const deployedTokenContract = await TokenContract.deploy(deployedNFTContract.address);

    return { deployedTokenContract, deployedNFTContract, deployedWhitelistContract, whitelistAddress, owner, otherAccount };
  }
  
  describe("deployment", function () {
    it("Should correctly set state variables", async function () {
      const { deployedTokenContract } = await loadFixture(deployTokenFixture);

      
      expect(await deployedTokenContract.tokenPrice()).to.equal(ethers.utils.parseEther("0.001"));
      expect(await deployedTokenContract.tokensPerNFT()).to.equal(ethers.BigNumber.from("10000000000000000000"));
      expect(await deployedTokenContract.maxTotalSupply()).to.equal(ethers.BigNumber.from("10000000000000000000000"));

    });
  });
  
  describe("mint", function () {
    it("Should fail if ether sent is incorrect", async function () {
      const { deployedTokenContract, owner } = await loadFixture(deployTokenFixture);

      
      await expect(deployedTokenContract.connect(owner).mint(100)).to.be.revertedWith(
        "Ether sent is incorrect"
      );
    });
    
    it("Should fail if exceeds supply available", async function () {
      const { deployedTokenContract, owner } = await loadFixture(deployTokenFixture);

      
      await expect(deployedTokenContract.connect(owner).mint(100000, {value: ethers.utils.parseEther("100")})).to.be.revertedWith(
        "Exceeds the max total supply available"
      );
    });
    
    it("Should succeed otherwise", async function () {
      const { deployedTokenContract, owner } = await loadFixture(deployTokenFixture);

      
      await deployedTokenContract.connect(owner).mint(100, {value: ethers.utils.parseEther("1")});
    });
  });
  
  describe("claim", function () {
    it("Should fail if sender does not own any NFTs", async function () {
      const { deployedTokenContract, owner } = await loadFixture(deployTokenFixture);

      await expect(deployedTokenContract.connect(owner).claim()).to.be.revertedWith(
        "You don't own any NFTs"
      );
    });
    
    it("Should fail if sender has claimed their NFTs", async function () {
      const { deployedTokenContract, deployedNFTContract, deployedWhitelistContract, owner } = await loadFixture(deployTokenFixture);
      
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);

      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      await deployedTokenContract.connect(owner).claim();

      await expect(deployedTokenContract.connect(owner).claim()).to.be.revertedWith(
	    "You have already claimed all the tokens"
      );
    });
    
    it("Should suceed otherwise", async function () {
      const { deployedTokenContract, deployedNFTContract, deployedWhitelistContract, owner } = await loadFixture(deployTokenFixture);
      
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);

      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      await deployedTokenContract.connect(owner).claim();

    });
  });
  
  
  
  describe("withdraw", function () {
    it("Should fail if contract balance is empty", async function () {
      const { deployedTokenContract, owner } = await loadFixture(deployTokenFixture);

      await expect(deployedTokenContract.connect(owner).withdraw()).to.be.revertedWith(
        "Nothing to withdraw; contract balance empty"
      );
    });
    
    it("Should fail if sender is not Owner", async function () {
      const { deployedTokenContract, owner, otherAccount } = await loadFixture(deployTokenFixture);

      await expect(deployedTokenContract.connect(otherAccount).withdraw()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    
    it("Should succeed otherwise", async function () {
      const { deployedTokenContract, owner, otherAccount } = await loadFixture(deployTokenFixture);

      let balance = await ethers.provider.getBalance(owner.address);
      await deployedTokenContract.connect(otherAccount).mint(100, {value: ethers.utils.parseEther("1")});
      
      await deployedTokenContract.connect(owner).withdraw();
      
      expect (await ethers.provider.getBalance(owner.address)).to.be.greaterThan(balance);
      expect (await ethers.provider.getBalance(deployedTokenContract.address)).to.be.equal(0);
    });
  });
});
