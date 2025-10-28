'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Pencil, Trash2, Share2, Check } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import RegistroEnvioForm from './RegistroEnvioForm' 
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"


function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
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

  // ✅ Actualiza fecha automáticamente según el estado
  const cambiarEstado = async (id, nuevoEstado) => {
    const hoy = dayjs().format('YYYY-MM-DD')
    const manana = dayjs().add(1, 'day').format('YYYY-MM-DD')

    let nuevaFecha = hoy
    if (nuevoEstado === 'Mañana') nuevaFecha = manana

    const { error } = await supabase
      .from('envios')
      .update({ estado: nuevoEstado, fecha: nuevaFecha })
      .eq('id', id)

    if (error) {
      toast.error('Error al actualizar estado')
      return
    }

    setEnvios((prev) =>
      prev.map((envio) =>
        envio.id === id
          ? { ...envio, estado: nuevoEstado, fecha: nuevaFecha }
          : envio
      )
    )
  }

  const cambiarMensajero = async (id, nuevoMensajero) => {
    const { error } = await supabase
      .from('envios')
      .update({ mensajero: nuevoMensajero })
      .eq('id', id)

    if (error) {
      toast.error('Error al actualizar mensajero')
      return
    }

    setEnvios((prev) =>
      prev.map((envio) =>
        envio.id === id ? { ...envio, mensajero: nuevoMensajero } : envio
      )
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
  }

  const generarLinkGoogleMaps = (ubicacion) => {
    if (!ubicacion) return '#'
    const esURL = ubicacion.startsWith('http://') || ubicacion.startsWith('https://')
    if (esURL) return ubicacion
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacion)}`
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

  // ✅ Mostrar texto dinámico según fecha
  const formatearFecha = (fecha) => {
    const hoy = dayjs().format('YYYY-MM-DD')
    const manana = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const ayer = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

    if (fecha === hoy) return 'Hoy'
    if (fecha === manana) return 'Mañana'
    if (fecha === ayer) return 'Ayer'
    return dayjs(fecha).format('DD/MM/YYYY')
  }

  // ✅ Guardar check completado en base de datos
  const toggleCompletado = async (id, estadoActual) => {
    const nuevoEstado = !estadoActual
    const { error } = await supabase
      .from('envios')
      .update({ completado: nuevoEstado })
      .eq('id', id)

    if (error) {
      toast.error('Error al actualizar completado')
      return
    }

    setEnvios((prev) =>
      prev.map((envio) =>
        envio.id === id ? { ...envio, completado: nuevoEstado } : envio
      )
    )
  } 

    // ✅ Exportar a Excel (filtrados o todos)
  const exportarExcel = (soloFiltrados = true) => {
    const datosAExportar = soloFiltrados ? enviosFiltradosOrdenados : envios

    if (datosAExportar.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }

    // Formatear datos para Excel
    const datosFormateados = datosAExportar.map(e => ({
      Cliente: e.cliente,
      Provincia: e.provincia,
      Teléfono: e.telefono,
      Ubicación: e.ubicacion,
      Descripción: e.descripcion,
      Mensajero: e.mensajero,
      Estado: e.estado,
      Fecha: dayjs(e.fecha).format('DD/MM/YYYY'),
      Hora: e.hora,
      Completado: e.completado ? 'Sí' : 'No',
    }))

    const hoja = XLSX.utils.json_to_sheet(datosFormateados)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Envíos')

    const nombreArchivo = soloFiltrados
      ? `envios_filtrados_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
      : `envios_todos_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`

    const excelBuffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
    saveAs(blob, nombreArchivo)

    toast.success('📤 Archivo Excel generado correctamente')
  }


  return (
    <div className="mt-8 overflow-x-auto rounded-xl shadow-lg bg-white text-zinc-900 font-sans">
      {/* 🔍 Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-6 py-4 border-b border-gray-300">
        <input
          type="text"
          placeholder="Buscar envíos..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setPaginaActual(1)
          }}
          className="w-full md:max-w-xs px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => setFechaFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="En la mañana">En la mañana</option>
          <option value="En la tarde">En la tarde</option>
          <option value="Mañana">Mañana</option>
        </select>
      </div>

<div className="flex justify-end gap-3 px-6 py-3 border-b border-gray-300">
  <button
    onClick={() => exportarExcel(true)}
    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md"
  >
    📋 Exportar filtrados
  </button>
  <button
    onClick={() => exportarExcel(false)}
    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md"
  >
    📦 Exportar todos
  </button>
</div>

      {/* 📋 Tabla */}
      <table className="min-w-full text-sm text-left border-collapse">
        <thead className="bg-gray-200 uppercase text-xs font-bold text-zinc-900 border-b border-gray-500">
          <tr>
            {['Cliente','Provincia','Teléfono','Ubicación','Descripción','Mensajero','Estado','Fecha','Hora','Acciones'].map(label => (
              <th key={label} className="p-3">{label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {enviosPagina.length === 0 ? (
            <tr><td colSpan={10} className="text-center p-6 text-gray-500">No hay registros</td></tr>
          ) : (
            enviosPagina.map((envio) => (
              <tr key={envio.id} className="border-b border-gray-300 hover:bg-gray-100">
                <td className="p-3">{envio.cliente}</td>
                <td className="p-3">{envio.provincia}</td>
                <td className="p-3">{envio.telefono}</td>
                <td className="p-3">
                  <a href={generarLinkGoogleMaps(envio.ubicacion)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ver</a>
                </td>
                <td className="p-3">{envio.descripcion}</td>

                {/* Mensajero editable */}
                <td className="p-3">
                  <select
                    value={envio.mensajero || ''}
                    onChange={(e) => cambiarMensajero(envio.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    {['jose', 'gary', 'jeremy', 'chris', 'uber', 'otro'].map(m => (
                      <option key={m} value={m}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Estado con color y check completado */}
                <td className="p-3 flex items-center gap-2">
                  <select
                    value={envio.estado}
                    onChange={(e) => cambiarEstado(envio.id, e.target.value)}
                    className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                      envio.estado === 'En la mañana'
                        ? 'bg-green-200 text-green-800'
                        : envio.estado === 'En la tarde'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    <option>En la mañana</option>
                    <option>En la tarde</option>
                    <option>Mañana</option>
                  </select>

                  <button
                    onClick={() => toggleCompletado(envio.id, envio.completado)}
                    className={`p-1.5 rounded-full border transition-all ${
                      envio.completado
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-400 text-gray-500 hover:bg-gray-200'
                    }`}
                    title="Marcar como completado"
                  >
                    <Check size={16} />
                  </button>
                </td>

                <td className="p-3">{formatearFecha(envio.fecha)}</td>
                <td className="p-3">{envio.hora}</td>

                <td className="p-3 flex gap-3 justify-center">
                  <button onClick={() => abrirEditarEnvio(envio)} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => eliminarEnvio(envio.id)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => compartirWhatsapp(envio)} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full">
                    <Share2 size={18} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal de edición */}
      <Modal isOpen={modalOpen} onClose={cerrarModal} title="Editar Envío">
        <RegistroEnvioForm initialData={envioEditando} onSave={guardarEnvio} onCancel={cerrarModal} modo="columnas" />
      </Modal>
    </div>
  )
}
