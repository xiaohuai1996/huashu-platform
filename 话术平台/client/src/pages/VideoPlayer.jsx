import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function VideoPlayer() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [videoKey, setVideoKey] = useState(0);
  const hideTimeoutRef = useRef(null);
  const animationRef = useRef(null);

  const apiUrl = "https://openapi.dwo.cc/api/fh_mvsp?ckey=3BC61MPRIZAG7SCWIRHF";

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      
      let videoList = [];
      if (Array.isArray(data)) {
        videoList = data;
      } else if (data.data && Array.isArray(data.data)) {
        videoList = data.data;
      } else if (data.url) {
        videoList = [{ url: data.url, title: data.title || '精彩视频' }];
      }
      
      videoList = videoList.filter(v => v.url && typeof v.url === 'string');
      
      if (videoList.length === 0) {
        videoList = [{ url: apiUrl, title: '精彩视频 1' }];
      }
      
      setVideos(videoList);
      setLoading(false);
    } catch (err) {
      setVideos([{ url: apiUrl, title: '精彩视频' }]);
      setLoading(false);
    }
  };

  // Canvas blur effect - capture video frame and blur
  const updateCanvas = useCallback(() => {
    if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (video.readyState >= 2) {
        canvas.width = 640;
        canvas.height = 360;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }
    animationRef.current = requestAnimationFrame(updateCanvas);
  }, []);

  useEffect(() => {
    if (!loading && videos.length > 0) {
      animationRef.current = requestAnimationFrame(updateCanvas);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loading, videos, updateCanvas]);

  useEffect(() => {
    if (videos.length > 0 && videoRef.current && !loading) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex, videos, loading]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      setCurrentTime(currentTime || 0);
      setDuration(duration || 0);
      setProgress(duration > 0 ? (currentTime / duration) * 100 : 0);
    }
  };

  const handleVideoEnded = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setVideoKey(prev => prev + 1);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * duration;
    }
  };

  const skipVideo = (direction) => {
    if (direction === 'next' && currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setVideoKey(prev => prev + 1);
      setIsPlaying(true);
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setVideoKey(prev => prev + 1);
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  };

  return (
    <div className="vp-page">
      {/* Canvas Blurred Background */}
      <div className="vp-bg">
        <canvas ref={canvasRef} className="vp-canvas" />
        <div className="vp-bg-overlay"></div>
      </div>

      {/* Header */}
      <div className="vp-header">
        <span className="vp-logo" onClick={() => navigate('/home')}>💬</span>
        <span className="vp-title" onClick={() => navigate('/home')}>话术平台</span>
        <div className="vp-nav">
          <span onClick={() => navigate('/home')}>🏠 首页</span>
          <span onClick={() => navigate('/dashboard')}>💬 话术库</span>
          <span className="active">🎬 轻松一刻</span>
        </div>
      </div>

      {/* Centered Player */}
      <div className="vp-center">
        {loading ? (
          <div className="vp-loading">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        ) : (
          <div className="vp-player">
            <video
              ref={videoRef}
              key={videoKey}
              src={videos[currentIndex]?.url}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration || 0);
                  videoRef.current.play().catch(() => {});
                }
              }}
              autoPlay
            />
            
            <div className="vp-overlay" style={{ opacity: showControls ? 1 : 0 }}>
              <div className="vp-center-btns">
                <button className="vp-skip" onClick={() => skipVideo('prev')}>⏮</button>
                <button className="vp-play" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
                <button className="vp-skip" onClick={() => skipVideo('next')}>⏭</button>
              </div>
            </div>

            <div className="vp-bottom" style={{ opacity: showControls ? 1 : 0 }}>
              <div className="vp-progress" onClick={handleSeek}>
                <div className="vp-fill" style={{ width: progress + '%' }}></div>
              </div>
              <div className="vp-info">
                <span className="vp-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <span className="vp-name">{videos[currentIndex]?.title}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .vp-page {
          min-height: 100vh;
          position: relative;
          background: #0a0a14;
        }
        .vp-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }
        .vp-canvas {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(25px);
          transform: translate(-50%, -50%) scale(1);
          opacity: 0.85;
        }
        .vp-bg-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(10,10,20,0.25);
        }
        .vp-header {
          position: relative;
          z-index: 20;
          display: flex;
          align-items: center;
          padding: 16px 24px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(20px);
          gap: 16px;
        }
        .vp-logo {
          font-size: 28px;
          cursor: pointer;
        }
        .vp-title {
          font-size: 20px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
        }
        .vp-nav {
          margin-left: auto;
          display: flex;
          gap: 12px;
        }
        .vp-nav span {
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          transition: all 0.3s;
        }
        .vp-nav span:hover {
          color: #fff;
          background: rgba(255,255,255,0.1);
        }
        .vp-nav span.active {
          color: #fff;
          background: linear-gradient(135deg, #667eea, #764ba2);
        }
        .vp-center {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 70px);
          padding: 20px;
        }
        .vp-player {
          position: relative;
          width: 100%;
          max-width: 500px;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 30px 100px rgba(0,0,0,0.7);
        }
        .vp-player video {
          width: 100%;
          display: block;
        }
        .vp-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.15);
          transition: opacity 0.3s;
        }
        .vp-center-btns {
          display: flex;
          gap: 20px;
          align-items: center;
        }
        .vp-skip, .vp-play {
          background: rgba(255,255,255,0.25);
          border: none;
          color: #fff;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        .vp-skip {
          width: 50px;
          height: 50px;
          font-size: 18px;
        }
        .vp-play {
          width: 70px;
          height: 70px;
          font-size: 26px;
        }
        .vp-skip:hover, .vp-play:hover {
          background: rgba(255,255,255,0.4);
          transform: scale(1.1);
        }
        .vp-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px;
          background: linear-gradient(transparent, rgba(0,0,0,0.9));
          transition: opacity 0.3s;
        }
        .vp-progress {
          height: 4px;
          background: rgba(255,255,255,0.25);
          border-radius: 2px;
          cursor: pointer;
          margin-bottom: 10px;
        }
        .vp-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 2px;
        }
        .vp-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vp-time {
          color: rgba(255,255,255,0.7);
          font-size: 13px;
        }
        .vp-name {
          color: #fff;
          font-size: 14px;
          font-weight: 500;
        }
        .vp-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          color: #fff;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .vp-nav { display: none; }
          .vp-center { padding: 12px; }
          .vp-player { max-width: 100%; }
        }
      `}</style>
    </div>
  );
}

export default VideoPlayer;
