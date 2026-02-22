import './globals.css'

export const metadata = {
  title: 'Project A1 - Secure Indian AI',
  description: 'Aapka apna intelligent AI companion.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Yeh main HTML body hai jahan Next.js hamare pages render karega */}
        <main id="app-root">
          {children}
        </main>
      </body>
    </html>
  )
}
