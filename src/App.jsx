import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Agents from './pages/Agents';
import Connect from './pages/Connector/Connect';
import Reports from './pages/Report/Reports';
import Resources from './pages/Resources';
import Knowledge from './pages/Knowledge';
import Chats from './pages/Chats';
import JDWizard from './pages/JDWizard';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';
import JDAgentPage from './pages/JDAgent/index';
import HRManualAgentPage from './pages/HRManualAgent/index';
import CompaniesPage from './pages/Companies';
import CompanyWorkspacePage from './pages/Companies/Workspace';
import AdminUsers from './pages/AdminUsers';
import PaylensePage from './pages/Paylense/landing';
import JobEvaluationPage from './pages/JobEvaluation/index';

function App() {
  const { user, loading, logout } = useAuth();

  const handleNewChat = () => {
    window.location.href = '/ai';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <>
    <ToastContainer position="top-right" autoClose={3000} />
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="app-layout">
              <Sidebar user={user} onNewChat={handleNewChat} />
              <div className="main-content">
                <Header />
                <div className="app-main-scroll">
                  <Routes>
                    <Route path="/" element={<Home user={user} />} />
                    <Route path="/agents" element={<Agents />} />
                    <Route path="/agents/jd-agent" element={<JDAgentPage />} />
                    <Route path="/agents/hr-manual-agent" element={<HRManualAgentPage />} />
                    <Route path="/companies" element={<CompaniesPage />} />
                    <Route path="/paylense" element={<PaylensePage />} />
                    <Route path="/job-evaluation" element={<JobEvaluationPage />} />
                    <Route path="/companies/:companyId/workspace" element={<CompanyWorkspacePage />} />
                    <Route path="/connect" element={<Connect />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/resources" element={<Resources />} />
                    <Route path="/knowledge" element={<Knowledge />} />
                    <Route path="/chats" element={<Chats />} />
                    <Route path="/ai" element={<AIChat />} />
                    <Route path="/settings" element={<Settings />} />
                    {user?.role === 'ADMIN' && (
                      <Route path="/admin/users" element={<AdminUsers />} />
                    )}
                    <Route path="/jd/new" element={<JDWizard />} />
                    <Route path="/jd/:id" element={<JDWizard />} />
                  </Routes>
                </div>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
}

export default App;
