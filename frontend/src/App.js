import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Juegos from "./pages/Juegos";
import InsertarJuego from "./pages/InsertarJuego";
import Auditoria from "./pages/Auditoria";
import Consultas from "./pages/Consultas";
import EditarJuegoConcurrencia from "./pages/EditarJuegoConcurrencia";


function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);

  return (
    <Router>
      <Navbar />
      <div className="p-4">
        <Routes>
          <Route path="/" element={<Home setUsuarioActual={setUsuarioActual} />} />
          <Route path="/juegos" element={<Juegos usuario={usuarioActual} />} />
          <Route path="/insertar" element={<InsertarJuego usuario={usuarioActual} />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="/consultas" element={<Consultas />} />
          <Route path="/editar-concurrencia" element={<EditarJuegoConcurrencia/>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
