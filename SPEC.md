# 话术平台 - 项目规格

## 技术栈
- **前端:** React + Vite + CSS动画
- **后端:** Node.js + Express + JWT认证
- **数据库:** SQLite (轻量级)
- **背景效果:** Canvas粒子动画 + 渐变流光

## 功能模块

### 1. 认证系统
- ✅ 注册页面（用户名、密码、确认密码）
- ✅ 登录页面
- ✅ JWT Token鉴权
- ✅ 登录状态持久化

### 2. 话术库（需登录）
- ✅ 话术分类展示
- ✅ 话术搜索
- ✅ 话术详情查看
- ✅ 我的话术（收藏/管理）

### 3. UI设计
- **登录/注册页:** 全屏粒子动画背景 + 毛玻璃卡片
- **话术库:** 左侧分类导航 + 右侧话术卡片网格
- **动效:** 渐变流光、悬浮发光、微交互

## 页面结构

```
/           → 登录页（未登录时重定向）
/register   → 注册页
/dashboard  → 话术库首页（需登录）
/scripts/:category → 分类话术
```

## 数据库设计

### users
| 字段 | 类型 |
|------|------|
| id | INTEGER PK |
| username | TEXT UNIQUE |
| password | TEXT (hashed) |
| created_at | DATETIME |

### scripts
| 字段 | 类型 |
|------|------|
| id | INTEGER PK |
| title | TEXT |
| category | TEXT |
| content | TEXT |
| tags | TEXT |
| created_at | DATETIME |
