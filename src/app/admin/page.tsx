'use client'
import { useState, useEffect } from 'react'
import InactivityTimeoutSetting from '@/components/admin/InactivityTimeoutSetting'
import UserManagement from '@/components/admin/UserManagement'

export default function AdminPage() {
  const { isDisabled, setIsDisabled, users } = useInactivityTimeoutManagement()
  
  return (
    <div style={{ padding: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      <h1 style={{ color: 'white', marginBottom: '24px' }}>Admin Settings</h1>
      
      {/* Inactivity Timer Section */}
      <div style={{ 
        background: '#0a1428', 
        padding: '24px', 
        borderRadius: '16px',
        marginBottom: '32px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ color: 'white', margin: '0 0 16px' }}>Auto Sign-Out Timer</h2>
        <InactivityTimeoutSetting 
          isDisabled={isDisabled} 
          onDisable={setIsDisabled} 
        />
      </div>

      {/* User Management Section */}
      <div style={{ 
        background: '#0a1428', 
        padding: '24px', 
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ color: 'white', margin: '0 0 16px' }}>User Management</h2>
        <UserManagement 
          onDelete={async (userId: string) => {
            // Add your delete logic here
            console.log('Deleting user:', userId)
            // Example: await supabase.from('users').delete().eq('id', userId)
          }} 
        />
      </div>
    </div>
  )
}
