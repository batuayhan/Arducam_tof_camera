import React from 'react'

const TestPage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>✅ Frontend Çalışıyor!</h1>
        <p>Vite dev server aktif</p>
      </div>
    </div>
  )
}

export default TestPage


