// EXPORTS: fetchMileage, fetchFullMileage, IFleetReport, IVehicleMilestone
// 18GPS 里程抓取 API 封装（通过 Vite proxy 转发，绕过跨域）

export interface IFleetRecord {
  fullname: string;
  mil: number;
  chaoSuCounts?: number;
  stopCount?: number;
}

export interface IFleetReport {
  fleetName: string;
  records: IFleetRecord[];
  sumMil: number;
}

export interface IVehicleMilestone {
  vehicleName: string;
  todayMil: number;
  monthMil: number;
  yearMil: number;
  chaoSuCounts: number;
  stopCount: number;
  fetchedAt: string;
  fleetName: string;
}

const FLEETS = [
  { id: '3a5c75d4-1432-413d-835d-6c4f5d118586', name: '阿荣旗热力' },
  { id: 'ad4ebc6d-1ade-4d45-8f25-a1816544a22e', name: '莫旗热力' },
  { id: 'a015f8e0-804e-4619-a9bc-c8a961fcd6eb', name: '扎兰屯热力' },
];

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');
const PROXY = IS_LOCAL ? '/gps-api' : 'https://api.allorigins.win/raw?url=';
const BASE_TARGET = 'https://www.18gps.net';
const WORKER_API = 'https://gps-proxy.5030670.workers.dev';

// 构造请求URL：本地走Vite proxy，线上走公共CORS代理
function apiUrl(path: string): string {
  if (IS_LOCAL) {
    return `${PROXY}${path}`;
  }
  // 线上：通过CORS代理访问，需要编码完整URL
  return PROXY + encodeURIComponent(BASE_TARGET + path);
}

async function login(): Promise<{ mds: string; loginId: string }> {
  await fetch(apiUrl('/Skins/DefaultIndex/Default_cn.html?locale=cn&back=true'), {
    credentials: 'include',
  });

  const params = new URLSearchParams();
  params.set('userName', '13474947494');
  params.set('pwd', '123456');
  params.set('pwd_', '');
  params.set('loginType', 'ENTERPRISE');
  params.set('loginUrl', '/Skins/DefaultIndex/Default_cn.html');
  params.set('timeZone', '8');
  params.set('language', 'cn');

  const res = await fetch(apiUrl('/LoginByUser.aspx?method=loginSystem'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    credentials: 'include',
  });
  const text = await res.text();

  const hrefMatch = text.match(/href="([^"]+)"/);
  if (!hrefMatch) {
    throw new Error('登录失败：账号或密码错误');
  }
  const redirectUrl = hrefMatch[1];

  // redirectUrl可能是相对路径或完整URL
  const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : BASE_TARGET + redirectUrl;
  const encodedRedirectUrl = IS_LOCAL ? redirectUrl : encodeURIComponent(fullRedirectUrl);
  await fetch(IS_LOCAL ? PROXY + redirectUrl : PROXY + encodedRedirectUrl, { credentials: 'include' });

  const m = redirectUrl.match(/login_id=([^&]+)&mds=([^&]+)/);
  if (!m) {
    throw new Error('登录失败：无法获取会话');
  }

  return { loginId: m[1], mds: m[2] };
}

async function openReportFrame(loginId: string, mds: string, fleetId: string) {
  await fetch(
    apiUrl(`/Report/Frame.aspx?currentId=${loginId}&enterprise_id=${loginId}&mds=${mds}&viewMenu=reports&locale=cn`),
    { credentials: 'include' }
  );
  // 关键：report.aspx URL里必须带上enterprise_id，否则报表默认不选车队
  await fetch(
    apiUrl(`/Report/run/report.aspx?enterprise_id=${fleetId}&mds=${mds}&locale=cn&timezone=8&mapType=BAIDU`),
    { credentials: 'include' }
  );
}

function toTimestamp(dateStr: string, endOfDay = false): number {
  const d = new Date(dateStr + (endOfDay ? 'T23:59:59' : 'T00:00:00'));
  return d.getTime();
}

async function queryFleetReport(
  mds: string,
  fleetId: string,
  beginTime: number,
  endTime: number
): Promise<IFleetRecord[]> {
  const body = new URLSearchParams();
  body.set('beginTime', String(beginTime));
  body.set('endTime', String(endTime));
  body.set('enterprise_id', fleetId);
  body.set('channel', 'ENTERPRISE');
  body.set('radiobutton', '0');

  const res = await fetch(
    apiUrl(`/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      credentials: 'include',
    }
  );
  const data = await res.json();
  return data.records || [];
}

// 里程数据CDN地址（jsDelivr加速，国内访问快）
const MILEAGE_DATA_URL = 'https://cdn.jsdelivr.net/gh/ASLOFREE/vehicle-mileage@main/mileage-data.json';

// 抓取全部里程（当日+当月+当年）
export async function fetchFullMileage(): Promise<IVehicleMilestone[]> {
  // 从GitHub读取里程数据，加30秒超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const res = await fetch(MILEAGE_DATA_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || '同步失败');
    }
    return data.data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('同步超时，请检查网络后重试');
    }
    throw new Error(`同步失败: ${err.message}`);
  }
}

// 保留旧接口名兼容
export async function fetchMileage(): Promise<IFleetReport[]> {
  const data = await fetchFullMileage();
  const map = new Map<string, IFleetRecord[]>();
  data.forEach(d => {
    if (!map.has(d.fleetName)) map.set(d.fleetName, []);
    map.get(d.fleetName)!.push({
      fullname: d.vehicleName,
      mil: d.todayMil,
      chaoSuCounts: d.chaoSuCounts,
      stopCount: d.stopCount,
    });
  });
  return Array.from(map.entries()).map(([fleetName, records]) => ({
    fleetName,
    records,
    sumMil: records.reduce((s, r) => s + (r.mil || 0), 0),
  }));
}
