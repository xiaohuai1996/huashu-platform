import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scriptsAPI, uploadAPI } from '../api';

const EMOJI_LIST = ['📚', '💬', '👋', '📦', '🤝', '💭', '🔗', '📨', '📺', '📝', '🛎️', '🔥', '⭐', '🌟', '💡', '🎯', '🚀', '💪', '👏', '🎉'];

function PublishScript() {
  const navigate = useNavigate();
  const [navigation, setNavigation] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    nav_group: '',
    images: [],  // Store images separately
  });
  const [showNavPicker, setShowNavPicker] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  // Filter categories based on selected nav_group
  const filteredCategories = categories.filter(cat => 
    cat.nav_group && cat.nav_group === formData.nav_group
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [navRes, catRes] = await Promise.all([
        scriptsAPI.getNavigation(),
        scriptsAPI.getCategories(),
      ]);
      setNavigation(navRes.data.navigation || []);
      setCategories(catRes.data.categories || []);
      
      // Set default nav_group if available
      if (navRes.data.navigation?.length > 0) {
        setFormData(prev => ({ ...prev, nav_group: navRes.data.navigation[0].name }));
      }
    } catch (err) {
      console.error('获取数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast('请输入话术标题', 'error');
      return;
    }
    
    // Get content from contenteditable div
    const editorContent = document.querySelector('.ps-editor')?.innerHTML || '';
    // Check if there's actual text content (strip HTML tags)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorContent;
    const textContent = tempDiv.textContent || '';
    
    if (!textContent.trim() && formData.images.length === 0) {
      showToast('请输入话术内容或上传图片', 'error');
      return;
    }
    if (!formData.category) {
      showToast('请选择分类', 'error');
      return;
    }

    try {
      // Build content with images appended
      let fullContent = editorContent;
      if (formData.images.length > 0) {
        const imagesHtml = formData.images.map(img => 
          `<br><img src="${img}" style="max-width:100%;border-radius:8px;margin:8px 0;" /><br>`
        ).join('');
        fullContent = editorContent + imagesHtml;
      }
      
      await scriptsAPI.createScript({
        title: formData.title,
        content: fullContent,
        category: formData.category,
        tags: formData.tags,
        nav_group: formData.nav_group
      });
      showToast('话术发布成功！');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      showToast(err.response?.data?.error || '发布失败', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!blob) {
          showToast('图片粘贴失败，请尝试下方按钮上传', 'error');
          return;
        }
        
        try {
          const response = await uploadAPI.uploadImage(blob);
          const imageUrl = response.data.url;
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, imageUrl]
          }));
          showToast('✅ 图片已粘贴！');
        } catch (err) {
          console.error('Image paste error:', err);
          showToast('❌ 图片粘贴失败', 'error');
        }
        break;
      }
    }
  };

  const renderContent = (content) => {
    if (!content) return '';
    // Convert [IMAGE]base64[/IMAGE] to actual images
    return content.replace(/\[IMAGE\]([^\[]+)\[\/IMAGE\]/g, '<img src="$1" style="max-width:100%;border-radius:8px;margin:8px 0;" />')
                  .replace(/\n/g, '<br/>');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }
    
    try {
      const response = await uploadAPI.uploadImage(file);
          const imageUrl = response.data.url;
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageUrl]
      }));
      showToast('✅ 图片已添加！');
    } catch (err) {
      console.error('Image upload error:', err);
      showToast('❌ 图片上传失败', 'error');
    }
    
    // Reset input
    e.target.value = '';
  };

  const getCurrentNav = () => {
    return navigation.find(n => n.name === formData.nav_group) || navigation[0];
  };

  const getFilteredCategories = () => {
    const nav = getCurrentNav();
    if (!nav) return categories;
    // Show all categories, but highlight the ones in current nav
    return categories;
  };

  if (loading) {
    return (
      <div className="personal-center">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="header-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>💬</div>
            <span className="header-title">话术平台</span>
          </div>
        </header>
        <div className="loading-container"><div className="loading-spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="personal-center">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>💬</div>
          <span className="header-title">话术平台</span>
        </div>
        <div className="header-right">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← 返回话术库
          </button>
        </div>
      </header>

      <div className="ps-content">
        <div className="ps-header">
          <h1 className="ps-title">📝 发布话术</h1>
          <p className="ps-subtitle">分享您的专业话术到话术库</p>
        </div>

        <div className="ps-form">
          {/* Navigation Selector */}
          <div className="ps-form-group">
            <label className="ps-label">📂 导航分组</label>
            <div className="ps-picker">
              <button 
                className="ps-picker-btn"
                onClick={() => setShowNavPicker(!showNavPicker)}
                style={{ position: 'relative', zIndex: 1001 }}
              >
                {getCurrentNav()?.emoji || '📂'} {formData.nav_group || '选择导航'} ▼
              </button>
              {showNavPicker && (
                <div className="ps-picker-list">
                  {navigation.map((nav) => (
                    <button
                      key={nav.name}
                      className="ps-picker-option"
                      onClick={() => {
                        setFormData({ ...formData, nav_group: nav.name, category: '' });
                        setShowNavPicker(false);
                      }}
                    >
                      {nav.emoji} {nav.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Selector */}
          <div className="ps-form-group">
            <label className="ps-label">🏷️ 分类</label>
            <div className="ps-picker">
              <button 
                className="ps-picker-btn"
                onClick={() => setShowCatPicker(!showCatPicker)}
                style={{ position: 'relative', zIndex: 1001 }}
              >
                {formData.category || '选择分类'} ▼
              </button>
              {showCatPicker && (
                <div className="ps-picker-list">
                  {filteredCategories.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                      该导航下暂无分类
                    </div>
                  ) : (
                    filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        className="ps-picker-option"
                        onClick={() => {
                          setFormData({ ...formData, category: cat.name });
                          setShowCatPicker(false);
                        }}
                      >
                        {cat.emoji} {cat.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="ps-form-group">
            <label className="ps-label">📌 标题</label>
            <input
              type="text"
              className="ps-input"
              placeholder="输入话术标题..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{ position: 'relative', zIndex: 1001 }}
            />
          </div>

          {/* Content */}
          <div className="ps-form-group">
            <label className="ps-label">💬 内容</label>
            <div
              className="ps-editor"
              contentEditable
              onInput={(e) => setFormData({ ...formData, content: e.currentTarget.innerHTML })}
              onPaste={handlePaste}
              style={{ position: 'relative', zIndex: 1001 }}
            />
            <div className="ps-image-actions" style={{ position: 'relative', zIndex: 1002 }}>
              <label className="ps-image-upload-btn">
                📷 上传图片
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <span className="ps-hint">💡 支持粘贴图片（Ctrl+V）或点击上传</span>
            </div>
          </div>

          {/* Content Preview */}
          {formData.content && (
            <div className="ps-form-group">
              <label className="ps-label">👁️ 预览效果</label>
              <div 
                className="ps-preview"
                dangerouslySetInnerHTML={{ __html: renderContent(formData.content) }}
              />
            </div>
          )}

          {/* Image Gallery */}
          {formData.images.length > 0 && (
            <div className="ps-form-group">
              <label className="ps-label">🖼️ 已上传图片 ({formData.images.length})</label>
              <div className="ps-image-gallery">
                {formData.images.map((img, index) => (
                  <div key={index} className="ps-image-item">
                    <img src={img} alt={`图片 ${index + 1}`} />
                    <button 
                      className="ps-image-remove"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index)
                        }));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="ps-form-group">
            <label className="ps-label">🏷️ 标签</label>
            <input
              type="text"
              className="ps-input"
              placeholder="输入标签，用逗号分隔，如：开场,破冰,引流"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              style={{ position: 'relative', zIndex: 1001 }}
            />
          </div>

          {/* Submit Button */}
          <button className="ps-submit-btn" onClick={handleSubmit} style={{ position: 'relative', zIndex: 1001 }}>
            🚀 发布话术
          </button>
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

export default PublishScript;
