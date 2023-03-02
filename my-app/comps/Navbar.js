import Link from 'next/link'

const Navbar = () => {
  return (
    <nav>
      <Link href="/">Whitelist</Link>
      <Link href="/nft">NFT</Link>
      <Link href="/token">Token</Link>
      <Link href="/dao">DAO</Link>
      <Link href="/dex">DEX</Link>
    </nav>
  );
}

export default Navbar;