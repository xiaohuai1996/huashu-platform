import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inviteAPI } from '../api';

function InviteCodeManagement() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const res = await inviteAPI.getCodes();
      setCodes(res.data.codes);
    } catch (err) {
      showToast('获取失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const handleGenerate = async () => {
    console.log('Generate button clicked!');
    setGenerating(true);
    try {
      const res = await inviteAPI.generateCodes(5);
      showToast(`生成${res.data.codes.length}个成功`, 'success');
      loadCodes();
    } catch (err) {
      console.error('Generate error:', err);
      showToast('生成失败', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (code) => {
    if (!confirm(`确定删除邀请码 ${code} 吗？`)) return;
    try {
      await inviteAPI.deleteCode(code);
      showToast('删除成功', 'success');
      loadCodes();
    } catch (err) {
      showToast(err.response?.data?.error || '删除失败', 'error');
    }
  };

  const handleCopy = async (code) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        showToast('已复制', 'success');
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('已复制', 'success');
      }
    } catch (err) {
      showToast('复制失败', 'error');
    }
  };

  return (
    <div className="icm-page">
      <header className="icm-header">
        <div className="icm-header-left">
          <span className="icm-logo" onClick={() => navigate('/home')}>💬</span>
          <span className="icm-title">话术平台</span>
        </div>
        <button className="back-btn" onClick={() => navigate('/user-management')}>
          ← 返回用户管理
        </button>
      </header>

      <div className="management-container">
        <div className="management-header">
          <h1>邀请码管理</h1>
          <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '🎯 生成5个邀请码'}
          </button>
        </div>

        {toast && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 24px',
            borderRadius: '25px',
            fontSize: '14px',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            background: toast.type === 'success' 
              ? 'linear-gradient(135deg, #10b981, #059669)' 
              : toast.type === 'error' 
              ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
              : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            animation: 'toastSlide 0.3s ease'
          }}>
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <span>{toast.message}</span>
          </div>
        )}

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="codes-table">
            <div className="table-header">
              <span>邀请码</span>
              <span>状态</span>
              <span>使用者</span>
              <span>创建时间</span>
              <span>操作</span>
            </div>
            {codes.length === 0 ? (
              <div className="empty-state">暂无邀请码</div>
            ) : (
              codes.map((code) => (
                <div key={code.id} className="table-row">
                  <span className="code-value" onClick={() => handleCopy(code.code)} title="点击复制">{code.code}</span>
                  <span className={`status ${code.used ? 'used' : 'unused'}`}>
                    {code.used ? '已使用' : '未使用'}
                  </span>
                  <span className="used-by">{code.used ? (code.used_by_name || '用户' + code.used_by) : '-'}</span>
                  <span className="created-at">{new Date(code.created_at).toLocaleDateString()}</span>
                  <span className="actions">
                    {!code.used && (
                      <button className="copy-btn" onClick={() => handleCopy(code.code)}>复制</button>
                    )}
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(code.code)}
                      disabled={code.used}
                    >
                      删除
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        .management-container {
          padding: 24px;
        }
        .management-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .management-header h1 {
          font-size: 24px;
          color: var(--text-primary);
        }
        .generate-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
          pointer-events: auto !important;
          position: relative;
          z-index: 10;
        }
        .generate-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .codes-table {
          background: var(--bg-card);
          border-radius: 16px;
          overflow: visible;
          position: relative;
          z-index: 10;
        }
        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1.5fr 1.5fr 1fr;
          padding: 16px 20px;
          background: rgba(102, 126, 234, 0.1);
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }
        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1.5fr 1.5fr 1fr;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          align-items: center;
        }
        .table-row:last-child {
          border-bottom: none;
        }
        .code-value {
          font-family: monospace;
          font-size: 16px;
          font-weight: 600;
          color: var(--primary);
        }
        .status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .status.unused {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        .status.used {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }
        .used-by {
          color: var(--text-secondary);
          font-size: 14px;
        }
        .created-at {
          color: var(--text-muted);
          font-size: 13px;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        .delete-btn {
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: none;
          border-radius: 6px;
          color: #ef4444;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          pointer-events: auto !important;
          position: relative;
          z-index: 10;
        }
        .copy-btn {
          padding: 6px 12px;
          background: rgba(16, 185, 129, 0.1);
          border: none;
          border-radius: 6px;
          color: #10b981;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          pointer-events: auto !important;
          position: relative;
          z-index: 10;
        }
        .copy-btn:hover {
          background: rgba(16, 185, 129, 0.2);
        }
        .code-value {
          cursor: pointer;
        }
        .code-value:hover {
          color: var(--primary);
        }
        .delete-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
        }
        .delete-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .empty-state {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
        }
        .loading {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
        }
        .toast {
          position: fixed !important;
          top: 20px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          padding: 10px 20px !important;
          border-radius: 25px !important;
          font-size: 14px !important;
          z-index: 10000 !important;
          animation: toastSlide 0.3s ease;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
          backdrop-filter: blur(10px) !important;
        }
        .toast-icon {
          font-size: 16px !important;
          font-weight: bold !important;
        }
        .toast-text {
          white-space: nowrap !important;
        }
        .toast-success {
          background: linear-gradient(135deg, #10b981, #059669) !important;
          color: white !important;
        }
        .toast-error {
          background: linear-gradient(135deg, #ef4444, #dc2626) !important;
          color: white !important;
        }
        .toast-info {
          background: linear-gradient(135deg, #6366f1, #4f46e5) !important;
          color: white !important;
        }
        @keyframes toastSlide {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .icm-page {
          min-height: 100vh;
          background: var(--bg-primary);
        }
        .icm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: rgba(15, 15, 26, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .icm-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .icm-logo {
          font-size: 24px;
          cursor: pointer;
        }
        .icm-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .back-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .back-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}

export default InviteCodeManagement;
