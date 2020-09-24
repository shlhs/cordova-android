var gTheme = 'light'; // 主题色 light/dark

var loginExpireCheckEnable = false;       // 是否检查鉴权过期
var defaultPlatIpAddr = "http://139.196.243.82"; // 平台默认ip，格式为：http://118.190.51.135
var defaultImgThumbHost = "";     // 如果为空则与 host一样
var defaultIpcHost = null; // 摄像头服务地址。为空则与host一样
var gQrDownloadUrl = '/version/qr.png'; // 二维码下载链接
var gShowEnergyPage = false;     // 是否显示能效页面，不显示能效页面时运维人员会看到抢单页面
var gIsEnergyPlatform = false; // 是否是能源管理平台，是的话部分菜单默认不显示
var gEnableDeviceMap = true; // 是否显示设备档案地图
var LANGUAGE = 'zh-CN'; //如果需要根据手机系统来自动切换的话，使用：getStorageItem('LANGUAGE') || "zh-CN";
var gIsEnglish = LANGUAGE === 'en-US';
var gShowRecheck = true; // 是否显示复测内容
var appName = ''; // 应用名称

