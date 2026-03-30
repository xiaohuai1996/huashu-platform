import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatRecords.css';

function ChatRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recordTitle, setRecordTitle] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [inputText, setInputText] = useState('');
  const [inputSender, setInputSender] = useState('customer');
  const chatListRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/chat-records', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error('Failed to fetch records:', err);
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgTag = `<img src="${event.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px;" />`;
      if (editingMessage !== null) {
        // Edit existing message
        const newMessages = [...messages];
        newMessages[editingMessage].content += '\n' + imgTag;
        setMessages(newMessages);
        setEditingMessage(null);
      } else {
        // Add new message with image
        addMessage(imgTag);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add message
  const addMessage = (content) => {
    if (!content.trim()) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('zh-CN');
    const datetimeStr = `${dateStr} ${timeStr}`;

    const newMsg = {
      id: Date.now(),
      datetime: datetimeStr,
      time: timeStr,
      sender: inputSender === 'customer' ? '客户' : '客服',
      content: content,
      type: inputSender
    };

    setMessages([...messages, newMsg]);
    setInputText('');
  };

  // Edit message
  const editMessage = (index) => {
    setEditingMessage(index);
    setInputText(messages[index].content.replace(/<[^>]*>/g, ''));
    setInputSender(messages[index].type);
  };

  // Update message
  const updateMessage = () => {
    if (editingMessage !== null) {
      const newMessages = [...messages];
      newMessages[editingMessage].content = inputText;
      newMessages[editingMessage].type = inputSender;
      newMessages[editingMessage].sender = inputSender === 'customer' ? '客户' : '客服';
      setMessages(newMessages);
      setEditingMessage(null);
      setInputText('');
    } else {
      addMessage(inputText);
    }
  };

  // Delete message
  const deleteMessage = (index) => {
    const newMessages = messages.filter((_, i) => i !== index);
    setMessages(newMessages);
  };

  // Save chat record
  const handleSaveRecord = async () => {
    if (!recordTitle.trim()) {
      alert('请输入记录标题');
      return;
    }

    if (messages.length === 0) {
      alert('请先添加聊天内容');
      return;
    }

    try {
      const customerCount = messages.filter(m => m.type === 'customer').length;
      const serviceCount = messages.filter(m => m.type === 'service').length;

      await fetch('/api/chat-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: recordTitle,
          raw_content: messages.map(m => `${m.datetime} ${m.sender}: ${m.content}`).join('\n'),
          messages: messages,
          customer_count: customerCount,
          service_count: serviceCount,
          total_count: messages.length
        })
      });

      alert('保存成功！');
      setMessages([]);
      setRecordTitle('');
      fetchRecords();
      setShowPublish(false);
    } catch (err) {
      console.error('Failed to save:', err);
      alert('保存失败');
    }
  };

  // Delete record
  const handleDeleteRecord = async (id) => {
    if (!confirm('确定要删除这条聊天记录吗？')) return;

    try {
      await fetch(`/api/chat-records/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRecords();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('删除失败');
    }
  };

  // View record detail
  const viewRecordDetail = (record) => {
    setMessages(record.messages || []);
    setRecordTitle(record.title);
    setShowPublish(false);
    setIsViewing(true);
  };

  const backToList = () => {
    setIsViewing(false);
    setMessages([]);
    setRecordTitle('');
  };

  // Filter messages
  const filteredMessages = messages.filter(msg => {
    if (filter === 'customer' && msg.type !== 'customer') return false;
    if (filter === 'service' && msg.type !== 'service') return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return msg.content.toLowerCase().includes(query) ||
             msg.sender.toLowerCase().includes(query);
    }
    return true;
  });

  const stats = {
    total: messages.length,
    customer: messages.filter(m => m.type === 'customer').length,
    service: messages.filter(m => m.type === 'service').length
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-header-left">
          <div className="chat-back-btn" onClick={() => navigate('/home')}>
            ← 返回
          </div>
          <div className="chat-title">💬 优质聊天</div>
        </div>
        <div className="chat-header-nav">
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
        </div>
      </header>

      <div className="chat-container">
        {/* Tab Bar */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${!showPublish && !isViewing ? 'active' : ''}`}
            onClick={() => { setShowPublish(false); setIsViewing(false); }}
          >
            📋 聊天记录
          </button>
          <button
            className={`tab-btn ${showPublish ? 'active' : ''}`}
            onClick={() => { setShowPublish(true); setIsViewing(false); }}
          >
            📝 发起聊天
          </button>
        </div>

        {/* View Record Detail */}
        {isViewing && (
          <div className="publish-section">
            <div className="view-header">
              <button className="back-btn" onClick={backToList}>← 返回列表</button>
              <h3 className="view-title">{recordTitle}</h3>
            </div>

            <div className="chat-stats-bar">
              <span className="stat-badge total">💬 {stats.total}</span>
              <span className="stat-badge customer">👤 {stats.customer}</span>
              <span className="stat-badge service">💼 {stats.service}</span>
            </div>

            <div className="wechat-chat-list">
              {messages.map((msg, index) => (
                <div key={msg.id} className={`wechat-message ${msg.type}`}>
                  <div className="wechat-avatar">
                    {msg.type === 'customer' ? '👤' : '💼'}
                  </div>
                  <div className="wechat-bubble-wrapper">
                    <div className="wechat-sender-name">{msg.sender}</div>
                    <div className="wechat-bubble">
                      <div 
                        className="wechat-content"
                        dangerouslySetInnerHTML={{ __html: msg.content }} 
                      />
                      <div className="wechat-time">{msg.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publish Tab - WeChat Style Chat Input */}
        {showPublish && (
          <div className="publish-section">
            {/* Title Input */}
            <div className="title-input-group">
              <input
                type="text"
                value={recordTitle}
                onChange={(e) => setRecordTitle(e.target.value)}
                placeholder="输入聊天记录标题..."
                className="title-input"
              />
            </div>

            {/* Chat Stats */}
            <div className="chat-stats-bar">
              <span className="stat-badge total">💬 {stats.total}</span>
              <span className="stat-badge customer">👤 {stats.customer}</span>
              <span className="stat-badge service">💼 {stats.service}</span>
            </div>

            {/* WeChat Style Chat List */}
            <div className="wechat-chat-list" ref={chatListRef}>
              {messages.length === 0 ? (
                <div className="empty-chat-hint">
                  <p>👆 点击下方输入框添加聊天内容</p>
                  <p>支持文字和图片</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={msg.id} className={`wechat-message ${msg.type}`}>
                    <div className="wechat-avatar">
                      {msg.type === 'customer' ? '👤' : '💼'}
                    </div>
                    <div className="wechat-bubble-wrapper">
                      <div className="wechat-sender-name">
                        {msg.sender}
                      </div>
                      <div className="wechat-bubble">
                        <div 
                          className="wechat-content"
                          dangerouslySetInnerHTML={{ __html: msg.content }} 
                        />
                        <div className="wechat-time">{msg.time}</div>
                      </div>
                      <div className="wechat-actions">
                        <button onClick={() => editMessage(index)}>✏️</button>
                        <button onClick={() => deleteMessage(index)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="chat-input-area">
              <div className="sender-selector">
                <label className={`sender-option ${inputSender === 'customer' ? 'active customer' : ''}`}>
                  <input
                    type="radio"
                    name="sender"
                    value="customer"
                    checked={inputSender === 'customer'}
                    onChange={() => setInputSender('customer')}
                  />
                  👤 客户
                </label>
                <label className={`sender-option ${inputSender === 'service' ? 'active service' : ''}`}>
                  <input
                    type="radio"
                    name="sender"
                    value="service"
                    checked={inputSender === 'service'}
                    onChange={() => setInputSender('service')}
                  />
                  💼 客服
                </label>
              </div>

              <div className="input-row">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={editingMessage !== null ? "修改内容..." : "输入聊天内容..."}
                  className="chat-text-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      updateMessage();
                    }
                  }}
                />
                <label className="image-upload-btn">
                  <span>🖼️</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <button 
                  className={`send-btn ${inputSender}`}
                  onClick={updateMessage}
                >
                  {editingMessage !== null ? '✏️ 修改' : '➤ 发送'}
                </button>
              </div>
            </div>

            {/* Save Button */}
            {messages.length > 0 && (
              <button className="save-chat-btn" onClick={handleSaveRecord}>
                💾 保存聊天记录
              </button>
            )}
          </div>
        )}

        {/* List Tab */}
        {!showPublish && (
          <div className="list-section">
            <div className="records-list">
              {records.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p>暂无聊天记录</p>
                  <button className="goto-publish" onClick={() => setShowPublish(true)}>
                    发起聊天 →
                  </button>
                </div>
              ) : (
                records.map((record) => (
                  <div key={record.id} className="record-card">
                    <div className="record-info" onClick={() => viewRecordDetail(record)}>
                      <div className="record-title">{record.title}</div>
                      <div className="record-meta">
                        <span>📅 {formatDate(record.created_at)}</span>
                        <span>👤 {record.customer_count}</span>
                        <span>💼 {record.service_count}</span>
                        <span>💬 {record.total_count}</span>
                      </div>
                    </div>
                    {(user.role === 'super_admin' || user.role === 'admin') && (
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteRecord(record.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatRecords;
