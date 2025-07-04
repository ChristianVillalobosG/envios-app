'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { toast } from 'sonner'

export default function RegistroModal({ isOpen, onClose, initialData, onSave }) {
  const [form, setForm] = useState({
    cliente: '',
    provincia: '',
    telefono: '',
    ubicacion: '',
    descripcion: '',
    mensajero: '',
    estado: 'En la mañana',
    fecha: '',
    hora: ''
  })

  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (initialData) {
      setForm(initialData)
    } else {
      const now = new Date()
      const hoy = now.toISOString().split('T')[0]
      // Hora en formato "HH:mm"
      const hora = now.toTimeString().slice(0, 5)
      setForm(prev => ({ ...prev, fecha: hoy, hora }))
    }
  }, [initialData])

  function formatearHoraParaPostgres(horaInput) {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(horaInput)) {
      return horaInput.length === 5 ? horaInput + ':00' : horaInput
    }

    // Intentar parsear con AM/PM
    const horaClean = horaInput.replace('p. m.', 'PM').replace('a. m.', 'AM')
    const date = new Date('1970-01-01T' + horaClean)
    if (!isNaN(date)) {
      const h = String(date.getHours()).padStart(2, '0')
      const m = String(date.getMinutes()).padStart(2, '0')
      const s = String(date.getSeconds()).padStart(2, '0')
      return `${h}:${m}:${s}`
    }
    return '00:00:00'
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const generarIframeURL = (ubicacion) => {
    if (!ubicacion) return ''
    const esURL = ubicacion.startsWith('http://') || ubicacion.startsWith('https://')
    if (esURL) return ubicacion
    return `https://www.google.com/maps?q=${encodeURIComponent(ubicacion)}&output=embed`
  }

  const handleSubmit = async () => {
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
      if (initialData) {
        const { error } = await supabase
          .from('envios')
          .update(nuevoEnvio)
          .eq('id', initialData.id)

        if (error) {
          toast.error(`❌ Error al actualizar: ${error.message}`)
        } else {
          toast.success('✏️ Envío actualizado correctamente')
          onSave()
          onClose()
        }
      } else {
        const { error } = await supabase
          .from('envios')
          .insert([nuevoEnvio])

        if (error) {
          toast.error(`❌ Error al guardar: ${error.message}`)
        } else {
          toast.success('✅ Envío agregado correctamente')
          onSave()
          onClose()
        }
      }
    } catch (err) {
      toast.error(`❌ Error inesperado: ${err.message}`)
    } finally {
      setCargando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-4xl shadow-xl space-y-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold mb-2">{initialData ? 'Editar envío' : 'Nuevo envío'}</h2>

        <div className="flex flex-col gap-4">
          {['cliente', 'provincia', 'telefono', 'descripcion', 'mensajero'].map((campo) => (
            <input
              key={campo}
              type="text"
              name={campo}
              value={form[campo]}
              onChange={handleChange}
              placeholder={campo.charAt(0).toUpperCase() + campo.slice(1)}
              className="px-4 py-2 border rounded w-full bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
            />
          ))}

          {/* Ubicación con mapa */}
          <input
            type="text"
            name="ubicacion"
            value={form.ubicacion}
            onChange={handleChange}
            placeholder="Ubicación o enlace de Google Maps"
            className="px-4 py-2 border rounded w-full bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
          />

          {form.ubicacion && (
            <iframe
              src={generarIframeURL(form.ubicacion)}
              className="w-full h-64 rounded border border-zinc-300 dark:border-zinc-700"
              loading="lazy"
              allowFullScreen
            ></iframe>
          )}

          {/* Estado */}
          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="px-4 py-2 border rounded w-full bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
          >
            <option>En la mañana</option>
            <option>En la tarde</option>
            <option>Mañana</option>
          </select>

          {/* Fecha y Hora */}
          <input
            type="date"
            name="fecha"
            value={form.fecha}
            onChange={handleChange}
            className="px-4 py-2 border rounded w-full bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
          />
    
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-400 hover:bg-zinc-500 text-white rounded"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={cargando}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
          >
            {cargando && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
            )}
            {initialData ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
