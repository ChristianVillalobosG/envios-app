'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { toast } from 'sonner'

export default function RegistroEnvioForm({

    tablaRef,
    onCancel,
    onDuplicar,
    initialData,
    modoFormulario,
    modo

}) {

  const mensajeros = [
    'Jose',
    'Gary',
    'Jeremy',
    'Chris',
    'Uber',
    'Andres',
    'Otro'
  ]

  const obtenerFechaHoy = () => {
    const now = new Date()
    const hoy = new Date(now.getTime() - now.getTimezoneOffset() * 60000)

    return hoy.toISOString().split('T')[0]
  }

  const formInicial = {
    id: null,
    cliente: '',
    provincia: '',
    telefono: '',
    ubicacion: '',
    descripcion: '',
    notas: '',
    mensajero: '',
    estado: 'En la mañana',
    fecha: obtenerFechaHoy(), 
    es_impresora: false, 
    es_whatsapp: false, 
    facturado: false
  }

  const [form, setForm] = useState(formInicial)
  const [cargando, setCargando] = useState(false)

  /* ---------- CARGAR DATOS ---------- */
  useEffect(() => {
    if (initialData) {
      setForm({ 
        id: initialData.id ?? null,
        cliente: initialData.cliente ?? '',
        provincia: initialData.provincia ?? '',
        telefono: initialData.telefono ?? '',
        ubicacion: initialData.ubicacion ?? '',
        descripcion: initialData.descripcion ?? '',
        notas: initialData.notas ?? '',
        mensajero: initialData.mensajero ?? '',
        estado: initialData.estado ?? 'En la mañana',
        fecha: initialData.fecha ?? obtenerFechaHoy(), 
        es_impresora: initialData.es_impresora || false, 
        es_whatsapp: initialData.es_whatsapp || false
      })
    } else {
      setForm({ ...formInicial })
    }
  }, [initialData])

  /* ---------- HANDLE CHANGE ---------- */
const handleChange = (e) => {
  const { name, value } = e.target

  const hoy = new Date()

  const hoyLocal = new Date(
    hoy.getTime() - hoy.getTimezoneOffset() * 60000
  )

  const hoyStr = hoyLocal.toISOString().split('T')[0]

  const manana = new Date(hoyLocal)

  manana.setDate(manana.getDate() + 1)

  const mananaStr = manana.toISOString().split('T')[0]

  /* ---------- CAMBIO DE ESTADO ---------- */
  if (name === 'estado') {
    let nuevaFecha

    if (value === 'Mañana') {
      nuevaFecha = mananaStr
    } else {
      nuevaFecha = hoyStr
    }

    setForm((prev) => ({
      ...prev,
      estado: value,
      fecha: nuevaFecha
    }))

    return
  }

  /* ---------- CAMBIO DE FECHA ---------- */
  if (name === 'fecha') {
    let nuevoEstado = form.estado

    // Si fecha es mañana → estado Mañana
    if (value === mananaStr) {
      nuevoEstado = 'Mañana'
    }

    // Si fecha es hoy o anterior → En la mañana
    else if (value <= hoyStr) {
      nuevoEstado = 'En la mañana'
    }

    // Si fecha es futura → En la mañana
    else {
      nuevoEstado = 'En la mañana'
    }

    setForm((prev) => ({
      ...prev,
      fecha: value,
      estado: nuevoEstado
    }))

    return
  }

  /* ---------- OTROS CAMPOS ---------- */
  setForm((prev) => ({
    ...prev,
    [name]: value
  }))
}
  /* ---------- GUARDAR ---------- */
  const handleGuardar = async (tipo) => {
    try {
      setCargando(true) 

      const esDuplicado = modoFormulario === 'duplicar' 

      const actualizar =
  tipo === 'actualizar' && !esDuplicado

      if (!form.cliente || !form.fecha) {
        toast.error('Completa cliente y fecha')
        return
      }

      /* ---------- SESIÓN ---------- */
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        toast.error('Sesión inválida')
        return
      }

      const user = session.user

let grupoId = null

const { data: grupoUsuario } = await supabase
  .from('usuarios_grupo')
  .select('grupo_id')
  .eq('user_id', user.id)
  .single()

if (grupoUsuario?.grupo_id) {
  grupoId = grupoUsuario.grupo_id
}

const { id, ...formSinId } = form

const envioData = {
  ...formSinId,
  user_id: user.id,
  grupo_id: grupoId,
  origen_navegador:
    sessionStorage.getItem('navegador_id')
}

console.log('USER ID:', user.id)
console.log('SESSION:', session)
console.log('ENVIO DATA:', envioData)

    
     /* ---------- ACTUALIZAR ---------- */
if (actualizar && form.id) {

  const descripcionCambio =
    (initialData.descripcion || '').trim() !==
    (form.descripcion || '').trim()

const { data, error } = await supabase
  .from('envios')
  .update({
    ...envioData,

    origen_navegador:
      sessionStorage.getItem('navegador_id'),

    descripcion_editada:
      descripcionCambio
        ? true
        : initialData.descripcion_editada,

    descripcion_editada_at:
      descripcionCambio
        ? new Date().toISOString()
        : initialData.descripcion_editada_at,

    updated_at: new Date().toISOString()
  })
.eq('id', form.id)
  .select()
  .single()

console.log(
  'ENVIO ACTUALIZADO:',
  data
)

if (error) {
  toast.error(`❌ ${error.message}`)
  return
}

toast.success('✔️ Envío actualizado')

tablaRef.current?.actualizarEnvioLocal(data)
onCancel?.()

return 

}
      /* ---------- CREAR ---------- */ 

      console.log('CREANDO ENVÍO:', {
  tipo,
  actualizar,
  esDuplicado,
  envioData
})
 const { data, error } = await supabase
  .from('envios')
.insert([
  {
    ...envioData,

    origen_navegador:
      sessionStorage.getItem('navegador_id'),

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
])
  .select()
  .single()

      if (error) {
        toast.error(`❌ ${error.message}`)
        return
      } 

       tablaRef.current?.guardarEnvioLocal(data)

      toast.success('✅ Envío creado')

      setForm({ ...formInicial }) 

      console.log(
  'ENVIO CREADO:',
  data
)
     
      onCancel?.()

    } catch (err) {
      console.error(err)

      toast.error('Error inesperado')
    } finally {
      setCargando(false)
    }
  }

  const containerClass =
    modo === 'lineal'
      ? 'flex items-center gap-3 overflow-x-auto p-4 bg-white rounded-xl shadow-md'
      : 'grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-xl shadow-md'

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className={containerClass}
    >
      <input
        type="text"
        name="cliente"
        value={form.cliente}
        onChange={handleChange}
        placeholder="Cliente"
        className="min-w-[150px] px-3 py-2 border rounded"
        required
      />

      <input
        type="text"
        name="provincia"
        value={form.provincia}
        onChange={handleChange}
        placeholder="Provincia"
        className="min-w-[120px] px-3 py-2 border rounded"
      />

      <input
        type="tel"
        name="telefono"
        value={form.telefono}
        onChange={handleChange}
        placeholder="Teléfono"
        className="min-w-[130px] px-3 py-2 border rounded"
      />

      <input
        type="text"
        name="ubicacion"
        value={form.ubicacion}
        onChange={handleChange}
        placeholder="Ubicación"
        className="min-w-[180px] px-3 py-2 border rounded"
      />

     <div className="flex flex-col min-w-[220px] pt-7">

  <input
    type="text"
    name="descripcion"
    value={form.descripcion}
    onChange={handleChange}
    placeholder="Descripción"
    className="px-3 py-2 border rounded"
  />

  <div className="mt-2 flex items-center gap-6">

    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={form.es_impresora}
        onChange={(e) =>
          setForm({
            ...form,
            es_impresora: e.target.checked
          })
        }
      />

      <span className="text-sm">Impresora</span>
    </label>

    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={form.es_whatsapp}
        onChange={(e) =>
          setForm({
            ...form,
            es_whatsapp: e.target.checked
          })
        }
      />

      <span className="text-sm">WhatsApp</span>
    </label>

  </div>

</div>


      <input
        type="text"
        name="notas"
        value={form.notas}
        onChange={handleChange}
        placeholder="Notas"
        className="min-w-[180px] px-3 py-2 border rounded"
      />  


      {/* MENSAJERO */}
      <select
        name="mensajero"
        value={form.mensajero}
        onChange={handleChange}
        className="min-w-[130px] px-3 py-2 border rounded"
      >
        <option value="">Mensajero</option>

        {mensajeros.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      {/* ESTADO */}
      <select
        name="estado"
        value={form.estado}
        onChange={handleChange}
        className="min-w-[130px] px-3 py-2 border rounded"
      >
        <option>En la mañana</option>
        <option>En la tarde</option>
        <option>Mañana</option>
      </select>

      {/* FECHA */}
      <input
        type="date"
        name="fecha"
        value={form.fecha}
        onChange={handleChange}
        className="min-w-[130px] px-3 py-2 border rounded"
        required
      />

      {/* BOTONES */}
     <div className="flex items-center gap-4">

{initialData ? (

  modoFormulario === 'duplicar' ? (

    <button
      type="button"
      disabled={cargando}
      onClick={() => handleGuardar('crear')}
      className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white"
    >
      {cargando ? 'Guardando...' : 'Crear'}
    </button>

  ) : (

    <>
      <button
        type="button"
        disabled={cargando}
        onClick={() => handleGuardar('actualizar')}
        className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {cargando ? 'Actualizando...' : 'Actualizar'}
      </button>

      <button
        type="button"
        disabled={cargando}
        onClick={onDuplicar}
        className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        Crear copia
      </button>
    </>

  )

) : (

  <button
    type="button"
    disabled={cargando}
    onClick={() => handleGuardar('crear')}
    className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white"
  >
    {cargando ? 'Guardando...' : 'Crear'}
  </button>

)}

  {onCancel && (
    <button
      type="button"
      onClick={onCancel}
      className="px-4 py-2 bg-zinc-400 hover:bg-zinc-500 text-white rounded"
    >
      Cancelar
    </button>
  )}

</div>
    </form>
  )
} 