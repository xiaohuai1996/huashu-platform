import { useState, useEffect } from 'react';
import { scriptsAPI, favoritesAPI } from '../api';

function ScriptModal({ script, user, onClose, onCopy, onToggleFavorite, onDeleted }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [editData, setEditData] = useState({
    title: script.title,
    content: script.content,
    category: script.category,
    tags: script.tags,
    nav_group: script.nav_group || '',
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    checkFavorite();
  }, [script.id]);

  const checkFavorite = async () => {
    try {
      const res = await favoritesAPI.checkFavorite(script.id);
      setIsFavorite(res.data.isFavorite);
    } catch (err) {
      console.error('检查收藏状态失败', err);
    }
  };

  const handleFavoriteClick = async () => {
    await onToggleFavorite(script);
    setIsFavorite(!isFavorite);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderContent = (content) => {
    if (!content) return '';
    // Separate text and images
    const imgRegex = /<img[^>]+>/g;
    const parts = content.split(imgRegex);
    const images = content.match(imgRegex) || [];
    
    let textHtml = '';
    let imgHtml = '';
    
    parts.forEach((part, i) => {
      if (part.trim()) {
        textHtml += `<p class="content-text">${part.replace(/\n/g, '<br/>')}</p>`;
      }
      if (images[i]) {
        // Extract src from img tag
        const srcMatch = images[i].match(/src=["']([^"']+)["']/);
        const src = srcMatch ? srcMatch[1] : '';
        imgHtml += `<div class="content-img-box"><img src="${src}" onclick="document.getElementById('img-lightbox').style.display='flex';document.getElementById('lightbox-img').src='${src}';" /></div>`;
      }
    });
    
    return `<div class="content-text-box">${textHtml}</div><div class="content-images-box">${imgHtml}</div>`;
  };

  const canEdit = () => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    if (script.publisher_id === user.id) return true;
    return false;
  };

  const handleSaveEdit = async () => {
    try {
      await scriptsAPI.updateScript(script.id, editData);
      setToast({ message: '话术已更新', type: 'success' });
      setTimeout(() => {
        setIsEditing(false);
        setToast(null);
        if (onDeleted) onDeleted();
      }, 1500);
    } catch (err) {
      setToast({ message: err.response?.data?.error || '更新失败', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条话术吗？')) return;
    try {
      await scriptsAPI.deleteScript(script.id);
      if (onDeleted) onDeleted();
    } catch (err) {
      setToast({ message: err.response?.data?.error || '删除失败', type: 'error' });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            {isEditing ? (
              <input
                type="text"
                className="modal-edit-title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            ) : (
              <>
                <span className="modal-category">{script.category}</span>
                <h2 className="modal-title">{script.title}</h2>
              </>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        {toast && (
          <div className={`modal-toast ${toast.type}`}>
            {toast.type === 'success' ? '✅ ' : '❌ '}
            {toast.message}
          </div>
        )}
        
        <div className="modal-body">
          {/* Metadata */}
          <div className="script-detail-meta">
            {script.nav_group && (
              <span className="detail-meta-item">📂 {script.nav_group}</span>
            )}
            {script.publisher_name && (
              <span className="detail-meta-item">👤 {script.publisher_name}</span>
            )}
            {script.created_at && (
              <span className="detail-meta-item">🕐 {formatDate(script.created_at)}</span>
            )}
          </div>

          {isEditing ? (
            <>
              <div className="script-edit-group">
                <label>分类</label>
                <input
                  type="text"
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  className="script-edit-input"
                />
              </div>
              <div className="script-edit-group">
                <label>导航分组</label>
                <input
                  type="text"
                  value={editData.nav_group}
                  onChange={(e) => setEditData({ ...editData, nav_group: e.target.value })}
                  className="script-edit-input"
                />
              </div>
              <div className="script-edit-group">
                <label>内容</label>
                <textarea
                  value={editData.content}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  className="script-edit-textarea"
                  rows={10}
                />
              </div>
              <div className="script-edit-group">
                <label>标签</label>
                <input
                  type="text"
                  value={editData.tags}
                  onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                  className="script-edit-input"
                  placeholder="用逗号分隔"
                />
              </div>
            </>
          ) : (
            <div className="script-content" dangerouslySetInnerHTML={{ __html: renderContent(script.content) }} />
          )}
          
          {isEditing ? (
            <div className="script-edit-tags">
              <input
                type="text"
                value={editData.tags}
                onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                placeholder="用逗号分隔标签"
                className="script-edit-input-full"
              />
            </div>
          ) : (
            <div className="modal-footer">
              {script.tags?.split(',').map((tag, i) => (
                <span key={i} className="script-tag">{tag.trim()}</span>
              ))}
            </div>
          )}
          
          <div className="modal-actions">
            <button className="copy-btn" onClick={() => onCopy(script.content)}>
              📋 复制话术
            </button>
            <button className="favorite-btn" onClick={handleFavoriteClick}>
              {isFavorite ? '❤️ 取消收藏' : '🤍 收藏'}
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <div id="img-lightbox" className="img-lightbox" onClick={(e) => { if (e.target.id === 'img-lightbox') document.getElementById('img-lightbox').style.display = 'none'; }}>
        <span className="lightbox-close" onClick={() => document.getElementById('img-lightbox').style.display = 'none'}>&times;</span>
        <img id="lightbox-img" className="lightbox-img" src="" alt="" />
      </div>
    </div>
  );
}

export default ScriptModal;
