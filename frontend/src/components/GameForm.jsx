import React, { useState, useEffect } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";

const GameForm = () => {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [rating, setRating] = useState("");

  const [generos, setGeneros] = useState([]);
  const [plataformas, setPlataformas] = useState([]);

  const [generosSeleccionados, setGenerosSeleccionados] = useState([]);
  const [plataformasSeleccionadas, setPlataformasSeleccionadas] = useState([]);
  const [desarrolladoresSeleccionados, setDesarrolladoresSeleccionados] = useState([]);
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      const endpoints = [
        { url: "http://localhost:5000/api/generos", setter: setGeneros },
        { url: "http://localhost:5000/api/plataformas", setter: setPlataformas },
      ];
      for (const { url, setter } of endpoints) {
        try {
          const res = await fetch(url);
          const data = await res.json();
          setter(data);
        } catch (error) {
          console.error("Error al cargar datos:", error);
        }
      }
    };
    cargarDatos();
  }, []);

  const cargarOpciones = async (inputValue, tipo) => {
    const res = await fetch(`http://localhost:5000/api/${tipo}?q=${inputValue}`);
    const data = await res.json();
    return data.map((item) => ({ value: item.id, label: item.nombre }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usuario = localStorage.getItem("usuario_simulado");
    if (!usuario) {
      alert("Selecciona un usuario simulado primero");
      return;
    }

    const data = {
      nombre,
      fecha,
      rating,
      usuario_simulado: usuario,
      generos: generosSeleccionados.map((g) => g.value),
      plataformas: plataformasSeleccionadas.map((p) => p.value),
      desarrolladores: desarrolladoresSeleccionados.map((d) => d.value),
      etiquetas: etiquetasSeleccionadas.map((e) => e.value),
    };

    try {
      const res = await fetch("http://localhost:5000/api/juegos/insertar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error(await res.text());

      alert("Juego insertado correctamente");
      // Limpiar
      setNombre("");
      setFecha("");
      setRating("");
      setGenerosSeleccionados([]);
      setPlataformasSeleccionadas([]);
      setDesarrolladoresSeleccionados([]);
      setEtiquetasSeleccionadas([]);
    } catch (err) {
      console.error("Error:", err);
      alert("Error al insertar juego");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-6 rounded shadow-md">
      <h2 className="text-xl font-bold mb-4 text-purple-700">Insertar nuevo juego</h2>

      <label className="block mb-2 font-semibold">Nombre del juego</label>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
        required
      />

      <label className="block mb-2 font-semibold">Fecha de lanzamiento</label>
      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      />

      <label className="block mb-2 font-semibold">Rating</label>
      <input
        type="number"
        step="0.1"
        value={rating}
        onChange={(e) => setRating(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      />

      <label className="block mb-2 font-semibold">Géneros</label>
      <Select
        isMulti
        options={generos.map((g) => ({ value: g.id, label: g.nombre }))}
        value={generosSeleccionados}
        onChange={setGenerosSeleccionados}
        className="mb-4"
      />

      <label className="block mb-2 font-semibold">Plataformas</label>
      <Select
        isMulti
        options={plataformas.map((p) => ({ value: p.id, label: p.nombre }))}
        value={plataformasSeleccionadas}
        onChange={setPlataformasSeleccionadas}
        className="mb-4"
      />

      <label className="block mb-2 font-semibold">Desarrolladores</label>
      <AsyncSelect
        isMulti
        cacheOptions
        defaultOptions
        loadOptions={(inputValue) => cargarOpciones(inputValue, "desarrolladores")}
        value={desarrolladoresSeleccionados}
        onChange={setDesarrolladoresSeleccionados}
        className="mb-4"
      />

      <label className="block mb-2 font-semibold">Etiquetas</label>
      <AsyncSelect
        isMulti
        cacheOptions
        defaultOptions
        loadOptions={(inputValue) => cargarOpciones(inputValue, "etiquetas")}
        value={etiquetasSeleccionadas}
        onChange={setEtiquetasSeleccionadas}
        className="mb-4"
      />

      <button
        type="submit"
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        Guardar
      </button>
    </form>
  );
};

export default GameForm;
