import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout.tsx'
import Auswertung from './pages/Auswertung.tsx'
import Betriebskosten from './pages/Betriebskosten.tsx'
import Konto from './pages/Konto.tsx'
import Mietobjekte from './pages/Mietobjekte.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/mietobjekte" replace />} />
          <Route path="mietobjekte" element={<Mietobjekte />} />
          <Route path="betriebskosten" element={<Betriebskosten />} />
          <Route path="konto" element={<Konto />} />
          <Route path="auswertung" element={<Auswertung />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
