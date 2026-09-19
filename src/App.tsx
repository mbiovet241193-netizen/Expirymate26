import React from 'react';
import { AppProvider } from './context/AppContext';
import { RouterProvider, useRouter } from './router/Router';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import ProductBatches from './pages/ProductBatches';
import ShelfLifeCalculator from './pages/ShelfLifeCalculator';
import ReceivingRegister from './pages/ReceivingRegister';
import NonConforming from './pages/NonConforming';
import HealthCertificates from './pages/HealthCertificates';
import Maintenance from './pages/Maintenance';
import ShiftNotes from './pages/ShiftNotes';
import PestControl from './pages/PestControl';
import Training from './pages/Training';
import PersonalHygiene from './pages/PersonalHygiene';
import DeepCleaning from './pages/DeepCleaning';
import Search from './pages/Search';
import Reports from './pages/Reports';
import ReportsArchive from './pages/ReportsArchive';
import Settings from './pages/Settings';
import About from './pages/About';

function RouteSwitch() {
  const { route } = useRouter();
  switch (route) {
    case 'dashboard':
      return <Dashboard />;
    case 'categories':
      return <Categories />;
    case 'products':
      return <Products />;
    case 'batches':
      return <ProductBatches />;
    case 'calculator':
      return <ShelfLifeCalculator />;
    case 'receiving':
      return <ReceivingRegister />;
    case 'nonConforming':
      return <NonConforming />;
    case 'healthCertificates':
      return <HealthCertificates />;
    case 'maintenance':
      return <Maintenance />;
    case 'shiftNotes':
      return <ShiftNotes />;
    case 'pestControl':
      return <PestControl />;
    case 'training':
      return <Training />;
    case 'personalHygiene':
      return <PersonalHygiene />;
    case 'deepCleaning':
      return <DeepCleaning />;
    case 'search':
      return <Search />;
    case 'reports':
      return <Reports />;
    case 'reportsArchive':
      return <ReportsArchive />;
    case 'settings':
      return <Settings />;
    case 'about':
      return <About />;
    default:
      return <Dashboard />;
  }
}

function Shell() {
  return (
    <div className="app-shell">
      <div className="main-area">
        <Header />
        <div className="page-content">
          <RouteSwitch />
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RouterProvider>
        <Shell />
      </RouterProvider>
    </AppProvider>
  );
}
