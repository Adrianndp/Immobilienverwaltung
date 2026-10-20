import { BrowserRouter, Route, Routes } from 'react-router'
import Layout from './components/Layout.tsx'
import Betriebskosten from './pages/Betriebskosten.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Konto from './pages/Konto.tsx'
import Mietobjekte from './pages/Mietobjekte.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="mietobjekte" element={<Mietobjekte />} />
          <Route path="betriebskosten" element={<Betriebskosten />} />
          <Route path="konto" element={<Konto />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
