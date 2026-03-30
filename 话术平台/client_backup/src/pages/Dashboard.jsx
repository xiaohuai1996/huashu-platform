import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scriptsAPI, favoritesAPI, authAPI } from '../api';
import ScriptModal from '../components/ScriptModal';

const CATEGORY_ICONS = {
  '全部': '🏠',
  '开场白': '👋',
  '产品介绍': '📦',
  '异议处理': '💭',
  '成交话术': '🤝',
  '售后话术': '💝',
  '引流话术': '📣',
  '群发话术': '📨',
  '私信话术': '💬',
  '朋友圈文案': '📱',
  '直播话术': '🎥',
};

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState(null);
  const [toast, setToast] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const avatarUrl = localStorage.getItem('avatarUrl') || '';

  const displayName = user.nickname || user.username;

  const loadUserInfo = async () => {
    try {
      const res = await authAPI.getMe();
      const freshUser = { ...user, ...res.data.user };
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
    } catch (err) {
      console.error('获取用户信息失败', err);
    }
  };

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catRes, scriptsRes] = await Promise.all([
        scriptsAPI.getCategories(),
        scriptsAPI.getScripts(),
      ]);
      setCategories([{ category: '全部', count: scriptsRes.data.scripts.length }, ...catRes.data.categories]);
      setScripts(scriptsRes.data.scripts);
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (category) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const res = await scriptsAPI.getScripts(category === '全部' ? {} : { category });
      setScripts(res.data.scripts);
    } catch (err) {
      console.error('加载话术失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      setLoading(true);
      try {
        const res = await scriptsAPI.getScripts({ search: query });
        setScripts(res.data.scripts);
        setSelectedCategory('全部');
      } catch (err) {
        console.error('搜索失败', err);
      } finally {
        setLoading(false);
      }
    } else {
      handleCategoryClick(selectedCategory);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyScript = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast('已复制到剪贴板！');
    } catch (err) {
      showToast('复制失败', 'error');
    }
  };

  const handleToggleFavorite = async (script) => {
    try {
      const checkRes = await favoritesAPI.checkFavorite(script.id);
      if (checkRes.data.isFavorite) {
        await favoritesAPI.removeFavorite(script.id);
        showToast('已取消收藏');
      } else {
        await favoritesAPI.addFavorite(script.id);
        showToast('已添加收藏！');
      }
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">💬</div>
          <span 
            className="header-title clickable" 
            onClick={() => navigate('/home')}
            style={{ cursor: 'pointer' }}
          >话术平台</span>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="avatar-wrapper">
              <div 
                className="user-avatar clickable" 
                onClick={() => setAvatarOpen(!avatarOpen)}
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!avatarUrl && getInitials(displayName)}
              </div>
              
              {avatarOpen && (
                <div className="avatar-dropdown">
                  <div className="dropdown-user-info">
                    <div className="dropdown-user-name">{displayName}</div>
                    <div className="dropdown-user-signature">
                      {user.signature || '暂无签名'}
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div 
                    className="dropdown-item"
                    onClick={() => {
                      setAvatarOpen(false);
                      navigate('/personal-center');
                    }}
                  >
                    👤 个人中心
                  </div>
                  {(user.role === 'super_admin' || user.role === 'admin') && (
                    <>
                      <div 
                        className="dropdown-item"
                        onClick={() => {
                          setAvatarOpen(false);
                          navigate('/announcement');
                        }}
                      >
                        📢 发布公告
                      </div>
                      <div 
                        className="dropdown-item"
                        onClick={() => {
                          setAvatarOpen(false);
                          navigate('/user-management');
                        }}
                      >
                        👥 用户管理
                      </div>
                    </>
                  )}
                  <div 
                    className="dropdown-item logout"
                    onClick={onLogout}
                  >
                    🚪 退出登录
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Left Sidebar - Categories */}
        <aside className="left-sidebar">
          <div 
            className="sidebar-header"
            onClick={() => setCategoryOpen(!categoryOpen)}
            style={{ cursor: 'pointer' }}
          >
            <span className="sidebar-icon">📂</span>
            <span className="sidebar-header-title">话术分类</span>
            <span className={`sidebar-arrow ${categoryOpen ? 'open' : ''}`}>›</span>
          </div>
          
          <div className={`category-collapse ${categoryOpen ? 'open' : ''}`}>
            <div className="category-list">
              {categories.map((cat) => (
                <div
                  key={cat.category}
                  className={`category-item ${selectedCategory === cat.category ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat.category)}
                >
                  <span className="cat-name">
                    <span className="cat-icon">{CATEGORY_ICONS[cat.category] || '📄'}</span>
                    <span>{cat.category}</span>
                  </span>
                  <span className="count">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-content">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索话术标题、内容或标签..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          <div className="section-header">
            <h2 className="section-title">
              {searchQuery ? `搜索结果: "${searchQuery}"` : selectedCategory}
            </h2>
            <span className="section-badge">{scripts.length} 条话术</span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : scripts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p className="empty-text">暂无话术</p>
            </div>
          ) : (
            <div className="scripts-grid">
              {scripts.map((script) => (
                <div
                  key={script.id}
                  className="script-card"
                  onClick={() => setSelectedScript(script)}
                >
                  <span className="script-category">{script.category}</span>
                  <h3 className="script-title">{script.title}</h3>
                  <p className="script-preview">{script.content}</p>
                  <div className="script-footer">
                    <div className="script-tags">
                      {script.tags?.split(',').slice(0, 3).map((tag, i) => (
                        <span key={i} className="script-tag">{tag.trim()}</span>
                      ))}
                    </div>
                    <div className="script-views">
                      👁 {script.views}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedScript && (
        <ScriptModal
          script={selectedScript}
          onClose={() => setSelectedScript(null)}
          onCopy={handleCopyScript}
          onToggleFavorite={handleToggleFavorite}
        />
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

export default Dashboard;
