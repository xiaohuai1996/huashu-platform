import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStartTime, setServerStartTime] = useState(null);
  const [uptime, setUptime] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/uptime')
      .then(res => res.json())
      .then(data => setServerStartTime(data.startTime))
      .catch(err => console.error('Failed to fetch uptime:', err));
  }, []);

  useEffect(() => {
    if (!serverStartTime) return;
    
    const updateUptime = () => {
      const elapsed = Date.now() - serverStartTime;
      const seconds = Math.floor((elapsed / 1000) % 60);
      const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
      const hours = Math.floor((elapsed / (1000 * 60 * 60)) % 24);
      const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
      
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.login(username, password);
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLoginSuccess();
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.error || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">💬</div>
          <h1 className="auth-title">话术平台</h1>
          <p className="auth-subtitle">登录到你的智能话术库</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            还没有账号？<Link to="/register">立即注册</Link>
          </p>
        </div>
      </div>

      <footer className="login-footer">
        <p>话术平台 © 2024 · 智能话术库 <span className="footer-sep">|</span> {uptime && `本站已稳定运行: ${uptime}`}</p>
      </footer>
    </div>
  );
}

export default Login;
// LOGIN_TEST
