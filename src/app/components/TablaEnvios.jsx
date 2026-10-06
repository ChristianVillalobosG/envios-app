'use client'


import { supabase } from '@/app/lib/supabase'
import { Pencil, Trash2, Check, Copy, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import RegistroEnvioForm from './RegistroEnvioForm'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { useRouter } from 'next/navigation' 
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle
} from 'react'
import { FaPrint } from 'react-icons/fa6' 
import { FaWhatsapp } from "react-icons/fa"

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
const TablaEnvios = forwardRef(({ refresh }, ref) => {
  const router = useRouter() 

  const navegadorId = useRef(null)  
  const ultimoDeleteRef = useRef(null)  
 const primeraCargaRef = useRef(true)

const filtrosRef = useRef({
  busqueda: '',
  fechaDesde: '',
  fechaHasta: '',
  estadoFiltro: '',
  mensajeroFiltro: '',
  filtroEmpacado: '',
  tipoFiltro: ''
})

const paginaActualRef = useRef(1)

  


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
const [fechaDesde, setFechaDesde] = useState('')
const [fechaHasta, setFechaHasta] = useState('')
const [estadoFiltro, setEstadoFiltro] = useState('') 
const [filtroEmpacado, setFiltroEmpacado] = useState('')
const [mensajeroFiltro, setMensajeroFiltro] = useState('')
const [tipoFiltro, setTipoFiltro] = useState('')
  const [actualizados, setActualizados] = useState({})
  const [envioEditando, setEnvioEditando] = useState(null)
  const [originalDelModal, setOriginalDelModal] = useState(null)
  const [editandoDesdeModal, setEditandoDesdeModal] = useState(false)
  const [animacionesListas, setAnimacionesListas] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [paginaActual, setPaginaActual] = useState(1)  
  const [totalEnvios, setTotalEnvios] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)   
  const [modoFormulario, setModoFormulario] = useState('editar')
  const [actualizandoCheck, setActualizandoCheck] = useState({})   
  const [actualizandoFacturado, setActualizandoFacturado] = useState({})  


  useEffect(() => {
  filtrosRef.current = {
    busqueda,
    fechaDesde,
    fechaHasta,
    estadoFiltro,
    mensajeroFiltro,
    filtroEmpacado,
    tipoFiltro
  }

  paginaActualRef.current = paginaActual
}, [
  busqueda,
  fechaDesde,
  fechaHasta,
  estadoFiltro,
  mensajeroFiltro,
  filtroEmpacado,
  tipoFiltro,
  paginaActual
])

 
 

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


const filtrosActuales = filtrosRef.current
const pagina = paginaActualRef.current
const porPagina = ITEMS_POR_PAGINA

const { data, error } = await supabase.rpc(
  'obtener_envios_paginados',
  {
    p_pagina: pagina,
    p_por_pagina: porPagina,
    p_busqueda: filtrosActuales.busqueda || '',
    p_fecha_desde: filtrosActuales.fechaDesde || null,
    p_fecha_hasta: filtrosActuales.fechaHasta || null,
    p_estado: filtrosActuales.estadoFiltro || '',
    p_mensajero: filtrosActuales.mensajeroFiltro || '',
    p_filtro_empacado:
      filtrosActuales.filtroEmpacado || '',
    p_tipo: filtrosActuales.tipoFiltro || ''
  }
)

    if (error) {
      console.error(error)
      toast.error('Error cargando envíos')
      return
    }

console.log(
  'ENVÍOS FETCH:',
  data?.length || 0
)

console.log(
  'TOTAL REAL FILTRADO:',
  data?.[0]?.total_count || 0
)

setTotalEnvios(
  Number(data?.[0]?.total_count || 0)
) 



    /* ---------- ACTUALIZAR ESTADOS AUTOMÁTICAMENTE ---------- */

let datosFinales = [...(data || [])]

const cambiosAutomaticos = datosFinales.filter((envio) => {

  const nuevoEstado =
    obtenerEstadoAutomatico(envio)

  return (
    nuevoEstado &&
    nuevoEstado !== envio.estado
  )

})

/* ---------- GUARDAR CAMBIOS EN SUPABASE ---------- */

if (cambiosAutomaticos.length > 0) {

  const gruposEstados = {}

  cambiosAutomaticos.forEach((envio) => {

    const nuevoEstado =
      obtenerEstadoAutomatico(envio)

    if (!gruposEstados[nuevoEstado]) {
      gruposEstados[nuevoEstado] = []
    }

    gruposEstados[nuevoEstado].push(envio.id)

  })


  for (const [nuevoEstado, ids] of Object.entries(
    gruposEstados
  )) {

    const { error: errorEstado } =
      await supabase
        .from('envios')
        .update({
          estado: nuevoEstado,

          origen_navegador:
            sessionStorage.getItem(
              'navegador_id'
            ),

          updated_at:
            new Date().toISOString()
        })
        .in('id', ids)

    if (errorEstado) {

      console.error(
        'Error actualizando estados automáticos:',
        errorEstado
      )

      continue
    }


    /* Actualizar también nuestra copia local */

    datosFinales = datosFinales.map((envio) => {

      const nuevoEstadoEnvio =
        obtenerEstadoAutomatico(envio)

      if (
        ids.includes(envio.id) &&
        nuevoEstadoEnvio === nuevoEstado
      ) {

        return {
          ...envio,
          estado: nuevoEstado
        }

      }

      return envio

    })

  }

}


setEnvios(datosFinales)

setActualizados((prev) => {
  const nuevo = { ...prev }

  datosFinales?.forEach((e) => {
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

  setTimeout(() => {
    primeraCargaRef.current = false
  }, 0)

  let canal = null
  let cancelado = false

  const configurarRealtime = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user || cancelado) {
        console.log(
          'No hay usuario → Realtime no configurado'
        )
        return
      }

      // Obtener grupo del usuario
      const {
        data: grupoUsuario,
        error: errorGrupo
      } = await supabase
        .from('usuarios_grupo')
        .select('grupo_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (errorGrupo) {
        console.error(
          'Error obteniendo grupo:',
          errorGrupo
        )
        return
      }

      if (cancelado) return

      const grupoId = grupoUsuario?.grupo_id || null

      console.log(
        'GRUPO REALTIME:',
        grupoId
      )

      // Si pertenece a un grupo, escucha solamente ese grupo.
      // Si no pertenece a un grupo, escucha solamente sus propios envíos.
      const filtroRealtime = grupoId
        ? `grupo_id=eq.${grupoId}`
        : `user_id=eq.${user.id}`

      console.log(
        'FILTRO REALTIME:',
        filtroRealtime
      )

      canal = supabase
        .channel('envios-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'envios',
            filter: filtroRealtime
          },
          (payload) => {

            console.log(
              'EVENTO REALTIME:',
              payload.eventType,
              payload.new?.id || payload.old?.id
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
                toast.success(
                  '📦 Nuevo envío agregado'
                )
              }

              return
            }


            // DELETE
            if (payload.eventType === 'DELETE') {

              eliminarEnvioLocal(
                payload.old.id
              )

              if (!esMiEvento) {
                toast.success(
                  '🗑️ Se eliminó un envío'
                )
              }

              return
            }


            // EMPACADO
            if (
              payload.eventType === 'UPDATE' &&
              payload.new?.completado !==
                payload.old?.completado
            ) {

              actualizarEnvioLocal(
                payload.new
              )

              if (!esMiEvento) {
                toast.success(
                  payload.new.completado
                    ? '📦 Se empacó un envío'
                    : '📦 Se desmarcó un envío'
                )
              }

              return
            }


            // FACTURADO
            if (
              payload.eventType === 'UPDATE' &&
              payload.new?.facturado !==
                payload.old?.facturado
            ) {

              actualizarEnvioLocal(
                payload.new
              )

              if (!esMiEvento) {
                toast.success(
                  payload.new.facturado
                    ? '🧾 Pedido facturado'
                    : '↩ Factura removida'
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

              actualizarEnvioLocal(
                payload.new
              )

              return
            }


            // ACTUALIZACIÓN GENERAL
            if (
              payload.eventType === 'UPDATE'
            ) {

              actualizarEnvioLocal(
                payload.new
              )

              if (!esMiEvento) {
                toast.success(
                  '✏️ Se actualizó un envío'
                )
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
              if (!cancelado) {
                fetchEnvios(false)
              }
            }, 1000)
          }
        })

    } catch (error) {

      console.error(
        'Error configurando Realtime:',
        error
      )
    }
  }

  configurarRealtime()


  const handleVisibility = () => {

    if (!document.hidden) {

      console.log(
        'Pestaña activa'
      )

      if (
        !canal ||
        canal.state !== 'joined'
      ) {

        console.log(
          'Realtime no conectado → sincronizando envíos'
        )

        fetchEnvios(false)

      } else {

        console.log(
          'Realtime conectado → no hace falta sincronizar'
        )
      }
    }
  }


  document.addEventListener(
    'visibilitychange',
    handleVisibility
  )


  // Respaldo si Realtime se desconecta
  const intervalo = setInterval(() => {

    if (
      canal &&
      canal.state !== 'joined'
    ) {

      console.log(
        'Reactivando realtime...'
      )

      canal.subscribe()

      fetchEnvios(false)
    }

  }, 60000)


  return () => {

    cancelado = true

    clearInterval(intervalo)

    document.removeEventListener(
      'visibilitychange',
      handleVisibility
    )

    if (canal) {
      supabase.removeChannel(canal)
    }
  }

}, [])



