// Cloudflare Worker: 18GPS 里程数据代理（简化版，先测试）
const BASE_URL = 'https://www.18gps.net';

const FLEETS = [
  { id: '3a5c75d4-1432-413d-835d-6c4f5d118586', name: '阿荣旗热力' },
  { id: 'ad4ebc6d-1ade-4d45-8f25-a1816544a22e', name: '莫旗热力' },
  { id: 'a015f8e0-804e-4619-a9bc-c8a961fcd6eb', name: '扎兰屯热力' },
];

let cache = null;
let cacheTime = 0;

async function login18GPS() {
  const loginRes = await fetch(`${BASE_URL}/LoginByUser.aspx?method=loginSystem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

export default {
  async fetch(request) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };

    if (cache && Date.now() - cacheTime < 10 * 60 * 1000) {
      return new Response(JSON.stringify(cache), { headers });
    }

    try {
      const { loginId, mds } = await login18GPS();
      
      let allVehicles = [];
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

      for (const fleet of FLEETS) {
        await fetch(`${BASE_URL}/Report/Frame.aspx?currentId=${loginId}&enterprise_id=${loginId}&mds=${mds}&viewMenu=reports&locale=cn`);
        await fetch(`${BASE_URL}/Report/run/report.aspx?enterprise_id=${fleet.id}&mds=${mds}&locale=cn&timezone=8&mapType=BAIDU`);

        // 只查一次本年里程
        const res = await fetch(`${BASE_URL}/GetDataService.aspx?method=report&mds=${mds}&showZeroMil=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            beginTime: String(yearStart),
            endTime: String(todayEnd),
            enterprise_id: fleet.id,
            channel: 'ENTERPRISE',
            radiobutton: '0',
          }).toString(),
        });

        const data = await res.json();
        if (data.records) {
          for (const record of data.records) {
            allVehicles.push({
              vehicleName: record.fullname,
              fleetName: fleet.name,
              yearMil: record.mil || 0,
              chaoSuCounts: record.chaoSuCounts || 0,
              stopCount: record.stopCount || 0,
            });
          }
        }
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
