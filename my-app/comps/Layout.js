import Navbar from './Navbar.js';

const Layout = ({ children }) => {
  return (
    <div>
      <Navbar />
      { children }
    </div>
  );
}

export default Layout;