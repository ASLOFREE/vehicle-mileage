import requests

BASE_URL = 'https://www.18gps.net'

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# 登录
login_url = f'{BASE_URL}/LoginByUser.aspx?method=loginSystem'
data = {
    'userName': '13474947494',
    'pwd': '123456',
    'pwd_': '123456',
    'loginType': 'ENTERPRISE',
    'loginUrl': '',
    'timeZone': '8',
    'language': 'cn',
}
res = session.post(login_url, data=data, allow_redirects=False)
import re
match = re.search(r'window\.location\.href="([^"]+)"', res.text)
redirect_path = match.group(1)
redirect_url = redirect_path if redirect_path.startswith('http') else BASE_URL + redirect_path
session.get(redirect_url)

from urllib.parse import urlparse, parse_qs
parsed = urlparse(redirect_url)
params = parse_qs(parsed.query)
login_id = params.get('login_id', [''])[0]
mds = params.get('mds', [''])[0]

# 访问报表
fleet_id = '3a5c75d4-1432-413d-835d-6c4f5d118586'
session.get(f'{BASE_URL}/Report/Frame.aspx?currentId={login_id}&enterprise_id={login_id}&mds={mds}&viewMenu=reports&locale=cn')
session.get(f'{BASE_URL}/Report/run/report.aspx?enterprise_id={fleet_id}&mds={mds}&locale=cn&timezone=8&mapType=BAIDU')

# 查询数据
from datetime import datetime, timedelta
now = datetime.now()
today_end = now.replace(hour=23, minute=59, second=59)
data = {
    'beginTime': str(int(now.replace(day=1, hour=0, minute=0, second=0).timestamp() * 1000)),
    'endTime': str(int(today_end.timestamp() * 1000)),
    'enterprise_id': fleet_id,
    'channel': 'ENTERPRISE',
    'radiobutton': '0',
}
res = session.post(f'{BASE_URL}/GetDataService.aspx?method=report&mds={mds}&showZeroMil=true', data=data)

print(f'Content-Type: {res.headers.get("Content-Type")}')
print(f'apparent_encoding: {res.apparent_encoding}')
print(f'encoding: {res.encoding}')
print()

# 试不同编码
for enc in ['utf-8', 'gbk', 'gb2312', 'latin1']:
    try:
        text = res.content.decode(enc)
        print(f'{enc}: {text[:200]}')
        print()
    except:
        print(f'{enc}: 解码失败')
