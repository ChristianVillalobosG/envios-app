'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { toast } from 'sonner'

export default function RegistroEnvioForm({ onSave, onCancel, initialData, modo = 'lineal' }) {
  const mensajeros = ['Jose', 'Gary', 'Jeremy', 'Chris', 'Uber', 'Andres', 'Otro']

  const [form, setForm] = useState({
    cliente: '',
    provincia: '',
    telefono: '',
    ubicacion: '',
    descripcion: '',
    notas: '',
    mensajero: '',
    estado: 'En la mañana',
    fecha: ''
  })

  const [cargando, setCargando] = useState(false)

  // 🔥 FIX: Normaliza initialData para evitar valores null en los inputs
  useEffect(() => {
    if (initialData) {
      const normalizado = {
        cliente: initialData.cliente ?? '',
        provincia: initialData.provincia ?? '',
        telefono: initialData.telefono ?? '',
        ubicacion: initialData.ubicacion ?? '',
        descripcion: initialData.descripcion ?? '',
        notas: initialData.notas ?? '',
        mensajero: initialData.mensajero ?? '',
        estado: initialData.estado ?? 'En la mañana',
        fecha: initialData.fecha ?? ''
      }

      setForm(normalizado)
    } else {
      const now = new Date()
      const hoy = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0]

      setForm({
        cliente: '',
        provincia: '',
        telefono: '',
        ubicacion: '',
        descripcion: '',
        notas: '',
        mensajero: '',
        estado: 'En la mañana',
        fecha: hoy
      })
    }
  }, [initialData])

  // Cambia fecha automáticamente según estado
  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'estado') {
      const hoy = new Date()
      const hoyLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000)
      const fechaHoy = hoyLocal.toISOString().split('T')[0]

      if (value === 'Mañana') {
        const manana = new Date(hoyLocal)
        manana.setDate(manana.getDate() + 1)
        const fechaManana = manana.toISOString().split('T')[0]
        setForm(prev => ({ ...prev, estado: value, fecha: fechaManana }))
      } else {
        setForm(prev => ({ ...prev, estado: value, fecha: fechaHoy }))
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  // Guarda el envío en Supabase
  const handleGuardar = async (modo) => {
    setCargando(true)

    if (!form.cliente || !form.fecha) {
      toast.error('Por favor completa al menos el cliente y la fecha.')
      setCargando(false)
      return
    }

    const nuevoEnvio = { ...form }

    try {
      if (modo === 'actualizar' && initialData) {
        const { error } = await supabase
          .from('envios')
          .update(nuevoEnvio)
          .eq('id', initialData.id)

        if (error) toast.error(`❌ Error al actualizar: ${error.message}`)
        else {
          toast.success('✏️ Envío actualizado correctamente')
          onSave?.()
          onCancel?.()
        }
      } else {
        if ('id' in nuevoEnvio) delete nuevoEnvio.id

        const { error } = await supabase.from('envios').insert([nuevoEnvio])

        if (error) toast.error(`❌ Error al guardar: ${error.message}`)
        else {
          toast.success('✅ Envío agregado correctamente')
          onSave?.()
          onCancel?.()
        }
      }
    } catch (err) {
      // si err no tiene message, mostramos el objeto
      toast.error(`❌ Error inesperado: ${err?.message ?? String(err)}`)
    } finally {
      setCargando(false)
    }
  }

  const containerClass =
    modo === 'lineal'
      ? 'flex items-center gap-3 overflow-x-auto p-4 bg-white rounded-xl shadow-md'
      : 'grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-xl shadow-md'

  return (
    <form onSubmit={(e) => e.preventDefault()} className={containerClass}>
      
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
        placeholder="Ubicación / Google Maps"
        className="min-w-[180px] px-3 py-2 border rounded"
      />

      <input
        type="text"
        name="descripcion"
        value={form.descripcion}
        onChange={handleChange}
        placeholder="Descripción"
        className="min-w-[180px] px-3 py-2 border rounded"
      />

      {/* Nuevo campo de notas */}
      <input
        type="text"
        name="notas"
        value={form.notas}
        onChange={handleChange}
        placeholder="Notas"
        className="min-w-[180px] px-3 py-2 border rounded"
      />

      {/* Mensajero */}
      <div className="flex flex-col min-w-[130px]">
        <select
          name="mensajero"
          value={form.mensajero}
          onChange={(e) => setForm(prev => ({ ...prev, mensajero: e.target.value }))}
          className="px-3 py-2 border rounded"
        >
          <option value="">Mensajero</option>
          {mensajeros.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

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

      <input
        type="date"
        name="fecha"
        value={form.fecha}
        onChange={handleChange}
        className="min-w-[130px] px-3 py-2 border rounded"
        required
      />

      <div className="flex items-center gap-4">
        {initialData && (
          <button
            type="button"
            disabled={cargando}
            onClick={() => handleGuardar('actualizar')}
            className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            Actualizar
          </button>
        )}

        <button
          type="button"
          disabled={cargando}
          onClick={() => handleGuardar('crear')}
          className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          Crear
        </button>

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
