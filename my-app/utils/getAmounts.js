import { Contract } from "ethers";
import {
	EXCHANGE_CONTRACT_ABI,
	EXCHANGE_CONTRACT_ADDRESS,
	TOKEN_CONTRACT_ABI,
	TOKEN_CONTRACT_ADDRESS,
} from "../constants";

export const getEtherBalance = async (provider, address, contract = false) => {
	try {
		// if contract then get exchange balance else get address balance
		const addr = contract ? EXCHANGE_CONTRACT_ADDRESS : address;
		const balance = await provider.getBalance(addr);
		return balance;
	} catch (e) {
		console.error(e);
		return 0;
	}
};

export const getCDTokensBalance = async (provider, address) => {
	try {
		const tokenContract = new Contract(
			TOKEN_CONTRACT_ADDRESS,
			TOKEN_CONTRACT_ABI,
			provider
		);
		const balanceOfCryptoDevTokens = await tokenContract.balanceOf(address);
		return balanceOfCryptoDevTokens;

	} catch (e) {
		console.error(e);
	}
};

export const getLPTokensBalance = async (provider, address) => {
	try {
		const exchangeContract = new Contract(
			EXCHANGE_CONTRACT_ADDRESS,
			EXCHANGE_CONTRACT_ABI,
			provider
		);
		const balanceOfLPTokens = await exchangeContract.balanceOf(address);
		return balanceOfLPTokens;
	} catch (err) {
		console.error(err);
	}
};

export const getReserveOfCDTokens = async (provider) => {
	try {
		const exchangeContract = new Contract(
			EXCHANGE_CONTRACT_ADDRESS,
			EXCHANGE_CONTRACT_ABI,
			provider
		);
		const reserve = await exchangeContract.getReserve();
		return reserve;
	} catch (e) {
		console.error(e);
	}
};
