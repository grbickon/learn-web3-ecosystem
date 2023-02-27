// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface INFT {
	function tokenOfOwnerByIndex(address owner, uint256)
		external
		view
		returns (uint256 tokenId);

	function balanceOf(address owner) external view returns (uint256 balance);
}
