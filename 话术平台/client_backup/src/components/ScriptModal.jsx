import { useState, useEffect } from 'react';
import { favoritesAPI } from '../api';

function ScriptModal({ script, onClose, onCopy, onToggleFavorite }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    checkFavorite();
  }, [script.id]);

  const checkFavorite = async () => {
    try {
      const res = await favoritesAPI.checkFavorite(script.id);
      setIsFavorite(res.data.isFavorite);
    } catch (err) {
      console.error('检查收藏状态失败', err);
    }
  };

  const handleFavoriteClick = async () => {
    await onToggleFavorite(script);
    setIsFavorite(!isFavorite);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-category">{script.category}</span>
            <h2 className="modal-title">{script.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="script-content">{script.content}</div>
          <div className="modal-footer">
            {script.tags?.split(',').map((tag, i) => (
              <span key={i} className="script-tag">{tag.trim()}</span>
            ))}
          </div>
          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button className="copy-btn" onClick={() => onCopy(script.content)}>
              📋 复制话术
            </button>
            <button 
              className={`fav-btn ${isFavorite ? 'active' : ''}`} 
              onClick={handleFavoriteClick}
            >
              {isFavorite ? '❤️ 已收藏' : '🤍 收藏'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScriptModal;
