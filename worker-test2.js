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
      
      const loginRes = await fetch(`${BASE_URL}/LoginByUser.aspx?method=loginSystem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.18gps.net/Skins/DefaultIndex/Default_cn.html',
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
      const setCookie = loginRes.headers.get('set-cookie');
      const body = await loginRes.text();

      return new Response(JSON.stringify({
        success: false,
        status: loginRes.status,
        location: location,
        setCookie: setCookie,
        bodyLength: body.length,
        bodyPreview: body.substring(0, 500),
        headers: Object.fromEntries(loginRes.headers.entries())
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
