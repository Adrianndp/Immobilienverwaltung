import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout.tsx'
import Auswertung from './pages/Auswertung.tsx'
import Konto from './pages/Konto.tsx'
import Kosten from './pages/Kosten.tsx'
import Mieter from './pages/Mieter.tsx'
import MietobjektDetail from './pages/MietobjektDetail.tsx'
import Mietobjekte from './pages/Mietobjekte.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/mietobjekte" replace />} />
          <Route path="mietobjekte" element={<Mietobjekte />} />
          <Route path="mietobjekte/:id" element={<MietobjektDetail />} />
          <Route path="mieter" element={<Mieter />} />
          <Route path="kosten" element={<Kosten />} />
          <Route path="konto" element={<Konto />} />
          <Route path="auswertung" element={<Auswertung />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