const hayFiltros =
  busqueda.trim() !== '' ||
  fechaDesde !== '' ||
  fechaHasta !== '' ||
  estadoFiltro !== '' ||
  mensajeroFiltro !== '' ||
  tipoFiltro !== '' ||
  filtroEmpacado !== ''

const limpiarFiltros = () => {

  setBusqueda('')
  setFechaDesde('')
  setFechaHasta('')
  setEstadoFiltro('')
  setMensajeroFiltro('')
  setTipoFiltro('')
  setFiltroEmpacado('')

}


  const obtenerEstadoVisual = (envio) => {

  if (!envio.fecha) return envio.estado

  const hoy = new Date()

  const hoyLocal = new Date(
    hoy.getTime() -
    hoy.getTimezoneOffset() * 60000
  )

  const hoyStr =
    hoyLocal.toISOString().split('T')[0]

  if (envio.fecha !== hoyStr) {
    return envio.estado
  }

  if (envio.estado === 'Mañana en la mañana') {
    return 'En la mañana'
  }

  if (envio.estado === 'Mañana en la tarde') {
    return 'En la tarde'
  }

  return envio.estado

} 


/* ---------- ESTADO AUTOMÁTICO ---------- */
const obtenerEstadoAutomatico = (envio) => {

  if (!envio?.fecha) {
    return envio?.estado
  }

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


  /* ---------- OTRA FECHA ---------- */

  if (envio.estado === 'Otra fecha') {

    // Si la fecha es mañana
    if (envio.fecha === mananaStr) {
      return 'Mañana en la mañana'
    }

    // Si la fecha ya es hoy
    if (envio.fecha === hoyStr) {
      return 'En la mañana'
    }

    return 'Otra fecha'
  }


  /* ---------- MAÑANA EN LA MAÑANA ---------- */

  if (
    envio.estado === 'Mañana en la mañana' &&
    envio.fecha === hoyStr
  ) {
    return 'En la mañana'
  }


  /* ---------- MAÑANA EN LA TARDE ---------- */

  if (
    envio.estado === 'Mañana en la tarde' &&
    envio.fecha === hoyStr
  ) {
    return 'En la tarde'
  }


  return envio.estado
}

