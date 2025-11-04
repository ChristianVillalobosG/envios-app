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

  // ✅ PAGINACIÓN
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
      datos = datos.filter(e =>
        Object.values(e).some(campo =>
          String(campo).toLowerCase().includes(filtro)
        )
      )
    }

    if (fechaFiltro) datos = datos.filter(e => e.fecha === fechaFiltro)
    if (estadoFiltro) datos = datos.filter(e => e.estado === estadoFiltro)

    datos.sort((a, b) => {
      let valA = a[ordenCampo]
      let valB = b[ordenCampo]

      if (ordenCampo === 'fecha') {
        valA = new Date(valA)
        valB = new Date(valB)
      }
      if (ordenCampo === 'hora' && valA && valB) {
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

  // ✅ PAGINACIÓN FINAL
  const totalPaginas = Math.ceil(enviosFiltradosOrdenados.length / ITEMS_POR_PAGINA)
  const enviosPagina = enviosFiltradosOrdenados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, fechaFiltro, estadoFiltro])

  const cambiarEstado = async (id, nuevoEstado) => {
    const hoy = dayjs().format('YYYY-MM-DD')
    const manana = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const nuevaFecha = nuevoEstado === 'Mañana' ? manana : hoy

    const { error } = await supabase
      .from('envios')
      .update({ estado: nuevoEstado, fecha: nuevaFecha })
      .eq('id', id)

    if (!error) {
      setEnvios(prev => prev.map(e => e.id === id ? { ...e, estado: nuevoEstado, fecha: nuevaFecha } : e))
    } else toast.error('Error al actualizar')
  }

  const cambiarMensajero = async (id, nuevoMensajero) => {
    const { error } = await supabase.from('envios').update({ mensajero: nuevoMensajero }).eq('id', id)
    if (!error) {
      setEnvios(prev => prev.map(e => e.id === id ? { ...e, mensajero: nuevoMensajero } : e))
    }
  }

  const eliminarEnvio = async (id) => {
    toast.warning('¿Eliminar envío?', {
      action: {
        label: 'Sí',
        onClick: async () => {
          const { error } = await supabase.from('envios').delete().eq('id', id)
          if (!error) {
            setEnvios(prev => prev.filter(e => e.id !== id))
            toast.success('Eliminado')
          }
        }
      },
      cancel: { label: 'Cancelar' }
    })
  }

  const compartirWhatsapp = (envio) => {
    const mensaje = `
📦 *Detalle del Envío*
Cliente: ${envio.cliente}
Provincia: ${envio.provincia}
Tel: ${envio.telefono}
Ubicación: ${envio.ubicacion}
${envio.descripcion}
Mensajero: ${envio.mensajero}
Fecha: ${dayjs(envio.fecha).format('DD/MM/YYYY')}
Hora: ${envio.hora}
Estado: ${envio.estado}
    `.trim()
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const formatearFecha = (fecha) => {
    const hoy = dayjs().format('YYYY-MM-DD')
    const manana = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const ayer = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
    if (fecha === hoy) return 'Hoy'
    if (fecha === manana) return 'Mañana'
    if (fecha === ayer) return 'Ayer'
    return dayjs(fecha).format('DD/MM/YYYY')
  }

  const toggleCompletado = async (id, estadoActual) => {
    const nuevo = !estadoActual
    const { error } = await supabase.from('envios').update({ completado: nuevo }).eq('id', id)
    if (!error) setEnvios(prev => prev.map(e => e.id === id ? { ...e, completado: nuevo } : e))
  }

  const exportarExcel = (soloFiltrados = true) => {
    const datos = soloFiltrados ? enviosFiltradosOrdenados : envios
    if (!datos.length) return toast.error('No hay datos')

    const formato = datos.map(e => ({
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

    const hoja = XLSX.utils.json_to_sheet(formato)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Envíos')

    saveAs(new Blob([XLSX.write(libro, { bookType: 'xlsx', type: 'array' })]),
      `${soloFiltrados ? 'envios_filtrados' : 'envios_todos'}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
    )
    toast.success('✅ Exportado')
  }

  const abrirEditarEnvio = (envio) => { setEnvioEditando(envio); setModalOpen(true) }
  const cerrarModal = () => { setModalOpen(false); setEnvioEditando(null) }
  const guardarEnvio = () => { fetchEnvios(); cerrarModal() }

  return (
    <div className="mt-8 overflow-x-auto rounded-xl shadow-lg bg-white text-zinc-900 font-sans">

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-6 py-4 border-b border-gray-300">
        <input
          type="text"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full md:max-w-xs px-4 py-2 rounded-md border border-gray-300"
        />

        <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300"
        />

        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300"
        >
          <option value="">Todos los estados</option>
          <option value="En la mañana">En la mañana</option>
          <option value="En la tarde">En la tarde</option>
          <option value="Mañana">Mañana</option>
        </select>
      </div>

      {/* Exportación */}
      <div className="flex justify-end gap-3 px-6 py-3 border-b border-gray-300">
        <button onClick={() => exportarExcel(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
          📋 Exportar filtrados
        </button>
        <button onClick={() => exportarExcel(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
          📦 Exportar todos
        </button>
      </div>

      {/* TABLA */}
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-200 uppercase text-xs font-bold text-zinc-900 border-b border-gray-500">
          <tr>
            {['Cliente','Provincia','Teléfono','Ubicación','Descripción','Mensajero','Estado','Fecha','Hora','Acciones'].map(txt => (
              <th key={txt} className="p-3">{txt}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {enviosPagina.length === 0 ? (
            <tr><td colSpan={10} className="text-center p-6 text-gray-500">No hay registros</td></tr>
          ) : enviosPagina.map(envio => (
            <tr key={envio.id} className="border-b hover:bg-gray-100">

              <td className="p-3">{envio.cliente}</td>
              <td className="p-3">{envio.provincia}</td>
              <td className="p-3">{envio.telefono}</td>
              <td className="p-3">
              {envio.ubicacion 
  ? (
      <a
        href={(envio.ubicacion || "").startsWith("http")
          ? envio.ubicacion
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(envio.ubicacion || "")}`
        }
        target="_blank"
        className="text-blue-600 underline"
      >
        Ver
      </a>
    )
  : <span className="text-gray-500">Sin ubicación</span>
}
              </td>
              <td className="p-3">{envio.descripcion}</td>

              <td className="p-3">
                <select
                  value={envio.mensajero || ''}
                  onChange={(e) => cambiarMensajero(envio.id, e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Seleccionar</option>
                  {['jose','gary','jeremy','chris','uber','otro'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>

              <td className="p-3 flex items-center gap-2">
                <select
                  value={envio.estado}
                  onChange={(e) => cambiarEstado(envio.id, e.target.value)}
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    envio.estado === 'En la mañana' ? 'bg-green-200 text-green-800'
                    : envio.estado === 'En la tarde' ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-blue-200 text-blue-800'
                  }`}
                >
                  <option>En la mañana</option>
                  <option>En la tarde</option>
                  <option>Mañana</option>
                </select>

                <button
                  onClick={() => toggleCompletado(envio.id, envio.completado)}
                  className={`p-1.5 rounded-full border ${
                    envio.completado ? 'bg-green-600 text-white border-green-600' : 'border-gray-400 text-gray-500'
                  }`}
                >
                  <Check size={16}/>
                </button>
              </td>

              <td className="p-3">{formatearFecha(envio.fecha)}</td>
              <td className="p-3">{envio.hora}</td>

              <td className="p-3 flex gap-3">
                <button onClick={() => abrirEditarEnvio(envio)} className="bg-blue-600 text-white p-2 rounded-full"><Pencil size={16} /></button>
                <button onClick={() => eliminarEnvio(envio.id)} className="bg-red-600 text-white p-2 rounded-full"><Trash2 size={16}/></button>
                <button onClick={() => compartirWhatsapp(envio)} className="bg-green-600 text-white p-2 rounded-full"><Share2 size={16}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGINACIÓN */}
      <div className="flex justify-center items-center gap-2 py-4">
        <button
          onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
          disabled={paginaActual === 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          ◀ Anterior
        </button>

        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            onClick={() => setPaginaActual(num)}
            className={`px-3 py-1 rounded ${
              paginaActual === num ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
          disabled={paginaActual === totalPaginas}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Siguiente ▶
        </button>
      </div>

      <Modal isOpen={modalOpen} onClose={cerrarModal} title="Editar Envío">
        <RegistroEnvioForm initialData={envioEditando} onSave={guardarEnvio} onCancel={cerrarModal} modo="columnas" />
      </Modal>
    </div>
  )
}
