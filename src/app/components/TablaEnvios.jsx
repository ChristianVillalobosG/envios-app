'use client'


import { supabase } from '@/app/lib/supabase'
import { Pencil, Trash2, Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import RegistroEnvioForm from './RegistroEnvioForm'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useRouter } from 'next/navigation' 
import { useEffect, useState, useMemo, useRef } from 'react' 
import { FaPrint } from 'react-icons/fa6'

/* ---------- Modal ---------- */
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
            <h2 className="text-2xl font-semibold text-gray-900">
              {title}
            </h2>

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

/* ---------- Loader ---------- */
const TableBarLoader = () => (
  <div className="flex flex-col gap-2 p-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 animate-[shimmer_1.5s_infinite]"
          style={{
            backgroundSize: '200% 100%',
            animationDelay: `${i * 0.15}s`
          }}
        />
      </div>
    ))}

    <style jsx>{`
      @keyframes shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
    `}</style>
  </div>
)

const normalizarTexto = (txt) =>
  String(txt ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() 
    
/* ---------- TablaEnvios ---------- */
export default function TablaEnvios({ refresh }) {
  const router = useRouter() 

  const navegadorId = useRef(null)  
  const ultimoDeleteRef = useRef(null)
  

if (!navegadorId.current) {
  navegadorId.current =
    sessionStorage.getItem('navegador_id') ||
    crypto.randomUUID()

  sessionStorage.setItem(
    'navegador_id',
    navegadorId.current
  )
}

  const [envios, setEnvios] = useState([]) 
  const [busqueda, setBusqueda] = useState('')
  const [fechaFiltro, setFechaFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [mensajeroFiltro, setMensajeroFiltro] = useState('')
  const [actualizados, setActualizados] = useState({})
  const [envioEditando, setEnvioEditando] = useState(null)
  const [originalDelModal, setOriginalDelModal] = useState(null)
  const [editandoDesdeModal, setEditandoDesdeModal] = useState(false)
  const [animacionesListas, setAnimacionesListas] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)
  const [modalOpen, setModalOpen] = useState(false) 
  const [actualizandoCheck, setActualizandoCheck] = useState({}) 
 

const ITEMS_POR_PAGINA = 45

  useEffect(() => {
    const timer = setTimeout(() => setAnimacionesListas(true), 50)

    return () => clearTimeout(timer)
  }, [])

  /* ---------- FETCH ---------- */
  const fetchEnvios = async (showLoader = false) => {
  try {
    if (showLoader) setLoading(true)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      setEnvios([])
      return
    }

    // Buscar si el usuario pertenece a un grupo
    const { data: grupoUsuario, error: grupoError } =
      await supabase
        .from('usuarios_grupo')
        .select('grupo_id')
        .eq('user_id', user.id)
        .single()

    let query = supabase
      .from('envios')
      .select('*')

    // Usuario autorizado en grupo
    if (grupoUsuario?.grupo_id) {
      query = query.eq(
        'grupo_id',
        grupoUsuario.grupo_id
      )
    }
    // Usuario independiente
    else {
      query = query.eq(
        'user_id',
        user.id
      )
    }

const { data, error } = await query
  .order('created_at', {
    ascending: false
  })
  .limit(200)

    if (grupoError && grupoError.code !== 'PGRST116') {
      console.error(grupoError)
    }

    if (error) {
      console.error(error)
      toast.error('Error cargando envíos')
      return
    }

    console.log('USUARIO:', user.id)
    console.log('GRUPO:', grupoUsuario?.grupo_id)
    console.log(
  'ENVÍOS FETCH:',
  data.length
)

    setEnvios(data || [])

    setActualizados((prev) => {
      const nuevo = { ...prev }

      data?.forEach((e) => {
        if (e.actualizado && !nuevo[e.id]) {
          nuevo[e.id] = true
        }
      })

      return nuevo
    })

  } catch (err) {
    console.error(err)

  } finally {
    if (showLoader) {
      setTimeout(() => {
        setLoading(false)
        setIsFirstLoad(false)
      }, 600)
    }
  }
}

  /* ---------- REALTIME ---------- */ 
useEffect(() => { 

    console.log('MONTA REALTIME')
  fetchEnvios(true)

  const canal = supabase
    .channel('envios-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'envios'
      },
 (payload) => { 

    console.log(
    'EVENTO REALTIME:',
    payload.eventType,
    payload
  )  

  console.log(
  'PAYLOAD COMPLETO:',
  JSON.stringify(payload)
)

console.log(
  'ORIGEN:',
  payload.new?.origen_navegador,
  payload.old?.origen_navegador
)

console.log(
  'NAVEGADOR ACTUAL:',
  navegadorId.current
)

  const origenEvento =
  payload.new?.origen_navegador ||
  payload.old?.origen_navegador

const esMiEvento =
  origenEvento === navegadorId.current


 // INSERT
if (payload.eventType === 'INSERT') {

  guardarEnvioLocal(payload.new)

  if (!esMiEvento) {
    toast.success('📦 Nuevo envío agregado')
  }

  return
}

// DELETE
if (payload.eventType === 'DELETE') {

  eliminarEnvioLocal(payload.old.id)

  if (!esMiEvento) {
    toast.success('🗑️ Se eliminó un envío')
  }

  return
}

// EMPACADO
if (
  payload.eventType === 'UPDATE' &&
  payload.new?.completado !==
    payload.old?.completado
) {

guardarEnvioLocal(payload.new)

  if (!esMiEvento) {
    toast.success(
      payload.new.completado
        ? '📦 Se empacó un envío'
        : '📦 Se desmarcó un envío'
    )
  }

  return
}
 // DESCRIPCIÓN REVISADA
if (
  payload.eventType === 'UPDATE' &&
  payload.new?.descripcion_editada !==
    payload.old?.descripcion_editada
) {

guardarEnvioLocal(payload.new)

  return
}

// ACTUALIZACIÓN GENERAL
if (payload.eventType === 'UPDATE') {

  guardarEnvioLocal(payload.new)

  if (!esMiEvento) {
    toast.success('✏️ Se actualizó un envío')
  }

  return
}
}
    )
.subscribe((status) => {

  console.log(
    'Realtime status:',
    status
  )

  if (
    status === 'CHANNEL_ERROR' ||
    status === 'TIMED_OUT'
   
  ) {

    console.log(
      'Realtime desconectado'
    )

    setTimeout(() => {
      fetchEnvios(false)
    }, 1000)
  }
})
 const handleVisibility = () => {
    if (!document.hidden) {
      console.log('Pestaña activa')
      fetchEnvios(false)
    }
  }

  document.addEventListener(
    'visibilitychange',
    handleVisibility
  )

  // respaldo si realtime se desconecta
const intervalo = setInterval(() => {

  if (canal.state !== 'joined') {

    console.log('Reactivando realtime...')

    canal.subscribe()

    fetchEnvios(false)
  }

}, 60000)

  return () => {
    clearInterval(intervalo) 

     document.removeEventListener(
      'visibilitychange',
      handleVisibility
    )
    supabase.removeChannel(canal)
  }
}, [])

  /* ---------- FILTRADO ---------- */
