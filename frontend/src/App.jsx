import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import CompareBar from './components/CompareBar'
import Home from './pages/Home'
import CarListing from './pages/CarListing'
import CarDetail from './pages/CarDetail'
import Compare from './pages/Compare'
import NotFound from './pages/NotFound'
import { CompareProvider } from './context/CompareContext'

export default function App() {
  return (
    <CompareProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cars" element={<CarListing />} />
            <Route path="/cars/:id" element={<CarDetail />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <CompareBar />
      </div>
    </CompareProvider>
  )
}
