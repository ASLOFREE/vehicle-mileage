// Cloudflare Worker: 18GPS 里程数据代理（优化版）
const BASE_URL = 'https://www.18gps.net';

const FLEETS = [
  { id: '3a5c75d4-1432-413d-835d-6c4f5d118586', name: '阿荣旗热力' },
  { id: 'ad4ebc6d-1ade-4d45-8f25-a1816544a22e', name: '莫旗热力' },
  { id: 'a015f8e0-804e-4619-a9bc-c8a961fcd6eb', name: '扎兰屯热力' },
];

// 缓存：5分钟内直接返回，不重复查询
let cache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

async function login18GPS() {
  const loginRes = await fetch(`${BASE_URL}/LoginByUser.aspx?method=loginSystem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
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
  const match = html.match(/window\.location\.href="([^"]+)"/);
  if (!match) throw new Error('登录失败');
  
  const redirectPath = match[1];
  const redirectUrl = redirectPath.startsWith('http') ? redirectPath : `${BASE_URL}${redirectPath}`;
  await fetch(redirectUrl);
  
  const urlObj = new URL(redirectUrl);
  return {
    loginId: urlObj.searchParams.get('login_id') || '',
    mds: urlObj.searchParams.get('mds') || ''
  };
}

async function queryFleet(loginId, mds, fleet) {
  await fetch(`${BASE_URL}/Report/Frame.aspx?currentId=${loginId}&enterprise_id=${loginId}&mds=${mds}&viewMenu=reports&locale=cn`);
  await fetch(`${BASE_URL}/Report/run/report.aspx?enterprise_id=${fleet.id}&mds=${mds}&locale=cn&timezone=8&mapType=BAIDU`);

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const vehicleMap = new Map();

  // 查询本年1月至今（一次性查询，如果返回0再按月累加）
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const yearRes = await fetch(`${BASE_URL}/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      beginTime: String(yearStart),
      endTime: String(todayEnd.getTime()),
      enterprise_id: fleet.id,
      channel: 'ENTERPRISE',
      radiobutton: '0',
    }).toString(),
  });
  const yearData = await yearRes.json();
  
  let hasYearData = yearData.records && yearData.records.length > 0 && 
    yearData.records.some(r => r.mil > 0);

  if (hasYearData) {
    // 直接用本年数据
    for (const record of yearData.records) {
      vehicleMap.set(record.fullname, {
        vehicleName: record.fullname,
        fleetName: fleet.name,
        todayMil: 0,
        monthMil: 0,
        yearMil: record.mil || 0,
        chaoSuCounts: record.chaoSuCounts || 0,
        stopCount: record.stopCount || 0,
      });
    }
  } else {
    // 按月累加
    for (let m = 0; m <= now.getMonth(); m++) {
      const monthStart = new Date(now.getFullYear(), m, 1).getTime();
      const monthEnd = m === now.getMonth() ? todayEnd.getTime() : new Date(now.getFullYear(), m + 1, 0, 23, 59, 59).getTime();
      
      const res = await fetch(`${BASE_URL}/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          beginTime: String(monthStart),
          endTime: String(monthEnd),
          enterprise_id: fleet.id,
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
              fleetName: fleet.name,
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
    }
  }

  // 今日里程
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayRes = await fetch(`${BASE_URL}/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      beginTime: String(todayStart),
      endTime: String(todayEnd.getTime()),
      enterprise_id: fleet.id,
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthRes = await fetch(`${BASE_URL}/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      beginTime: String(monthStart),
      endTime: String(todayEnd.getTime()),
      enterprise_id: fleet.id,
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

    // 检查缓存
    if (cache && Date.now() - cacheTime < CACHE_DURATION) {
      return new Response(JSON.stringify(cache), { headers });
    }

    try {
      const { loginId, mds } = await login18GPS();
      let allVehicles = [];
      for (const fleet of FLEETS) {
        const fleetVehicles = await queryFleet(loginId, mds, fleet);
        allVehicles = allVehicles.concat(fleetVehicles);
      }
      
      cache = {
        success: true,
        data: allVehicles,
        fetchedAt: new Date().toISOString(),
      };
      cacheTime = Date.now();

      return new Response(JSON.stringify(cache), { headers });
    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: String(err),
      }), { headers, status: 500 });
    }
  },
};
