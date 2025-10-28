'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { toast } from 'sonner'

export default function RegistroEnvioForm({ onSave, onCancel, initialData, modo = 'lineal' }) {
  const mensajeros = ['jose', 'gary', 'jeremy', 'chris', 'uber', 'otro']
  const [form, setForm] = useState({
    cliente: '',
    provincia: '',
    telefono: '',
    ubicacion: '',
    descripcion: '',
    mensajero: 'jose',
    estado: 'En la mañana',
    fecha: '',
    hora: ''
  })
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (initialData) {
      if (!mensajeros.includes(initialData.mensajero)) {
        setForm(prev => ({ ...prev, ...initialData, mensajero: initialData.mensajero }))
      } else {
        setForm(initialData)
      }
    } else {
      const now = new Date()
      const hoy = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0]
      const hora = now.toTimeString().slice(0, 5)
      setForm({
        cliente: '',
        provincia: '',
        telefono: '',
        ubicacion: '',
        descripcion: '',
        mensajero: 'jose',
        estado: 'En la mañana',
        fecha: hoy,
        hora
      })
    }
  }, [initialData])

  function formatearHoraParaPostgres(horaInput) {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(horaInput)) {
      return horaInput.length === 5 ? horaInput + ':00' : horaInput
    }
    return '00:00:00'
  }

  // ✅ Cambia fecha automáticamente según estado seleccionado
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

  // ✅ Guarda el envío en Supabase
  const handleGuardar = async (modo) => {
    setCargando(true)

    if (!form.cliente || !form.fecha || !form.hora) {
      toast.error('Por favor completa al menos el cliente, la fecha y la hora.')
      setCargando(false)
      return
    }

    const nuevoEnvio = {
      ...form,
      hora: formatearHoraParaPostgres(form.hora)
    }

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
      toast.error(`❌ Error inesperado: ${err.message}`)
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
      <input type="text" name="cliente" value={form.cliente} onChange={handleChange} placeholder="Cliente" className="min-w-[150px] px-3 py-2 border rounded" required />
      <input type="text" name="provincia" value={form.provincia} onChange={handleChange} placeholder="Provincia" className="min-w-[120px] px-3 py-2 border rounded" />
      <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" className="min-w-[130px] px-3 py-2 border rounded" />
      <input type="text" name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ubicación / Google Maps" className="min-w-[180px] px-3 py-2 border rounded" />
      <input type="text" name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción" className="min-w-[180px] px-3 py-2 border rounded" />

      {/* Mensajero */}
      <div className="flex flex-col min-w-[130px]">
        <select
          name="mensajero"
          value={mensajeros.includes(form.mensajero) ? form.mensajero : 'otro'}
          onChange={e => {
            const valor = e.target.value
            setForm(prev => ({ ...prev, mensajero: valor === 'otro' ? '' : valor }))
          }}
          className="px-3 py-2 border rounded"
        >
          {mensajeros.map(m => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
          ))}
        </select>
    
      </div>

      <select name="estado" value={form.estado} onChange={handleChange} className="min-w-[130px] px-3 py-2 border rounded">
        <option>En la mañana</option>
        <option>En la tarde</option>
        <option>Mañana</option>
      </select>

      <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="min-w-[130px] px-3 py-2 border rounded" required />
      <input type="time" name="hora" value={form.hora} onChange={handleChange} className="min-w-[110px] px-3 py-2 border rounded" required />

      <div className="flex items-center gap-4">
        {initialData && (
          <button type="button" disabled={cargando} onClick={() => handleGuardar('actualizar')} className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
            Actualizar
          </button>
        )}
        <button type="button" disabled={cargando} onClick={() => handleGuardar('crear')} className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
          Crear
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-zinc-400 hover:bg-zinc-500 text-white rounded">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
