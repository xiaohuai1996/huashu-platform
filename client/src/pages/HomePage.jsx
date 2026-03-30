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
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [serverStartTime, setServerStartTime] = useState(null);
  const [uptime, setUptime] = useState('');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [weather, setWeather] = useState(null);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadData();
    // Fetch server start time for uptime counter
    fetch('/api/uptime')
      .then(res => res.json())
      .then(data => setServerStartTime(data.startTime))
      .catch(err => console.error('Failed to fetch uptime:', err));
  }, []);

  // Update uptime every second
  useEffect(() => {
    if (!serverStartTime) return;
    
    const updateUptime = () => {
      const elapsed = Date.now() - serverStartTime;
      const seconds = Math.floor((elapsed / 1000) % 60);
      const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
      const hours = Math.floor((elapsed / (1000 * 60 * 60)) % 24);
      const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
      
      // Calculate years and months (approximate)
      const totalDays = Math.floor(elapsed / (1000 * 60 * 60 * 24));
      const years = Math.floor(totalDays / 365);
      const months = Math.floor((totalDays % 365) / 30);
      const remainingDays = totalDays % 30;
      
      let uptimeStr = '';
      if (years > 0) uptimeStr += `${years}年`;
      if (months > 0) uptimeStr += `${months}月`;
      if (remainingDays > 0) uptimeStr += `${remainingDays}天`;
      uptimeStr += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      setUptime(uptimeStr);
    };
    
    updateUptime();
    const interval = setInterval(updateUptime, 1000);
    return () => clearInterval(interval);
  }, [serverStartTime]);

  const loadData = async () => {
    try {
      const [scriptsRes, usersRes, announcementsRes] = await Promise.all([
        scriptsAPI.getScripts(),
        authAPI.getUsers(),
        authAPI.getAnnouncements(),
      ]);
      
      setStats({
        scriptsCount: scriptsRes.data.scripts?.length || 0,
        usersCount: usersRes.data.users?.length || 0,
      });
      
      // Get top 4 hot scripts (pinned first, then by views)
      const hot = [...(scriptsRes.data.scripts || [])]
        .sort((a, b) => {
          // Pinned scripts first
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          // Then sort by views
          return b.views - a.views;
        })
        .slice(0, 8);
      setHotScripts(hot);
      
      // Get latest 3 announcements
      setAnnouncements((announcementsRes.data.announcements || []).slice(0, 3));

      // Check if there's a new announcement to show
      const announcements = announcementsRes.data.announcements || [];
      if (announcements.length > 0) {
        const latestAnn = announcements[0];
        const lastSeenId = localStorage.getItem('lastSeenAnnouncementId');
        if (lastSeenId !== String(latestAnn.id)) {
          // New announcement found, show popup
          setCurrentAnnouncement(latestAnn);
          setShowAnnouncementModal(true);
        }
      }
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch weather data based on user location
  useEffect(() => {
    const MIANYANG_LAT = 31.46;
    const MIANYANG_LON = 104.75;

    const fetchWeather = async (lat = MIANYANG_LAT, lon = MIANYANG_LON, retries = 2) => {
      setWeatherLoading(true);
      try {
        // Use open-meteo API for accurate real-time weather + 3-day forecast
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=3`,
          { signal: AbortSignal.timeout(10000) }
        );
        const data = await res.json();

        console.log('Weather API response:', data);

        if (data.current) {
          const current = data.current;
          const wmoCode = current.weather_code;
          
          // Parse 3-day forecast
          const forecast = [];
          if (data.daily && data.daily.time) {
            for (let i = 0; i < data.daily.time.length; i++) {
              const dateStr = data.daily.time[i];
              const date = new Date(dateStr);
              const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
              forecast.push({
                day: dayNames[date.getDay()],
                date: `${date.getMonth() + 1}/${date.getDate()}`,
                weatherCode: data.daily.weather_code[i],
                tempMax: Math.round(data.daily.temperature_2m_max[i]),
                tempMin: Math.round(data.daily.temperature_2m_min[i]),
                icon: getWeatherIconFromWMO(data.daily.weather_code[i]),
                condition: getWeatherCondition(data.daily.weather_code[i]),
              });
            }
          }
          
          setWeather({
            city: '绵阳',
            temp: Math.round(current.temperature_2m) + '°',
            feelsLike: Math.round(current.apparent_temperature) + '°',
            humidity: current.relative_humidity_2m + '%',
            wind: getWindDirection(current.wind_direction_10m),
            windSpeed: current.wind_speed_10m + ' km/h',
            condition: getWeatherCondition(wmoCode),
            icon: getWeatherIconFromWMO(wmoCode),
            uvIndex: '0',
            pressure: '1013 mb',
            visibility: '10 km',
            sunrise: '',
            sunset: '',
            livingIndex: [],
            forecast: forecast,
          });
        } else {
          throw new Error('Invalid weather data');
        }
      } catch (err) {
        console.error('获取天气失败:', err);
        if (retries > 0) {
          console.log(`重试...剩余${retries}次`);
          await new Promise(r => setTimeout(r, 1000));
          return fetchWeather(lat, lon, retries - 1);
        }
        // Fallback to default weather
        setWeather({
          city: '绵阳',
          temp: '15°',
          condition: '多云',
          icon: '⛅',
        });
      } finally {
        setWeatherLoading(false);
      }
    };

    const getWindDirection = (deg) => {
      const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
      const index = Math.round(deg / 45) % 8;
      return directions[index];
    };

    const getWeatherCondition = (code) => {
      const conditions = {
        0: '晴',
        1: '晴',
        2: '多云',
        3: '阴',
        45: '雾',
        48: '雾凇',
        51: '小毛毛雨',
        53: '中毛毛雨',
        55: '大毛毛雨',
        61: '小雨',
        63: '中雨',
        65: '大雨',
        80: '阵雨',
        81: '中阵雨',
        82: '大阵雨',
        95: '雷阵雨',
        96: '雷暴冰雹',
        99: '雷暴冰雹',
      };
      return conditions[code] || '未知';
    };

    // Method 1: Browser GPS geolocation (most accurate)
    const fetchByGPS = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('Got GPS location:', latitude, longitude);
            await fetchWeather(null, latitude, longitude);
            resolve(true);
          },
          (error) => {
            console.log('GPS error:', error.message);
            resolve(false);
          },
          { timeout: 10000, maximumAge: 300000 }
        );
      });
    };

    // Method 2: Default to Mianyang (most reliable for this user)
    const fetchDefault = async () => {
      console.log('Using default city: 绵阳');
      await fetchWeather();
    };

    // Try location methods in order
    const initWeather = async () => {
      // Try GPS first (most accurate)
      const gpsSuccess = await fetchByGPS();
      if (gpsSuccess) return;

      // Default to Mianyang
      await fetchDefault();
    };

    initWeather();
  }, []);

  const getWeatherIconFromCondition = (condition) => {
    if (!condition) return '🌤️';
    const c = condition.toLowerCase();
    // wttr.in returns English descriptions
    if (c.includes('sunny') || c.includes('clear')) return '☀️';
    if (c.includes('partly')) return '⛅';
    if (c.includes('cloudy') || c.includes('overcast')) return '☁️';
    if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
    if (c.includes('snow')) return '❄️';
    if (c.includes('fog') || c.includes('mist')) return '🌫️';
    if (c.includes('thunder')) return '⛈️';
    return '🌤️';
  };

  const getWeatherIconFromWMO = (code) => {
    // WMO Weather interpretation codes
    if (code === 0) return '☀️';      // Clear sky
    if (code === 1) return '☀️';      // Mainly clear
    if (code === 2) return '⛅';      // Partly cloudy
    if (code === 3) return '☁️';      // Overcast
    if (code === 45) return '🌫️';    // Fog
    if (code === 48) return '🌫️';    // Depositing rime fog
    if (code >= 51 && code <= 57) return '🌧️';  // Drizzle
    if (code >= 61 && code <= 67) return '🌧️';  // Rain
    if (code >= 71 && code <= 77) return '❄️';  // Snow
    if (code >= 80 && code <= 82) return '🌧️';  // Rain showers
    if (code >= 85 && code <= 86) return '🌨️';  // Snow showers
    if (code >= 95) return '⛈️';     // Thunderstorm
    return '🌤️';
  };

  const getLivingIcon = (name) => {
    const iconMap = {
      '紫外线指数': '☀️',
      '太阳镜指数': '🕶️',
      '交通指数': '🚗',
      '感冒指数': '🤧',
      '洗车指数': '🚿',
      '运动指数': '🏃',
      '约会指数': '💕',
      '空气指数': '🌿',
      '晾晒指数': '👕',
      '钓鱼指数': '🎣',
      '逛街指数': '🛍️',
      '美发指数': '💇',
      '划船指数': '🚣',
      '夜生活指数': '🌃',
      '晨练指数': '🏋️',
      '啤酒指数': '🍺',
      '舒适度指数': '😌',
      '穿衣指数': '👔',
    };
    return iconMap[name] || '📊';
  };

  const getWeatherIcon = (code) => {
    const codeMap = {
      '113': '☀️', // Sunny/Clear
      '116': '⛅', // Partly cloudy
      '119': '☁️', // Cloudy
      '122': '☁️', // Overcast
      '143': '🌫️', // Mist
      '176': '🌦️', // Patch rain
      '179': '🌨️', // Patch snow
      '200': '⛈️', // Thundery outbreaks
      '227': '🌨️', // Blowing snow
      '230': '❄️', // Heavy snow
      '248': '🌫️', // Fog
      '260': '🌫️', // Freezing fog
      '263': '🌧️', // Patchy rain
      '266': '🌧️', // Light rain
      '281': '🌨️', // Patchy freezing rain
      '284': '🌨️', // Heavy freezing rain
      '293': '🌧️', // Patchy light rain
      '296': '🌧️', // Light rain
      '299': '🌧️', // Moderate rain
      '302': '🌧️', // Heavy rain
      '305': '🌧️', // Heavy rain
      '308': '🌧️', // Heavy rain
      '311': '🌨️', // Light sleet
      '314': '🌨️', // Light sleet
      '317': '🌨️', // Sleet
      '320': '🌨️', // Heavy sleet
      '323': '🌨️', // Light snow
      '326': '🌨️', // Light snow
      '329': '❄️', // Moderate snow
      '332': '❄️', // Heavy snow
      '350': '🌨️', // Ice pellets
      '353': '🌧️', // Light rain shower
      '356': '🌧️', // Moderate rain
      '359': '🌧️', // Heavy rain
      '362': '🌨️', // Light sleet showers
      '365': '🌨️', // Moderate sleet
      '368': '🌨️', // Light snow showers
      '371': '❄️', // Heavy snow showers
      '374': '🌨️', // Light snow showers
      '377': '🌨️', // Sleet showers
      '386': '⛈️', // Thundery outbreaks
      '389': '⛈️', // Thundery outbreaks
      '392': '⛈️', // Thundery snow
      '395': '⛈️', // Heavy snow
    };
    return codeMap[code] || '🌤️';
  };

  const handleCloseAnnouncement = () => {
    if (currentAnnouncement) {
      localStorage.setItem('lastSeenAnnouncementId', String(currentAnnouncement.id));
    }
    setShowAnnouncementModal(false);
    setCurrentAnnouncement(null);
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
          <div className="nav-btn" onClick={() => navigate('/home')}>
            <span className="nav-btn-icon">🏠</span>
            <span className="nav-btn-text">首页</span>
          </div>
          <div className="nav-btn" onClick={() => navigate('/dashboard')}>
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
        <div className="home-header-right">
          {weather && (
            <div className="weather-widget" onClick={() => setShowWeatherModal(!showWeatherModal)}>
              <span className="weather-icon">{weather.icon}</span>
              <span className="weather-temp">{weather.temp}</span>
              <span className="weather-city">{weather.city}</span>
            </div>
          )}
          <div className="avatar-wrapper">
            <div 
              className="home-user-avatar clickable" 
              onClick={() => setAvatarOpen(!avatarOpen)}
            >
              <div 
                className="avatar-circle"
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!avatarUrl && getInitials(displayName)}
              </div>
            </div>
            
            {avatarOpen && (
              <div className="avatar-dropdown">
                <div className="dropdown-mobile-header">
                  <span className="dropdown-mobile-title">菜单</span>
                  <button className="dropdown-mobile-close" onClick={() => setAvatarOpen(false)}>✕</button>
                </div>
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
          {hotScripts.map((script, index) => {
            const content = script.content || '';
            const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
            const firstImage = imgMatch ? imgMatch[1] : null;
            return (
              <div 
                key={script.id} 
                className="hot-script-card"
                onClick={async () => {
                  // Optimistically update views
                  const updatedScript = { ...script, views: (script.views || 0) + 1 };
                  setHotScripts(prev => prev.map(s => s.id === script.id ? updatedScript : s));
                  setSelectedScript(updatedScript);
                  // Notify server
                  try {
                    await fetch(`/api/scripts/${script.id}`, {
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                  } catch (e) {}
                }}
              >
                {script.is_pinned === 1 && <span className="pinned-badge">🔥</span>}
                <div className="hot-script-content">
                  <span className="hot-script-category">{script.category}</span>
                  <h4 className="hot-script-title">{script.title}</h4>
                  {!firstImage && (
                    <p className="hot-script-preview">{content.replace(/<[^>]*>/g, '').slice(0, 50)}...</p>
                  )}
                </div>
                {firstImage && (
                  <div className="hot-script-image">
                    <img src={firstImage} alt="" />
                  </div>
                )}
                <div className="hot-script-footer">
                  <span className="hot-script-views">👁 {script.views}</span>
                  <span className="hot-script-tag">{script.tags?.split(',')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="section-footer">
          <button className="view-all-btn" onClick={() => navigate('/dashboard')}>
            查看全部话术 →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>话术平台 © 2024 · 智能话术库 <span className="footer-sep">|</span> {uptime && `本站已稳定运行: ${uptime}`}</p>
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

      {/* Announcement Modal */}
      {showAnnouncementModal && currentAnnouncement && (
        <div className="announcement-modal-overlay" onClick={handleCloseAnnouncement}>
          <div className="announcement-modal" onClick={(e) => e.stopPropagation()}>
            <div className="announcement-modal-header">
              <div className="announcement-modal-icon">📢</div>
              <h2 className="announcement-modal-title">{currentAnnouncement.title}</h2>
              <button className="announcement-modal-close" onClick={handleCloseAnnouncement}>×</button>
            </div>
            <div className="announcement-modal-content">
              <div 
                className="announcement-text"
                dangerouslySetInnerHTML={{ __html: currentAnnouncement.content }}
              />
            </div>
            <div className="announcement-modal-footer">
              <button className="announcement-modal-btn" onClick={handleCloseAnnouncement}>
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weather Dropdown - 3 Day Forecast */}
      {showWeatherModal && weather && (
        <div className="weather-dropdown">
          <div className="weather-dropdown-header">
            <div className="weather-dropdown-main">
              <div className="weather-main-icon">{weather.icon}</div>
              <div className="weather-main-info">
                <h2 className="weather-city-name">{weather.city}</h2>
                <p className="weather-condition">{weather.condition} {weather.temp}</p>
              </div>
            </div>
            <button className="weather-dropdown-close" onClick={() => setShowWeatherModal(false)}>×</button>
          </div>
          {weather.forecast && weather.forecast.length > 0 && (
            <div className="weather-forecast">
              <div className="forecast-title">三天天气预报</div>
              <div className="forecast-days">
                {weather.forecast.map((day, index) => (
                  <div key={index} className="forecast-day">
                    <div className="forecast-day-name">{day.day}</div>
                    <div className="forecast-date">{day.date}</div>
                    <div className="forecast-icon">{day.icon}</div>
                    <div className="forecast-temp">
                      <span className="temp-high">{day.tempMax}°</span>
                      <span className="temp-low">{day.tempMin}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HomePage;
// TEST_MARKER
