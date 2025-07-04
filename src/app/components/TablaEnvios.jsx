'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabase'
import RegistroModal from './RegistroModal'
import { Pencil, Trash2, Share2, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'

export default function TablaEnvios() {
  const [envios, setEnvios] = useState([])
  const [enviosFiltrados, setEnviosFiltrados] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [envioEditando, setEnvioEditando] = useState(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const ITEMS_POR_PAGINA = 45

  // Ordenamiento
  const [ordenCampo, setOrdenCampo] = useState('fecha')
  const [ordenDireccion, setOrdenDireccion] = useState('desc') // 'asc' | 'desc'

  // Fetch inicial
  const fetchEnvios = async () => {
    const { data, error } = await supabase
      .from('envios')
      .select('*')

    if (error) {
      console.error(error)
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

  // Filtro y ordenamiento memorizados para optimizar render
  const enviosFiltradosOrdenados = useMemo(() => {
    let datos = [...envios]

    // Filtros
    if (busqueda.trim() !== '') {
      const filtro = busqueda.toLowerCase()
      datos = datos.filter((e) =>
        Object.values(e).some((campo) =>
          String(campo).toLowerCase().includes(filtro)
        )
      )
    }

    if (fechaFiltro) {
      datos = datos.filter((e) => e.fecha === fechaFiltro)
    }

    if (estadoFiltro) {
      datos = datos.filter((e) => e.estado === estadoFiltro)
    }

    // Ordenamiento
    datos.sort((a, b) => {
      let valA = a[ordenCampo]
      let valB = b[ordenCampo]

      // Para fecha, transformamos a Date para comparar
      if (ordenCampo === 'fecha') {
        valA = new Date(valA)
        valB = new Date(valB)
      }
      // Para hora, convertir a minutos para comparación
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

  // Paginación
  const totalPaginas = Math.ceil(enviosFiltradosOrdenados.length / ITEMS_POR_PAGINA)
  const enviosPagina = enviosFiltradosOrdenados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  // Cambiar estado sin mover fila
  const cambiarEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('envios').update({ estado: nuevoEstado }).eq('id', id)
    if (error) {
      toast.error('Error al actualizar estado')
      return
    }
    // Actualizar localmente para no perder posición ni hacer fetch completo
    setEnvios((prev) =>
      prev.map((envio) =>
        envio.id === id ? { ...envio, estado: nuevoEstado } : envio
      )
    )
  }

  // Eliminar con confirmación
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

  // Compartir por Whatsapp
  const compartirWhatsapp = (envio) => {
    const mensaje = `
📦 *Detalle del Envío*
🧑 Cliente: ${envio.cliente}
🏞 Provincia: ${envio.provincia}
📞 Teléfono: ${envio.telefono}
📍 Ubicación: ${envio.ubicacion}
📦 Descripción: ${envio.descripcion}
🚚 Mensajero: ${envio.mensajero}
📅 Fecha: ${envio.fecha}
🕐 Hora: ${envio.hora}
📌 Estado: ${envio.estado}
    `.trim()
    const link = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(link, '_blank')
  }

  // Generar link Google Maps
  const generarLinkGoogleMaps = (ubicacion) => {
    if (!ubicacion) return '#'
    const esURL = ubicacion.startsWith('http://') || ubicacion.startsWith('https://')
    if (esURL) return ubicacion
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacion)}`
  }

  // Cambiar campo y dirección de ordenamiento
  const cambiarOrden = (campo) => {
    if (ordenCampo === campo) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenCampo(campo)
      setOrdenDireccion('asc')
    }
  }

  // Exportar a Excel
  const exportAllExcel = async () => {
    const datosFormateados = enviosFiltradosOrdenados.map(envio => ({
      'Cliente': envio.cliente,
      'Provincia': envio.provincia,
      'Teléfono': envio.telefono,
      'Ubicación': envio.ubicacion,
      'Descripción': envio.descripcion,
      'Mensajero': envio.mensajero,
      'Estado': envio.estado,
      'Fecha': dayjs(envio.fecha).format('DD/MM/YYYY'),
      'Hora': envio.hora,
    }))

    const ws = XLSX.utils.json_to_sheet(datosFormateados, { origin: 'A1' })

    // Ajustar ancho de columnas mínimo 15 caracteres
    const encabezados = Object.keys(datosFormateados[0] || {})
    ws['!cols'] = encabezados.map(key => ({ wch: Math.max(key.length + 2, 15) }))

    // Negrita en encabezados (básico)
    encabezados.forEach((_, idx) => {
      const cell = XLSX.utils.encode_cell({ r: 0, c: idx })
      if (ws[cell]) {
        ws[cell].s = { font: { bold: true } }
      }
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Envíos')

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf]), 'envios.xlsx')
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-xl shadow-md">
      {/* FILTROS */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-2">
        <input
          type="text"
          placeholder="Buscar por cliente, provincia, mensajero..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setPaginaActual(1)
          }}
          className="w-full md:w-1/3 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded shadow-sm bg-white dark:bg-zinc-800 text-sm"
        />

        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => {
            setFechaFiltro(e.target.value)
            setPaginaActual(1)
          }}
          className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded shadow-sm bg-white dark:bg-zinc-800 text-sm"
        />

        <select
          value={estadoFiltro}
          onChange={(e) => {
            setEstadoFiltro(e.target.value)
            setPaginaActual(1)
          }}
          className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded shadow-sm bg-white dark:bg-zinc-800 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="En la mañana">En la mañana</option>
          <option value="En la tarde">En la tarde</option>
          <option value="Mañana">Mañana</option>
        </select>

        {(busqueda || fechaFiltro || estadoFiltro) && (
          <button
            onClick={() => {
              setBusqueda('')
              setFechaFiltro('')
              setEstadoFiltro('')
              setPaginaActual(1)
            }}
            className="text-sm px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Limpiar filtros
          </button>
        )}

        <button
          onClick={exportAllExcel}
          className="text-sm px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        >
          Exportar Excel
        </button>
      </div>

      {/* TABLA */}
      <table className="min-w-full text-sm text-left bg-white dark:bg-zinc-900 border-collapse">
        <thead className="bg-zinc-100 dark:bg-zinc-800 uppercase text-xs text-zinc-700 dark:text-zinc-300">
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
              { label: 'Acciones', campo: null },
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
                    <ArrowUpDown size={14} className="inline" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {enviosPagina.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center p-4 text-zinc-500">
                No hay registros que mostrar
              </td>
            </tr>
          ) : (
            enviosPagina.map((envio) => (
              <tr
                key={envio.id}
                className="border-t hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                <td className="p-3">{envio.cliente}</td>
                <td className="p-3">{envio.provincia}</td>
                <td className="p-3">{envio.telefono}</td>
                <td className="p-3">
                  <a
                    href={generarLinkGoogleMaps(envio.ubicacion)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Ver
                  </a>
                </td>
                <td className="p-3">{envio.descripcion}</td>
                <td className="p-3">{envio.mensajero}</td>
                <td className="p-3">
                  <select
                    value={envio.estado}
                    onChange={(e) => cambiarEstado(envio.id, e.target.value)}
                    className={`px-2 py-1 rounded text-xs font-semibold text-white
                      ${envio.estado === 'En la mañana' ? 'bg-green-500' :
                        envio.estado === 'En la tarde' ? 'bg-yellow-500 text-black' :
                          'bg-blue-500'}
                    `}
                  >
                    <option value="En la mañana">En la mañana</option>
                    <option value="En la tarde">En la tarde</option>
                    <option value="Mañana">Mañana</option>
                  </select>
                </td>
                <td className="p-3">{dayjs(envio.fecha).format('DD/MM/YYYY')}</td>
                <td className="p-3">{envio.hora}</td>
                <td className="p-3 flex gap-2 justify-center items-center">
                  <button
                    onClick={() => {
                      setEnvioEditando(envio)
                      setModalOpen(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => eliminarEnvio(envio.id)}
                    className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => compartirWhatsapp(envio)}
                    className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-full"
                    title="Compartir por WhatsApp"
                  >
                    <Share2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINACION */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center mt-4 gap-2 text-sm">
          <button
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="px-3 py-1 rounded bg-zinc-300 hover:bg-zinc-400 disabled:opacity-50"
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
                  num === paginaActual ? 'bg-blue-600 text-white' : 'bg-zinc-300 hover:bg-zinc-400'
                }`}
              >
                {num}
              </button>
            )
          })}

          <button
            onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="px-3 py-1 rounded bg-zinc-300 hover:bg-zinc-400 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* MODAL */}
      <RegistroModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEnvioEditando(null)
        }}
        initialData={envioEditando}
        onSave={fetchEnvios}
      />
    </div>
  )
}
