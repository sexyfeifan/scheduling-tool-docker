const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const VERSION_FILE = path.join(DATA_DIR, 'version.json');

// 默认备份目录（可通过环境变量配置）
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

// 备份功能访问密码（可通过环境变量配置，默认为 "admin123"）
const BACKUP_PASSWORD = process.env.BACKUP_PASSWORD || 'admin123';

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  
  // 确保数据文件存在
  try {
    await fs.access(SCHEDULES_FILE);
  } catch (error) {
    await fs.writeFile(SCHEDULES_FILE, JSON.stringify([]));
  }
  
  try {
    await fs.access(SETTINGS_FILE);
  } catch (error) {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify({
      commonLocations: [],
      commonDirectors: [],
      commonPhotographers: [],
      commonProductionFacilities: [],
      commonRdFacilities: [],
      commonOperationalFacilities: [],
      commonAudioFacilities: []
    }));
  }
}

// 读取数据文件
async function readDataFile(filePath) {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

// 写入数据文件
async function writeDataFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// 用于存储连接的客户端（实现实时同步）
let connectedClients = [];

// SSE端点用于实时更新
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  connectedClients.push(res);

  req.on('close', () => {
    connectedClients = connectedClients.filter(client => client !== res);
  });
});

// 向所有连接的客户端发送更新
function sendUpdateToClients(data) {
  connectedClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// 排期相关路由
// 获取排期数据
app.get('/api/schedules', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    // 确保数据目录存在
    await ensureDataDir();
    
    // 读取排期数据
    const schedules = await readDataFile(SCHEDULES_FILE);
    
    // 如果提供了日期范围，则添加日期过滤条件
    let filteredSchedules = schedules;
    if (startDate && endDate) {
      filteredSchedules = schedules.filter(schedule => 
        schedule.date >= startDate && schedule.date <= endDate
      );
    }
    
    // 将数据转换为前端期望的格式
    const scheduleData = {};
    filteredSchedules.forEach(schedule => {
      scheduleData[schedule.date] = schedule.projects;
    });

    res.json(scheduleData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 保存或更新排期数据
app.post('/api/schedules', async (req, res) => {
  const { date, projects } = req.body;

  try {
    // 确保数据目录存在
    await ensureDataDir();
    
    // 读取排期数据
    let schedules = await readDataFile(SCHEDULES_FILE);
    
    // 查找或创建排期记录
    const scheduleIndex = schedules.findIndex(schedule => schedule.date === date);

    if (scheduleIndex !== -1) {
      // 更新现有记录
      schedules[scheduleIndex].projects = projects;
    } else {
      // 创建新记录
      schedules.push({
        id: Date.now().toString(),
        date,
        projects
      });
    }
    
    await writeDataFile(SCHEDULES_FILE, schedules);
    
    // 通知所有客户端更新
    sendUpdateToClients({ type: 'scheduleUpdate', date, projects });

    res.json({ message: '保存成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除指定日期的排期数据
app.delete('/api/schedules/:date', async (req, res) => {
  const { date } = req.params;

  try {
    // 确保数据目录存在
    await ensureDataDir();
    
    // 读取排期数据
    let schedules = await readDataFile(SCHEDULES_FILE);
    
    // 查找并删除排期记录
    const scheduleIndex = schedules.findIndex(schedule => schedule.date === date);

    if (scheduleIndex !== -1) {
      schedules.splice(scheduleIndex, 1);
      await writeDataFile(SCHEDULES_FILE, schedules);
      
      // 通知所有客户端更新
      sendUpdateToClients({ type: 'scheduleDelete', date });
      
      res.json({ message: '删除成功' });
    } else {
      res.status(404).json({ message: '未找到指定日期的排期数据' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 设置相关路由
// 获取设置
app.get('/api/settings', async (req, res) => {
  try {
    // 确保数据目录存在
    await ensureDataDir();
    
    // 读取设置数据
    const settings = await readDataFile(SETTINGS_FILE);

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 保存设置
app.post('/api/settings', async (req, res) => {
  const { commonLocations, commonDirectors, commonPhotographers, commonProductionFacilities, commonRdFacilities, commonOperationalFacilities, commonAudioFacilities } = req.body;

  try {
    // 确保数据目录存在
    await ensureDataDir();
    
    // 创建设置对象
    const settings = {
      commonLocations,
      commonDirectors,
      commonPhotographers,
      commonProductionFacilities,
      commonRdFacilities,
      commonOperationalFacilities,
      commonAudioFacilities
    };
    
    await writeDataFile(SETTINGS_FILE, settings);
    
    // 通知所有客户端更新
    sendUpdateToClients({ type: 'settingsUpdate', settings });

    res.json({ message: '设置已保存' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取版本信息
app.get('/api/version', async (req, res) => {
  try {
    let versionData = {
      version: '2.10',
      createDate: '2026-02-14',
      buildDate: new Date().toISOString().split('T')[0]
    };
    
    try {
      const data = await fs.readFile(VERSION_FILE, 'utf8');
      versionData = JSON.parse(data);
      // 如果 buildDate 为空，设置为当前日期
      if (!versionData.buildDate) {
        versionData.buildDate = new Date().toISOString().split('T')[0];
        await fs.writeFile(VERSION_FILE, JSON.stringify(versionData, null, 2));
      }
    } catch (e) {
      // 如果版本文件不存在，创建它
      await fs.writeFile(VERSION_FILE, JSON.stringify(versionData, null, 2));
    }
    
    res.json(versionData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 备份相关路由
// 创建备份
app.post('/api/backup', async (req, res) => {
  try {
    // 确保数据目录存在
    await ensureDataDir();
    
    // 创建备份目录
    const backupDate = new Date().toISOString().split('T')[0];
    const backupSubDir = path.join(BACKUP_DIR, `backup_${backupDate}`);
    await fs.mkdir(backupSubDir, { recursive: true });
    
    // 读取所有数据
    const schedules = await readDataFile(SCHEDULES_FILE);
    const settings = await readDataFile(SETTINGS_FILE);
    
    // 创建备份数据
    const backupData = {
      settings: settings,
      schedules: schedules,
      backupDate: new Date().toISOString(),
      version: '2.14'
    };
    
    // 保存备份文件
    const backupFile = path.join(backupSubDir, 'backup.json');
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    
    // 获取备份列表
    const backupFiles = await fs.readdir(BACKUP_DIR);
    const backups = await Promise.all(
      backupFiles
        .filter(f => f.startsWith('backup_'))
        .sort()
        .reverse()
        .map(async (f) => {
          const stats = await fs.stat(path.join(BACKUP_DIR, f));
          return {
            name: f,
            date: stats.mtime.toISOString().split('T')[0],
            path: `/backups/${f}/backup.json`
          };
        })
    );
    
    res.json({ 
      message: '备份成功', 
      backupPath: backupSubDir,
      backups: backups.slice(0, 10) // 返回最近10个备份
    });
  } catch (error) {
    console.error('备份失败:', error);
    res.status(500).json({ message: '备份失败: ' + error.message });
  }
});

// 验证备份密码
app.post('/api/verify-password', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ valid: false, message: '请输入密码' });
  }
  
  // 验证密码
  if (password === BACKUP_PASSWORD) {
    res.json({ valid: true });
  } else {
    res.json({ valid: false });
  }
});

// 获取备份列表
app.get('/api/backups', async (req, res) => {
  try {
    // 确保备份目录存在
    try {
      await fs.access(BACKUP_DIR);
    } catch (e) {
      return res.json([]);
    }
    
    // 获取备份列表
    const backupFiles = await fs.readdir(BACKUP_DIR);
    const backups = await Promise.all(
      backupFiles
        .filter(f => f.startsWith('backup_'))
        .sort()
        .reverse()
        .map(async (f) => {
          const stats = await fs.stat(path.join(BACKUP_DIR, f));
          return {
            name: f,
            date: stats.mtime.toISOString().split('T')[0],
            time: stats.mtime.toISOString(),
            path: `/backups/${f}/backup.json`
          };
        })
    );
    
    res.json(backups);
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({ message: '获取备份列表失败' });
  }
});

// 恢复备份
app.post('/api/restore', async (req, res) => {
  const { backupPath } = req.body;
  
  if (!backupPath) {
    return res.status(400).json({ message: '请选择要恢复的备份' });
  }

  try {
    // 解析备份文件路径
    const backupFile = path.join(__dirname, '..', backupPath);
    
    // 读取备份文件
    const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));
    
    // 恢复设置
    if (backupData.settings) {
      await writeDataFile(SETTINGS_FILE, backupData.settings);
    }
    
    // 恢复排期数据
    if (backupData.schedules) {
      await writeDataFile(SCHEDULES_FILE, backupData.schedules);
    }
    
    // 通知所有客户端更新
    sendUpdateToClients({ type: 'scheduleUpdate', date: '', projects: {} });
    sendUpdateToClients({ type: 'settingsUpdate', settings: backupData.settings || {} });

    res.json({ message: '恢复成功' });
  } catch (error) {
    console.error('恢复失败:', error);
    res.status(500).json({ message: '恢复失败: ' + error.message });
  }
});

// 提供备份文件下载
app.get('/backups/:filename/:file', async (req, res) => {
  const { filename, file } = req.params;
  const filePath = path.join(BACKUP_DIR, filename, file);
  
  try {
    const data = await fs.readFile(filePath);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup.json`);
    res.send(data);
  } catch (error) {
    res.status(404).json({ message: '文件不存在' });
  }
});

// 静态文件服务（用于提供前端文件）
app.use(express.static('../client'));

// 根路径返回前端首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 预览页面路由
app.get('/canbox', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/preview.html'));
});

const PORT = process.env.PORT || 3000;

// 初始化数据目录并启动服务器
ensureDataDir().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });
}).catch(error => {
  console.error('初始化数据目录失败:', error);
});