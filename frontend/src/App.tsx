import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout.tsx'
import AnlageV from './pages/AnlageV.tsx'
import Deckungsbeitrag from './pages/Deckungsbeitrag.tsx'
import Konto from './pages/Konto.tsx'
import Kostenarten from './pages/Kostenarten.tsx'
import LieferantDetail from './pages/LieferantDetail.tsx'
import Lieferanten from './pages/Lieferanten.tsx'
import Mieter from './pages/Mieter.tsx'
import MietobjektDetail from './pages/MietobjektDetail.tsx'
import Mietobjekte from './pages/Mietobjekte.tsx'
import Rechnungen from './pages/Rechnungen.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/mietobjekte" replace />} />
          <Route path="mietobjekte" element={<Mietobjekte />} />
          <Route path="mietobjekte/:id" element={<MietobjektDetail />} />
          <Route path="mieter" element={<Mieter />} />
          <Route path="kosten">
            <Route index element={<Navigate to="/kosten/rechnungen" replace />} />
            <Route path="rechnungen" element={<Rechnungen />} />
            <Route path="kostenarten" element={<Kostenarten />} />
            <Route path="lieferanten" element={<Lieferanten />} />
            <Route path="lieferanten/:id" element={<LieferantDetail />} />
          </Route>
          <Route path="konto" element={<Konto />} />
          <Route path="auswertung">
            <Route index element={<Navigate to="/auswertung/deckungsbeitrag" replace />} />
            <Route path="deckungsbeitrag" element={<Deckungsbeitrag />} />
            <Route path="anlage-v" element={<AnlageV />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
