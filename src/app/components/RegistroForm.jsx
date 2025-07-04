'use client'
import { useState } from 'react'
import { supabase } from '@/app/lib/supabase' 

export default function RegistroForm({ onRegistroExitoso, onMostrarLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const handleRegistro = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
    } else {
      setMensaje('Registro exitoso. Revisa tu correo para confirmar tu cuenta.')
      onRegistroExitoso()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.png"
            alt="Logo PRITONIC"
            className="h-16 mb-2"
            style={{ objectFit: 'contain' }}
          />
          <h1 className="text-2xl font-bold text-blue-800 mb-1">Registro de envíos</h1>
        </div>
        <form onSubmit={handleRegistro} className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              placeholder-black placeholder-opacity-100 font-bold text-black"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              placeholder-black placeholder-opacity-100 font-bold text-black"
            required
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
              placeholder-black placeholder-opacity-100 font-bold text-black"
            required
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Registrarse
          </button>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          {mensaje && <p className="text-green-600 text-sm text-center">{mensaje}</p>}
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            onClick={onMostrarLogin}
            className="text-blue-700 underline font-semibold"
          >Inicia sesión aquí
          </button>
        </p>
      </div>
    </div>
  )
}