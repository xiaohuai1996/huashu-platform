import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

function UserManagement() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const res = await authAPI.getMe();
      setCurrentUser(res.data.user);
    } catch (err) {
      console.error('获取当前用户失败', err);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await authAPI.getUsers();
      setUsers(res.data.users);
    } catch (err) {
      console.error('获取用户列表失败', err);
      showToast('获取用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await authAPI.updateUserRole(userId, newRole);
      showToast('权限修改成功！');
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || '修改权限失败', 'error');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`确定要删除用户「${username}」吗？此操作不可恢复！`)) return;
    
    try {
      await authAPI.deleteUser(userId);
      showToast('用户已删除');
      loadUsers();
    } catch (err) {
      showToast(err.response?.data?.error || '删除用户失败', 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin':
        return <span className="role-badge super-admin">👑 超级管理员</span>;
      case 'admin':
        return <span className="role-badge admin">⭐ 管理员</span>;
      default:
        return <span className="role-badge user">👤 普通用户</span>;
    }
  };

  const canManageUser = (targetUser) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') {
      return targetUser.role !== 'super_admin';
    }
    if (currentUser.role === 'admin') {
      return targetUser.role === 'user';
    }
    return false;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const avatarUrl = localStorage.getItem('avatarUrl') || '';

  return (
    <div className="personal-center">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>💬</div>
          <span className="header-title">话术平台</span>
        </div>
        <div className="header-right">
          <button className="back-btn" onClick={() => navigate('/home')}>
            ← 返回主页
          </button>
        </div>
      </header>

      <div className="um-content">
        <div className="um-header">
          <h1 className="um-title">👥 用户管理</h1>
          <p className="um-subtitle">管理系统所有用户 · {currentUser?.role === 'super_admin' ? '👑 超级管理员' : currentUser?.role === 'admin' ? '⭐ 管理员' : '👤 普通用户'}</p>
          {currentUser?.role === 'super_admin' && (
            <a href="/invite-code-management" className="invite-btn">
              🎫 邀请码管理
            </a>
          )}
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="um-list">
            {users.map((user) => (
              <div 
                key={user.id} 
                className={`um-card ${currentUser?.id === user.id ? 'current' : ''}`}
              >
                <div className="um-card-left">
                  <div 
                    className="um-avatar"
                    style={avatarUrl && currentUser?.id === user.id 
                      ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : {}
                    }
                  >
                    {(!avatarUrl || currentUser?.id !== user.id) && getInitials(user.nickname || user.username)}
                  </div>
                  <div className="um-card-info">
                    <div className="um-card-name">
                      {user.nickname || user.username}
                      {currentUser?.id === user.id && <span className="um-badge">当前账号</span>}
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="um-card-meta">
                      @{user.username}
                    </div>
                    <div className="um-card-meta">
                      📅 注册时间：{formatDate(user.created_at)}
                    </div>
                    {user.last_login_ip && (
                      <div className="um-card-meta">
                        🌐 最近登录IP：{user.last_login_ip}
                      </div>
                    )}
                    {user.signature && (
                      <div className="um-card-signature">「{user.signature}」</div>
                    )}
                  </div>
                </div>

                {/* Management Actions */}
                {canManageUser(user) && (
                  <div className="um-card-actions">
                    <div className="um-action-group">
                      <span className="um-action-label">设置权限：</span>
                      <select 
                        className="um-role-select"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>
                    <button 
                      className="um-delete-btn"
                      onClick={() => handleDeleteUser(user.id, user.nickname || user.username)}
                    >
                      🗑️ 删除用户
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅ ' : '❌ '}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default UserManagement;
