import { Routes, Route, Link } from 'react-router-dom';
import VendorList from './pages/VendorList.jsx';
import VendorDetail from './pages/VendorDetail.jsx';
import AddVendor from './pages/AddVendor.jsx';

export default function App() {
  return (
    <div className="container">
      <header>
        <h1>VendorIQ</h1>
        <nav>
          <Link to="/">Vendors</Link> | <Link to="/vendors/new">Add vendor</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<VendorList />} />
        <Route path="/vendors/new" element={<AddVendor />} />
        <Route path="/vendors/:id" element={<VendorDetail />} />
      </Routes>
    </div>
  );
}