const enviosFiltradosOrdenados = useMemo(() => {
  let datos = [...envios]

  // BUSCADOR
  if (busqueda.trim()) {
    const filtro = busqueda.toLowerCase()

    datos = datos.filter((e) =>
      Object.values(e).some((valor) =>
        String(valor ?? '')
          .toLowerCase()
          .includes(filtro)
      )
    )
  }

  // FECHA
  if (fechaFiltro) {
    datos = datos.filter(
      (e) => e.fecha === fechaFiltro
    )
  }

  // MENSAJERO
  if (mensajeroFiltro) {
    datos = datos.filter(
      (e) => e.mensajero === mensajeroFiltro
    )
  }

  // ESTADO
  if (estadoFiltro) {
    const estadoNorm =
      normalizarTexto(estadoFiltro)

    datos = datos.filter(
      (e) =>
        normalizarTexto(e.estado) ===
        estadoNorm
    )
  }

  // FECHAS DE REFERENCIA
  const hoy = new Date()

  const hoyLocal = new Date(
    hoy.getTime() -
      hoy.getTimezoneOffset() * 60000
  )

  const hoyStr =
    hoyLocal.toISOString().split('T')[0]

  const manana = new Date(hoyLocal)

  manana.setDate(
    manana.getDate() + 1
  )

  const mananaStr =
    manana.toISOString().split('T')[0]

  const obtenerPrioridad = (envio) => {
    const fecha = envio.fecha

    if (
      !fecha ||
      isNaN(new Date(fecha).getTime())
    ) {
      return 6
    }

    // Hoy mañana
    if (
      envio.estado === 'En la mañana' &&
      fecha === hoyStr
    ) {
      return 1
    }

    // Hoy tarde
    if (
      envio.estado === 'En la tarde' &&
      fecha === hoyStr
    ) {
      return 2
    }

    // Mañana
    if (
      envio.estado === 'Mañana' ||
      fecha === mananaStr
    ) {
      return 3
    }

    const fechaObj = new Date(fecha)
    const hoyObj = new Date(hoyStr)

    // Futuras
    if (fechaObj > hoyObj) {
      return 4
    }

    // Pasadas
    return 5
  }

  datos.sort((a, b) => {
    const prioridadA =
      obtenerPrioridad(a)

    const prioridadB =
      obtenerPrioridad(b)

    if (prioridadA !== prioridadB) {
      return prioridadA - prioridadB
    }

    const fechaA =
      a.fecha &&
      !isNaN(new Date(a.fecha))
        ? new Date(a.fecha).getTime()
        : null

    const fechaB =
      b.fecha &&
      !isNaN(new Date(b.fecha))
        ? new Date(b.fecha).getTime()
        : null

    // Futuras
    if (prioridadA === 4) {
      return fechaA - fechaB
    }

    // Pasadas
    if (prioridadA === 5) {
      return fechaB - fechaA
    }

    // Invalid Date
    if (prioridadA === 6) {
      return 0
    }

    return 0
  })

  return datos

}, [
  envios,
  busqueda,
  fechaFiltro,
  mensajeroFiltro,
  estadoFiltro
])

  const totalPaginas = Math.ceil(
    enviosFiltradosOrdenados.length / ITEMS_POR_PAGINA
  )

  const enviosPagina = enviosFiltradosOrdenados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, fechaFiltro, estadoFiltro, mensajeroFiltro]) 

  useEffect(() => {
  if (
    paginaActual > totalPaginas &&
    totalPaginas > 0
  ) {
    setPaginaActual(totalPaginas)
  }
}, [paginaActual, totalPaginas])

  /* ---------- CAMBIAR ESTADO ---------- */
