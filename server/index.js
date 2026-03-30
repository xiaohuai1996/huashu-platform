import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'huashu-platform-secret-key-2024';
const DB_PATH = path.join(__dirname, 'huashu.db');
const SERVER_START_TIME = Date.now();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Server uptime endpoint
app.get('/api/uptime', (req, res) => {
  res.json({ startTime: SERVER_START_TIME });
});

let db;

// Initialize database
async function initDB() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      signature TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      last_login_ip TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add nickname column if not exists (for existing databases)
  try {
    db.run('ALTER TABLE users ADD COLUMN nickname TEXT DEFAULT ""');
  } catch (e) {
    // Column might already exist, ignore
  }
  
  // Add avatar column if not exists
  try {
    db.run('ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ""');
  } catch (e) {}

  // Create invite_codes table
  db.run(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      used_by INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME DEFAULT NULL
    )
  `);
  
  // Generate initial invite codes if none exist
  const codesCount = db.exec('SELECT COUNT(*) FROM invite_codes');
  if (codesCount.length === 0 || codesCount[0].values[0][0] === 0) {
    const initialCodes = ['HF2026A1', 'HF2026A2', 'HF2026A3', 'HF2026A4', 'HF2026A5'];
    const stmt = db.prepare('INSERT INTO invite_codes (code) VALUES (?)');
    initialCodes.forEach(code => stmt.run([code]));
    stmt.free();
    console.log('✅ Generated initial invite codes');
  }

  // Add signature column if not exists
  try {
    db.run('ALTER TABLE users ADD COLUMN signature TEXT DEFAULT ""');
  } catch (e) {
    // Column might already exist, ignore
  }
  
  // Add role column if not exists
  try {
    db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
  } catch (e) {
    // Column might already exist, ignore
  }
  
  // Add last_login_ip column if not exists
  try {
    db.run('ALTER TABLE users ADD COLUMN last_login_ip TEXT DEFAULT ""');
  } catch (e) {
    // Column might already exist, ignore
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      views INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      publisher_id INTEGER,
      publisher_name TEXT,
      nav_group TEXT
    )
  `);

  // Add publisher columns if they don't exist (for existing databases)
  try {
    const hasPublisherId = db.exec("PRAGMA table_info(scripts)").some(r => r.values.some(row => row[1] === 'publisher_id'));
    if (!hasPublisherId) {
      db.run('ALTER TABLE scripts ADD COLUMN publisher_id INTEGER');
      db.run('ALTER TABLE scripts ADD COLUMN publisher_name TEXT');
      db.run('ALTER TABLE scripts ADD COLUMN nav_group TEXT');
      console.log('✅ Added publisher columns to scripts table');
    }
  } catch (e) {
    console.error('Error adding publisher columns:', e.message);
  }

  // Create script_categories table for category management
  db.run(`
    CREATE TABLE IF NOT EXISTS script_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      emoji TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      nav_group TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add views column if not exists (for existing databases)
  try {
    const viewsCol = db.exec("PRAGMA table_info(scripts)");
    const hasViews = viewsCol[0]?.values?.some(row => row[1] === 'views');
    if (!hasViews) {
      db.run('ALTER TABLE scripts ADD COLUMN views INTEGER DEFAULT 0');
      console.log('✅ Added views column to scripts table');
    }
  } catch (e) {
    console.error('Error adding views column:', e.message);
  }

  // Add is_pinned column if not exists (for existing databases)
  try {
    const pinnedCol = db.exec("PRAGMA table_info(scripts)");
    const hasPinned = pinnedCol[0]?.values?.some(row => row[1] === 'is_pinned');
    if (!hasPinned) {
      db.run("ALTER TABLE scripts ADD COLUMN is_pinned INTEGER DEFAULT 0");
      console.log('✅ Added is_pinned column to scripts table');
    }
  } catch (e) {
    console.error('Error adding is_pinned column:', e.message);
  }

  // Create sidebar_navigation table
  db.run(`
    CREATE TABLE IF NOT EXISTS sidebar_navigation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default navigation if empty
  const navCount = db.exec('SELECT COUNT(*) FROM sidebar_navigation');
  if (navCount.length === 0 || navCount[0].values[0][0] === 0) {
    const defaultNav = [
      { name: '基础话术', emoji: '📚' },
      { name: '营销话术', emoji: '🎯' },
      { name: '服务话术', emoji: '💬' },
    ];
    const stmt = db.prepare('INSERT INTO sidebar_navigation (name, emoji, sort_order) VALUES (?, ?, ?)');
    defaultNav.forEach((n, i) => stmt.run([n.name, n.emoji, i]));
    stmt.free();
  }

  // Insert default categories if empty
  const catCount = db.exec('SELECT COUNT(*) FROM script_categories');
  if (catCount.length === 0 || catCount[0].values[0][0] === 0) {
    const defaultCategories = [
      { name: '开场白', emoji: '👋' },
      { name: '产品介绍', emoji: '📦' },
      { name: '成交话术', emoji: '🤝' },
      { name: '异议处理', emoji: '💭' },
      { name: '引流话术', emoji: '🔗' },
      { name: '群发话术', emoji: '📨' },
      { name: '私信话术', emoji: '💬' },
      { name: '直播话术', emoji: '📺' },
      { name: '朋友圈文案', emoji: '📝' },
      { name: '售后话术', emoji: '🛎️' },
    ];
    const stmt = db.prepare('INSERT INTO script_categories (name, emoji, sort_order) VALUES (?, ?, ?)');
    defaultCategories.forEach((cat, i) => {
      stmt.run([cat.name, cat.emoji, i]);
    });
    stmt.free();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      user_id INTEGER,
      script_id INTEGER,
      PRIMARY KEY (user_id, script_id)
    )
  `);

  // Seed sample scripts if empty
  const result = db.exec('SELECT COUNT(*) as c FROM scripts');
  const count = result.length > 0 ? result[0].values[0][0] : 0;
  
  if (count === 0) {
    const sampleScripts = [
      { title: '开场白 - 破冰话术', category: '开场白', content: '您好呀！很高兴认识您～我是XXX，不知道怎么称呼您比较合适呢？', tags: '开场,破冰,初次见面' },
      { title: '产品介绍 - 吸引兴趣', category: '产品介绍', content: '您知道吗？我们这款产品已经帮助了超过10000+用户解决了XXX问题，而且操作特别简单...', tags: '产品,介绍,吸引' },
      { title: '处理异议 - 价格太贵', category: '异议处理', content: '我完全理解您的顾虑。其实您换个角度想想，这个投资可以用很多年，折算下来每天才几块钱...', tags: '价格,异议,说服' },
      { title: '促成成交 - 限时优惠', category: '成交话术', content: '这样吧，考虑到您是我们的新客户，我特意申请了一个限时优惠价，名额有限哦～', tags: '成交,优惠,限时' },
      { title: '售后服务 - 温暖问候', category: '售后话术', content: '您好呀！我是小婉儿～想问问您产品用得还顺手吗？有什么问题随时找我哦！', tags: '售后,服务,关怀' },
      { title: '微信添加 - 温柔请求', category: '引流话术', content: '认识您真的很开心！方便的话可以加个微信吗？这样以后有什么好的内容也能第一时间分享给您～', tags: '微信,引流,加粉' },
      { title: '群发话术 - 节日祝福', category: '群发话术', content: '🎉XXX节快乐呀！感谢您一直以来的支持与信任，送您一个小惊喜，请查收哦～', tags: '节日,祝福,群发' },
      { title: '私信话术 - 个性化沟通', category: '私信话术', content: '嗨～看到您刚才点赞了这条内容，感觉我们品味很像呢！您也对这个话题感兴趣吗？', tags: '私信,互动,个性化' },
      { title: '朋友圈文案 - 种草推荐', category: '朋友圈文案', content: '🌟今日推荐 | 用了半个月真的绝了！强烈安利给想要XXX的你们～\n\n#好物推荐 #种草', tags: '朋友圈,种草,文案' },
      { title: '直播话术 - 互动引流', category: '直播话术', content: '宝宝们！左上角点个关注，主播每天都有超福利送给大家哦～来，扣个1我看看有多少人！', tags: '直播,互动,引流', views: Math.floor(Math.random() * 1000) + 100 },
    ];
    
    const stmt = db.prepare('INSERT INTO scripts (title, category, content, tags, views) VALUES (?, ?, ?, ?, ?)');
    for (const s of sampleScripts) {
      stmt.run([s.title, s.category, s.content, s.tags, s.views || Math.floor(Math.random() * 500)]);
    }
    stmt.free();
    
    saveDB();
  }

  // Create announcements table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER,
      is_pinned INTEGER DEFAULT 0,
      is_expired INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create chat_records table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      raw_content TEXT NOT NULL,
      messages TEXT NOT NULL,
      customer_count INTEGER DEFAULT 0,
      service_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 0,
      author_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ 数据库初始化完成');
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Save DB periodically
setInterval(saveDB, 30000);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: '登录已过期，请重新登录' });
  }
};

// ============ AUTH ROUTES ============

app.post('/api/register', (req, res) => {
  try {
    const { username, password, nickname, inviteCode } = req.body;

    if (!username || !password || !inviteCode) {
      return res.status(400).json({ error: '账号、密码和邀请码都不能为空' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: '账号至少3个字符' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6个字符' });
    }

    // Check invite code
    const codeResult = db.exec(`SELECT * FROM invite_codes WHERE code = '${inviteCode}' AND used = 0`);
    if (codeResult.length === 0 || codeResult[0].values.length === 0) {
      return res.status(400).json({ error: '邀请码无效或已使用' });
    }

    // Check if username already exists
    const existingUsername = db.exec(`SELECT id FROM users WHERE username = '${username}'`);
    if (existingUsername.length > 0 && existingUsername[0].values.length > 0) {
      return res.status(400).json({ error: '账号已存在，请修改' });
    }

    // Check if nickname already exists
    const safeNickname = nickname?.trim() || username;
    const existingNickname = db.exec(`SELECT id FROM users WHERE nickname = '${safeNickname}'`);
    if (existingNickname.length > 0 && existingNickname[0].values.length > 0) {
      return res.status(400).json({ error: '昵称已存在，请修改' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Check if this is the first user - make them super_admin
    const countResult = db.exec('SELECT COUNT(*) as c FROM users');
    const isFirstUser = countResult[0].values[0][0] === 0;
    const role = isFirstUser ? 'super_admin' : 'user';
    
    db.run('INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)', [username, hashedPassword, safeNickname, role]);
    
    const result = db.exec('SELECT last_insert_rowid()');
    const userId = result[0].values[0][0];
    
    // Mark invite code as used
    db.run(`UPDATE invite_codes SET used = 1, used_by = ${userId} WHERE code = '${inviteCode}'`);
    
    saveDB();

    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      success: true, 
      token, 
      user: { id: userId, username, nickname: username, role } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const result = db.exec(`SELECT * FROM users WHERE username = '${username}'`);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const columns = result[0].columns;
    const user = {};
    result[0].values[0].forEach((val, i) => user[columns[i]] = val);

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // Update last login IP
    const safeIp = clientIp.replace(/'/g, "''");
    db.run(`UPDATE users SET last_login_ip = '${safeIp}' WHERE id = ${user.id}`);
    saveDB();

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      success: true, 
      token, 
      user: { id: user.id, username: user.username, nickname: user.nickname || user.username, role: user.role || 'user' } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/me', authenticateToken, (req, res) => {
  const result = db.exec(`SELECT id, username, nickname, avatar, signature, role, last_login_ip, created_at FROM users WHERE id = ${req.user.id}`);
  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  const columns = result[0].columns;
  const user = {};
  result[0].values[0].forEach((val, i) => user[columns[i]] = val);
  
  res.json({ user });
});

// Update nickname
app.put('/api/nickname', authenticateToken, (req, res) => {
  try {
    const { nickname } = req.body;
    
    if (!nickname || nickname.trim().length === 0) {
      return res.status(400).json({ error: '昵称不能为空' });
    }
    
    if (nickname.trim().length > 20) {
      return res.status(400).json({ error: '昵称不能超过20个字符' });
    }
    
    const safeNickname = nickname.trim().replace(/'/g, "''");
    db.run(`UPDATE users SET nickname = '${safeNickname}' WHERE id = ${req.user.id}`);
    saveDB();
    
    res.json({ success: true, nickname: nickname.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新失败' });
  }
});

// Update signature
app.put('/api/signature', authenticateToken, (req, res) => {
  try {
    const { signature } = req.body;
    
    if (signature && signature.length > 50) {
      return res.status(400).json({ error: '签名不能超过50个字符' });
    }
    
    const safeSignature = (signature || '').trim().replace(/'/g, "''");
    db.run(`UPDATE users SET signature = '${safeSignature}' WHERE id = ${req.user.id}`);
    saveDB();
    
    res.json({ success: true, signature: (signature || '').trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新失败' });
  }
});

// Get all users
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const result = db.exec('SELECT id, username, nickname, avatar, signature, role, last_login_ip, created_at FROM users ORDER BY created_at DESC');
    if (result.length === 0) {
      return res.json({ users: [] });
    }
    
    const columns = result[0].columns;
    const users = result[0].values.map(row => {
      const user = {};
      row.forEach((val, i) => user[columns[i]] = val);
      return user;
    });
    
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// Get all invite codes (admin only)
app.get('/api/invite-codes', authenticateToken, (req, res) => {
  try {
    // Only super_admin can view invite codes
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'super_admin') {
      return res.status(403).json({ error: '无权限' });
    }
    
    const result = db.exec('SELECT id, code, used, used_by, created_at FROM invite_codes ORDER BY created_at DESC');
    if (result.length === 0) {
      return res.json({ codes: [] });
    }
    
    // Get used_by usernames
    const columns = ['id', 'code', 'used', 'used_by', 'created_at'];
    const codes = result[0].values.map(row => {
      const code = {};
      row.forEach((val, i) => code[columns[i]] = val);
      return code;
    });
    
    // Fetch usernames for used_by
    const usedByIds = codes.filter(c => c.used_by).map(c => c.used_by);
    if (usedByIds.length > 0) {
      const usersResult = db.exec(`SELECT id, nickname FROM users WHERE id IN (${usedByIds.join(',')})`);
      if (usersResult.length > 0) {
        const userMap = {};
        usersResult[0].values.forEach(row => {
          userMap[row[0]] = row[1];
        });
        codes.forEach(code => {
          if (code.used_by) {
            code.used_by_name = userMap[code.used_by] || '未知';
          }
        });
      }
    }
    
    res.json({ codes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取邀请码失败' });
  }
});

// Generate new invite code (admin only)
app.post('/api/invite-codes', authenticateToken, (req, res) => {
  try {
    // Only super_admin can create invite codes
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'super_admin') {
      return res.status(403).json({ error: '无权限' });
    }
    
    const { count = 1 } = req.body;
    const newCodes = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    
    for (let i = 0; i < count; i++) {
      let code = 'HF';
      for (let j = 0; j < 6; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check if code already exists
      const existing = db.exec(`SELECT id FROM invite_codes WHERE code = '${code}'`);
      if (existing.length === 0 || existing[0].values.length === 0) {
        db.run('INSERT INTO invite_codes (code) VALUES (?)', [code]);
        newCodes.push(code);
      }
    }
    
    saveDB();
    res.json({ success: true, codes: newCodes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '生成邀请码失败' });
  }
});

// Delete invite code (admin only)
app.delete('/api/invite-codes/:code', authenticateToken, (req, res) => {
  try {
    // Only super_admin can delete invite codes
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    if (userResult.length === 0 || userResult[0].values[0][0] !== 'super_admin') {
      return res.status(403).json({ error: '无权限' });
    }
    
    const { code } = req.params;
    db.run(`DELETE FROM invite_codes WHERE code = '${code}'`);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除邀请码失败' });
  }
});

// Update user avatar
app.put('/api/users/avatar', authenticateToken, (req, res) => {
  try {
    const { avatar } = req.body;
    const safeAvatar = (avatar || '').replace(/'/g, "''");
    db.run(`UPDATE users SET avatar = '${safeAvatar}' WHERE id = ${req.user.id}`);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新头像失败' });
  }
});

// Update user role (super_admin only)
app.put('/api/users/:id/role', authenticateToken, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { role } = req.body;
    
    // Check if current user is super_admin
    const currentUserResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    if (currentUserResult.length === 0 || currentUserResult[0].values[0][0] !== 'super_admin') {
      return res.status(403).json({ error: '只有超级管理员可以修改用户权限' });
    }
    
    // Cannot modify super_admin's role
    const targetUserResult = db.exec(`SELECT role FROM users WHERE id = ${targetUserId}`);
    if (targetUserResult.length > 0 && targetUserResult[0].values[0][0] === 'super_admin') {
      return res.status(403).json({ error: '无法修改超级管理员的权限' });
    }
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '无效的角色' });
    }
    
    const safeRole = role.replace(/'/g, "''");
    db.run(`UPDATE users SET role = '${safeRole}' WHERE id = ${targetUserId}`);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '修改权限失败' });
  }
});

// Delete user (super_admin or admin)
app.delete('/api/users/:id', authenticateToken, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    
    // Cannot delete yourself
    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: '无法删除自己' });
    }
    
    // Get current user role
    const currentUserResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    const currentRole = currentUserResult.length > 0 ? currentUserResult[0].values[0][0] : 'user';
    
    // Get target user role
    const targetUserResult = db.exec(`SELECT role FROM users WHERE id = ${targetUserId}`);
    if (targetUserResult.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    const targetRole = targetUserResult[0].values[0][0];
    
    // Check permissions
    if (currentRole === 'super_admin') {
      // super_admin can delete anyone except other super_admin
      if (targetRole === 'super_admin') {
        return res.status(403).json({ error: '无法删除超级管理员' });
      }
    } else if (currentRole === 'admin') {
      // admin can only delete regular users
      if (targetRole !== 'user') {
        return res.status(403).json({ error: '权限不足' });
      }
    } else {
      return res.status(403).json({ error: '权限不足' });
    }
    
    db.run(`DELETE FROM users WHERE id = ${targetUserId}`);
    db.run(`DELETE FROM user_favorites WHERE user_id = ${targetUserId}`);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// ============ ANNOUNCEMENTS ============

// Get all announcements
app.get('/api/announcements', authenticateToken, (req, res) => {
  try {
    const result = db.exec('SELECT * FROM announcements ORDER BY is_pinned DESC, is_expired ASC, created_at DESC');
    if (result.length === 0) {
      return res.json({ announcements: [] });
    }
    
    const columns = result[0].columns;
    const announcements = result[0].values.map(row => {
      const ann = {};
      row.forEach((val, i) => ann[columns[i]] = val);
      return ann;
    });
    
    res.json({ announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取公告失败' });
  }
});

// Publish announcement (admin and super_admin only)
app.post('/api/announcements', authenticateToken, (req, res) => {
  try {
    const { title, content } = req.body;
    
    // Check role
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    const role = userResult.length > 0 ? userResult[0].values[0][0] : 'user';
    
    if (role !== 'super_admin' && role !== 'admin') {
      return res.status(403).json({ error: '权限不足，只有管理员可以发布公告' });
    }
    
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    
    const safeTitle = title.replace(/'/g, "''");
    const safeContent = content.replace(/'/g, "''");
    
    db.run(`INSERT INTO announcements (title, content, author_id) VALUES ('${safeTitle}', '${safeContent}', ${req.user.id})`);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '发布公告失败' });
  }
});

// Update announcement
app.put('/api/announcements/:id', authenticateToken, (req, res) => {
  try {
    const annId = req.params.id;
    const { title, content, is_pinned, is_expired } = req.body;
    
    // Check if announcement exists
    const existing = db.exec(`SELECT * FROM announcements WHERE id = ${annId}`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ error: '公告不存在' });
    }
    
    // Check role
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    const role = userResult.length > 0 ? userResult[0].values[0][0] : 'user';
    
    if (role !== 'super_admin' && role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }
    
    let updates = [];
    if (title !== undefined) {
      updates.push(`title = '${title.replace(/'/g, "''")}'`);
    }
    if (content !== undefined) {
      updates.push(`content = '${content.replace(/'/g, "''")}'`);
    }
    if (is_pinned !== undefined) {
      updates.push(`is_pinned = ${is_pinned ? 1 : 0}`);
    }
    if (is_expired !== undefined) {
      updates.push(`is_expired = ${is_expired ? 1 : 0}`);
    }
    
    if (updates.length > 0) {
      db.run(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ${annId}`);
      saveDB();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新失败' });
  }
});

// Delete announcement
app.delete('/api/announcements/:id', authenticateToken, (req, res) => {
  try {
    const annId = req.params.id;
    
    // Check role
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    const role = userResult.length > 0 ? userResult[0].values[0][0] : 'user';
    
    if (role !== 'super_admin' && role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }
    
    db.run(`DELETE FROM announcements WHERE id = ${annId}`);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ============ CHAT RECORDS ROUTES ============

// Get all chat records
app.get('/api/chat-records', authenticateToken, (req, res) => {
  try {
    const result = db.exec(`
      SELECT cr.*, u.nickname as author_name
      FROM chat_records cr
      LEFT JOIN users u ON cr.author_id = u.id
      ORDER BY cr.created_at DESC
    `);

    if (result.length === 0) {
      return res.json({ records: [] });
    }

    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      // Parse messages JSON
      if (obj.messages) {
        try {
          obj.messages = JSON.parse(obj.messages);
        } catch (e) {
          obj.messages = [];
        }
      }
      return obj;
    });

    res.json({ records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取聊天记录失败' });
  }
});

// Create chat record
app.post('/api/chat-records', authenticateToken, (req, res) => {
  try {
    const { title, raw_content, messages, customer_count, service_count, total_count } = req.body;

    if (!title || !raw_content || !messages) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    db.run(`
      INSERT INTO chat_records (title, raw_content, messages, customer_count, service_count, total_count, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, raw_content, JSON.stringify(messages), customer_count || 0, service_count || 0, total_count || 0, req.user.id]);

    saveDB();

    const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

    res.json({ success: true, id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建聊天记录失败' });
  }
});

