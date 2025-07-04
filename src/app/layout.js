import './globals.css'
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Toaster richColors position="bottom-right" />
        {children}
      </body>
    </html>
  )
}
