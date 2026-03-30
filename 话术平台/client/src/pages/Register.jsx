import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

function Register({ onRegisterSuccess }) {
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    if (!username.trim()) {
      setError('请输入账号');
      return;
    }

    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6个字符');
      return;
    }

    if (username.length < 3) {
      setError('账号至少3个字符');
      return;
    }

    setLoading(true);

    try {
      const res = await authAPI.register(username, password, nickname, inviteCode);
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onRegisterSuccess();
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.error || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">💬</div>
          <h1 className="auth-title">创建账号</h1>
          <p className="auth-subtitle">加入话术平台，开启智能沟通</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label>昵称</label>
            <input
              type="text"
              placeholder="请输入昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>账号</label>
            <input
              type="text"
              placeholder="请输入账号（至少3个字符）"
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
              placeholder="请输入密码（至少6个字符）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>确认密码</label>
            <input
              type="password"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>邀请码</label>
            <input
              type="text"
              placeholder="请输入邀请码"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            已有账号？<Link to="/login">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
