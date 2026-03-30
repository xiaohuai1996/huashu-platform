import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scriptsAPI } from '../api';

const EMOJI_LIST = ['📚', '💬', '👋', '📦', '🤝', '💭', '🔗', '📨', '📺', '📝', '🛎️', '🔥', '⭐', '🌟', '💡', '🎯', '🚀', '💪', '👏', '🎉', '✅', '❌', '⚠️', '💯', '🎁', '📌', '🔖', '🏷️', '📋', '📊', '📈', '💰', '🎯', '✨', '🌈', '💖', '🎨', '🎭', '🎪', '🎬'];

function CategoryManagement() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [navigation, setNavigation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showNavForm, setShowNavForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingNav, setEditingNav] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [navFormData, setNavFormData] = useState({ name: '', emoji: '' });
  const [catFormData, setCatFormData] = useState({ name: '', emoji: '', nav_group: '' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNavGroupPicker, setShowNavGroupPicker] = useState(false);

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
    } catch (err) {
      console.error('获取数据失败', err);
      showToast('获取数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleNavSubmit = async () => {
    if (!navFormData.name.trim()) {
      showToast('导航名称不能为空', 'error');
      return;
    }
    try {
      if (editingNav) {
        await scriptsAPI.updateNavigation(editingNav.id, navFormData);
        showToast('导航已更新');
      } else {
        await scriptsAPI.createNavigation(navFormData);
        showToast('导航已创建');
      }
      setNavFormData({ name: '', emoji: '' });
      setShowNavForm(false);
      setEditingNav(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleEditNav = (nav) => {
    setEditingNav(nav);
    setNavFormData({ name: nav.name, emoji: nav.emoji || '' });
    setShowNavForm(true);
  };

  const handleDeleteNav = async (nav) => {
    if (!confirm(`确定要删除导航「${nav.name}」吗？\n注意：下属分类会移到"默认"分组。`)) return;
    try {
      await scriptsAPI.deleteNavigation(nav.id);
      showToast('导航已删除');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || '删除失败', 'error');
    }
  };

  // Category handlers
  const handleCatSubmit = async () => {
    if (!catFormData.name.trim()) {
      showToast('分类名称不能为空', 'error');
      return;
    }
    try {
      if (editingCat) {
        await scriptsAPI.updateCategory(editingCat.id, catFormData);
        showToast('分类已更新');
      } else {
        await scriptsAPI.createCategory(catFormData);
        showToast('分类已创建');
      }
      setCatFormData({ name: '', emoji: '', nav_group: '' });
      setShowCatForm(false);
      setEditingCat(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || '操作失败', 'error');
    }
  };

  const handleEditCat = (cat) => {
    setEditingCat(cat);
    setCatFormData({ name: cat.name, emoji: cat.emoji || '', nav_group: cat.nav_group || '' });
    setShowCatForm(true);
  };

  const handleDeleteCat = async (cat) => {
    if (!confirm(`确定要删除分类「${cat.name}」吗？`)) return;
    try {
      await scriptsAPI.deleteCategory(cat.id);
      showToast('分类已删除');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || '删除失败', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getNavForCat = (cat) => {
    const nav = navigation.find(n => n.name === (cat.nav_group || '默认'));
    return nav ? nav.name : '默认';
  };

  const unassignedCats = categories.filter(c => !c.nav_group || !navigation.find(n => n.name === c.nav_group));

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

      <div className="cm-content">
        <div className="cm-header">
          <h1 className="cm-title">🏷️ 分类管理</h1>
          <p className="cm-subtitle">管理侧边栏导航和分类，支持表情符号</p>
        </div>

        {/* Navigation Section */}
        <div className="cm-section">
          <h2 className="cm-section-title">📂 侧边栏导航</h2>
          {!showNavForm ? (
            <button className="cm-add-btn" style={{ position: 'relative', zIndex: 1000 }} onClick={() => { setShowNavForm(true); setEditingNav(null); setNavFormData({ name: '', emoji: '' }); }}>
              ➕ 添加导航
            </button>
          ) : (
            <div className="cm-form">
              <div className="cm-form-row">
                <div className="cm-emoji-picker" style={{ position: 'relative', zIndex: 1001 }}>
                  <button type="button" className="cm-emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    {navFormData.emoji || '😊'}
                  </button>
                  {showEmojiPicker && (
                    <div className="cm-emoji-grid">
                      {EMOJI_LIST.map((emoji) => (
                        <button key={emoji} type="button" className="cm-emoji-option" onClick={() => { setNavFormData({ ...navFormData, emoji }); setShowEmojiPicker(false); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="text" placeholder="导航名称..." value={navFormData.name} onChange={(e) => setNavFormData({ ...navFormData, name: e.target.value })} className="cm-input" style={{ position: 'relative', zIndex: 1001 }} />
              </div>
              <div className="cm-form-btns">
                <button className="cm-save-btn" style={{ position: 'relative', zIndex: 1001 }} onClick={handleNavSubmit}>
                  {editingNav ? '保存修改' : '创建导航'}
                </button>
                <button className="cm-cancel-btn" style={{ position: 'relative', zIndex: 1001 }} onClick={() => { setShowNavForm(false); setEditingNav(null); }}>
                  取消
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-container"><div className="loading-spinner"></div></div>
          ) : (
            <div className="cm-list">
              {navigation.map((nav) => (
                <div key={nav.id} className="cm-card cm-nav-card">
                  <div className="cm-card-left">
                    <span className="cm-card-emoji">{nav.emoji || '📂'}</span>
                    <span className="cm-card-name">{nav.name}</span>
                    <span className="cm-card-count">({nav.categories?.length || 0}个分类)</span>
                  </div>
                  <div className="cm-card-actions">
                    <button className="cm-action-btn edit" onClick={() => handleEditNav(nav)} title="编辑">✏️</button>
                    <button className="cm-action-btn delete" onClick={() => handleDeleteNav(nav)} title="删除">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Section */}
        <div className="cm-section">
          <h2 className="cm-section-title">🏷️ 分类管理</h2>
          {!showCatForm ? (
            <button className="cm-add-btn" style={{ position: 'relative', zIndex: 1000 }} onClick={() => { setShowCatForm(true); setEditingCat(null); setCatFormData({ name: '', emoji: '', nav_group: '' }); }}>
              ➕ 添加分类
            </button>
          ) : (
            <div className="cm-form">
              <div className="cm-form-row">
                <div className="cm-emoji-picker" style={{ position: 'relative', zIndex: 1001 }}>
                  <button type="button" className="cm-emoji-btn" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    {catFormData.emoji || '😊'}
                  </button>
                  {showEmojiPicker && (
                    <div className="cm-emoji-grid">
                      {EMOJI_LIST.map((emoji) => (
                        <button key={emoji} type="button" className="cm-emoji-option" onClick={() => { setCatFormData({ ...catFormData, emoji }); setShowEmojiPicker(false); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="text" placeholder="分类名称..." value={catFormData.name} onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })} className="cm-input" style={{ position: 'relative', zIndex: 1001 }} />
              </div>
              <div className="cm-form-row">
                <div className="cm-nav-picker" style={{ position: 'relative', zIndex: 1001 }}>
                  <button type="button" className="cm-nav-btn" onClick={() => setShowNavGroupPicker(!showNavGroupPicker)}>
                    {catFormData.nav_group || '默认分组'} ▼
                  </button>
                  {showNavGroupPicker && (
                    <div className="cm-nav-list">
                      <button type="button" className="cm-nav-option" onClick={() => { setCatFormData({ ...catFormData, nav_group: '' }); setShowNavGroupPicker(false); }}>
                        默认分组
                      </button>
                      {navigation.map((nav) => (
                        <button key={nav.id} type="button" className="cm-nav-option" onClick={() => { setCatFormData({ ...catFormData, nav_group: nav.name }); setShowNavGroupPicker(false); }}>
                          {nav.emoji} {nav.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="cm-form-btns">
                <button className="cm-save-btn" style={{ position: 'relative', zIndex: 1001 }} onClick={handleCatSubmit}>
                  {editingCat ? '保存修改' : '创建分类'}
                </button>
                <button className="cm-cancel-btn" style={{ position: 'relative', zIndex: 1001 }} onClick={() => { setShowCatForm(false); setEditingCat(null); }}>
                  取消
                </button>
              </div>
            </div>
          )}

          {!loading && (
            <div className="cm-list">
              {categories.map((cat) => (
                <div key={cat.id} className="cm-card">
                  <div className="cm-card-left">
                    <span className="cm-card-emoji">{cat.emoji || '📄'}</span>
                    <span className="cm-card-name">{cat.name}</span>
                    <span className="cm-nav-badge">{getNavForCat(cat)}</span>
                    <span className="cm-card-count">({cat.script_count || 0}个话术)</span>
                  </div>
                  <div className="cm-card-actions">
                    <button className="cm-action-btn edit" onClick={() => handleEditCat(cat)} title="编辑">✏️</button>
                    <button className="cm-action-btn delete" onClick={() => handleDeleteCat(cat)} title="删除">🗑️</button>
                  </div>
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

export default CategoryManagement;
