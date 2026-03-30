import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

function Announcement() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const res = await authAPI.getAnnouncements();
      setAnnouncements(res.data.announcements);
    } catch (err) {
      console.error('获取公告失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      showToast('请输入公告标题', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('请输入公告内容', 'error');
      return;
    }

    setPublishing(true);
    try {
      await authAPI.publishAnnouncement({ title: title.trim(), content: content.trim() });
      showToast('公告发布成功！');
      setTitle('');
      setContent('');
      loadAnnouncements();
    } catch (err) {
      showToast(err.response?.data?.error || '发布失败', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

      <div className="ann-content">
        <div className="ann-header">
          <h1 className="ann-title">📢 发布公告</h1>
          <p className="ann-subtitle">发布平台公告，通知所有用户</p>
        </div>

        <div className="ann-form">
          <div className="ann-form-group">
            <label className="ann-label">公告标题</label>
            <input
              type="text"
              className="ann-input"
              placeholder="输入公告标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="ann-form-group">
            <label className="ann-label">公告内容</label>
            <textarea
              className="ann-textarea"
              placeholder="输入公告内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={500}
            />
            <span className="ann-char-count">{content.length}/500</span>
          </div>

          <button 
            className="ann-publish-btn" 
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? '发布中...' : '📢 发布公告'}
          </button>
        </div>

        <div className="ann-divider"></div>

        <div className="ann-list-section">
          <h2 className="ann-list-title">📋 历史公告</h2>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-text">暂无公告</p>
            </div>
          ) : (
            <div className="ann-list">
              {announcements.map((ann) => (
                <div key={ann.id} className="ann-card">
                  <div className="ann-card-header">
                    <h3 className="ann-card-title">{ann.title}</h3>
                    <span className="ann-card-time">{formatDate(ann.created_at)}</span>
                  </div>
                  <p className="ann-card-content">{ann.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
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

export default Announcement;
