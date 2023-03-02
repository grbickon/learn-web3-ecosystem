import Navbar from './Navbar.js';
import Footer from './Footer.js';

const Layout = ({ children }) => {
  return (
    <div>
      <Navbar />
      { children }
      <Footer />
    </div>
  );
}

export default Layout;