// Cloudflare Worker: 18GPS 里程数据代理
const BASE_URL = 'https://www.18gps.net';

const FLEETS = [
  { id: '3a5c75d4-1432-413d-835d-6c4f5d118586', name: '阿荣旗热力' },
  { id: 'ad4ebc6d-1ade-4d45-8f25-a1816544a22e', name: '莫旗热力' },
  { id: 'a015f8e0-804e-4619-a9bc-c8a961fcd6eb', name: '扎兰屯热力' },
];

async function login18GPS() {
  const loginRes = await fetch(`${BASE_URL}/LoginByUser.aspx?method=loginSystem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: new URLSearchParams({
      userName: '13474947494',
      pwd: '123456',
      pwd_: '123456',
      loginType: 'ENTERPRISE',
      loginUrl: '',
      timeZone: '8',
      language: 'cn',
    }).toString(),
  });

  const html = await loginRes.text();
  
  // 从JS跳转代码里提取URL
  const match = html.match(/window\.location\.href="([^"]+)"/);
  if (!match) throw new Error('登录失败：未找到跳转地址');
  
  const redirectPath = match[1];
  const redirectUrl = redirectPath.startsWith('http') ? redirectPath : `${BASE_URL}${redirectPath}`;
  
  // 跟随跳转
  await fetch(redirectUrl);
  
  // 解析login_id和mds
  const urlObj = new URL(redirectUrl);
  const loginId = urlObj.searchParams.get('login_id') || '';
  const mds = urlObj.searchParams.get('mds') || '';
  
  if (!loginId || !mds) throw new Error('登录失败：未获取到session');
  
  return { loginId, mds };
}

async function queryFleetMileage(loginId, mds, fleetId, fleetName) {
  await fetch(`${BASE_URL}/Report/Frame.aspx?currentId=${loginId}&enterprise_id=${loginId}&mds=${mds}&viewMenu=reports&locale=cn`);
  await fetch(`${BASE_URL}/Report/run/report.aspx?enterprise_id=${fleetId}&mds=${mds}&locale=cn&timezone=8&mapType=BAIDU`);

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = now;

  const vehicleMap = new Map();
  let current = new Date(yearStart);
  
  while (current <= yearEnd) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
    const end = monthEnd > yearEnd ? yearEnd : monthEnd;

    const res = await fetch(`${BASE_URL}/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        beginTime: String(monthStart.getTime()),
        endTime: String(end.getTime()),
        enterprise_id: fleetId,
        channel: 'ENTERPRISE',
        radiobutton: '0',
      }).toString(),
    });

    const data = await res.json();
    if (data.records) {
      for (const record of data.records) {
        if (!vehicleMap.has(record.fullname)) {
          vehicleMap.set(record.fullname, {
            vehicleName: record.fullname,
            fleetName: fleetName,
            todayMil: 0,
            monthMil: 0,
            yearMil: 0,
            chaoSuCounts: record.chaoSuCounts || 0,
            stopCount: record.stopCount || 0,
          });
        }
        vehicleMap.get(record.fullname).yearMil += record.mil || 0;
      }
    }
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  // 今日里程
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const todayRes = await fetch(`${BASE_URL}/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      beginTime: String(todayStart.getTime()),
      endTime: String(todayEnd.getTime()),
      enterprise_id: fleetId,
      channel: 'ENTERPRISE',
      radiobutton: '0',
    }).toString(),
  });
  const todayData = await todayRes.json();
  if (todayData.records) {
    for (const record of todayData.records) {
      const v = vehicleMap.get(record.fullname);
      if (v) v.todayMil = record.mil || 0;
    }
  }

  // 本月里程
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRes = await fetch(`${BASE_URL}/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      beginTime: String(monthStartDate.getTime()),
      endTime: String(todayEnd.getTime()),
      enterprise_id: fleetId,
      channel: 'ENTERPRISE',
      radiobutton: '0',
    }).toString(),
  });
  const monthData = await monthRes.json();
  if (monthData.records) {
    for (const record of monthData.records) {
      const v = vehicleMap.get(record.fullname);
      if (v) v.monthMil = record.mil || 0;
    }
  }

  return Array.from(vehicleMap.values());
}

export default {
  async fetch(request) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      const { loginId, mds } = await login18GPS();
      let allVehicles = [];
      for (const fleet of FLEETS) {
        const fleetVehicles = await queryFleetMileage(loginId, mds, fleet.id, fleet.name);
        allVehicles = allVehicles.concat(fleetVehicles);
      }
      return new Response(JSON.stringify({
        success: true,
        data: allVehicles,
        fetchedAt: new Date().toISOString(),
      }), { headers });
    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: String(err),
      }), { headers, status: 500 });
    }
  },
};
