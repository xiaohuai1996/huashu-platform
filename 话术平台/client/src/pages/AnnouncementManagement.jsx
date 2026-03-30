import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

function AnnouncementManagement() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingAnn, setEditingAnn] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });

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
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('标题和内容不能为空', 'error');
      return;
    }
    try {
      await authAPI.publishAnnouncement(formData);
      showToast('公告发布成功！');
      setFormData({ title: '', content: '' });
      setShowForm(false);
      loadAnnouncements();
    } catch (err) {
      showToast(err.response?.data?.error || '发布失败', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条公告吗？')) return;
    try {
      await authAPI.deleteAnnouncement(id);
      showToast('公告已删除');
      loadAnnouncements();
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  const handlePin = async (ann) => {
    try {
      await authAPI.updateAnnouncement(ann.id, { is_pinned: !ann.is_pinned });
      showToast(ann.is_pinned ? '已取消置顶' : '已置顶');
      loadAnnouncements();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const handleExpire = async (ann) => {
    try {
      await authAPI.updateAnnouncement(ann.id, { is_expired: !ann.is_expired });
      showToast(ann.is_expired ? '已恢复公告' : '已过期公告');
      loadAnnouncements();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAnn || !editingAnn.title.trim() || !editingAnn.content.trim()) {
      showToast('标题和内容不能为空', 'error');
      return;
    }
    try {
      await authAPI.updateAnnouncement(editingAnn.id, {
        title: editingAnn.title,
        content: editingAnn.content,
      });
      showToast('公告已更新');
      setEditingAnn(null);
      loadAnnouncements();
    } catch (err) {
      showToast('更新失败', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const activeAnns = announcements.filter(a => !a.is_expired);
  const expiredAnns = announcements.filter(a => a.is_expired);

  return (
    <div className="personal-center">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>💬</div>
          <span className="header-title">话术平台</span>
        </div>
        <div className="header-right">
          <button className="back-btn" onClick={() => navigate('/web-management')}>
            ← 返回主页
          </button>
        </div>
      </header>

      <div className="am-content">
        <div className="am-header">
          <h1 className="am-title">📢 公告管理</h1>
          <p className="am-subtitle">管理系统所有公告</p>
        </div>

        {/* Active Announcements */}
        <div className="am-section">
          <h2 className="am-section-title">🟢 有效公告 ({activeAnns.length})</h2>
          {loading ? (
            <div className="loading-container"><div className="loading-spinner"></div></div>
          ) : activeAnns.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📭</div><p className="empty-text">暂无有效公告</p></div>
          ) : (
            <div className="am-list">
              {activeAnns.map((ann) => (
                <div key={ann.id} className={`am-card ${ann.is_pinned ? 'pinned' : ''}`}>
                  <div className="am-card-header">
                    <div className="am-card-left">
                      {ann.is_pinned && <span className="pin-badge">置顶</span>}
                      <h3 className="am-card-title">{ann.title}</h3>
                    </div>
                    <div className="am-card-actions">
                      <button className={`am-action-btn ${ann.is_pinned ? 'active' : ''}`} onClick={() => handlePin(ann)} title="置顶">
                        📌
                      </button>
                      <button className="am-action-btn edit" onClick={() => setEditingAnn({ ...ann })} title="编辑">
                        ✏️
                      </button>
                      <button className="am-action-btn expire" onClick={() => handleExpire(ann)} title="设为过期">
                        ⏰
                      </button>
                      <button className="am-action-btn delete" onClick={() => handleDelete(ann.id)} title="删除">
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p className="am-card-content">{ann.content}</p>
                  <div className="am-card-footer">
                    <span className="am-card-date">{formatDate(ann.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expired Announcements */}
        {expiredAnns.length > 0 && (
          <div className="am-section am-section-expired">
            <h2 className="am-section-title">⚫ 已过期公告 ({expiredAnns.length})</h2>
            <div className="am-list">
              {expiredAnns.map((ann) => (
                <div key={ann.id} className="am-card expired">
                  <div className="am-card-header">
                    <div className="am-card-left">
                      <span className="expired-badge">已过期</span>
                      <h3 className="am-card-title">{ann.title}</h3>
                    </div>
                    <div className="am-card-actions">
                      <button className="am-action-btn restore" onClick={() => handleExpire(ann)} title="恢复">
                        ♻️
                      </button>
                      <button className="am-action-btn delete" onClick={() => handleDelete(ann.id)} title="删除">
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p className="am-card-content">{ann.content}</p>
                  <div className="am-card-footer">
                    <span className="am-card-date">{formatDate(ann.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingAnn && (
        <div className="modal-overlay" onClick={() => setEditingAnn(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h2 className="modal-title">编辑公告</h2>
              </div>
              <button className="modal-close" onClick={() => setEditingAnn(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={editingAnn.title}
                  onChange={(e) => setEditingAnn({ ...editingAnn, title: e.target.value })}
                  className="ann-input"
                />
              </div>
              <div className="form-group">
                <label>内容</label>
                <textarea
                  value={editingAnn.content}
                  onChange={(e) => setEditingAnn({ ...editingAnn, content: e.target.value })}
                  className="ann-textarea"
                  rows={5}
                />
              </div>
              <button className="ann-publish-btn" onClick={handleSaveEdit}>
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅ ' : '❌ '}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default AnnouncementManagement;
