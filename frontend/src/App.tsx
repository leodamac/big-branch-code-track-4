import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ExpedientesList } from './pages/ExpedientesList';
import { ExpedienteWorkspace } from './pages/ExpedienteWorkspace';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-white text-ink-800">
          <Navbar />
          <main className="flex-1 w-full">
            <Routes>
              <Route path="/" element={<ExpedientesList />} />
              <Route path="/expedientes/:id" element={<ExpedienteWorkspace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
