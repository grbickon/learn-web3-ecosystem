const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("NFT", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTFixture() {

    // Contracts are deployed using the first signer/account by default
    const maxWhitelistedAddresses = 1;
    const [owner, otherAccount] = await ethers.getSigners();

    const whitelistContract = await ethers.getContractFactory("Whitelist");
    const deployedWhitelistContract = await whitelistContract.deploy(maxWhitelistedAddresses);
    const whitelistAddress = deployedWhitelistContract.address;

    const baseURI = ""

    const NFTContract = await ethers.getContractFactory("NFT");
    const deployedNFTContract = await NFTContract.deploy(baseURI, whitelistAddress);

    return { deployedNFTContract, deployedWhitelistContract, whitelistAddress, owner, otherAccount };
  }

  describe("deployment", function () {
    it("Should correctly set state variables", async function () {
      const { deployedNFTContract, whitelistAddress } = await loadFixture(deployNFTFixture);

      // string testing is a pain
      // not sure how to do interface testing
      
      expect(await deployedNFTContract._price()).to.equal(ethers.BigNumber.from("10000000000000000"));
      expect(await deployedNFTContract._paused()).to.equal(false);
      expect(await deployedNFTContract.maxTokenIds()).to.equal(20);
      expect(await deployedNFTContract.tokenIds()).to.equal(0);
      expect(await deployedNFTContract.presaleStarted()).to.equal(false);
      expect(await deployedNFTContract.presaleEnded()).to.equal(0);
    });
  });

  describe("startPresale", function () {
    it("Should fail if sender is not Owner", async function () {
      const { deployedNFTContract, owner, otherAccount } = await loadFixture(deployNFTFixture);

      await expect(deployedNFTContract.connect(otherAccount).startPresale()).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
    });
    
    it("Should succeed otherwise", async function () {
      const { deployedNFTContract, owner, otherAccount } = await loadFixture(deployNFTFixture);

      await deployedNFTContract.connect(owner).startPresale();
      
      expect(await deployedNFTContract.presaleStarted()).to.equal(true);
      
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const timestampAfter = blockAfter.timestamp;

      expect(await deployedNFTContract.presaleEnded()).to.be.greaterThan(0);
      
      
    });
  });
  
  describe("presaleMint", function () {
  
    it("Should correctly update tokenIds", async function () {
    	const { deployedNFTContract, deployedWhitelistContract, owner, otherAccount } = await loadFixture(deployNFTFixture);

      await deployedNFTContract.connect(owner).startPresale();
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).presaleMint({value: ethers.utils.parseEther("0.01")});
      
      expect(await deployedNFTContract.tokenIds()).to.be.equal(1);
      
    });
    
    it("Should fail if paused", async function () {
    	const { deployedNFTContract, owner, otherAccount } = await loadFixture(deployNFTFixture);

      await deployedNFTContract.connect(owner).setPaused(true);
      
      await expect(deployedNFTContract.connect(owner).presaleMint()).to.be.revertedWith(
          "Contract currently paused"
        );
    });
    
    it("Should fail if presale not running", async function () {
      const { deployedNFTContract, owner, otherAccount } = await loadFixture(deployNFTFixture);
      
      await expect(deployedNFTContract.connect(owner).presaleMint()).to.be.revertedWith(
          "Presale not running"
        );
        
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      
      await expect(deployedNFTContract.connect(owner).presaleMint()).to.be.revertedWith(
          "Presale not running"
        );
    });
    
    it("Should fail if user not whitelisted", async function () {
      const { deployedNFTContract, owner, otherAccount } = await loadFixture(deployNFTFixture);
      
      await deployedNFTContract.connect(owner).startPresale();
      
      await expect(deployedNFTContract.connect(owner).presaleMint()).to.be.revertedWith(
          "You are not whitelisted"
        );
    });
    
    it("Should fail if max token limit exceeded", async function () {
      const { deployedNFTContract, deployedWhitelistContract, owner, otherAccount } = await loadFixture(deployNFTFixture);
      
      // Manually reaching token limit since modifying state variable with Hardhat is painful (requires dealing with EVM internals, storage slots)
      // Also max token limit hardcoded to 1 in deployNFTFixture - changing that breaks this test
      await deployedNFTContract.connect(owner).startPresale();
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      for (let i = 0; i < 20; i++) {
        await deployedNFTContract.connect(owner).presaleMint({value: ethers.utils.parseEther("0.01")});
      }     

      await expect(deployedNFTContract.connect(owner).presaleMint({value: ethers.utils.parseEther("0.01")})).to.be.revertedWith(
        "Exceeded maximum Crypto Devs supply"
        );
    });
    
    //TODO
    it("Should fail if Ether sent is not correct", async function () {
      const { deployedNFTContract, deployedWhitelistContract, owner, otherAccount } = await loadFixture(deployNFTFixture);
      
      await deployedNFTContract.connect(owner).startPresale();
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await expect(deployedNFTContract.connect(owner).presaleMint({value: ethers.utils.parseEther("0.001")})).to.be.revertedWith(
        "Ether sent is not correct"
        );
    });
  });
  
  describe("mint", function () {
    it("Should correctly update tokenIds", async function () {
      const { deployedNFTContract, deployedWhitelistContract, owner, otherAccount } = await loadFixture(deployNFTFixture);
    	
    	await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      expect(await deployedNFTContract.tokenIds()).to.be.equal(1);
    });
    
    it("Should fail if presale is running", async function () {
      const { deployedNFTContract, owner, otherAccount } = await loadFixture(deployNFTFixture);
        
      await deployedNFTContract.connect(owner).startPresale();
      
      await expect(deployedNFTContract.connect(owner).mint()).to.be.revertedWith(
          "Presale has not ended yet"
        );
    });
  });
  
  describe("withdraw", function () {
    it("Should fail if sender is not Owner", async function () {
      const { deployedNFTContract, owner, otherAccount } = await loadFixture(deployNFTFixture);

      await expect(deployedNFTContract.connect(otherAccount).withdraw()).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
    });
    
    it("Should suceed otherwise", async function () {
      const { deployedNFTContract, deployedWhitelistContract, owner, otherAccount } = await loadFixture(deployNFTFixture);

      let balance = await ethers.provider.getBalance(owner.address);
      expect (await ethers.provider.getBalance(deployedNFTContract.address)).to.be.equal(0);
      
      await deployedNFTContract.connect(owner).startPresale();
      await deployedWhitelistContract.connect(otherAccount).addAddressToWhitelist();
      await deployedNFTContract.connect(otherAccount).presaleMint({value: ethers.utils.parseEther("0.01")});

      await deployedNFTContract.connect(owner).withdraw();
      
      expect (await ethers.provider.getBalance(owner.address)).to.be.greaterThan(balance);
      expect (await ethers.provider.getBalance(deployedNFTContract.address)).to.be.equal(0);
      
    });
  });
});
