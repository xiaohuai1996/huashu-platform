import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, scriptsAPI } from '../api';

function WebManagement() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    scriptsCount: 0,
    usersCount: 0,
    announcementsCount: 0,
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, scriptsRes, announcementsRes] = await Promise.all([
        authAPI.getUsers(),
        scriptsAPI.getScripts(),
        authAPI.getAnnouncements(),
      ]);
      
      setStats({
        scriptsCount: scriptsRes.data.scripts?.length || 0,
        usersCount: usersRes.data.users?.length || 0,
        announcementsCount: announcementsRes.data.announcements?.length || 0,
      });
    } catch (err) {
      console.error('获取数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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

      <div className="wm-content">
        <div className="wm-header">
          <h1 className="wm-title">🌐 网页管理</h1>
          <p className="wm-subtitle">管理系统概览与状态</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="wm-stats-grid">
              <div className="wm-stat-card wm-stat-1" onClick={() => navigate('/category-management')} style={{ cursor: 'pointer' }}>
                <div className="wm-stat-icon">🏷️</div>
                <div className="wm-stat-info">
                  <span className="wm-stat-label">分类管理</span>
                </div>
              </div>
              <div className="wm-stat-card wm-stat-2" onClick={() => navigate('/script-management')} style={{ cursor: 'pointer' }}>
                <div className="wm-stat-icon">📚</div>
                <div className="wm-stat-info">
                  <span className="wm-stat-label">话术管理</span>
                </div>
              </div>
              <div className="wm-stat-card wm-stat-3" onClick={() => navigate('/announcement-management')} style={{ cursor: 'pointer' }}>
                <div className="wm-stat-icon">📢</div>
                <div className="wm-stat-info">
                  <span className="wm-stat-label">发布公告</span>
                </div>
              </div>
            </div>

            {/* Platform Info */}
            <div className="wm-info-card">
              <h3 className="wm-info-title">📊 平台信息</h3>
              <div className="wm-info-list">
                <div className="wm-info-item">
                  <span className="wm-info-label">平台名称</span>
                  <span className="wm-info-value">话术平台</span>
                </div>
                <div className="wm-info-item">
                  <span className="wm-info-label">访问地址</span>
                  <span className="wm-info-value">http://129.211.9.58:3001</span>
                </div>
                <div className="wm-info-item">
                  <span className="wm-info-label">当前时间</span>
                  <span className="wm-info-value">{new Date().toLocaleString('zh-CN')}</span>
                </div>
                <div className="wm-info-item">
                  <span className="wm-info-label">系统状态</span>
                  <span className="wm-info-value wm-status">🟢 运行中</span>
                </div>
              </div>
            </div>
          </>
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

export default WebManagement;
