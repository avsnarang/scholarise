"use client";

import { useAuth } from "@/providers/auth-provider";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export function AuthDebug() {
  const { user, session, loading } = useAuth();
  const [clientSession, setClientSession] = useState<any>(null);
  const [serverResponse, setServerResponse] = useState<any>(null);

  useEffect(() => {
    // Get client-side session directly
    const getClientSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      setClientSession({ session, error });
    };

    getClientSession();
  }, []);

  const testServerAuth = async () => {
    try {
      const response = await fetch('/api/auth-test');
      const data = await response.json();
      setServerResponse(data);
    } catch (error) {
      setServerResponse({ error: 'Failed to fetch' });
    }
  };

  const checkCookies = () => {
    const cookies = document.cookie.split(';').map(cookie => {
      const [name, value] = cookie.split('=');
      return { 
        name: name?.trim(), 
        hasValue: !!value,
        valueLength: value?.length || 0,
        valuePreview: value ? value.substring(0, 50) + '...' : null
      };
    });
    console.log('🔍 Client cookies:', cookies);
    
    // Also check localStorage and sessionStorage
    console.log('🔍 LocalStorage keys:', Object.keys(localStorage));
    console.log('🔍 SessionStorage keys:', Object.keys(sessionStorage));
    
    // Check for Supabase-specific storage
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('sb-')
    );
    console.log('🔍 Supabase localStorage keys:', supabaseKeys);
    
    supabaseKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`🔍 ${key}:`, value ? `${value.substring(0, 100)}...` : 'null');
    });
    
    return cookies;
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg space-y-4">
      <h3 className="text-lg font-bold">🔍 Authentication Debug Panel</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Side */}
        <div className="p-4 bg-white rounded border">
          <h4 className="font-semibold text-green-700">Client Side</h4>
          <div className="text-sm space-y-2">
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Has User: {user ? 'Yes' : 'No'}</div>
            <div>User ID: {user?.id || 'None'}</div>
            <div>User Email: {user?.email || 'None'}</div>
            <div>Has Session: {session ? 'Yes' : 'No'}</div>
            <div>Client Session: {clientSession?.session ? 'Yes' : 'No'}</div>
            {clientSession?.error && (
              <div className="text-red-600">Error: {clientSession.error.message}</div>
            )}
          </div>
        </div>

        {/* Server Side */}
        <div className="p-4 bg-white rounded border">
          <h4 className="font-semibold text-blue-700">Server Side</h4>
          <button 
            onClick={testServerAuth}
            className="mb-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Test Server Auth
          </button>
          {serverResponse && (
            <div className="text-sm space-y-2">
              <div>Has Session: {serverResponse.hasSession ? 'Yes' : 'No'}</div>
              <div>Has User: {serverResponse.hasUser ? 'Yes' : 'No'}</div>
              <div>User ID: {serverResponse.userId || 'None'}</div>
              <div>User Email: {serverResponse.userEmail || 'None'}</div>
              <div>Cookies Count: {serverResponse.cookies?.length || 0}</div>
              {serverResponse.error && (
                <div className="text-red-600">Error: {serverResponse.error}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-x-2">
        <button 
          onClick={checkCookies}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
        >
          Log Client Cookies
        </button>
        
        <button 
          onClick={() => {
            console.log('🔍 Full auth state:', { user, session, clientSession });
          }}
          className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
        >
          Log Full State
        </button>
        
        <button 
          onClick={async () => {
            try {
              console.log('🔍 Testing GET cookies...');
              const getResponse = await fetch('/api/debug-cookies', {
                method: 'GET',
                credentials: 'include'
              });
              const getData = await getResponse.json();
              console.log('🔍 GET cookies result:', getData);
              
              console.log('🔍 Testing POST cookies...');
              const postResponse = await fetch('/api/debug-cookies', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ test: 'data' })
              });
              const postData = await postResponse.json();
              console.log('🔍 POST cookies result:', postData);
              
              alert('Cookie debug tests completed. Check console and terminal for results.');
            } catch (error) {
              console.error('Cookie debug test failed:', error);
              alert('Cookie debug test failed. Check console.');
            }
          }}
          className="px-3 py-1 bg-orange-500 text-white rounded text-sm"
        >
          Debug Cookies
        </button>
      </div>

      {/* Raw Data */}
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold">Raw Data</summary>
        <pre className="mt-2 p-2 bg-gray-800 text-green-400 rounded overflow-auto">
          {JSON.stringify({ 
            client: { user, session, clientSession },
            server: serverResponse 
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
}