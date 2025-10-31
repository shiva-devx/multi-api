import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from './pages/Dashboard';
import GenerateImage from "./pages/GenerateImage";
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 text-gray-900">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/generate-image" element={<GenerateImage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
