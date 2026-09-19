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
      const BASE_URL = 'https://www.18gps.net';
      
      // 1. 登录
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
        redirect: 'manual',
      });

      const location = loginRes.headers.get('location');
      if (!location) {
        return new Response(JSON.stringify({
          success: false,
          error: '登录失败：未获取到跳转地址',
          status: loginRes.status
        }), { headers });
      }

      // 2. 跟随跳转
      const fullUrl = location.startsWith('http') ? location : `${BASE_URL}${location}`;
      const redirectRes = await fetch(fullUrl);
      const html = await redirectRes.text();

      const urlObj = new URL(fullUrl);
      const loginId = urlObj.searchParams.get('login_id') || '';
      const mds = urlObj.searchParams.get('mds') || '';

      if (!loginId || !mds) {
        return new Response(JSON.stringify({
          success: false,
          error: '登录失败：未获取到session',
          url: fullUrl
        }), { headers });
      }

      return new Response(JSON.stringify({
        success: true,
        message: '登录成功',
        loginId: loginId,
        mds: mds
      }), { headers });

    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: String(err),
        stack: err.stack
      }), { headers, status: 500 });
    }
  },
};