const obtenerNombreDia = (fecha) => {

  if (!fecha) return ''

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

  const ayer = new Date(hoyLocal)

  ayer.setDate(
    ayer.getDate() - 1
  )

  const ayerStr =
    ayer.toISOString().split('T')[0]

  // AYER
  if (fecha === ayerStr) {
    return 'AYER'
  }

  // HOY
  if (fecha === hoyStr) {
    return 'HOY'
  }

  // MAÑANA
  if (fecha === mananaStr) {
    return 'MAÑANA'
  }

  // Cualquier otro día
  const [anio, mes, dia] = fecha.split('-')

  const fechaLocal = new Date(
    Number(anio),
    Number(mes) - 1,
    Number(dia)
  )

  return fechaLocal
    .toLocaleDateString('es-CR', {
      weekday: 'long'
    })
    .toUpperCase()
} 


const obtenerFechaVisual = (fecha) => {

  if (!fecha) return ''

  const [anio, mes, dia] = fecha.split('-')

  return `${dia}/${mes}/${anio}`
}


const enviosFiltradosOrdenados = useMemo(() => {
  return [...envios]
}, [envios])

const totalPaginas = Math.ceil(
  totalEnvios / ITEMS_POR_PAGINA
)

const enviosPagina = enviosFiltradosOrdenados  


