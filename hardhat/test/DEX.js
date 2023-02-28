const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const YAY = 0;
const NAY = 1;

describe("DEX", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployDEXFixture() {

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
    
    const MarketplaceContract = await ethers.getContractFactory("FakeNFTMarketplace");
    const deployedMarketplaceContract = await MarketplaceContract.deploy();
    
    const DAOContract = await ethers.getContractFactory("DAO");
    const deployedDAOContract = await DAOContract.deploy(deployedMarketplaceContract.address, deployedNFTContract.address);
    
    const DEXContract = await ethers.getContractFactory("DEX");
    const deployedDEXContract = await DEXContract.deploy(deployedTokenContract.address);

    return { deployedDEXContract, deployedDAOContract, deployedTokenContract, deployedNFTContract, deployedMarketplaceContract, deployedWhitelistContract, whitelistAddress, owner, otherAccount };
  }
  
  describe("deployment", function () {
    it("should fail if token address is null", async function () {
      const DEXContract = await ethers.getContractFactory("DEX");
      await  expect(DEXContract.deploy(ethers.constants.AddressZero)).to.be.revertedWith(
        "Token address passed is a null address"
      );
    });
  });
  
  describe("addLiquidity", function () {
    it("should fail if amount of tokens sent is less than minimum", async function () {
      const { deployedDEXContract, deployedTokenContract, owner } = await loadFixture(deployDEXFixture);
      
      await deployedTokenContract.connect(owner).mint(100, {value: ethers.utils.parseEther("0.2")});
      
      await deployedTokenContract.connect(owner).approve(deployedDEXContract.address, 100000000);
      
      await deployedDEXContract.connect(owner).addLiquidity(150, {value: ethers.utils.parseEther("0.2")});
      
      
      // await expect(deployedDEXContract.connect(owner).addLiquidity(150, {value: ethers.utils.parseEther("0.2")})).to.emit(deployedDEXContract, "Event");
      
      await expect(deployedDEXContract.connect(owner).addLiquidity(1, {value: ethers.utils.parseEther("100")})).to.be.revertedWith(
        "Amount of tokens sent is less than the minimum tokens required"
      );
    });
  });
  
  describe("removeLiquidity", function () {
    it("should fail if amount of tokens is less than zero", async function () {
      const { deployedDEXContract, deployedTokenContract, owner } = await loadFixture(deployDEXFixture);
      
      await deployedTokenContract.connect(owner).mint(100, {value: ethers.utils.parseEther("0.2")});
      
      await expect(deployedDEXContract.connect(owner).removeLiquidity(0)).to.be.revertedWith(
        "_amount should be greater than zero"
      );
    });
    
    it("should correctly update balances on success", async function () {
      const { deployedDEXContract, deployedTokenContract, owner } = await loadFixture(deployDEXFixture);
      
      await deployedTokenContract.connect(owner).mint(100, {value: ethers.utils.parseEther("0.2")});
      
      await deployedTokenContract.connect(owner).approve(deployedDEXContract.address, 100000000);
      
      await deployedDEXContract.connect(owner).addLiquidity(1000, {value: ethers.utils.parseEther("100")});
      
      let balance = await ethers.provider.getBalance(deployedDEXContract.address);
      await deployedDEXContract.connect(owner).removeLiquidity(100);
      expect (await ethers.provider.getBalance(deployedDEXContract.address)).to.be.lessThan(balance);
    });
  });
  
  describe("getAmountOfTokens", function () {
    it("should fail if invalid reserve", async function () {
      const { deployedDEXContract, deployedTokenContract, owner } = await loadFixture(deployDEXFixture);
      
      await expect(deployedDEXContract.connect(owner).getAmountOfTokens(0,0,0)).to.be.revertedWith(
        "invalid reserves"
      );
    });
  });

  describe("ethToToken", function () {
    it("should fail if insufficient output amount", async function () {
      const { deployedDEXContract, deployedTokenContract, owner } = await loadFixture(deployDEXFixture);
      
      await deployedTokenContract.connect(owner).mint(100, {value: ethers.utils.parseEther("0.2")});
      
      await deployedTokenContract.connect(owner).approve(deployedDEXContract.address, 100000000);
      
      await deployedDEXContract.connect(owner).addLiquidity(1000, {value: ethers.utils.parseEther("100")});
      
      await expect(deployedDEXContract.connect(owner).ethToToken(10000000000)).to.be.revertedWith(
        "insufficient output amount"
      );
    });
  });
  
  describe("tokenToEth", function () {
    it("should fail if insufficient output amount", async function () {
      const { deployedDEXContract, deployedTokenContract, owner } = await loadFixture(deployDEXFixture);
      
      await deployedTokenContract.connect(owner).mint(100, {value: ethers.utils.parseEther("0.2")});
      
      await deployedTokenContract.connect(owner).approve(deployedDEXContract.address, 100000000);
      
      await deployedDEXContract.connect(owner).addLiquidity(10, {value: ethers.utils.parseEther("1")});
      
      await expect(deployedDEXContract.connect(owner).tokenToEth(0, 1000000000000000)).to.be.revertedWith(
        "insufficient output amount"
      );
    });
  });
});
