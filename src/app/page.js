'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import RegistroEnvioForm from './components/RegistroEnvioForm'
import TablaEnvios from './components/TablaEnvios'
import LoginForm from './components/LoginForm'
import RegistroForm from './components/RegistroForm'
import Bienvenida from './components/Bienvenida'

export default function Page() {
  const [user, setUser] = useState(null)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const [refresh, setRefresh] = useState(false) 
  const tablaRef = useRef(null)

  /* ---------- Verificar sesión ---------- */
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession()

        // Si no hay sesión válida
        if (error || !session) {
          await supabase.auth.signOut()
          setUser(null)
          return
        }

        setUser(session.user)

      } catch (err) {
        console.error('Error verificando sesión:', err)

        await supabase.auth.signOut()

        setUser(null)
      }
    }

    verificarSesion()

    // Escuchar cambios de autenticación
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  /* ---------- LOGIN / REGISTRO ---------- */
  if (!user) {
    return (
      <main className="p-6">
        {mostrarRegistro ? (
          <RegistroForm
            onRegistroExitoso={() => setMostrarRegistro(false)}
            onMostrarLogin={() => setMostrarRegistro(false)}
          />
        ) : (
          <LoginForm
            onMostrarRegistro={() => setMostrarRegistro(true)}
          />
        )}
      </main>
    )
  }

  /* ---------- APP ---------- */
  return (
    <main className="p-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          Registro de Envíos Pritonic
        </h1>

        <div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* BIENVENIDA */}
      <Bienvenida />

      {/* FORMULARIO */}
<RegistroEnvioForm
  tablaRef={tablaRef}
  modo="lineal"
/>

      {/* TABLA */}
     <TablaEnvios
    ref={tablaRef}
    refresh={refresh}
/>

    </main>
  )
}