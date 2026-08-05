import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from './lib/queryClient'
import App from './App'
import './styles/globals.css'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e1830',
            border: '1px solid #2d2545',
            color: '#f0edf8',
            fontSize: '13px',
          },
        }}
        richColors
        closeButton
      />
    </QueryClientProvider>
  </React.StrictMode>
)
