import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import CompareBar from './components/CompareBar'
import AuthModal from './components/AuthModal'
import Home from './pages/Home'
import CarListing from './pages/CarListing'
import CarDetail from './pages/CarDetail'
import Compare from './pages/Compare'
import OwnershipCalculator from './pages/OwnershipCalculator'
import Recommendations from './pages/Recommendations'
import ResetPassword from './pages/ResetPassword'
import Favorites from './pages/Favorites'
import NotFound from './pages/NotFound'
import { CompareProvider } from './context/CompareContext'
import { AuthProvider } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CompareProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 pb-14">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cars" element={<CarListing />} />
                <Route path="/cars/:id" element={<CarDetail />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/calculator" element={<OwnershipCalculator />} />
                <Route path="/recommendations" element={<Recommendations />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <CompareBar />
            <AuthModal />
          </div>
        </CompareProvider>
      </FavoritesProvider>
    </AuthProvider>
  )
}
