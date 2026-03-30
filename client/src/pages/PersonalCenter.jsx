import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

function PersonalCenter() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState({ username: '', nickname: '', signature: '', created_at: '' });
  const [loading, setLoading] = useState(true);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState('');
  const [editingSignature, setEditingSignature] = useState(false);
  const [signature, setSignature] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatarUrl') || '');
  const [avatarRotation, setAvatarRotation] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data.user);
      setNickname(res.data.user.nickname || res.data.user.username);
      setSignature(res.data.user.signature || '');
      // Set avatar from server if available
      if (res.data.user.avatar) {
        setAvatarUrl(res.data.user.avatar);
        localStorage.setItem('avatarUrl', res.data.user.avatar);
      }
    } catch (err) {
      console.error('获取用户信息失败', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNickname = async () => {
    if (nickname.trim().length === 0) {
      showToast('昵称不能为空', 'error');
      return;
    }
    if (nickname.trim().length > 20) {
      showToast('昵称不能超过20个字符', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await authAPI.updateNickname(nickname.trim());
      setUser({ ...user, nickname: nickname.trim() });
      setEditingNickname(false);
      showToast('昵称修改成功！');
      
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.nickname = nickname.trim();
      localStorage.setItem('user', JSON.stringify(storedUser));
    } catch (err) {
      showToast(err.response?.data?.error || '修改失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSignature = async () => {
    if (signature.length > 50) {
      showToast('签名不能超过50个字符', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await authAPI.updateSignature(signature.trim());
      setUser({ ...user, signature: signature.trim() });
      setEditingSignature(false);
      showToast('签名修改成功！');
    } catch (err) {
      showToast(err.response?.data?.error || '修改失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const newAvatar = event.target.result;
      setAvatarUrl(newAvatar);
      localStorage.setItem('avatarUrl', newAvatar);
      setAvatarRotation(0);
      
      // Save avatar to server
      try {
        await authAPI.updateAvatar(newAvatar);
        // Update localStorage user info
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.avatar = newAvatar;
          localStorage.setItem('user', JSON.stringify(user));
        }
        showToast('头像已更新！');
      } catch (err) {
        console.error('Failed to save avatar to server:', err);
        showToast('头像保存失败', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRotateAvatar = async () => {
    const newRotation = (avatarRotation + 90) % 360;
    setAvatarRotation(newRotation);
    // Save rotated version
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = async () => {
      const size = Math.max(img.width, img.height);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.translate(size / 2, size / 2);
      ctx.rotate((newRotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const rotatedUrl = canvas.toDataURL('image/jpeg', 0.9);
      setAvatarUrl(rotatedUrl);
      localStorage.setItem('avatarUrl', rotatedUrl);
      
      // Save rotated avatar to server
      try {
        await authAPI.updateAvatar(rotatedUrl);
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.avatar = rotatedUrl;
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (err) {
        console.error('Failed to save rotated avatar to server:', err);
      }
    };
    img.src = avatarUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('avatarUrl');
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDisplayName = () => {
    return nickname || user.username;
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="personal-center">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>💬</div>
          <span className="header-title">话术平台</span>
        </div>
        <div className="header-right">
          <button className="back-btn" onClick={() => navigate('/home')}>
            ← 返回主页
          </button>
        </div>
      </header>

      <div className="pc-content">
        <div className="pc-card">
          <div className="pc-avatar-section">
            {/* Avatar with rotation */}
            <div className="pc-avatar-wrapper">
              <div 
                className="pc-avatar large"
                style={{
                  backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transform: `rotate(${avatarRotation}deg)`,
                  transition: 'transform 0.3s ease'
                }}
              >
                {!avatarUrl && getInitials(getDisplayName())}
              </div>
              
              {/* Avatar Controls */}
              <div className="avatar-controls">
                <button 
                  className="avatar-btn select-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  title="选择图片"
                >
                  📷
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                style={{ display: 'none' }}
              />
            </div>
            
            <h2 className="pc-username">{getDisplayName()}</h2>
            
            {/* Signature Section */}
            <div className="pc-signature-section">
              {editingSignature ? (
                <div className="signature-edit">
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="signature-input"
                    placeholder="填写你的个性签名..."
                    maxLength={50}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSignature();
                      if (e.key === 'Escape') {
                        setEditingSignature(false);
                        setSignature(user.signature || '');
                      }
                    }}
                  />
                  <div className="signature-edit-btns">
                    <button className="signature-save-btn" onClick={handleSaveSignature} disabled={saving}>
                      {saving ? '...' : '✓'}
                    </button>
                    <button className="signature-cancel-btn" onClick={() => {
                      setEditingSignature(false);
                      setSignature(user.signature || '');
                    }}>
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="pc-signature" 
                  onClick={() => {
                    setSignature(user.signature || '');
                    setEditingSignature(true);
                  }}
                >
                  {user.signature || '点击添加个性签名 ✏️'}
                </div>
              )}
            </div>
            
            <span className="pc-badge">已认证用户</span>
          </div>

          <div className="pc-divider"></div>

          <div className="pc-info-section">
            <div className="pc-info-item">
              <span className="pc-info-label">用户名</span>
              <span className="pc-info-value">{user.username}</span>
            </div>
            <div className="pc-info-item">
              <span className="pc-info-label">昵称</span>
              {editingNickname ? (
                <div className="nickname-inline-edit">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="nickname-inline-input"
                    maxLength={20}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNickname();
                      if (e.key === 'Escape') {
                        setEditingNickname(false);
                        setNickname(user.nickname || user.username);
                      }
                    }}
                  />
                  <button className="nickname-inline-save" onClick={handleSaveNickname} disabled={saving}>
                    ✓
                  </button>
                  <button className="nickname-inline-cancel" onClick={() => {
                    setEditingNickname(false);
                    setNickname(user.nickname || user.username);
                  }}>
                    ✕
                  </button>
                </div>
              ) : (
                <span 
                  className="pc-info-value highlight" 
                  onClick={() => {
                    setNickname(user.nickname || user.username);
                    setEditingNickname(true);
                  }} 
                  style={{ cursor: 'pointer' }}
                >
                  {getDisplayName()} ✏️
                </span>
              )}
            </div>
            <div className="pc-info-item">
              <span className="pc-info-label">注册时间</span>
              <span className="pc-info-value">{formatDate(user.created_at)}</span>
            </div>
            <div className="pc-info-item">
              <span className="pc-info-label">账号状态</span>
              <span className="pc-info-value status-active">● 正常</span>
            </div>
          </div>
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

export default PersonalCenter;