// Delete chat record
app.delete('/api/chat-records/:id', authenticateToken, (req, res) => {
  try {
    const recordId = req.params.id;

    // Check role
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    const role = userResult.length > 0 ? userResult[0].values[0][0] : 'user';

    if (role !== 'super_admin' && role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    db.run(`DELETE FROM chat_records WHERE id = ${recordId}`);
    saveDB();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ============ SIDEBAR NAVIGATION ROUTES ============

// Get all navigation items
app.get('/api/navigation', authenticateToken, (req, res) => {
  try {
    const navResult = db.exec('SELECT * FROM sidebar_navigation ORDER BY sort_order ASC');
    const catResult = db.exec(`
      SELECT sc.id, sc.name, sc.emoji, sc.nav_group, sc.sort_order, 
             COUNT(s.id) as script_count 
      FROM script_categories sc
      LEFT JOIN scripts s ON s.category = sc.name
      GROUP BY sc.id, sc.name, sc.emoji, sc.nav_group, sc.sort_order
      ORDER BY sc.sort_order ASC
    `);
    
    const navigation = navResult.length > 0 
      ? navResult[0].values.map(row => {
          const nav = {};
          navResult[0].columns.forEach((col, i) => nav[col] = row[i]);
          nav.categories = [];
          return nav;
        })
      : [];
    
    if (catResult.length > 0) {
      const cats = catResult[0].values.map(row => {
        const cat = {};
        catResult[0].columns.forEach((col, i) => cat[col] = row[i]);
        return cat;
      });
      
      // Assign categories to navigation groups
      cats.forEach(cat => {
        const navGroup = cat.nav_group;
        let nav = null;
        
        if (navGroup) {
          // Find the specified navigation
          nav = navigation.find(n => n.name === navGroup);
        }
        
        if (!nav && navigation.length > 0) {
          // Assign to first navigation (sorted by sort_order)
          nav = navigation[0];
        }
        
        if (nav) {
          nav.categories.push(cat);
        }
      });
    }
    
    res.json({ navigation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取导航失败' });
  }
});

// Create navigation item
app.post('/api/navigation', authenticateToken, (req, res) => {
  try {
    const { name, emoji } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '导航名称不能为空' });
    }
    const safeName = name.trim().replace(/'/g, "''");
    const safeEmoji = (emoji || '').replace(/'/g, "''");
    const maxOrder = db.exec('SELECT MAX(sort_order) FROM sidebar_navigation');
    const nextOrder = (maxOrder.length > 0 && maxOrder[0].values[0][0] !== null) ? maxOrder[0].values[0][0] + 1 : 0;
    db.run(`INSERT INTO sidebar_navigation (name, emoji, sort_order) VALUES ('${safeName}', '${safeEmoji}', ${nextOrder})`);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建导航失败' });
  }
});

// Update navigation item
app.put('/api/navigation/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji, sort_order } = req.body;
    const updates = [];
    if (name !== undefined) updates.push(`name = '${name.replace(/'/g, "''")}'`);
    if (emoji !== undefined) updates.push(`emoji = '${emoji.replace(/'/g, "''")}'`);
    if (sort_order !== undefined) updates.push(`sort_order = ${sort_order}`);
    if (updates.length > 0) {
      db.run(`UPDATE sidebar_navigation SET ${updates.join(', ')} WHERE id = ${id}`);
      saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新导航失败' });
  }
});

// Delete navigation item
app.delete('/api/navigation/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    // Clear nav_group for categories in this navigation
    const nav = db.exec(`SELECT name FROM sidebar_navigation WHERE id = ${id}`);
    if (nav.length > 0 && nav[0].values.length > 0) {
      const navName = nav[0].values[0][0];
      db.run(`UPDATE script_categories SET nav_group = '' WHERE nav_group = '${navName}'`);
    }
    db.run(`DELETE FROM sidebar_navigation WHERE id = ${id}`);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除导航失败' });
  }
});

// Update category's navigation group
app.put('/api/categories/:id/nav', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { nav_group } = req.body;
    const safeNavGroup = (nav_group || '').replace(/'/g, "''");
    db.run(`UPDATE script_categories SET nav_group = '${safeNavGroup}' WHERE id = ${id}`);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新失败' });
  }
});

// ============ SCRIPTS ROUTES ============

// Get all managed categories
app.get('/api/categories', authenticateToken, (req, res) => {
  try {
    // Get categories from script_categories table with script count
    const result = db.exec(`
      SELECT sc.id, sc.name, sc.emoji, sc.sort_order, 
             COUNT(s.id) as script_count 
      FROM script_categories sc
      LEFT JOIN scripts s ON s.category = sc.name
      GROUP BY sc.id, sc.name, sc.emoji, sc.sort_order
      ORDER BY sc.sort_order ASC, sc.name ASC
    `);
    
    if (result.length === 0) {
      return res.json({ categories: [] });
    }
    
    const columns = result[0].columns;
    const categories = result[0].values.map(row => {
      const cat = {};
      row.forEach((val, i) => cat[columns[i]] = val);
      return cat;
    });
    
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// Create new category
app.post('/api/categories', authenticateToken, (req, res) => {
  try {
    const { name, emoji } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }
    
    const safeName = name.trim().replace(/'/g, "''");
    const safeEmoji = (emoji || '').replace(/'/g, "''");
    
    // Check if category already exists
    const existing = db.exec(`SELECT id FROM script_categories WHERE name = '${safeName}'`);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json({ error: '分类已存在' });
    }
    
    // Get max sort_order
    const maxOrder = db.exec('SELECT MAX(sort_order) FROM script_categories');
    const nextOrder = (maxOrder.length > 0 && maxOrder[0].values[0][0] !== null) ? maxOrder[0].values[0][0] + 1 : 0;
    
    db.run(`INSERT INTO script_categories (name, emoji, sort_order) VALUES ('${safeName}', '${safeEmoji}', ${nextOrder})`);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// Update category
app.put('/api/categories/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji, sort_order, nav_group } = req.body;
    
    const existing = db.exec(`SELECT * FROM script_categories WHERE id = ${id}`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    const updates = [];
    if (name !== undefined) {
      updates.push(`name = '${name.replace(/'/g, "''")}'`);
    }
    if (emoji !== undefined) {
      updates.push(`emoji = '${emoji.replace(/'/g, "''")}'`);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = ${sort_order}`);
    }
    if (nav_group !== undefined) {
      updates.push(`nav_group = '${(nav_group || '').replace(/'/g, "''")}'`);
    }
    
    if (updates.length > 0) {
      db.run(`UPDATE script_categories SET ${updates.join(', ')} WHERE id = ${id}`);
      saveDB();
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新分类失败' });
  }
});

// Delete category
app.delete('/api/categories/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = db.exec(`SELECT * FROM script_categories WHERE id = ${id}`);
    if (existing.length === 0 || existing[0].values.length === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    db.run(`DELETE FROM script_categories WHERE id = ${id}`);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除分类失败' });
  }
});

// Create new script
app.post('/api/scripts', authenticateToken, (req, res) => {
  try {
    const { title, category, content, tags, nav_group } = req.body;
    
    if (!title?.trim() || !content?.trim() || !category?.trim()) {
      return res.status(400).json({ error: '标题、内容和分类不能为空' });
    }
    
    const safeTitle = title.trim();
    const safeCategory = category.trim();
    const safeContent = content.trim();
    const safeTags = tags || '';
    const safeNavGroup = nav_group || '';
    
    // Get user's nickname
    const userResult = db.exec(`SELECT nickname FROM users WHERE id = ${req.user.id}`);
    const publisherName = userResult.length > 0 && userResult[0].values.length > 0 && userResult[0].values[0][0] 
      ? userResult[0].values[0][0] 
      : req.user.username;
    
    const stmt = db.prepare('INSERT INTO scripts (title, category, content, tags, publisher_id, publisher_name, nav_group, views) VALUES (?, ?, ?, ?, ?, ?, ?, 0)');
    stmt.run([safeTitle, safeCategory, safeContent, safeTags, req.user.id, publisherName, safeNavGroup]);
    stmt.free();
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建话术失败' });
  }
});

app.get('/api/scripts', authenticateToken, (req, res) => {
  const { category, search } = req.query;
  let result;

  // Debug: check columns
  const pragmaResult = db.exec("PRAGMA table_info(scripts)");
  console.log('Scripts table columns:', pragmaResult[0]?.values?.map(row => row[1]));

  if (search) {
    const safeSearch = search.replace(/'/g, "''");
    result = db.exec(`
      SELECT id, title, category, content, tags, views, is_pinned, created_at, publisher_name 
      FROM scripts 
      WHERE (title LIKE '%${safeSearch}%' OR content LIKE '%${safeSearch}%' OR tags LIKE '%${safeSearch}%')
      ORDER BY is_pinned DESC, views DESC, created_at DESC
    `);
  } else if (category && category !== '全部') {
    const safeCategory = category.replace(/'/g, "''");
    result = db.exec(`SELECT id, title, category, content, tags, views, is_pinned, created_at, publisher_name FROM scripts WHERE category = '${safeCategory}' ORDER BY is_pinned DESC, views DESC, created_at DESC`);
  } else {
    result = db.exec('SELECT id, title, category, content, tags, views, is_pinned, created_at, publisher_name FROM scripts ORDER BY is_pinned DESC, views DESC, created_at DESC');
  }

  if (result.length === 0) {
    return res.json({ scripts: [] });
  }

  const columns = result[0].columns;
  console.log('Query result columns:', columns);
  console.log('Sample data:', result[0]?.values?.[0]);
  const scripts = result[0].values.map(row => {
    const script = {};
    row.forEach((val, i) => script[columns[i]] = val);
    return script;
  });

  res.json({ scripts });
});

app.get('/api/scripts/:id', authenticateToken, (req, res) => {
  const result = db.exec(`SELECT id, title, category, content, tags, views, is_pinned, created_at, publisher_name FROM scripts WHERE id = ${req.params.id}`);
  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(404).json({ error: '话术不存在' });
  }

  const columns = result[0].columns;
  const script = {};
  result[0].values[0].forEach((val, i) => script[columns[i]] = val);
  
  // Increment views
  db.run(`UPDATE scripts SET views = views + 1 WHERE id = ${req.params.id}`);
  script.views += 1;
  saveDB();
  
  res.json({ script });
});

// Update script
app.put('/api/scripts/:id', authenticateToken, (req, res) => {
  try {
    const { title, content, category, tags, nav_group } = req.body;
    const scriptId = req.params.id;
    
    // Get current script
    const scriptResult = db.exec(`SELECT * FROM scripts WHERE id = ${scriptId}`);
    if (scriptResult.length === 0 || scriptResult[0].values.length === 0) {
      return res.status(404).json({ error: '话术不存在' });
    }
    
    const columns = scriptResult[0].columns;
    const currentScript = {};
    scriptResult[0].values[0].forEach((val, i) => currentScript[columns[i]] = val);
    
    // Check permission: only publisher or admin can edit
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    const userRole = userResult.length > 0 ? userResult[0].values[0][0] : 'user';
    
    if (currentScript.publisher_id !== req.user.id && userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({ error: '无权限修改此话术' });
    }
    
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    
    const safeTitle = title.replace(/'/g, "''");
    const safeContent = content.replace(/'/g, "''");
    const safeCategory = (category || '').replace(/'/g, "''");
    const safeTags = (tags || '').replace(/'/g, "''");
    const safeNavGroup = (nav_group || '').replace(/'/g, "''");
    
    db.run(`UPDATE scripts SET title = '${safeTitle}', content = '${safeContent}', category = '${safeCategory}', tags = '${safeTags}', nav_group = '${safeNavGroup}' WHERE id = ${scriptId}`);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新失败' });
  }
});

// Delete script
app.delete('/api/scripts/:id', authenticateToken, (req, res) => {
  try {
    const scriptId = req.params.id;
    
    // Get current script
    const scriptResult = db.exec(`SELECT * FROM scripts WHERE id = ${scriptId}`);
    if (scriptResult.length === 0 || scriptResult[0].values.length === 0) {
      return res.status(404).json({ error: '话术不存在' });
    }
    
    const columns = scriptResult[0].columns;
    const currentScript = {};
    scriptResult[0].values[0].forEach((val, i) => currentScript[columns[i]] = val);
    
    // Check permission: only publisher or admin can delete
    const userResult = db.exec(`SELECT role FROM users WHERE id = ${req.user.id}`);
    const userRole = userResult.length > 0 ? userResult[0].values[0][0] : 'user';
    
    if (currentScript.publisher_id !== req.user.id && userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({ error: '无权限删除此话术' });
    }
    
    db.run(`DELETE FROM scripts WHERE id = ${scriptId}`);
    db.run(`DELETE FROM user_favorites WHERE script_id = ${scriptId}`);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

// Pin/Unpin script
app.put('/api/scripts/:id/pin', authenticateToken, (req, res) => {
  try {
    const { is_pinned } = req.body;
    const scriptId = req.params.id;
    
    // Check if is_pinned column exists
    const columns = db.exec("PRAGMA table_info(scripts)");
    const hasPinned = columns[0]?.values.some(row => row[1] === 'is_pinned');
    
    if (!hasPinned) {
      db.run("ALTER TABLE scripts ADD COLUMN is_pinned INTEGER DEFAULT 0");
    }
    
    db.run(`UPDATE scripts SET is_pinned = ${is_pinned ? 1 : 0} WHERE id = ${scriptId}`);
    saveDB();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '操作失败' });
  }
});

// ============ FAVORITES ROUTES ============

app.get('/api/favorites', authenticateToken, (req, res) => {
  const result = db.exec(`
    SELECT s.* FROM scripts s
    JOIN user_favorites uf ON s.id = uf.script_id
    WHERE uf.user_id = ${req.user.id}
    ORDER BY s.created_at DESC
  `);

  if (result.length === 0) {
    return res.json({ favorites: [] });
  }

  const columns = result[0].columns;
  const favorites = result[0].values.map(row => {
    const script = {};
    row.forEach((val, i) => script[columns[i]] = val);
    return script;
  });

  res.json({ favorites });
});

app.post('/api/favorites/:scriptId', authenticateToken, (req, res) => {
  const scriptId = req.params.scriptId;
  try {
    db.run('INSERT OR IGNORE INTO user_favorites (user_id, script_id) VALUES (?, ?)', [req.user.id, scriptId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '操作失败' });
  }
});

app.delete('/api/favorites/:scriptId', authenticateToken, (req, res) => {
  db.run(`DELETE FROM user_favorites WHERE user_id = ${req.user.id} AND script_id = ${req.params.scriptId}`);
  saveDB();
  res.json({ success: true });
});

app.get('/api/favorites/check/:scriptId', authenticateToken, (req, res) => {
  const result = db.exec(`SELECT 1 FROM user_favorites WHERE user_id = ${req.user.id} AND script_id = ${req.params.scriptId}`);
  res.json({ isFavorite: result.length > 0 && result[0].values.length > 0 });
});

// Serve static files in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🔥 话术平台服务器已启动: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