const cambiarEstado = async (id, nuevoEstado) => {
  try {
    const hoy = new Date()
    const hoyLocal = new Date(
      hoy.getTime() - hoy.getTimezoneOffset() * 60000
    )

    let nuevaFecha

    if (nuevoEstado === 'Mañana') {
      const manana = new Date(hoyLocal)
      manana.setDate(manana.getDate() + 1)

      nuevaFecha = manana.toISOString().split('T')[0]
    } else {
      nuevaFecha = hoyLocal.toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('envios')
      .update({
        estado: nuevoEstado,
        fecha: nuevaFecha,
        updated_at: new Date().toISOString(), 
        origen_navegador:
  sessionStorage.getItem('navegador_id')
      })
      .eq('id', id) 

      if (!error) {
  toast.success('✏️ Envío actualizado')
}

    if (error) {
      toast.error(error.message)
      return
    }


  } catch (err) {
    console.error(err)
  }
}

  /* ---------- CAMBIAR MENSAJERO ---------- */
  const cambiarMensajero = async (id, nuevoMensajero) => {
    try {
      const { error } = await supabase
        .from('envios')
        .update({
          mensajero: nuevoMensajero,
          updated_at: new Date().toISOString(), 
          origen_navegador:
  sessionStorage.getItem('navegador_id')
        })
        .eq('id', id) 

        if (!error) {
  toast.success('✏️ Envío actualizado')
}

      if (error) {
        toast.error(error.message)
        return
      }

    } catch (err) {
      console.error(err)
    }
  }

  /* ---------- ELIMINAR ---------- */
const eliminarEnvio = (id) => {
  toast.warning('¿Eliminar envío?', {
    action: {
      label: 'Sí',
      onClick: async () => {

        ultimoDeleteRef.current = id

       const { error } = await supabase
  .from('envios')
  .delete()
  .eq('id', id)

if (error) {
  toast.error(error.message)
  return
}

eliminarEnvioLocal(id)

toast.success('Envío eliminado')
      }
    },
    cancel: {
      label: 'Cancelar'
    }
  })
}
 
/* ---------- TOGGLE COMPLETADO ---------- */
const toggleCompletado = async (id, estadoActual) => {
  if (actualizandoCheck[id]) return

  try {
    setActualizandoCheck(prev => ({
      ...prev,
      [id]: true
    }))

    const nuevo = !estadoActual

    setEnvios(prev => {
      const copia = [...prev]

      const index = copia.findIndex(e => e.id === id)

      if (index !== -1) {
        copia[index] = {
          ...copia[index],
          completado: nuevo
        }
      }

      return copia
    })

    const { error } = await supabase
      .from('envios')
      .update({
        completado: nuevo, 
        origen_navegador:
  sessionStorage.getItem('navegador_id')
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    if (nuevo) {
      toast.success('✔ Envío empacado')
    } else {
      toast.error('❗ Envío sin empacar')
    }

  } catch (err) {
    console.error(err)
  } finally {
    setActualizandoCheck(prev => ({
      ...prev,
      [id]: false
    }))
  }
}

/* ---------- DESCRIPCIÓN REVISADA ---------- */
const marcarDescripcionRevisada = async (id) => {
  try {
    const { error } = await supabase
      .from('envios')
      .update({
        descripcion_editada: false, 
        origen_navegador:
  sessionStorage.getItem('navegador_id')
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('✓ Cambio revisado')



  } catch (err) {
    console.error(err)
    toast.error('Error al marcar como revisado')
  }
}
  /* ---------- FECHA ---------- */
  const formatearFecha = (fecha) => {
    const d = dayjs(fecha)

    const hoy = dayjs()
    const manana = dayjs().add(1, 'day')
    const ayer = dayjs().subtract(1, 'day')

    if (d.isSame(hoy, 'day')) return 'Hoy'
    if (d.isSame(manana, 'day')) return 'Mañana'
    if (d.isSame(ayer, 'day')) return 'Ayer'

    return d.format('DD/MM/YYYY')
  }

  /* ---------- MODAL ---------- */
  const abrirEditarEnvio = (envio) => {
    setOriginalDelModal(envio ? { ...envio } : null)
    setEditandoDesdeModal(!!envio)
    setEnvioEditando(envio ? { ...envio } : null)
    setModalOpen(true)
  }

  const cerrarModal = () => {
    setModalOpen(false)
    setEnvioEditando(null)
    setOriginalDelModal(null)
    setEditandoDesdeModal(false)
  } 

const guardarEnvioLocal = (envio) => {

  setEnvios(prev => {

    const existe = prev.some(e => e.id === envio.id)

    if (existe) {
      return prev.map(e =>
        e.id === envio.id
          ? envio
          : e
      )
    }

    
    return [
      envio,
      ...prev
    ].slice(0, 200)

  })

  setPaginaActual(1)
}

const eliminarEnvioLocal = (id) => {
  setEnvios(prev =>
    prev.filter(e => e.id !== id)
  )
} 


const guardarEnvio = async (envio) => {

  if (!envio) return

  guardarEnvioLocal(envio)

  setEditandoDesdeModal(false)
  setOriginalDelModal(null)
}


  /* ---------- EXPORTAR ---------- */
  const exportarExcel = (soloFiltrados) => {
    const datos = soloFiltrados
      ? enviosFiltradosOrdenados
      : envios

    if (!datos || datos.length === 0) {
      toast.error('No hay envíos para exportar')
      return
    }

    const datosLimpios = datos.map((e) => ({
      Cliente: e.cliente || '',
      Provincia: e.provincia || '',
      Teléfono: e.telefono || '',
      Ubicación: e.ubicacion || '',
      Descripción: e.descripcion || '',
      Notas: e.notas || '',
      Mensajero: e.mensajero || '',
      Estado: e.estado || '',
      Fecha: e.fecha || '',
      Completado: e.completado ? 'Sí' : 'No'
    }))

    const hoja = XLSX.utils.json_to_sheet(datosLimpios)

    const libro = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(libro, hoja, 'Envios')

    const nombre = soloFiltrados
      ? 'envios_filtrados.xlsx'
      : 'envios_todos.xlsx'

    const archivoExcel = XLSX.write(libro, {
      bookType: 'xlsx',
      type: 'array'
    })

    saveAs(new Blob([archivoExcel]), nombre)

    toast.success('📄 Excel generado correctamente')
  }

  /* ---------- COPIAR ---------- */
  const copiarEnvio = async (e) => {
    const msg = `
📦 *Envío Mensajero* *${e.mensajero || '-'}*

*${e.cliente || '-'}*
Provincia: ${e.provincia || '-'}
Teléfono: ${e.telefono || '-'}
Ubicación: ${e.ubicacion || '-'}
Notas: *${e.notas || '-'}*
    `.trim()

    await navigator.clipboard.writeText(msg)

    toast.success('✔ Envío copiado')
  }

  /* ---------- COPIAR FILTRADOS ---------- */
  const copiarEnviosFiltrados = async () => {
    if (!mensajeroFiltro || enviosFiltradosOrdenados.length === 0) {
      toast.error(
        'Debe seleccionar un mensajero y tener envíos filtrados'
      )

      return
    }

    let msg = `📦 *Envíos Mensajero* *${mensajeroFiltro}*\n\n`

    enviosFiltradosOrdenados.forEach((e, i) => {
      msg += `${i + 1}. *${e.cliente || '-'}*
Provincia: ${e.provincia || '-'}
Teléfono: ${e.telefono || '-'}
Ubicación: ${e.ubicacion || '-'}
Notas: *${e.notas || '-'}*\n\n`
    })

    await navigator.clipboard.writeText(msg.trim())

    toast.success('✔ Envíos copiados')
  }

  /* ---------- LOADING ---------- */
  if (loading && isFirstLoad) {
    return <TableBarLoader />
  }


const hayFiltros =
  busqueda.trim() !== '' ||
  fechaFiltro !== '' ||
  estadoFiltro !== '' ||
  mensajeroFiltro !== ''


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

        <input
          type="date"
          value={fechaFiltro}
          onChange={(e) => setFechaFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300"
        />

        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300"
        >
          <option value="">Todos los estados</option>
          <option value="En la mañana">En la mañana</option>
          <option value="En la tarde">En la tarde</option>
          <option value="Mañana">Mañana</option>
        </select>

        <select
          value={mensajeroFiltro}
          onChange={(e) => setMensajeroFiltro(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-300"
        >
          <option value="">Todos los mensajeros</option>
          {['Jose','Gary','Jeremy','Chris','Uber','Andres','Otro'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

      </div>

      {/* BOTONES SUPERIORES */}
      <div className="flex flex-wrap justify-end gap-3 px-6 py-3 border-b border-gray-300"> 
{hayFiltros && (
  <div className="text-gray-700 text-sm mr-auto gap-2 flex items-center"
    style={{
      padding: '10px 20px',
      fontWeight: 'bold'
    }}
  >
    🔍 Se encontraron {enviosFiltradosOrdenados.length} envíos
  </div>
)}

        <button
          onClick={() => exportarExcel(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          📋 Exportar filtrados
        </button>

        <button
          onClick={() => exportarExcel(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          📦 Exportar todos
        </button>

        <button
          onClick={copiarEnviosFiltrados}
          className="bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-md"
        >
          📄 Copiar envíos
        </button>

        {/* NUEVO BOTÓN DE VISTA MENSAJEROS */}
<button
  onClick={() => router.push('/vista-mensajeros')}
  className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow font-medium"
>
  <span className="text-lg">🛵</span>
  Vista Mensajeros
</button>


      </div>

      {/* TABLA */}
      <table className="min-w-full text-sm text-left table-auto">
        <thead className="bg-gray-200 uppercase text-xs font-bold text-zinc-900 border-b border-gray-500">
          <tr>
            {[
              'Cliente','Provincia','Teléfono','Ubicación',
              'Descripción','Notas','Mensajero','Estado','Fecha','Acciones'
            ].map(txt => (
              <th key={txt} className="p-3">{txt}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {enviosPagina.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center p-6 text-gray-500">
                No hay registros
              </td>
            </tr>
          ) : enviosPagina.map((envio) => (
          <tr
  key={envio.id}
  className={`border-b align-top transition-colors ${
    actualizados[envio.id]
      ? actualizados[envio.id] === 'fijo'
        ? 'bg-yellow-300'
        : `bg-yellow-300 ${animacionesListas ? 'animate-pulse' : ''}`
      : envio.es_impresora
        ? 'bg-blue-50 hover:bg-blue-100'
        : 'bg-white hover:bg-gray-100'
  }`}
>
              <td className="p-3 break-words max-w-[180px]">
  <div className="flex items-center gap-2">
    {envio.es_impresora && (
      <FaPrint
        size={18}
        className="text-blue-600 flex-shrink-0"
        title="Impresora 3D"
      />
    )}

    <span>{envio.cliente}</span>
  </div>
</td>
              <td className="p-3 break-words max-w-[150px]">{envio.provincia}</td>
              <td className="p-3 break-words max-w-[140px]">{envio.telefono}</td>

              {/* UBICACIÓN */}
              <td className="p-3 break-words max-w-[160px]">
                {envio.ubicacion ? (
                  <a
                    href={
                      (envio.ubicacion || "").startsWith("http")
                        ? envio.ubicacion
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(envio.ubicacion || "")}`
                    }
                    target="_blank"
                    className="text-blue-600 underline"
                  >
                    Ver
                  </a>
                ) : (
                  <span className="text-gray-500">Sin ubicación</span>
                )}
              </td>

              {/* DESCRIPCIÓN */}
             <td
  className={`p-3 break-words max-w-[250px] whitespace-pre-line ${
    envio.descripcion_editada
      ? 'bg-yellow-200 border-l-4 border-yellow-500'
      : ''
  }`}
>
  <div className="flex flex-col gap-2">

    <span>{envio.descripcion}</span>

    {envio.descripcion_editada && (
      <button
        onClick={() =>
          marcarDescripcionRevisada(envio.id)
        }
        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded w-fit"
      >
        ✓ Revisado
      </button>
    )}

  </div>
</td>

              {/* NOTAS */}
              <td className="p-3 break-words max-w-[250px] whitespace-pre-line">
                {envio.notas || '—'}
              </td>

              {/* MENSAJERO */}
              <td className="p-3">
                <select
                  value={envio.mensajero || ''}
                  onChange={(e) => cambiarMensajero(envio.id, e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Seleccionar</option>
                  {['Jose','Gary','Jeremy','Chris','Uber','Andres','Otro'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>

              {/* ESTADO Y COMPLETADO */}
              <td className="p-3 align-top">
                <div className="flex flex-col gap-1">

                  {/* SELECT DE ESTADO + COMPLETADO */}
                  <div className="flex items-center justify-between gap-2">

                    <select
                      value={envio.estado ?? ''}
                      onChange={(e) => cambiarEstado(envio.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-semibold w-fit
                        ${
                          envio.estado === 'En la mañana'
                            ? 'bg-green-200 text-green-800'
                            : envio.estado === 'En la tarde'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-blue-200 text-blue-800'
                        }
                      `}
                    >
                      <option>En la mañana</option>
                      <option>En la tarde</option>
                      <option>Mañana</option>
                    </select>

                    {/* BOTÓN COMPLETADO */}
          {/* BOTÓN COMPLETADO */}
<button
  disabled={actualizandoCheck[envio.id]}
  onClick={() =>
    toggleCompletado(
      envio.id,
      envio.completado
    ) 
  } 



  

  className={`
    flex items-center justify-center
    w-7 h-7 min-w-[28px] min-h-[28px]
    rounded-full border transition-colors
    ${
      envio.completado
        ? 'bg-green-600 text-white border-green-600'
        : 'bg-white text-gray-500 border-gray-400'
    }
  `}
>
  <Check size={14} strokeWidth={3} />
</button> 



                  </div>
                </div>

                {/* ANIMACIÓN */}
                <style jsx>{`
                  @keyframes typing {
                    from { width: 0 }
                    to { width: 100% }
                  }
                  .animate-typing {
                    display: inline-block;
                    width: 0;
                    animation: typing 1.2s steps(12, end) forwards;
                  }
                `}</style>
              </td>

              {/* FECHA */}
              <td className="p-3">{formatearFecha(envio.fecha)}</td>

              {/* ACCIONES */}
              <td className="p-3 flex gap-3">

                {/* EDITAR */}
                <button
                  onClick={() => abrirEditarEnvio(envio)}
                  className="bg-blue-600 text-white p-2 rounded-full"
                >
                  <Pencil size={16} />
                </button>

                {/* ELIMINAR */}
                <button
                  onClick={() => eliminarEnvio(envio.id)}
                  className="bg-red-600 text-white p-2 rounded-full"
                >
                  <Trash2 size={16} />
                </button>

                {/* COPIAR */}
                <button
                  onClick={() => copiarEnvio(envio)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full"
                >
                  <Copy size={16} />
                </button>

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
              paginaActual === num
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
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

      {/* MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={cerrarModal}
        title={envioEditando ? "Editar Envío" : "Crear Envío"}
      >
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

