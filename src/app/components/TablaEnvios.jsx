'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Pencil, Trash2, Share2, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import RegistroEnvioForm from './RegistroEnvioForm'

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-6">
        <div
          className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-300"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex justify-between items-center p-4 border-b border-gray-300">
            <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-gray-600 hover:text-gray-900 text-3xl font-bold leading-none transition-colors"
            >
              ×
            </button>
          </header>
          <section className="p-6">{children}</section>
        </div>
      </div>
    </>
  )
}

export default function TablaEnvios() {
  const [envios, setEnvios] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [paginaActual, setPaginaActual] = useState(1)
  const ITEMS_POR_PAGINA = 45
  const [ordenCampo, setOrdenCampo] = useState('fecha')
  const [ordenDireccion, setOrdenDireccion] = useState('desc')

  const [modalOpen, setModalOpen] = useState(false)
  const [envioEditando, setEnvioEditando] = useState(null)

  const [enviosEnviados, setEnviosEnviados] = useState(new Set())

  const fetchEnvios = async () => {
    const { data, error } = await supabase.from('envios').select('*')
    if (error) {
      toast.error('Error cargando envíos')
      return
    }
    setEnvios(data)
  }

  useEffect(() => {
    fetchEnvios()
    const canal = supabase
      .channel('envios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'envios' }, fetchEnvios)
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [])

  const enviosFiltradosOrdenados = useMemo(() => {
    let datos = [...envios]

    if (busqueda.trim() !== '') {
      const filtro = busqueda.toLowerCase()
      datos = datos.filter((e) =>
        Object.values(e).some((campo) =>
          String(campo).toLowerCase().includes(filtro)
        )
      )
    }
    if (fechaFiltro) datos = datos.filter((e) => e.fecha === fechaFiltro)
    if (estadoFiltro) datos = datos.filter((e) => e.estado === estadoFiltro)

    datos.sort((a, b) => {
      let valA = a[ordenCampo]
      let valB = b[ordenCampo]

      if (ordenCampo === 'fecha') {
        valA = new Date(valA)
        valB = new Date(valB)
      }
      if (ordenCampo === 'hora') {
        const [ha, ma] = valA.split(':').map(Number)
        const [hb, mb] = valB.split(':').map(Number)
        valA = ha * 60 + ma
        valB = hb * 60 + mb
      }
      if (valA < valB) return ordenDireccion === 'asc' ? -1 : 1
      if (valA > valB) return ordenDireccion === 'asc' ? 1 : -1
      return 0
    })

    return datos
  }, [envios, busqueda, fechaFiltro, estadoFiltro, ordenCampo, ordenDireccion])

  const totalPaginas = Math.ceil(enviosFiltradosOrdenados.length / ITEMS_POR_PAGINA)
  const enviosPagina = enviosFiltradosOrdenados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  const cambiarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('envios').update({ estado: nuevoEstado }).eq('id', id)
    if (error) {
      toast.error('Error al actualizar estado')
      return
    }
    setEnvios((prev) =>
      prev.map((envio) => (envio.id === id ? { ...envio, estado: nuevoEstado } : envio))
    )
  }

  const eliminarEnvio = async (id) => {
    toast.warning('¿Estás seguro de eliminar este envío?', {
      action: {
        label: 'Sí, eliminar',
        onClick: async () => {
          const { error } = await supabase.from('envios').delete().eq('id', id)
          if (!error) {
            setEnvios((prev) => prev.filter((e) => e.id !== id))
            toast.success('🗑️ Envío eliminado correctamente')
          } else {
            toast.error('Error al eliminar envío')
          }
        }
      },
      cancel: { label: 'Cancelar' }
    })
  }

  const compartirWhatsapp = (envio) => {
    const mensaje = `
📦 *Detalle del Envío*
🧑 Cliente: ${envio.cliente || 'N/A'}
🏞 Provincia: ${envio.provincia || 'N/A'}
📞 Teléfono: ${envio.telefono || 'N/A'}
📍 Ubicación: ${envio.ubicacion || 'N/A'}
📦 Descripción: ${envio.descripcion || 'N/A'}
🚚 Mensajero: ${envio.mensajero || 'N/A'}
📅 Fecha: ${dayjs(envio.fecha).format('DD/MM/YYYY')}
🕐 Hora: ${envio.hora || 'N/A'}
📌 Estado: ${envio.estado || 'N/A'}
    `.trim()

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')

    setEnviosEnviados(prev => new Set(prev).add(envio.id))
  }

  const generarLinkGoogleMaps = (ubicacion) => {
    if (!ubicacion) return '#'
    const esURL = ubicacion.startsWith('http://') || ubicacion.startsWith('https://')
    if (esURL) return ubicacion
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacion)}`
  }

  const cambiarOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenCampo(campo)
      setOrdenDireccion('asc')
    }
  }

  const abrirEditarEnvio = (envio) => {
    setEnvioEditando(envio)
    setModalOpen(true)
  }

  const cerrarModal = () => {
    setModalOpen(false)
    setEnvioEditando(null)
  }

  const guardarEnvio = () => {
    fetchEnvios()
    cerrarModal()
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-xl shadow-lg bg-white text-zinc-900 font-sans">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-6 py-4 border-b border-gray-300">
        <input
          type="text"
          placeholder="Buscar envíos..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setPaginaActual(1)
          }}
          className="w-full md:max-w-xs px-4 py-2 rounded-md bg-white border border-gray-300 text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />

        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => {
            setFechaFiltro(e.target.value)
            setPaginaActual(1)
          }}
          className="px-4 py-2 rounded-md bg-white border border-gray-300 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />

        <select
          value={estadoFiltro}
          onChange={(e) => {
            setEstadoFiltro(e.target.value)
            setPaginaActual(1)
          }}
          className="px-4 py-2 rounded-md bg-white border border-gray-300 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Todos los estados</option>
          <option value="En la mañana">En la mañana</option>
          <option value="En la tarde">En la tarde</option>
          <option value="Mañana">Mañana</option>
        </select>
      </div>

      <table className="min-w-full text-sm text-left border-collapse">
        <thead className="bg-gray-100 text-zinc-700 uppercase text-xs font-semibold tracking-wide border-b border-gray-300">
          <tr>
            {[
              { label: 'Cliente', campo: 'cliente' },
              { label: 'Provincia', campo: 'provincia' },
              { label: 'Teléfono', campo: 'telefono' },
              { label: 'Ubicación', campo: 'ubicacion' },
              { label: 'Descripción', campo: 'descripcion' },
              { label: 'Mensajero', campo: 'mensajero' },
              { label: 'Estado', campo: 'estado' },
              { label: 'Fecha', campo: 'fecha' },
              { label: 'Hora', campo: 'hora' },
              { label: 'Acciones', campo: null }
            ].map(({ label, campo }) => (
              <th
                key={label}
                className="p-3 cursor-pointer select-none"
                onClick={() => campo && cambiarOrden(campo)}
                title={campo ? `Ordenar por ${label}` : undefined}
              >
                <div className="flex items-center gap-1">
                  {label}
                  {campo && ordenCampo === campo && (
                    <ArrowUpDown size={14} className={`inline transition-transform ${ordenDireccion === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {enviosPagina.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center p-6 text-gray-500">
                No hay registros que mostrar
              </td>
            </tr>
          ) : (
            enviosPagina.map((envio) => (
              <tr
                key={envio.id}
                className="border-b border-gray-300 hover:bg-gray-100 transition-colors duration-200"
              >
                <td className="p-3">{envio.cliente}</td>
                <td className="p-3">{envio.provincia}</td>
                <td className="p-3">{envio.telefono}</td>
                <td className="p-3">
                  <a
                    href={generarLinkGoogleMaps(envio.ubicacion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline transition-colors"
                    title="Ver en Google Maps"
                  >
                    Ver
                  </a>
                </td>
                <td className="p-3">{envio.descripcion}</td>
                <td className="p-3">{envio.mensajero}</td>
                <td className="p-3 flex items-center gap-2">
                  <select
                    value={envio.estado}
                    onChange={(e) => cambiarEstado(envio.id, e.target.value)}
                    className={`px-2 py-1 rounded text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white appearance-none cursor-pointer transition-colors
                      ${
                        envio.estado === 'En la mañana'
                          ? 'bg-green-200 text-green-800 focus:ring-green-500'
                          : envio.estado === 'En la tarde'
                          ? 'bg-yellow-200 text-yellow-800 focus:ring-yellow-400'
                          : 'bg-blue-200 text-blue-800 focus:ring-blue-500'
                      }
                    `}
                  >
                    <option value="En la mañana">En la mañana</option>
                    <option value="En la tarde">En la tarde</option>
                    <option value="Mañana">Mañana</option>
                  </select>
                  {enviosEnviados.has(envio.id) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-700 bg-opacity-80 px-2 py-0.5 text-xs font-semibold text-green-100 select-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Enviado
                    </span>
                  )}
                </td>
                <td className="p-3">{dayjs(envio.fecha).format('DD/MM/YYYY')}</td>
                <td className="p-3">{envio.hora}</td>
                <td className="p-3 flex gap-3 justify-center items-center">
                  <button
                    onClick={() => abrirEditarEnvio(envio)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-transform duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Editar"
                    aria-label="Editar envío"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={() => eliminarEnvio(envio.id)}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-transform duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400"
                    title="Eliminar"
                    aria-label="Eliminar envío"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={() => compartirWhatsapp(envio)}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-transform duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400"
                    title="Compartir por WhatsApp"
                    aria-label="Compartir por WhatsApp"
                  >
                    <Share2 size={20} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPaginas > 1 && (
        <div className="flex justify-center items-center mt-6 mb-4 gap-2 text-sm">
          <button
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-700 transition-colors"
          >
            Anterior
          </button>

          {[...Array(totalPaginas).keys()].map((n) => {
            const num = n + 1
            return (
              <button
                key={num}
                onClick={() => setPaginaActual(num)}
                className={`px-3 py-1 rounded ${
                  num === paginaActual
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                } transition-colors`}
              >
                {num}
              </button>
            )
          })}

          <button
            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-700 transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={cerrarModal} title={envioEditando ? 'Editar Envío' : 'Nuevo Envío'}>
        <RegistroEnvioForm
          initialData={envioEditando}
          onSave={guardarEnvio}
          onCancel={cerrarModal}
          modo="columnas"
        />
      </Modal>
    </div>
  )
}
