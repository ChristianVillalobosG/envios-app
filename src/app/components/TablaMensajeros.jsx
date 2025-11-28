'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Check, Bike } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'

/* ---------- Loader reutilizado ---------- */
const TableBarLoader = () => (
  <div className="flex flex-col gap-2 p-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 animate-[shimmer_1.5s_infinite]"
          style={{ backgroundSize: '200% 100%', animationDelay: `${i * 0.15}s` }}
        />
      </div>
    ))}
    <style jsx>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
)

export default function TablaMensajeros() {
  const [envios, setEnvios] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [mensajeroFiltro, setMensajeroFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [loading, setLoading] = useState(true)

  /* ---------- Fetch ---------- */
const fetchEnvios = async (mostrarLoader = false) => {
  if (mostrarLoader) setLoading(true)

  const { data, error } = await supabase
    .from('envios')
    .select('*')
    .order('fecha', { ascending: false })

  if (!error) setEnvios(data)

  if (mostrarLoader) {
    setTimeout(() => setLoading(false), 600)
  }
}

useEffect(() => {
  fetchEnvios(true)   // 👈 SOLO aquí aparece loading

  const canal = supabase
    .channel('envios_mensajeros')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'envios' },
      () => fetchEnvios(false)   // 👈 NO loading en tiempo real
    )
    .subscribe()

  return () => supabase.removeChannel(canal)
}, [])


  /* ---------- Filtrado ---------- */
  const enviosFiltrados = useMemo(() => {
    let datos = [...envios]

    if (busqueda.trim()) {
      const f = busqueda.toLowerCase()
      datos = datos.filter(e =>
        Object.values(e).some(v => String(v).toLowerCase().includes(f))
      )
    }

    if (fechaFiltro) datos = datos.filter(e => e.fecha === fechaFiltro)
    if (mensajeroFiltro) datos = datos.filter(e => (e.mensajero || '') === mensajeroFiltro)
    if (estadoFiltro) datos = datos.filter(e => (e.estado || '') === estadoFiltro)

    datos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

    return datos
  }, [envios, busqueda, mensajeroFiltro, estadoFiltro, fechaFiltro])

  /* ---------- Nuevo campo: mensajero_lleva ---------- */
  const toggleMensajeroLleva = async (id, estadoActual) => {
    const nuevo = !estadoActual

    await supabase
      .from("envios")
      .update({ mensajero_lleva: nuevo })
      .eq("id", id)

    setEnvios(prev =>
      prev.map(e => e.id === id ? { ...e, mensajero_lleva: nuevo } : e)
    )

    toast.success(nuevo ? "✔ Paquete Llevado" : "❗ Desmarcado")
  }

  /* ---------- Fecha inteligente ---------- */
  const formatearFecha = (fecha) => {
    if (!fecha) return ''
    const d = dayjs(fecha)
    const hoy = dayjs()
    const manana = dayjs().add(1, "day")
    const ayer = dayjs().subtract(1, "day")

    if (d.isSame(hoy, "day")) return "Hoy"
    if (d.isSame(manana, "day")) return "Mañana"
    if (d.isSame(ayer, "day")) return "Ayer"

    return d.format("DD/MM/YYYY")
  }

  if (loading) return <TableBarLoader />

  /* ---------- Colores por estado ---------- */
  const colorEstado = (estado) => {
    if (estado === "En la mañana") return "bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-semibold"
    if (estado === "En la tarde") return "bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs font-semibold"
    return "bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-semibold"
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-xl shadow-lg bg-white text-zinc-900 font-sans">

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-6 py-4 border-b border-gray-300">

        <input
          type="text"
          placeholder="Buscar..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full md:max-w-xs px-4 py-2 rounded-md border border-gray-300"
        />

        <input
          type="date"
          value={fechaFiltro}
          onChange={e => setFechaFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300"
        />

        <select
          value={mensajeroFiltro}
          onChange={e => setMensajeroFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300"
        >
          <option value="">Todos los mensajeros</option>
          {['Jose','Gary','Jeremy','Chris','Uber','Andres','Otro'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={estadoFiltro}
          onChange={e => setEstadoFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300"
        >
          <option value="">Todos los estados</option>
          <option value="En la mañana">En la mañana</option>
          <option value="En la tarde">En la tarde</option>
          <option value="Mañana">Mañana</option>
        </select>

      </div>

      {/* TABLA */}
      <table className="min-w-full text-sm text-left table-auto">
        <thead className="bg-gray-200 uppercase text-xs font-bold text-zinc-900 border-b border-gray-500">
          <tr>
            {['Cliente','Provincia','Ubicación','Notas','Mensajero','Estado','Fecha','Llevado']
              .map(txt => (
                <th key={txt} className="p-3">{txt}</th>
              ))}
          </tr>
        </thead>

        <tbody>
          {enviosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center p-6 text-gray-500">
                No hay registros
              </td>
            </tr>
          ) : enviosFiltrados.map(envio => (
            <tr key={envio.id} className="border-b bg-white hover:bg-gray-100 transition">

              <td className="p-3 break-words max-w-[180px]">{envio.cliente}</td>
              <td className="p-3 break-words max-w-[150px]">{envio.provincia}</td>

              <td className="p-3">
                {envio.ubicacion ? (
                  <a
                    href={
                      envio.ubicacion.startsWith("http")
                        ? envio.ubicacion
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(envio.ubicacion)}`
                    }
                    target="_blank"
                    className="text-blue-600 underline"
                  >
                    Ver
                  </a>
                ) : '—'}
              </td>

              <td className="p-3 whitespace-pre-line max-w-[200px]">{envio.notas || '—'}</td>
              <td className="p-3">{envio.mensajero || '—'}</td>

              <td className="p-3">
                <span className={colorEstado(envio.estado)}>
                  {envio.estado}
                </span>
              </td>

              <td className="p-3">{formatearFecha(envio.fecha)}</td>

              {/* BOTÓN LLEVADO */}
              <td className="p-3">
                <button
                  onClick={() => toggleMensajeroLleva(envio.id, envio.mensajero_lleva)}
                  className={`p-1.5 rounded-full border
                    ${
                      envio.mensajero_lleva
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-400 text-gray-500'
                    }
                  `}
                >
                  <Check size={16}/>
                </button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
