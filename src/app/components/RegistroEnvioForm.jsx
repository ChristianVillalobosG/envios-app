'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { toast } from 'sonner'

export default function RegistroEnvioForm({ onSave, onCancel, initialData, modo = 'lineal' }) {
  const mensajeros = ["jose", "gary", "jeremy", "uber", "otro"]
  const [otroMensajero, setOtroMensajero] = useState('')

  const [form, setForm] = useState({
    cliente: '',
    provincia: '',
    telefono: '',
    ubicacion: '',
    descripcion: '',
    mensajero: 'jose', // valor inicial para evitar campo vacío
    estado: 'En la mañana',
    fecha: '',
    hora: ''
  })

  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (initialData) {
      if (!mensajeros.includes(initialData.mensajero)) {
        setForm(prev => ({ ...prev, ...initialData, mensajero: "otro" }))
        setOtroMensajero(initialData.mensajero || '')
      } else {
        setForm(initialData)
        setOtroMensajero('')
      }
    } else {
      const now = new Date()
      const hoy = now.toISOString().split('T')[0]
      const hora = now.toTimeString().slice(0, 5)
      setForm(prev => ({
        ...prev,
        mensajero: 'jose',
        fecha: hoy,
        hora
      }))
      setOtroMensajero('')
    }
    // eslint-disable-next-line
  }, [initialData])

  function formatearHoraParaPostgres(horaInput) {
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(horaInput)) {
      return horaInput.length === 5 ? horaInput + ':00' : horaInput
    }
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

  const handleGuardar = async (modo) => {
    setCargando(true)

    if (!form.cliente || !form.fecha || !form.hora) {
      toast.error('Por favor completa al menos el cliente, la fecha y la hora.')
      setCargando(false)
      return
    }

    if (form.mensajero === "otro" && !otroMensajero.trim()) {
      toast.error('Por favor escribe el nombre del mensajero.')
      setCargando(false)
      return
    }

    const nuevoEnvio = {
      ...form,
      mensajero: form.mensajero === "otro" ? otroMensajero.trim() : form.mensajero,
      hora: formatearHoraParaPostgres(form.hora)
    }

    if (modo === 'crear') {
      const now = new Date()
      const hoy = now.toISOString().split('T')[0]
      const horaActual = now.toTimeString().slice(0, 5) + ':00'
      nuevoEnvio.fecha = hoy
      nuevoEnvio.hora = horaActual
    }

    try {
      if (modo === 'actualizar' && initialData) {
        const { error } = await supabase
          .from('envios')
          .update(nuevoEnvio)
          .eq('id', initialData.id)

        if (error) {
          toast.error(`❌ Error al actualizar: ${error.message}`)
        } else {
          toast.success('✏️ Envío actualizado correctamente')
          onSave && onSave()
          onCancel && onCancel()
        }
      } else {
        if ('id' in nuevoEnvio) delete nuevoEnvio.id

        const { error } = await supabase
          .from('envios')
          .insert([nuevoEnvio])

        if (error) {
          toast.error(`❌ Error al guardar: ${error.message}`)
        } else {
          toast.success('✅ Envío agregado correctamente')

          const now = new Date()
          const hoy = now.toISOString().split('T')[0]
          const horaActual = now.toTimeString().slice(0, 5)

          setForm({
            cliente: '',
            provincia: '',
            telefono: '',
            ubicacion: '',
            descripcion: '',
            mensajero: 'jose', // restablecer a valor por defecto
            estado: 'En la mañana',
            fecha: hoy,
            hora: horaActual
          })
          setOtroMensajero('')

          onSave && onSave()
          onCancel && onCancel()
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
      ? 'flex items-center gap-3 overflow-x-auto p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-md max-w-full'
      : 'grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-md max-w-full'

  return (
    <form onSubmit={(e) => e.preventDefault()} className={containerClass}>
      {/* Campos */}
      <input
        type="text"
        name="cliente"
        value={form.cliente}
        onChange={handleChange}
        placeholder="Cliente"
        className="min-w-[150px] px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
        required
      />
      <input
        type="text"
        name="provincia"
        value={form.provincia}
        onChange={handleChange}
        placeholder="Provincia"
        className="min-w-[120px] px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
      />
      <input
        type="tel"
        name="telefono"
        value={form.telefono}
        onChange={handleChange}
        placeholder="Teléfono"
        className="min-w-[130px] px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
      />
      <input
        type="text"
        name="ubicacion"
        value={form.ubicacion}
        onChange={handleChange}
        placeholder="Ubicación / Google Maps"
        className="min-w-[180px] px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
      />
      <input
        type="text"
        name="descripcion"
        value={form.descripcion}
        onChange={handleChange}
        placeholder="Descripción"
        className="min-w-[180px] px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
      />

      {/* Mensajero: select + input cuando es "otro" */}
      <div className="flex flex-col min-w-[130px]">
        <select
          name="mensajero"
          value={form.mensajero}
          onChange={e => {
            setForm(prev => ({ ...prev, mensajero: e.target.value }))
            if (e.target.value !== "otro") setOtroMensajero("")
          }}
          className="px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
        >
          {mensajeros.map(m => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
        {form.mensajero === "otro" && (
          <input
            type="text"
            name="otroMensajero"
            value={otroMensajero}
            onChange={e => setOtroMensajero(e.target.value)}
            placeholder="Escribe el nombre"
            className="mt-2 px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
            autoFocus
            required
          />
        )}
      </div>

      <select
        name="estado"
        value={form.estado}
        onChange={handleChange}
        className="min-w-[130px] px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
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
        className="min-w-[130px] px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
        required
      />
      <input
        type="time"
        name="hora"
        value={form.hora}
        onChange={handleChange}
        className="min-w-[110px] px-3 py-2 border rounded bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-sm"
        required
      />

      {/* Botones */}
      <div className="flex items-center gap-4">
        {initialData && (
          <button
            type="button"
            disabled={cargando}
            onClick={() => handleGuardar('actualizar')}
            title="Actualizar"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="select-none font-semibold">Actualizar</span>
          </button>
        )}
        <button
          type="button"
          disabled={cargando}
          onClick={() => handleGuardar('crear')}
          title="Crear nuevo"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="select-none font-semibold">Crear</span>
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
