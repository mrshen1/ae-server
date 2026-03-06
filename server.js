const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据文件
function initDataFile(filePath, defaultData = {}) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

initDataFile(RECORDS_FILE, { records: [] });
initDataFile(CONFIG_FILE, {
  noticeContent: `【卖家须知】

1. 请确保填写的账号信息真实有效，虚假信息将导致估价不准确。

2. 回收价格仅供参考，最终价格以实际验号为准。

3. 账号交易存在一定的风险，请谨慎操作。

4. 我们承诺保护您的个人信息安全，不会泄露给第三方。

5. 如有疑问，请联系客服咨询。`,
  insuranceOptions: [
    { value: '2', label: '2格', ratio: 40 },
    { value: '4', label: '4格', ratio: 38 },
    { value: '6', label: '6格', ratio: 35 },
    { value: '9', label: '9格', ratio: 34 },
  ],
  knifeSkinOptions: [
    { value: 'none', label: '无刀皮', hasSkin: false },
    { value: 'dark_star', label: '暗星', hasSkin: true },
    { value: 'dragon_fang', label: '龙牙', hasSkin: true },
    { value: 'creed', label: '信条', hasSkin: true },
    { value: 'chixiao', label: '赤霄', hasSkin: true },
    { value: 'mercy', label: '怜悯', hasSkin: true },
    { value: 'shadow_edge', label: '影锋', hasSkin: true },
    { value: 'black_sea', label: '黑海', hasSkin: true },
    { value: 'polaris', label: '北极星', hasSkin: true },
  ],
  operatorSkinOptions: [
    { value: 'none', label: '无红皮', hasSkin: false },
    { value: 'lingxiao', label: '凌霄戍卫', hasSkin: true },
    { value: 'gold_rose', label: '蚀金玫瑰', hasSkin: true },
    { value: 'ink_cloud', label: '水墨云图', hasSkin: true },
    { value: 'skyline', label: '天际线', hasSkin: true },
    { value: 'wisadel', label: '维什戴尔', hasSkin: true },
  ],
  bottomImages: [],
  // 手续费配置
  feeConfig: {
    enabled: false,  // 是否开启手续费
    rate: 0.9,       // 手续费后价格 = 原价 * rate
  }
});

// 中间件
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 读取记录
function readRecords() {
  try {
    const data = fs.readFileSync(RECORDS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { records: [] };
  }
}

// 保存记录
function saveRecords(data) {
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(data, null, 2));
}

// 读取配置
function readConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

// 保存配置
function saveConfig(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

// ========== 记录 API ==========

// 获取所有记录
app.get('/api/records', (req, res) => {
  const data = readRecords();
  res.json({ success: true, data: data.records });
});

// 添加记录
app.post('/api/records', (req, res) => {
  const { formData, ratio, price } = req.body;
  
  if (!formData || ratio === undefined || price === undefined) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }

  const data = readRecords();
  const newRecord = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    formData,
    ratio,
    price,
  };
  
  data.records.unshift(newRecord);
  
  // 只保留最近500条记录
  if (data.records.length > 500) {
    data.records = data.records.slice(0, 500);
  }
  
  saveRecords(data);
  res.json({ success: true, data: newRecord });
});

// 更新记录
app.put('/api/records/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { formData, ratio, price } = req.body;
  
  const data = readRecords();
  const index = data.records.findIndex(r => r.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  
  data.records[index] = {
    ...data.records[index],
    formData: formData || data.records[index].formData,
    ratio: ratio !== undefined ? ratio : data.records[index].ratio,
    price: price !== undefined ? price : data.records[index].price,
  };
  
  saveRecords(data);
  res.json({ success: true, data: data.records[index] });
});

// 删除记录
app.delete('/api/records/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = readRecords();
  
  data.records = data.records.filter(r => r.id !== id);
  saveRecords(data);
  
  res.json({ success: true, message: '记录已删除' });
});

// 清空记录
app.delete('/api/records', (req, res) => {
  saveRecords({ records: [] });
  res.json({ success: true, message: '所有记录已清空' });
});

// ========== 配置 API ==========

// 获取配置
app.get('/api/config', (req, res) => {
  const config = readConfig();
  res.json({ success: true, data: config });
});

// 更新配置
app.put('/api/config', (req, res) => {
  const newConfig = req.body;
  const currentConfig = readConfig();
  const mergedConfig = { ...currentConfig, ...newConfig };
  saveConfig(mergedConfig);
  res.json({ success: true, data: mergedConfig });
});

// 更新特定配置项
app.patch('/api/config/:key', (req, res) => {
  const key = req.params.key;
  const value = req.body;
  const config = readConfig();
  config[key] = value;
  saveConfig(config);
  res.json({ success: true, data: config });
});

// ========== 手续费配置 API ==========

// 获取手续费配置
app.get('/api/fee-config', (req, res) => {
  const config = readConfig();
  res.json({ 
    success: true, 
    data: config.feeConfig || { enabled: false, rate: 0.9 } 
  });
});

// 更新手续费配置
app.put('/api/fee-config', (req, res) => {
  const { enabled, rate } = req.body;
  const config = readConfig();
  config.feeConfig = { 
    enabled: enabled !== undefined ? enabled : config.feeConfig?.enabled,
    rate: rate !== undefined ? rate : (config.feeConfig?.rate || 0.9)
  };
  saveConfig(config);
  res.json({ success: true, data: config.feeConfig });
});

// ========== 图片上传 API ==========

// 上传图片（Base64）
app.post('/api/upload', (req, res) => {
  const { image } = req.body;
  
  if (!image) {
    return res.status(400).json({ success: false, message: '缺少图片数据' });
  }
  
  // 直接返回Base64图片（存储在配置中）
  res.json({ success: true, url: image });
});

// ========== 健康检查 ==========

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务器运行正常' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`================================`);
  console.log(`AE商行后端服务已启动`);
  console.log(`================================`);
  console.log(`服务器地址: http://localhost:${PORT}`);
  console.log(`API地址: http://localhost:${PORT}/api`);
  console.log(`数据目录: ${DATA_DIR}`);
  console.log(`================================`);
});

module.exports = app;
