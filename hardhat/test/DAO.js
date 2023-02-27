const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const YAY = 0;
const NAY = 1;

describe("DAO", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployDAOFixture() {

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

    return { deployedDAOContract, deployedTokenContract, deployedNFTContract, deployedMarketplaceContract, deployedWhitelistContract, whitelistAddress, owner, otherAccount };
  }
  
  describe("createProposal", function () {
    it("Should fail if sender in not NFT holder", async function () {
      const { deployedDAOContract, owner } = await loadFixture(deployDAOFixture);
      
      await expect(deployedDAOContract.connect(owner).createProposal(0)).to.be.revertedWith(
        "NOT_A_DAO_MEMBER"
      );
    });
    
    it("Should fail if NFT not available", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      // Buying NFT from marketplace
      await deployedMarketplaceContract.connect(owner).purchase(0, {value: ethers.utils.parseEther("0.01")});
      
      await expect(deployedDAOContract.connect(owner).createProposal(0)).to.be.revertedWith(
        "NFT_NOT_FOR_SALE"
      );
    });
    
    it("Should succeed otherwise", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      
      await deployedDAOContract.connect(owner).createProposal(1);
      expect(await deployedDAOContract.numProposals()).to.be.equal(1);
      
      let proposal = await deployedDAOContract.proposals(0);
      // nftTokenId
      expect(proposal[0]).to.be.equal(1);
      // yayVotes
      expect(proposal[2]).to.be.equal(0);
      // nayVotes
      expect(proposal[3]).to.be.equal(0);
      // executed
      expect(proposal[4]).to.be.equal(false);    
    });
  });
  
  describe("voteOnProposal", function () {
    it("Should correctly update state variables on success", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      await deployedDAOContract.connect(owner).createProposal(1);
      
      await deployedDAOContract.connect(owner).voteOnProposal(0, YAY);
      
      let proposal = await deployedDAOContract.proposals(0);
      // nftTokenId
      expect(proposal[0]).to.be.equal(1);
      // yayVotes
      expect(proposal[2]).to.be.equal(2);
    });
  
    it("Should fail if deadline passed", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      await deployedDAOContract.connect(owner).createProposal(1);
      await time.increase(301);
      
      await expect(deployedDAOContract.connect(owner).voteOnProposal(0, YAY)).to.be.revertedWith(
        "DEADLINE_EXCEEDED"
      );
    });
    
    it("Should fail if user already voted", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
     
      await deployedDAOContract.connect(owner).createProposal(1);
      
      await deployedDAOContract.connect(owner).voteOnProposal(0, YAY);
      
      await expect(deployedDAOContract.connect(owner).voteOnProposal(0, YAY)).to.be.revertedWith(
        "ALREADY_VOTED"
      );
    });
  });
  
  describe("executeProposal", function () {
    it("Should correctly update state variables on success", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      await deployedDAOContract.connect(owner).createProposal(1);
      await deployedDAOContract.connect(owner).voteOnProposal(0, YAY);
      await time.increase(301);
      
      await owner.sendTransaction({to: deployedDAOContract.address, value: ethers.utils.parseEther("1.0")});
      
      expect(await ethers.provider.getBalance(deployedDAOContract.address)).to.be.greaterThan(0);
      
      await deployedDAOContract.connect(owner).executeProposal(0);
      
      let proposal = await deployedDAOContract.proposals(0);
      // nftTokenId
      expect(proposal[0]).to.be.equal(1);
      // executed
      expect(proposal[4]).to.be.equal(true);
    });
    
    it("Should fail if deadline not exceeded", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      await deployedDAOContract.connect(owner).createProposal(1);
      await deployedDAOContract.connect(owner).voteOnProposal(0, NAY);
      
      
      await expect(deployedDAOContract.connect(owner).executeProposal(0)).to.be.revertedWith(
        "DEADLINE_NOT_EXCEEDED"
      );
    });
    
    it("Should fail if not enough funds", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      await deployedDAOContract.connect(owner).createProposal(1);
      await deployedDAOContract.connect(owner).voteOnProposal(0, YAY);
      await time.increase(301);
      
      
      await expect(deployedDAOContract.connect(owner).executeProposal(0)).to.be.revertedWith(
        "NOT_ENOUGH_FUNDS"
      );
    });
    
      it("Should fail if proposal already executed", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner } = await loadFixture(deployDAOFixture);

      // Minting NFT
      await deployedNFTContract.connect(owner).startPresale();
      await time.increase(301);
      await deployedWhitelistContract.connect(owner).addAddressToWhitelist();
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      await deployedNFTContract.connect(owner).mint({value: ethers.utils.parseEther("0.01")});
      
      await deployedDAOContract.connect(owner).createProposal(1);
      await deployedDAOContract.connect(owner).voteOnProposal(0, YAY);
      await time.increase(301);
      
      await owner.sendTransaction({to: deployedDAOContract.address, value: ethers.utils.parseEther("1.0")});
      
      expect(await ethers.provider.getBalance(deployedDAOContract.address)).to.be.greaterThan(0);
      
      await deployedDAOContract.connect(owner).executeProposal(0);
      
      await expect(deployedDAOContract.connect(owner).executeProposal(0)).to.be.revertedWith(
        "PROPOSAL_ALREADY_EXECUTED"
      );
      

    });
  });
  
  describe("withdraw", function () {
    it("Should fail if sender is not Owner", async function () {
      const { deployedDAOContract, owner, otherAccount } = await loadFixture(deployDAOFixture);

      await expect(deployedDAOContract.connect(otherAccount).withdrawEther()).to.be.revertedWith(
          "Ownable: caller is not the owner"
        );
    });
    
    it("should correctly update balances on success", async function () {
      const { deployedDAOContract, deployedNFTContract, deployedWhitelistContract, deployedMarketplaceContract, owner, otherAccount } = await loadFixture(deployDAOFixture);

      let balance = await ethers.provider.getBalance(owner.address);
      expect (await ethers.provider.getBalance(deployedDAOContract.address)).to.be.equal(0);
      
      await otherAccount.sendTransaction({to: deployedDAOContract.address, value: ethers.utils.parseEther("1.0")});
      
      await deployedDAOContract.connect(owner).withdrawEther();
      
      expect (await ethers.provider.getBalance(owner.address)).to.be.greaterThan(balance);
      expect (await ethers.provider.getBalance(deployedDAOContract.address)).to.be.equal(0);
    });
  });
});
