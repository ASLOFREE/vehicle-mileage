#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
18GPS 里程数据抓取脚本
用于 GitHub Actions 定时运行，抓取里程数据并保存为 JSON
"""
import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = 'https://www.18gps.net'

FLEETS = [
    {'id': '3a5c75d4-1432-413d-835d-6c4f5d118586', 'name': '阿荣旗热力'},
    {'id': 'ad4ebc6d-1ade-4d45-8f25-a1816544a22e', 'name': '莫旗热力'},
    {'id': 'a015f8e0-804e-4619-a9bc-c8a961fcd6eb', 'name': '扎兰屯热力'},
]

USERNAME = '13474947494'
PASSWORD = '123456'


def login(session):
    """登录18GPS，获取login_id和mds"""
    login_url = f'{BASE_URL}/LoginByUser.aspx?method=loginSystem'
    data = {
        'userName': USERNAME,
        'pwd': PASSWORD,
        'pwd_': PASSWORD,
        'loginType': 'ENTERPRISE',
        'loginUrl': '',
        'timeZone': '8',
        'language': 'cn',
    }
    res = session.post(login_url, data=data, allow_redirects=False)
    html = res.text
    
    # 从JS跳转中提取URL
    import re
    match = re.search(r'window\.location\.href="([^"]+)"', html)
    if not match:
        raise Exception('登录失败：未找到跳转地址')
    
    redirect_path = match.group(1)
    redirect_url = redirect_path if redirect_path.startswith('http') else BASE_URL + redirect_path
    
    # 跟随跳转
    session.get(redirect_url)
    
    # 解析参数
    from urllib.parse import urlparse, parse_qs
    parsed = urlparse(redirect_url)
    params = parse_qs(parsed.query)
    
    login_id = params.get('login_id', [''])[0]
    mds = params.get('mds', [''])[0]
    
    if not login_id or not mds:
        raise Exception('登录失败：未获取到session')
    
    return login_id, mds


def query_fleet(session, login_id, mds, fleet):
    """查询单个车队的里程数据"""
    # 访问报表Frame
    session.get(f'{BASE_URL}/Report/Frame.aspx?currentId={login_id}&enterprise_id={login_id}&mds={mds}&viewMenu=reports&locale=cn')
    
    # 打开车队报表
    session.get(f'{BASE_URL}/Report/run/report.aspx?enterprise_id={fleet["id"]}&mds={mds}&locale=cn&timezone=8&mapType=BAIDU')
    
    now = datetime.now()
    year_start = datetime(now.year, 1, 1)
    today_end = now.replace(hour=23, minute=59, second=59)
    
    # 查询本年里程（按月累加）
    year_map = {}
    current = year_start
    while current <= now:
        month_start = current.replace(day=1, hour=0, minute=0, second=0)
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        month_end = next_month - timedelta(seconds=1)
        end = min(month_end, today_end)
        
        data = {
            'beginTime': str(int(month_start.timestamp() * 1000)),
            'endTime': str(int(end.timestamp() * 1000)),
            'enterprise_id': fleet['id'],
            'channel': 'ENTERPRISE',
            'radiobutton': '0',
        }
        res = session.post(f'{BASE_URL}/GetDataService.aspx?method=report&mds={mds}&showZeroMil=true', data=data)
        result = res.json()
        
        if 'records' in result:
            for record in result['records']:
                name = record['fullname']
                if name not in year_map:
                    year_map[name] = {
                        'vehicleName': name,
                        'fleetName': fleet['name'],
                        'yearMil': 0,
                        'chaoSuCounts': record.get('chaoSuCounts', 0),
                        'stopCount': record.get('stopCount', 0),
                    }
                year_map[name]['yearMil'] += record.get('mil', 0)
        
        current = next_month
    
    # 查询今日里程
    today_start = now.replace(hour=0, minute=0, second=0)
    data = {
        'beginTime': str(int(today_start.timestamp() * 1000)),
        'endTime': str(int(today_end.timestamp() * 1000)),
        'enterprise_id': fleet['id'],
        'channel': 'ENTERPRISE',
        'radiobutton': '0',
    }
    res = session.post(f'{BASE_URL}/GetDataService.aspx?method=report&mds={mds}&showZeroMil=true', data=data)
    result = res.json()
    if 'records' in result:
        for record in result['records']:
            name = record['fullname']
            if name in year_map:
                year_map[name]['todayMil'] = record.get('mil', 0)
    
    # 查询本月里程
    month_start = now.replace(day=1, hour=0, minute=0, second=0)
    data = {
        'beginTime': str(int(month_start.timestamp() * 1000)),
        'endTime': str(int(today_end.timestamp() * 1000)),
        'enterprise_id': fleet['id'],
        'channel': 'ENTERPRISE',
        'radiobutton': '0',
    }
    res = session.post(f'{BASE_URL}/GetDataService.aspx?method=report&mds={mds}&showZeroMil=true', data=data)
    result = res.json()
    if 'records' in result:
        for record in result['records']:
            name = record['fullname']
            if name in year_map:
                year_map[name]['monthMil'] = record.get('mil', 0)
    
    return list(year_map.values())


def main():
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    })
    
    print('登录18GPS...')
    login_id, mds = login(session)
    print('登录成功')
    
    all_vehicles = []
    for fleet in FLEETS:
        print(f'查询 {fleet["name"]}...')
        vehicles = query_fleet(session, login_id, mds, fleet)
        all_vehicles.extend(vehicles)
        print(f'  获取 {len(vehicles)} 辆车')
    
    output = {
        'success': True,
        'data': all_vehicles,
        'fetchedAt': datetime.now().isoformat(),
    }
    
    # 保存到文件
    with open('mileage-data.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f'共获取 {len(all_vehicles)} 辆车数据，已保存到 mileage-data.json')


if __name__ == '__main__':
    main()
