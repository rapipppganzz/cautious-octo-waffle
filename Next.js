// ============================================
// FILE 1: pages/index.js (Frontend)
// ============================================

import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, UserPlus, Phone, X, RefreshCw } from 'lucide-react';

export default function DatabaseManager() {
  const [users, setUsers] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginBar, setShowLoginBar] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddNumber, setShowAddNumber] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'reseller',
    expired: ''
  });
  const [numberForm, setNumberForm] = useState({ number: '' });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [usersRes, numbersRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/numbers')
      ]);
      
      const usersData = await usersRes.json();
      const numbersData = await numbersRes.json();
      
      setUsers(usersData);
      setNumbers(numbersData);
      setLoading(false);
    } catch (err) {
      setError('Gagal memuat data: ' + err.message);
      setLoading(false);
    }
  };

  const handleLogin = () => {
    const user = users.find(
      u => u.username === loginForm.username && u.password === loginForm.password
    );
    
    if (user) {
      if (user.expired && user.expired !== '') {
        const expiredDate = new Date(user.expired);
        const now = new Date();
        
        if (expiredDate < now) {
          setError('Akun Anda sudah expired!');
          return;
        }
      }
      
      setIsLoggedIn(true);
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setShowLoginBar(false);
      setLoginForm({ username: '', password: '' });
      setSuccess(`Berhasil login sebagai ${user.username} (${user.role})`);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Username atau password salah!');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setSuccess('Berhasil logout');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddNumber = async () => {
    if (!isLoggedIn) {
      setError('Anda harus login terlebih dahulu!');
      return;
    }
    
    if (!numberForm.number.trim()) {
      setError('Nomor tidak boleh kosong!');
      return;
    }
    
    let cleanNumber = numberForm.number.trim().replace(/\s+/g, '');
    
    if (numbers.includes(cleanNumber)) {
      setError('Nomor sudah ada dalam database!');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch('/api/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          number: cleanNumber,
          addedBy: currentUser.username 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setNumbers(result.data);
        setSuccess(`Nomor ${cleanNumber} berhasil ditambahkan!`);
        setNumberForm({ number: '' });
        setShowAddNumber(false);
      } else {
        setError(result.message || 'Gagal menambahkan nomor');
      }
      
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error: ' + err.message);
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!isLoggedIn) {
      setError('Anda harus login terlebih dahulu!');
      return;
    }
    
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      setError('Hanya owner dan admin yang bisa menambah user!');
      return;
    }
    
    if (!userForm.username.trim() || !userForm.password.trim()) {
      setError('Username dan password tidak boleh kosong!');
      return;
    }
    
    if (users.find(u => u.username === userForm.username)) {
      setError('Username sudah digunakan!');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userForm.username,
          password: userForm.password,
          role: userForm.role,
          expired: userForm.expired || '',
          createdBy: currentUser.username
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data);
        setSuccess(`User ${userForm.username} berhasil ditambahkan!`);
        setUserForm({ username: '', password: '', role: 'reseller', expired: '' });
        setShowAddUser(false);
      } else {
        setError(result.message || 'Gagal menambahkan user');
      }
      
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error: ' + err.message);
      setSaving(false);
    }
  };

  const deleteNumber = async (index) => {
    if (!isLoggedIn) {
      setError('Anda harus login terlebih dahulu!');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch('/api/numbers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setNumbers(result.data);
        setSuccess('Nomor berhasil dihapus!');
      } else {
        setError(result.message || 'Gagal menghapus nomor');
      }
      
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-indigo-600">Database Manager</h1>
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-indigo-600 transition"
                title="Refresh data"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                  <span className="text-sm text-gray-600">
                    {currentUser.username} ({currentUser.role})
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLoginBar(!showLoginBar)}
                  className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  <LogIn size={18} />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showLoginBar && !isLoggedIn && (
        <div className="bg-white shadow-lg border-b-2 border-indigo-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Login</h2>
              <button onClick={() => setShowLoginBar(false)}>
                <X size={24} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleLogin}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
            <button onClick={() => setError('')} className="absolute top-0 right-0 p-3">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            {success}
            <button onClick={() => setSuccess('')} className="absolute top-0 right-0 p-3">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {saving && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
              <span>Menyimpan ke GitHub...</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Daftar Nomor</h2>
              <button
                onClick={() => setShowAddNumber(!showAddNumber)}
                disabled={!isLoggedIn}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  isLoggedIn 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Phone size={18} />
                <span>Add Nomor</span>
              </button>
            </div>

            {showAddNumber && isLoggedIn && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  placeholder="Masukkan nomor telepon"
                  value={numberForm.number}
                  onChange={(e) => setNumberForm({number: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-green-500"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddNumber}
                    disabled={saving}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {saving ? 'Menyimpan...' : 'Tambah'}
                  </button>
                  <button
                    onClick={() => setShowAddNumber(false)}
                    className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-500 mb-2">Total: {numbers.length} nomor</p>
              {numbers.map((number, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <span className="text-gray-700">{number}</span>
                  {isLoggedIn && (
                    <button
                      onClick={() => deleteNumber(index)}
                      disabled={saving}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-400"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Daftar User</h2>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                disabled={!isLoggedIn || (currentUser && currentUser.role === 'reseller')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  isLoggedIn && currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin')
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <UserPlus size={18} />
                <span>Add User</span>
              </button>
            </div>

            {showAddUser && isLoggedIn && (currentUser.role === 'owner' || currentUser.role === 'admin') && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  placeholder="Username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reseller">Reseller</option>
                  <option value="admin">Admin</option>
                  {currentUser.role === 'owner' && <option value="owner">Owner</option>}
                </select>
                <input
                  type="date"
                  placeholder="Expired Date (optional)"
                  value={userForm.expired}
                  onChange={(e) => setUserForm({...userForm, expired: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddUser}
                    disabled={saving}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {saving ? 'Menyimpan...' : 'Tambah'}
                  </button>
                  <button
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-500 mb-2">Total: {users.length} user</p>
              {users.map((user, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{user.username}</p>
                      <p className="text-sm text-gray-600">Role: {user.role}</p>
                      {user.expired && user.expired !== '' && (
                        <p className="text-xs text-orange-600">Expired: {user.expired}</p>
                      )}
                      <p className="text-xs text-gray-500">Created by: {user.createdBy}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'owner' ? 'bg-purple-200 text-purple-800' :
                      user.role === 'admin' ? 'bg-blue-200 text-blue-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Informasi & Setup</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold text-blue-800 mb-2">🔐 Environment Variables Required:</p>
              <code className="block bg-white p-2 rounded mt-2">
                GITHUB_TOKEN=your_github_personal_access_token<br/>
                GITHUB_OWNER=rapipppganzz<br/>
                GITHUB_REPO=improve-database<br/>
                GITHUB_BRANCH=main
              </code>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-semibold text-green-800 mb-2">📂 Lokasi Database:</p>
                <ul className="list-disc ml-5 text-green-700">
                  <li><code>users.json</code> → Data pengguna</li>
                  <li><code>numbers.json</code> → Data nomor</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="font-semibold text-yellow-800 mb-2">⚙️ API Routes:</p>
                <ul className="list-disc ml-5 text-yellow-700">
                  <li>GET /api/users</li>
                  <li>POST /api/users</li>
                  <li>GET /api/numbers</li>
                  <li>POST /api/numbers</li>
                  <li>DELETE /api/numbers</li>
                </ul>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg mt-4">
              <p className="font-semibold text-purple-800 mb-2">💡 Catatan:</p>
              <p className="text-purple-700 text-sm">
                Setiap perubahan akan otomatis disimpan ke GitHub melalui API backend.
                Pastikan token GitHub memiliki izin: <b>repo (full control)</b>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-10 py-6 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Improve— Database Manager
      </footer>
    </div>
  );
}