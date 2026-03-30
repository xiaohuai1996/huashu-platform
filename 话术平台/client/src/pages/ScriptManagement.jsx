import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { scriptsAPI } from '../api';

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

function ScriptManagement() {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingScript, setEditingScript] = useState(null);
  const [editingImages, setEditingImages] = useState([]);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Load current user info
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    loadScripts();
  }, []);

  // Filter scripts: normal users only see their own, admins see all
  const getVisibleScripts = () => {
    if (!currentUser) return scripts;
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
      return scripts;
    }
    return scripts.filter(s => s.publisher_id === currentUser.id);
  };

  // Check if user can edit/delete a script
  const canModify = (script) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') return true;
    return script.publisher_id === currentUser.id;
  };

  // Check if user can pin
  const canPin = () => {
    if (!currentUser) return false;
    return currentUser.role === 'super_admin' || currentUser.role === 'admin';
  };

  // Decode HTML entities to render HTML properly
  const decodeAndRender = (content) => {
    if (!content) return '';
    // Use DOMParser to decode HTML entities properly
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    return doc.body.innerHTML;
  };

  const loadScripts = async () => {
    try {
      const res = await scriptsAPI.getScripts();
      setScripts(res.data.scripts);
    } catch (err) {
      console.error('获取话术失败', err);
      showToast('获取话术失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUploadForEdit = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }
    try {
      const base64 = await blobToBase64(file);
      setEditingImages(prev => [...prev, base64]);
      showToast('✅ 图片已添加！');
    } catch (err) {
      console.error('Image upload error:', err);
      showToast('❌ 图片上传失败', 'error');
    }
    e.target.value = '';
  };

  const handleDelete = async (script) => {
    if (!confirm(`确定要删除话术「${script.title}」吗？此操作不可恢复！`)) return;
    try {
      await scriptsAPI.deleteScript(script.id);
      showToast('话术已删除');
      loadScripts();
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  const handlePin = async (script) => {
    try {
      await scriptsAPI.pinScript(script.id, !script.is_pinned);
      showToast(script.is_pinned ? '已取消置顶' : '已置顶');
      loadScripts();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingScript) return;
    if (!editingScript.title.trim() || (!editingScript.content.trim() && editingImages.length === 0)) {
      showToast('标题和内容不能为空', 'error');
      return;
    }
    try {
      // Strip all img tags from content and only use editingImages
      let textContent = editingScript.content || '';
      textContent = textContent.replace(/<img[^>]*>/gi, '');
      
      let fullContent = textContent.trim();
      if (editingImages.length > 0) {
        const imagesHtml = editingImages.map(img => 
          `<br><img src="${img}" style="max-width:100%;border-radius:8px;margin:8px 0;" /><br>`
        ).join('');
        fullContent = fullContent + imagesHtml;
      }
      await scriptsAPI.updateScript(editingScript.id, {
        title: editingScript.title,
        content: fullContent,
        category: editingScript.category,
        tags: editingScript.tags,
      });
      showToast('话术已更新');
      setEditingScript(null);
      setEditingImages([]);
      loadScripts();
    } catch (err) {
      showToast('更新失败', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getFilteredScripts = () => {
    const visible = getVisibleScripts();
    if (!searchQuery) return visible;
    return visible.filter(s => 
      s.title.includes(searchQuery) || 
      s.content.includes(searchQuery) ||
      s.category.includes(searchQuery)
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

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

      <div className="sm-content">
        <div className="sm-header">
          <h1 className="sm-title">📚 话术管理</h1>
          <p className="sm-subtitle">管理所有话术内容</p>
        </div>

        <div className="sm-search">
          <input
            type="text"
            placeholder="搜索话术..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm-search-input"
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="sm-list">
            {getFilteredScripts().map((script) => (
              <div key={script.id} className={`sm-card ${script.is_pinned ? 'pinned' : ''}`}>
                {(() => {
                  const content = script.content || '';
                  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
                  const firstImage = imgMatch ? imgMatch[1] : null;
                  return firstImage ? (
                    <div className="sm-card-image">
                      <img src={firstImage} alt="" />
                    </div>
                  ) : null;
                })()}
                <div className="sm-card-header">
                  <div className="sm-card-left">
                    {script.is_pinned && <span className="pin-badge">置顶</span>}
                    <span className="sm-category">{script.category}</span>
                    <h3 className="sm-title-text">{script.title}</h3>
                    {script.publisher_name && (
                      <span className="sm-publisher">@{script.publisher_name}</span>
                    )}
                  </div>
                  <div className="sm-card-actions">
                    {canPin() && (
                      <button 
                        className={`sm-action-btn ${script.is_pinned ? 'active' : ''}`}
                        onClick={() => handlePin(script)}
                        title={script.is_pinned ? '取消置顶' : '置顶'}
                      >
                        {script.is_pinned ? '📌' : '📍'}
                      </button>
                    )}
                    {canModify(script) && (
                      <>
                        <button 
                          className="sm-action-btn edit"
                          onClick={() => {
                            // Extract images from content
                            const content = script.content || '';
                            const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
                            const images = [];
                            let match;
                            while ((match = imgRegex.exec(content)) !== null) {
                              images.push(match[1]);
                            }
                            // Strip images from content for editing
                            const contentWithoutImages = content.replace(/<img[^>]*>/gi, '');
                            setEditingImages(images);
                            setEditingScript({ ...script, content: contentWithoutImages });
                          }}
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button 
                          className="sm-action-btn delete"
                          onClick={() => handleDelete(script)}
                          title="删除"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="sm-content-preview" dangerouslySetInnerHTML={{ __html: (script.content || '').replace(/<[^>]*>/g, ' ').substring(0, 100) + '...' }} />
                <div className="sm-card-footer">
                  <span className="sm-tags">{script.tags}</span>
                  <span className="sm-views">👁 {script.views}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingScript && (
        <div className="modal-overlay" onClick={() => setEditingScript(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <h2 className="modal-title">编辑话术</h2>
              </div>
              <button className="modal-close" onClick={() => setEditingScript(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={editingScript.title}
                  onChange={(e) => setEditingScript({ ...editingScript, title: e.target.value })}
                  className="ann-input"
                />
              </div>
              <div className="form-group">
                <label>分类</label>
                <input
                  type="text"
                  value={editingScript.category}
                  onChange={(e) => setEditingScript({ ...editingScript, category: e.target.value })}
                  className="ann-input"
                />
              </div>
              <div className="form-group">
                <label>标签（用逗号分隔）</label>
                <input
                  type="text"
                  value={editingScript.tags}
                  onChange={(e) => setEditingScript({ ...editingScript, tags: e.target.value })}
                  className="ann-input"
                />
              </div>
              <div className="form-group">
                <label>内容</label>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: editingScript.content || '' }}
                  style={{ minHeight: '150px', padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                  onBlur={(e) => setEditingScript({ ...editingScript, content: e.target.innerHTML })}
                />
              </div>
              
              {/* Image Gallery for Edit */}
              <div className="form-group">
                <label>🖼️ 已上传图片 ({editingImages.length})</label>
                <div className="ps-image-gallery">
                  {editingImages.map((img, index) => (
                    <div key={index} className="ps-image-item">
                      <img src={img} alt={`图片 ${index + 1}`} />
                      <button 
                        className="ps-image-remove"
                        onClick={() => {
                          setEditingImages(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="ps-image-actions" style={{ marginTop: '12px' }}>
                  <label className="ps-image-upload-btn">
                    📷 添加图片
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUploadForEdit}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
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

export default ScriptManagement;