useEffect(() => {
  if (primeraCargaRef.current) return

  if (paginaActual !== 1) {
    setPaginaActual(1)
    return
  }

  fetchEnvios(false)
}, [
  busqueda,
  fechaDesde,
  fechaHasta,
  estadoFiltro,
  mensajeroFiltro,
  tipoFiltro,
  filtroEmpacado
])

useEffect(() => {
  if (primeraCargaRef.current) return

  fetchEnvios(false)
}, [paginaActual])

  /* ---------- CAMBIAR ESTADO ---------- */
const cambiarEstado = async (id, nuevoEstado) => {

  const hoy = new Date()
  const hoyLocal = new Date(
    hoy.getTime() - hoy.getTimezoneOffset() * 60000
  )

  let nuevaFecha

if (
  nuevoEstado === 'Mañana en la mañana' ||
  nuevoEstado === 'Mañana en la tarde'
) {

  const manana = new Date(hoyLocal)

  manana.setDate(manana.getDate() + 1)

  nuevaFecha = manana.toISOString().split('T')[0]

} else {

  nuevaFecha = hoyLocal.toISOString().split('T')[0]

}
  // Actualización inmediata de la tabla
  const envioActual = envios.find(e => e.id === id)

  if (envioActual) {
    guardarEnvioLocal({
      ...envioActual,
      estado: nuevoEstado,
      fecha: nuevaFecha,
      updated_at: new Date().toISOString()
    })
  }

  try {

    const { error } = await supabase
      .from('envios')
      .update({
        estado: nuevoEstado,
        fecha: nuevaFecha,
        updated_at: new Date().toISOString(),
        origen_navegador: sessionStorage.getItem('navegador_id')
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('✏️ Envío actualizado')

  } catch (err) {
    console.error(err)
  }
}

  /* ---------- CAMBIAR MENSAJERO ---------- */
const cambiarMensajero = async (id, nuevoMensajero) => {

  const envioActual = envios.find(e => e.id === id)

  if (envioActual) {
    guardarEnvioLocal({
      ...envioActual,
      mensajero: nuevoMensajero,
      updated_at: new Date().toISOString()
    })
  }

  try {

    const { error } = await supabase
      .from('envios')
      .update({
        mensajero: nuevoMensajero,
        updated_at: new Date().toISOString(),
        origen_navegador: sessionStorage.getItem('navegador_id')
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('✏️ Envío actualizado')

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

        // Eliminar inmediatamente de la tabla
        eliminarEnvioLocal(id)

        const { error } = await supabase
          .from('envios')
          .delete()
          .eq('id', id)

        if (error) {
          toast.error(error.message)

          // Más adelante agregaremos rollback
          fetchEnvios(false)

          return
        }

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

    const envioActual = envios.find(e => e.id === id)

if (envioActual) {
  guardarEnvioLocal({
    ...envioActual,
    completado: nuevo
  })
}
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


/* ---------- TOGGLE FACTURADO ---------- */ 
const toggleFacturado = async (id, facturadoActual) => {

  const nuevoEstado = !facturadoActual

  // Actualización inmediata de la tabla
  const envioActual = envios.find(e => e.id === id)

  if (envioActual) {
    guardarEnvioLocal({
      ...envioActual,
      facturado: nuevoEstado
    })
  }

  try {

    const { error } = await supabase
      .from('envios')
      .update({
        facturado: nuevoEstado,
        updated_at: new Date().toISOString(),
        origen_navegador:
          sessionStorage.getItem('navegador_id')
      })
      .eq('id', id)

    if (error) {

      // Restaurar si ocurrió un error
      if (envioActual) {
        guardarEnvioLocal(envioActual)
      }

      toast.error(error.message)
      return
    }

    toast.success(
      nuevoEstado
        ? '🧾 Pedido facturado'
        : '↩ Factura removida'
    )

  } catch (err) {

    console.error(err)

    if (envioActual) {
      guardarEnvioLocal(envioActual)
    }

    toast.error('Error inesperado')
  }

}


/* ---------- DESCRIPCIÓN REVISADA ---------- */
const marcarDescripcionRevisada = async (id) => {

  // Buscar el envío actual
  const envioActual = envios.find(e => e.id === id)

  if (!envioActual) return

  // Actualización inmediata en la tabla
  actualizarEnvioLocal({
    ...envioActual,
    descripcion_editada: false
  })

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

      // Restaurar si hubo error
      actualizarEnvioLocal(envioActual)

      toast.error(error.message)
      return
    }

    toast.success('✓ Cambio revisado')

  } catch (err) {

    console.error(err)

    // Restaurar si hubo error
    actualizarEnvioLocal(envioActual)

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

    setModoFormulario('editar')
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

const duplicarEnvio = () => {

  if (!envioEditando) return

  setModoFormulario('duplicar')

  setEnvioEditando({
    ...envioEditando,

    id: null,
    created_at: undefined,
    updated_at: undefined,

    completado: false,

    descripcion_editada: false,
    descripcion_editada_at: null,

    origen_navegador: undefined
  })

}


const actualizarEnvioLocal = (envioActualizado) => {
  setEnvios(prev =>
    prev.map(envio =>
      envio.id === envioActualizado.id
        ? envioActualizado
        : envio
    )
  )
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
      ...prev.filter(e => e.id !== envio.id)
    ]

  })

  setPaginaActual(1)
}

const eliminarEnvioLocal = (id) => {
  setEnvios(prev =>
    prev.filter(e => e.id !== id)
  )
} 


useImperativeHandle(ref, () => ({
  guardarEnvioLocal,
  actualizarEnvioLocal,
  eliminarEnvioLocal
}))


const guardarEnvio = async (envio) => {

  if (!envio) return

  guardarEnvioLocal(envio) 

  setEditandoDesdeModal(false)
  setOriginalDelModal(null)
}


  /* ---------- EXPORTAR ---------- */
const exportarExcel = async (soloFiltrados) => {
  try {
    const { data, error } = await supabase.rpc(
      'obtener_envios_para_exportar',
      {
        p_busqueda: soloFiltrados ? busqueda || '' : '',
        p_fecha_desde: soloFiltrados
          ? fechaDesde || null
          : null,
        p_fecha_hasta: soloFiltrados
          ? fechaHasta || null
          : null,
        p_estado: soloFiltrados
          ? estadoFiltro || ''
          : '',
        p_mensajero: soloFiltrados
          ? mensajeroFiltro || ''
          : '',
        p_filtro_empacado: soloFiltrados
          ? filtroEmpacado || ''
          : '',
        p_tipo: soloFiltrados
          ? tipoFiltro || ''
          : ''
      }
    )

    if (error) {
      console.error(
        'Error obteniendo envíos para exportar:',
        error
      )

      toast.error('Error preparando el Excel')
      return
    }

    if (!data || data.length === 0) {
      toast.error('No hay envíos para exportar')
      return
    }

    const datosLimpios = data.map((e) => ({
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

    const hoja = XLSX.utils.json_to_sheet(
      datosLimpios
    )

    const libro = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      libro,
      hoja,
      'Envios'
    )

    const nombre = soloFiltrados
      ? 'envios_filtrados.xlsx'
      : 'envios_todos.xlsx'

    const archivoExcel = XLSX.write(libro, {
      bookType: 'xlsx',
      type: 'array'
    })

    saveAs(
      new Blob([archivoExcel]),
      nombre
    )

    toast.success(
      `📄 Excel generado correctamente (${data.length} envíos)`
    )

  } catch (err) {
    console.error(
      'Error exportando Excel:',
      err
    )

    toast.error('Error generando el Excel')
  }
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
  try {
    if (!mensajeroFiltro) {
      toast.error(
        'Debe seleccionar un mensajero'
      )

      return
    }

    const { data, error } = await supabase.rpc(
      'obtener_envios_para_exportar',
      {
        p_busqueda: busqueda || '',
        p_fecha_desde: fechaDesde || null,
        p_fecha_hasta: fechaHasta || null,
        p_estado: estadoFiltro || '',
        p_mensajero: mensajeroFiltro || '',
        p_filtro_empacado: filtroEmpacado || '',
        p_tipo: tipoFiltro || ''
      }
    )

    if (error) {
      console.error(
        'Error obteniendo envíos para copiar:',
        error
      )

      toast.error('Error obteniendo los envíos')
      return
    }

    if (!data || data.length === 0) {
      toast.error(
        'No hay envíos filtrados'
      )

      return
    }

    let msg =
      `📦 *Envíos Mensajero* *${mensajeroFiltro}*\n\n`

    data.forEach((e, i) => {
      msg += `${i + 1}. *${e.cliente || '-'}*
Provincia: ${e.provincia || '-'}
Teléfono: ${e.telefono || '-'}
Ubicación: ${e.ubicacion || '-'}
Notas: *${e.notas || '-'}*\n\n`
    })

    await navigator.clipboard.writeText(
      msg.trim()
    )

    toast.success(
      `✔ ${data.length} envíos copiados`
    )

  } catch (err) {
    console.error(
      'Error copiando envíos:',
      err
    )

    toast.error(
      'No se pudieron copiar los envíos'
    )
  }
}

  /* ---------- LOADING ---------- */
  if (loading && isFirstLoad) {
    return <TableBarLoader />
  }


    return (
    <div className="mt-8 overflow-x-auto rounded-xl shadow-lg bg-white text-zinc-900 font-sans">

{/* FILTROS */}
<div className="flex flex-wrap items-end gap-4 px-6 py-4 border-b border-gray-300">

  {/* Buscar */}
  <div className="flex flex-col">
    <label className="text-xs text-gray-500 mb-1">
      Buscar
    </label>

    <input
      type="text"
      placeholder="Cliente, teléfono, descripción..."
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      className="w-72 px-4 py-2 rounded-md border border-gray-300"
    />
  </div>

  {/* Desde */}
  <div className="flex flex-col">
    <label className="text-xs text-gray-500 mb-1">
      Desde
    </label>

    <input
      type="date"
      value={fechaDesde}
      onChange={(e) => setFechaDesde(e.target.value)}
      className="px-4 py-2 rounded-md border border-gray-300"
    />
  </div>

  {/* Hasta */}
  <div className="flex flex-col">
    <label className="text-xs text-gray-500 mb-1">
      Hasta
    </label>

    <input
      type="date"
      value={fechaHasta}
      onChange={(e) => setFechaHasta(e.target.value)}
      className="px-4 py-2 rounded-md border border-gray-300"
    />
  </div>

  {/* Estado */}
  <div className="flex flex-col">
    <label className="text-xs text-gray-500 mb-1">
      Estado
    </label>

    <select
      value={estadoFiltro ?? ''}
      onChange={(e) => setEstadoFiltro(e.target.value)}
      className="w-44 px-4 py-2 rounded-md border border-gray-300"
    >
      <option value="">Todos</option>

<option value="En la mañana">
  En la mañana
</option>

<option value="En la tarde">
  En la tarde
</option>

<option value="Mañana en la mañana">
  Mañana en la mañana
</option>

<option value="Mañana en la tarde">
  Mañana en la tarde
</option> 

<option value="Otra fecha">
  Otra fecha
</option>
    </select> 


  </div> 


  {/* Mensajero */}
  <div className="flex flex-col">
    <label className="text-xs text-gray-500 mb-1">
      Mensajero
    </label>

    <select
      value={mensajeroFiltro ?? ''}
      onChange={(e) => setMensajeroFiltro(e.target.value)}
      className="w-44 px-4 py-2 rounded-md border border-gray-300"
    >
      <option value="">Todos</option>

      {[
        'Jose',
        'Gary',
        'Jeremy',
        'Chris',
        'Uber',
        'Andres',
        'Otro'
      ].map(m => (

        <option
          key={m}
          value={m}
        >
          {m}
        </option>

      ))}

    </select>
  </div> 


  
      {/* FILTRO EMPACADO */} 
      <div className="flex flex-col">
    <label className="text-xs text-gray-500 mb-1">
      Empacados
    </label>
 <select
  value={filtroEmpacado}
  onChange={(e) => setFiltroEmpacado(e.target.value)}
  className="px-3 py-2 rounded-md border border-gray-300"
>
  <option value="">
    Empacado: Todos
  </option>

  <option value="pendientes">
    Empacado: Pendientes
  </option>

  <option value="empacados">
    Empacado: Empacados
  </option>
</select>
 </div>

  {/* Tipo */}
  <div className="flex flex-col">
    <label className="text-xs text-gray-500 mb-1">
      Tipo
    </label>

    <select
      value={tipoFiltro ?? ''}
      onChange={(e) => setTipoFiltro(e.target.value)}
      className="w-44 px-4 py-2 rounded-md border border-gray-300"
    >
      <option value="">Todos</option>
      <option value="pagina">📦 Página</option>
      <option value="impresora">🖨 Impresora</option>
      <option value="whatsapp">💬 WhatsApp</option>
    </select>
  </div> 

  {hayFiltros && (

  <div className="flex flex-col">

    <label className="text-xs text-transparent mb-1">
      Acción
    </label>

    <button
      onClick={limpiarFiltros}
      className="px-4 py-2 rounded-md bg-gray-200 hover:bg-red-500 hover:text-white transition-colors"
    >
      🧹 Limpiar filtros
    </button>

  </div>

)}

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
    🔍 Se encontraron {totalEnvios} envíos
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
      <div className="overflow-x-auto">
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
  envio.es_whatsapp
    ? envio.facturado
      ? 'bg-fuchsia-100 hover:bg-fuchsia-200'
      : 'bg-pink-50 hover:bg-pink-100'
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

    {envio.es_whatsapp && (
      <FaWhatsapp 
      size={20}
        className="text-green-600"
        title="Pedido WhatsApp"
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
                  value={envio.mensajero ?? ''}
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
       <td className="p-3">

  <div className="flex items-center justify-center gap-6">

  
{/* ESTADO */}

{envio.estado === 'Otra fecha' ? (

  <span
    className="
      inline-flex
      items-center
      justify-center
      px-13
      py-1
      rounded
      text-xs
      font-semibold
      w-fit
      bg-gray-200
      text-gray-700
      whitespace-nowrap
    "
  >
    Otra fecha
  </span>

) : (

  <select
    value={envio.estado ?? ''}
    onChange={(e) =>
      cambiarEstado(
        envio.id,
        e.target.value
      )
    }
    className={`
      px-2 py-1 rounded text-xs font-semibold w-fit
      border border-transparent
      cursor-pointer
      outline-none
      transition-colors
      ${
        envio.estado === 'En la mañana'
          ? 'bg-green-200 text-green-800'
          : envio.estado === 'En la tarde'
          ? 'bg-yellow-200 text-yellow-800'
          : envio.estado === 'Mañana en la mañana'
          ? 'bg-blue-200 text-blue-800'
          : envio.estado === 'Mañana en la tarde'
          ? 'bg-purple-200 text-purple-800'
          : 'bg-gray-200 text-gray-700'
      }
    `}
  >

    <option
      value="En la mañana"
      className="bg-green-200 text-green-800"
    >
      En la mañana
    </option>

    <option
      value="En la tarde"
      className="bg-yellow-200 text-yellow-800"
    >
      En la tarde
    </option>

    <option
      value="Mañana en la mañana"
      className="bg-blue-200 text-blue-800"
    >
      Mañana en la mañana
    </option>

    <option
      value="Mañana en la tarde"
      className="bg-purple-200 text-purple-800"
    >
      Mañana en la tarde
    </option>

  </select>

)}

{/* CONTENEDOR DE TOGGLES */}
<div className="flex items-center gap-4 w-[75px] justify-start">

  {/* COMPLETADO */}

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

      w-8 h-8
      min-w-[32px]
      min-h-[32px]

      rounded-full
      border
      transition-colors

      ${
        envio.completado
          ? 'bg-green-600 text-white border-green-600'
          : 'bg-white text-gray-500 border-gray-400'
      }
    `}
  >

    <Check
      size={16}
      strokeWidth={3}
    />

  </button>

  {/* FACTURADO */}

  {envio.es_whatsapp && (

    <button
      disabled={actualizandoFacturado[envio.id]}
      onClick={() =>
        toggleFacturado(
          envio.id,
          envio.facturado
        )
      }

      title={
        envio.facturado
          ? 'Factura realizada'
          : 'Marcar como facturado'
      }

      className={`
        flex items-center justify-center

        w-8 h-8
        min-w-[32px]
        min-h-[32px]

        rounded-full
        border
        transition-colors

        ${
          envio.facturado
  ? 'bg-fuchsia-600 text-white border-fuchsia-600'
  : 'bg-white text-gray-500 border-gray-400 hover:bg-gray-50'
        }
      `}
    >

      <Receipt
    size={15}
    strokeWidth={2.8}
/>
    </button>

  )}

</div>
</div>
</td>

{/* ---------- FECHA ---------- */}
<td className="text-center align-middle">
  <div className="flex flex-col items-center justify-center gap-1 py-2 min-w-[110px]">
    
    <span className="text-xs font-bold uppercase text-gray-600">
      {obtenerNombreDia(envio.fecha)}
    </span>

    <span className="text-sm font-semibold text-gray-800">
      {obtenerFechaVisual(envio.fecha)}
    </span>

  </div>
</td>

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
</div>

{/* PAGINACIÓN */}
<div className="w-full flex justify-center items-center gap-2 py-4 flex-wrap">
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
        title={
  modoFormulario === 'duplicar'
    ? '📄 Crear copia de envío'
    : 'Editar Envío'
}
      >
      <RegistroEnvioForm
  tablaRef={ref}
  initialData={envioEditando}
  modoFormulario={modoFormulario}
  onCancel={cerrarModal}
  onDuplicar={duplicarEnvio}
  modo="columnas"
/>
      </Modal>

    </div>
  )
})

export default TablaEnvios