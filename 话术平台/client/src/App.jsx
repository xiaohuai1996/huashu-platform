import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PersonalCenter from './pages/PersonalCenter';
import UserManagement from './pages/UserManagement';
import Announcement from './pages/Announcement';
import HomePage from './pages/HomePage';
import VideoPlayer from './pages/VideoPlayer';
import ChatRecords from './pages/ChatRecords';
import WebManagement from './pages/WebManagement';
import ScriptManagement from './pages/ScriptManagement';
import AnnouncementManagement from './pages/AnnouncementManagement';
import CategoryManagement from './pages/CategoryManagement';
import PublishScript from './pages/PublishScript';
import InviteCodeManagement from './pages/InviteCodeManagement';
import AnimatedBackground from './components/AnimatedBackground';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <BrowserRouter>
      <AnimatedBackground />
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : 
            <Login onLoginSuccess={handleLoginSuccess} />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : 
            <Register onRegisterSuccess={handleLoginSuccess} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? 
            <Dashboard onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/personal-center" 
          element={
            isAuthenticated ? 
            <PersonalCenter /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/user-management" 
          element={
            isAuthenticated ? 
            <UserManagement /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/announcement" 
          element={
            isAuthenticated ? 
            <Announcement /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/web-management" 
          element={
            isAuthenticated ? 
            <WebManagement /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/script-management" 
          element={
            isAuthenticated ? 
            <ScriptManagement /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/announcement-management" 
          element={
            isAuthenticated ? 
            <AnnouncementManagement /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/category-management" 
          element={
            isAuthenticated ? 
            <CategoryManagement /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/publish-script" 
          element={
            isAuthenticated ? 
            <PublishScript /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/home" 
          element={
            isAuthenticated ? 
            <HomePage onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/video" 
          element={
            isAuthenticated ? 
            <VideoPlayer /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/chat-records" 
          element={
            isAuthenticated ? 
            <ChatRecords /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/invite-code-management" 
          element={
            isAuthenticated ? 
            <InviteCodeManagement /> : 
            <Navigate to="/login" />
          } 
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/home" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
