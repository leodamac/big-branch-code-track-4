import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ExpedientesList } from './pages/ExpedientesList';
import { ExpedienteWorkspace } from './pages/ExpedienteWorkspace';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <Navbar />
          <main className="flex-1 w-full">
            <Routes>
              <Route path="/" element={<ExpedientesList />} />
              <Route path="/expedientes/:id" element={<ExpedienteWorkspace />} />
            </Routes>
          </main>
          
          {/* Subtle glow elements */}
          <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
          <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
