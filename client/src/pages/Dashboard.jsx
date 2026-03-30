import { useState, useEffect, Fragment } from 'react';
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

const NAV_ICONS = {
  '默认': '📂',
  '基础话术': '📚',
  '营销话术': '🎯',
  '服务话术': '💬',
};

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [navigation, setNavigation] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedScript, setSelectedScript] = useState(null);
  const [toast, setToast] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [expandedNavs, setExpandedNavs] = useState({});
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
      const [navRes, scriptsRes] = await Promise.all([
        scriptsAPI.getNavigation(),
        scriptsAPI.getScripts(),
      ]);
      const totalScripts = scriptsRes.data.scripts.length;
      
      // Set navigation data
      const navGroups = navRes.data.navigation || [];
      setNavigation(navGroups);
      
      // Initialize: all navs collapsed by default
      const expanded = {};
      navGroups.forEach(nav => { expanded[nav.name] = false; });
      setExpandedNavs(expanded);
      
      // Flatten categories for display
      const flatCats = [];
      flatCats.push({ category: '全部', emoji: '🏠', count: totalScripts, nav: null });
      navGroups.forEach(nav => {
        nav.categories.forEach(cat => {
          flatCats.push({
            category: cat.name,
            emoji: cat.emoji,
            count: cat.script_count || 0,
            nav: nav.name
          });
        });
      });
      
      setCategories(flatCats);
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

  const handleNavClick = (navName) => {
    setExpandedNavs(prev => {
      const newExpanded = {};
      // Accordion: only expand the clicked one, collapse others
      newExpanded[navName] = !prev[navName];
      return newExpanded;
    });
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
      // Strip HTML tags for plain text copy
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || content;
      await navigator.clipboard.writeText(plainText);
      showToast('已复制到剪贴板！');
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = content.replace(/<[^>]*>/g, '');
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('已复制到剪贴板！');
      } catch (fallbackErr) {
        showToast('复制失败', 'error');
      }
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
        <div className="home-header-nav">
          <div className="nav-btn" onClick={() => navigate('/home')}>
            <span className="nav-btn-icon">🏠</span>
            <span className="nav-btn-text">首页</span>
          </div>
          <div className="nav-btn active" onClick={() => navigate('/dashboard')}>
            <span className="nav-btn-icon">💬</span>
            <span className="nav-btn-text">话术库</span>
          </div>
          <div className="nav-btn" onClick={() => navigate('/video')}>
            <span className="nav-btn-icon">🎬</span>
            <span className="nav-btn-text">轻松一刻</span>
          </div>
          <div className="nav-btn" onClick={() => navigate('/chat-records')}>
            <span className="nav-btn-icon">💬</span>
            <span className="nav-btn-text">优质聊天</span>
          </div>
          {(user.role === 'super_admin' || user.role === 'admin') && (
            <div className="nav-btn" onClick={() => navigate('/announcement')}>
              <span className="nav-btn-icon">📢</span>
              <span className="nav-btn-text">发布公告</span>
            </div>
          )}
          <div className="nav-btn" onClick={() => window.open('https://jf.scjanelife.com/rewards', '_blank')}>
            <span className="nav-btn-icon">🎁</span>
            <span className="nav-btn-text">积分</span>
          </div>
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
                  <div 
                    className="dropdown-item"
                    onClick={() => {
                      setAvatarOpen(false);
                      navigate('/publish-script');
                    }}
                  >
                    📝 发布话术
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
                      <div 
                        className="dropdown-item"
                        onClick={() => {
                          setAvatarOpen(false);
                          navigate('/web-management');
                        }}
                      >
                        🌐 网页管理
                      </div>
                    </>
                  )}
                  <div 
                    className="dropdown-item"
                    onClick={() => {
                      setAvatarOpen(false);
                      navigate('/script-management');
                    }}
                  >
                    📝 话术管理
                  </div>
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
        <aside className={`left-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {/* "全部" category at top */}
          <div
            className={`nav-group-item ${selectedCategory === '全部' ? 'active' : ''}`}
            onClick={() => handleCategoryClick('全部')}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-name">全部</span>
            <span className="count">{categories.find(c => c.category === '全部')?.count || 0}</span>
          </div>

          {/* Navigation Groups */}
          {navigation.map((nav) => (
            <div key={nav.name} className="nav-group">
              <div
                className="nav-group-header"
                onClick={() => handleNavClick(nav.name)}
              >
                <span className="nav-icon">{nav.emoji || '📂'}</span>
                <span className="nav-name">{nav.name}</span>
                <span className={`nav-arrow ${expandedNavs[nav.name] ? 'open' : ''}`}>›</span>
              </div>
              {expandedNavs[nav.name] && (
                <div className="nav-group-categories">
                  {nav.categories.map((cat) => (
                    <div
                      key={cat.name}
                      className={`category-item ${selectedCategory === cat.name ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(cat.name)}
                    >
                      <span className="cat-icon">{cat.emoji || '📄'}</span>
                      <span className="cat-name">{cat.name}</span>
                      <span className="count">{cat.script_count || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
              {scripts.map((script) => {
                // Extract first image from content
                const content = script.content || '';
                const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
                const firstImage = imgMatch ? imgMatch[1] : null;
                
                return (
                  <div
                    key={script.id}
                    className="script-card"
                    onClick={async () => {
                      // Optimistically update views locally
                      const updatedScript = { ...script, views: (script.views || 0) + 1 };
                      setScripts(prev => prev.map(s => s.id === script.id ? updatedScript : s));
                      setSelectedScript(updatedScript);
                      // Notify server to increment views
                      try {
                        await fetch(`/api/scripts/${script.id}`, {
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                      } catch (e) {}
                    }}
                  >
                    <h3 className="script-title">{script.title}</h3>
                    {firstImage && (
                      <div className="script-card-image">
                        <img src={firstImage} alt="" />
                      </div>
                    )}
                    {!firstImage && (
                      <p className="script-preview" dangerouslySetInnerHTML={{ __html: content.replace(/<[^>]*>/g, ' ').substring(0, 80) + '...' }} />
                    )}
                    <div className="script-meta">
                      {script.publisher_name && (
                        <span className="script-publisher">👤 {script.publisher_name}</span>
                      )}
                      <span className="script-category">{script.category}</span>
                    </div>
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
                );
              })}
            </div>
          )}
        </main>
        
        {/* Mobile Sidebar Toggle Button */}
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? '📂 展开导航' : '⬆️ 收起导航'}
        </button>
      </div>

      {selectedScript && (
        <ScriptModal
          script={selectedScript}
          user={user}
          onClose={() => setSelectedScript(null)}
          onCopy={handleCopyScript}
          onToggleFavorite={handleToggleFavorite}
          onDeleted={() => {
            handleCategoryClick(selectedCategory);
            setSelectedScript(null);
          }}
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
