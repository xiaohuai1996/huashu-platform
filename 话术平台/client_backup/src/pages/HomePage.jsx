import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scriptsAPI, authAPI } from '../api';
import ScriptModal from '../components/ScriptModal';

function HomePage({ onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ scriptsCount: 0, usersCount: 0 });
  const [hotScripts, setHotScripts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [scriptsRes, usersRes, announcementsRes] = await Promise.all([
        scriptsAPI.getScripts(),
        authAPI.getUsers(),
        authAPI.getAnnouncements(),
      ]);
      
      setStats({
        scriptsCount: scriptsRes.data.scripts.length,
        usersCount: usersRes.data.users.length,
      });
      
      // Get top 4 hot scripts (by views)
      const hot = [...scriptsRes.data.scripts]
        .sort((a, b) => b.views - a.views)
        .slice(0, 4);
      setHotScripts(hot);
      
      // Get latest 3 announcements
      setAnnouncements(announcementsRes.data.announcements.slice(0, 3));
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const avatarUrl = localStorage.getItem('avatarUrl') || '';
  const displayName = user.nickname || user.username;

  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-left">
          <div className="home-logo">💬</div>
          <div className="home-title-group">
            <h1 className="home-title">话术平台</h1>
            <span className="home-subtitle">智能话术库</span>
          </div>
        </div>
        <div className="home-header-nav">
          <div className="nav-btn" onClick={() => navigate('/dashboard')}>
            <span className="nav-btn-icon">💬</span>
            <span className="nav-btn-text">话术库</span>
          </div>
          <div className="nav-btn" onClick={() => navigate('/personal-center')}>
            <span className="nav-btn-icon">👤</span>
            <span className="nav-btn-text">个人中心</span>
          </div>
          {(user.role === 'super_admin' || user.role === 'admin') && (
            <>
              <div className="nav-btn" onClick={() => navigate('/announcement')}>
                <span className="nav-btn-icon">📢</span>
                <span className="nav-btn-text">发布公告</span>
              </div>
              <div className="nav-btn" onClick={() => navigate('/user-management')}>
                <span className="nav-btn-icon">👥</span>
                <span className="nav-btn-text">用户管理</span>
              </div>
            </>
          )}
        </div>
        <div className="home-header-right">
          <div className="home-user-avatar" onClick={() => navigate('/personal-center')}>
            <div 
              className="avatar-circle"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!avatarUrl && getInitials(displayName)}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-sphere hero-sphere-1"></div>
          <div className="hero-sphere hero-sphere-2"></div>
          <div className="hero-sphere hero-sphere-3"></div>
        </div>
        <div className="hero-content">
          <h2 className="hero-title">欢迎回来，{displayName} 👋</h2>
          <p className="hero-desc">发现精彩话术，提升沟通效率</p>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="stats-section" style={{ paddingTop: '40px' }}>
        <div className="stats-grid">
          <div className="stat-card stat-1 clickable" onClick={() => navigate('/dashboard')}>
            <div className="stat-icon">📚</div>
            <div className="stat-info">
              <span className="stat-number">{stats.scriptsCount}</span>
              <span className="stat-label">话术总数</span>
            </div>
          </div>
          <div className="stat-card stat-2">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-number">{stats.usersCount}</span>
              <span className="stat-label">平台用户</span>
            </div>
          </div>
          <div className="stat-card stat-3">
            <div className="stat-icon">🔥</div>
            <div className="stat-info">
              <span className="stat-number">{hotScripts[0]?.views || 0}</span>
              <span className="stat-label">最热浏览</span>
            </div>
          </div>
          <div className="stat-card stat-4">
            <div className="stat-icon">📢</div>
            <div className="stat-info">
              <span className="stat-number">{announcements.length}</span>
              <span className="stat-label">最新公告</span>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <section className="section announcements-section">
          <div className="section-header">
            <h3 className="section-title">📢 最新公告</h3>
            <span className="section-tag">公告</span>
          </div>
          <div className="announcements-list">
            {announcements.map((ann) => (
              <div key={ann.id} className="announcement-card">
                <div className="announcement-badge">公告</div>
                <div className="announcement-content">
                  <h4 className="announcement-title">{ann.title}</h4>
                  <p className="announcement-text">{ann.content}</p>
                </div>
                <span className="announcement-date">{formatDate(ann.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hot Scripts Section */}
      <section className="section hot-scripts-section">
        <div className="section-header">
          <h3 className="section-title">🔥 热门话术</h3>
          <span className="section-tag">推荐</span>
        </div>
        <div className="hot-scripts-grid">
          {hotScripts.map((script, index) => (
            <div 
              key={script.id} 
              className="hot-script-card"
              onClick={() => setSelectedScript(script)}
            >
              <div className="hot-rank">#{index + 1}</div>
              <div className="hot-script-content">
                <span className="hot-script-category">{script.category}</span>
                <h4 className="hot-script-title">{script.title}</h4>
                <p className="hot-script-preview">{script.content.slice(0, 50)}...</p>
                <div className="hot-script-footer">
                  <span className="hot-script-views">👁 {script.views}</span>
                  <span className="hot-script-tag">{script.tags?.split(',')[0]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="section-footer">
          <button className="view-all-btn" onClick={() => navigate('/dashboard')}>
            查看全部话术 →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>话术平台 © 2024 · 智能话术库</p>
      </footer>

      {/* Script Modal */}
      {selectedScript && (
        <ScriptModal
          script={selectedScript}
          onClose={() => setSelectedScript(null)}
          onCopy={(content) => {
            navigator.clipboard.writeText(content);
          }}
          onToggleFavorite={() => {}}
        />
      )}
    </div>
  );
}

export default HomePage;
// TEST_MARKER
