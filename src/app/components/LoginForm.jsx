'use client'
import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'

export default function LoginForm({ onMostrarRegistro }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else setError('')
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
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
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500  placeholder-black placeholder-opacity-100 font-bold text-black" 
            
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500  placeholder-black placeholder-opacity-100 font-bold text-black"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition"
          >
            Iniciar sesión
          </button>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </form>
        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-300" />
          <span className="mx-3 text-gray-400 text-sm">o</span>
          <div className="flex-grow border-t border-gray-300" />
        </div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 py-3 rounded-lg font-semibold text-gray-700 shadow transition"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png"
            alt="Google"
            className="h-5 w-5"
          />
          Iniciar sesión con Google
        </button>
        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={onMostrarRegistro}
            className="text-blue-700 underline font-semibold"
          >
            Regístrate aquí
          </button>
        </p>
      </div>
    </div>
  )
}
