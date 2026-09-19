import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, Fuel, AlertTriangle, Wrench, BarChart3, LogIn, LogOut, User, Download, Upload, Menu, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getCurrentUser, login, logout, IUser } from '@/lib/auth';
import { toast } from 'sonner';

const navItems = [
  { path: '/', label: '总览看板', icon: LayoutDashboard },
  { path: '/vehicles', label: '车辆列表', icon: Car },
  { path: '/fuel', label: '加油记录', icon: Fuel },
  { path: '/violations', label: '违章记录', icon: AlertTriangle },
  { path: '/repair', label: '维修保养记录', icon: Wrench },
  { path: '/analytics', label: '数据分析', icon: BarChart3 },
];

const NS = 'vehicle-management';

export const Layout = () => {
  const location = useLocation();
  const [user, setUser] = useState<IUser | null>(() => getCurrentUser());
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为手机屏幕
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = login(username, password);
    if (u) {
      setUser(u);
      setLoginOpen(false);
      setUsername('');
      setPassword('');
      toast.success(`欢迎，${u.displayName}`);
    } else {
      toast.error('账号或密码错误');
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    toast.info('已退出登录');
  };

  const handleBackup = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NS)) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `车辆管理系统备份_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('备份文件已下载，请妥善保存');
  };

  // 更新数据：导出本地 + 打开飞书表格查看全部
  const handleSync = () => {
    // 第一步：导出本地数据
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NS)) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().slice(0, 5).replace(':', '');
    a.href = url;
    a.download = `车辆数据_${date}_${time}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // 第二步：打开飞书多维表格查看全部数据
    window.open('https://my.feishu.cn/base/N5IWbUozAa7HS7sKax9ckx9insb', '_blank');

    toast.success('已导出本地数据，飞书表格已打开，可查看全部三地数据');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith(NS)) {
            localStorage.setItem(key, value as string);
          }
        });
        toast.success('备份已恢复，刷新页面生效');
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error('备份文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <h1 className="text-base font-bold text-sidebar-foreground leading-tight">
          扎兰屯热电厂<br />车辆管理系统 V1.0
        </h1>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="space-y-2 pb-2 border-b border-sidebar-border/50">
          <p className="text-xs text-sidebar-foreground/60">数据同步</p>
          <Button variant="default" size="sm" onClick={handleSync} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />更新数据
          </Button>
        </div>
        <div className="space-y-2 pb-2 border-b border-sidebar-border/50">
          <p className="text-xs text-sidebar-foreground/60">数据备份</p>
          <Button variant="outline" size="sm" onClick={handleBackup} className="w-full">
            <Download className="w-4 h-4 mr-2" />导出备份
          </Button>
          <label className="w-full">
            <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
            <Button variant="outline" size="sm" className="w-full">
              <Upload className="w-4 h-4 mr-2" />恢复备份
            </Button>
          </label>
        </div>
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
              <User className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-medium">{user.displayName}</div>
                <div className="text-xs text-sidebar-foreground/60">{user.fleet}</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-sidebar-foreground/60">未登录，仅可查看</p>
            <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  登录录入
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>登录</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>账号</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入账号" required />
                  </div>
                  <div className="space-y-2">
                    <Label>密码</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" required />
                  </div>
                  <DialogFooter>
                    <Button type="submit">登录</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* 桌面/平板侧边栏：始终显示 */}
      {!isMobile && (
        <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
          {sidebarContent}
        </aside>
      )}

      {/* 手机端侧边栏：抽屉式 */}
      {isMobile && mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50 shadow-xl">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-2 top-2 p-1 rounded-md hover:bg-sidebar-accent/50 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* 手机端顶部栏 */}
        {isMobile && (
          <header className="sticky top-0 z-30 h-14 bg-background border-b flex items-center px-4 gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-md hover:bg-accent"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold">扎兰屯热电厂车辆管理系统</h1>
          </header>
        )}
        <div className="flex-1">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
};
