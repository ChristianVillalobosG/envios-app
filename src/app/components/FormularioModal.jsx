'use client'
import { useState } from 'react'
import RegistroModal from './components/RegistroModal'

export default function Page() {
  const [modalAbierto, setModalAbierto] = useState(false)

  return (
    <>
      <button onClick={() => setModalAbierto(true)} className="bg-blue-600 text-white px-4 py-2 rounded">
        Nuevo Envío
      </button>

      <RegistroModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={() => {
          // Aquí puedes recargar datos o mostrar un mensaje
          console.log('Se guardó o actualizó el envío')
        }}
      />
    </>
  )
}
