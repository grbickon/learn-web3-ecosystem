//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Whitelist {
	uint8 public numAddressesWhitelisted;

	uint8 public maxWhitelistedAddresses;
	
	mapping(address => bool) public whitelistedAddresses;

	constructor(uint8 _maxWhitelistedAddresses) {
		maxWhitelistedAddresses = _maxWhitelistedAddresses;
	}

	function addAddressToWhitelist() public {
		require(!whitelistedAddresses[msg.sender], "Sender has already been whitelisted");
		require(numAddressesWhitelisted < maxWhitelistedAddresses, "Whitelist full");

		whitelistedAddresses[msg.sender] = true;
		numAddressesWhitelisted += 1;
	}
}
