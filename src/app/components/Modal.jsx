// components/Modal.jsx
import React from 'react'

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-6">
        <div
          className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex justify-between items-center p-4 border-b border-zinc-300 dark:border-zinc-700">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white text-3xl font-bold leading-none"
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
