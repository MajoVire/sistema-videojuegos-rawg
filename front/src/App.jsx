import { useEffect, useState } from 'react'
import supabase from './supabase'

function App() {
  const [juegos, setJuegos] = useState([])

  useEffect(() => {
    async function loadJuegos() {
      const { data, error } = await supabase.from('juegos').select()
      console.log('Datos recibidos de juegos:', data)
      if (error) {
        console.error('Error al obtener juegos:', error)
      }
      setJuegos(data || [])
    }
    loadJuegos()
  }, [])

  return (
    <div>
      <h1>Lista de Juegos</h1>
      <table border="1">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Fecha de Lanzamiento</th>
            <th>Rating</th>
          </tr>
        </thead>
        <tbody>
          {juegos.map(juego => (
            <tr key={juego.id}>
              <td>{juego.nombre}</td>
              <td>{juego.fecha_lanzamiento}</td>
              <td>{juego.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App