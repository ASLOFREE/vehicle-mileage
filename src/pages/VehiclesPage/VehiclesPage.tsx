import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Camera, Calendar, Edit2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { VEHICLES_MOCK, IMileageData, IVehicle, store } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import { fetchFullMileage } from '@/api/gpsApi';
import { toast } from 'sonner';

export default function VehiclesPage() {
  const [search, setSearch] = useState('');
  const [fleetFilter, setFleetFilter] = useState('全部');
  const [mileageList, setMileageList] = useState<IMileageData[]>(() => {
    const raw = store.get<any[]>('mileage-data', []);
    return raw.map((item: any) => ({
      ...item,
      todayMil: item.todayMil ?? item.mil ?? 0,
      monthMil: item.monthMil ?? 0,
      yearMil: item.yearMil ?? 0,
    }));
  });
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>(() => {
    const saved = store.get<IMileageData[]>('mileage-data', []);
    return saved.length > 0 ? new Date(saved[0].fetchedAt).toLocaleString() : '';
  });

  // 车辆扩展信息（照片、年检、保险）
  const [vehicleExts, setVehicleExts] = useState<Record<string, { photo?: string; inspectionDate?: string; insuranceDate?: string }>>(() => {
    return store.get('vehicle-exts', {});
  });
  const [editingVehicle, setEditingVehicle] = useState<IVehicle | null>(null);
  const [editPhoto, setEditPhoto] = useState('');
  const [editInspectionDate, setEditInspectionDate] = useState('');
  const [editInsuranceDate, setEditInsuranceDate] = useState('');
  const [currentUser] = useState(() => getCurrentUser());

  const fleets = ['全部', ...new Set(VEHICLES_MOCK.map(v => v.fleet))];

  const filtered = VEHICLES_MOCK.filter(v => {
    const matchSearch = v.name.includes(search) || v.plate.includes(search);
    const matchFleet = fleetFilter === '全部' || v.fleet === fleetFilter;
    return matchSearch && matchFleet;
  });

  const mileageMap = new Map(mileageList.map(m => [m.vehicleName, m]));

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await fetchFullMileage();
      setMileageList(data);
      store.set('mileage-data', data);
      setLastSync(new Date().toLocaleString());
      toast.success(`成功同步 ${data.length} 辆车的里程数据`);
    } catch (err) {
      toast.error(`同步失败: ${String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  // 自动同步：每天早上8点后首次打开页面时自动拉取里程
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;

    const now = new Date();
    const today8am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);

    const saved = store.get<IMileageData[]>('mileage-data', []);
    let lastSyncTime: Date | null = null;
    if (saved.length > 0 && saved[0].fetchedAt) {
      lastSyncTime = new Date(saved[0].fetchedAt);
    }

    if (now >= today8am && (!lastSyncTime || lastSyncTime < today8am)) {
      handleSync();
    }
  }, []);

  // 按车队汇总
  const fleetSummary = ['阿荣旗热力', '莫旗热力', '扎兰屯热力'].map(fleet => {
    const list = mileageList.filter(m => m.fleetName === fleet);
    return {
      name: fleet,
      today: list.reduce((s, m) => s + m.todayMil, 0),
      month: list.reduce((s, m) => s + m.monthMil, 0),
      year: list.reduce((s, m) => s + m.yearMil, 0),
      count: list.length,
    };
  });

  // 获取年检状态
  const getInspectionStatus = (dateStr?: string) => {
    if (!dateStr) return { label: '未设置', color: 'bg-gray-100 text-gray-600' };
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { label: `已过期 ${Math.abs(daysLeft)} 天`, color: 'bg-red-100 text-red-700' };
    } else if (daysLeft <= 30) {
      return { label: `${daysLeft} 天后到期`, color: 'bg-orange-100 text-orange-700' };
    } else if (daysLeft <= 90) {
      return { label: `${daysLeft} 天后到期`, color: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { label: `${daysLeft} 天后到期`, color: 'bg-green-100 text-green-700' };
    }
  };

  // 获取保险状态
  const getInsuranceStatus = (dateStr?: string) => {
    if (!dateStr) return { label: '未设置', color: 'bg-gray-100 text-gray-600' };
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { label: `已过期 ${Math.abs(daysLeft)} 天`, color: 'bg-red-100 text-red-700' };
    } else if (daysLeft <= 30) {
      return { label: `${daysLeft} 天后到期`, color: 'bg-orange-100 text-orange-700' };
    } else if (daysLeft <= 90) {
      return { label: `${daysLeft} 天后到期`, color: 'bg-yellow-100 text-yellow-700' };
    } else {
      return { label: `${daysLeft} 天后到期`, color: 'bg-green-100 text-green-700' };
    }
  };

  // 打开编辑弹窗
  const openEditDialog = (v: IVehicle) => {
    setEditingVehicle(v);
    setEditPhoto(vehicleExts[v.id]?.photo || '');
    setEditInspectionDate(vehicleExts[v.id]?.inspectionDate || '');
    setEditInsuranceDate(vehicleExts[v.id]?.insuranceDate || '');
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingVehicle) return;
    const newExts = { ...vehicleExts, [editingVehicle.id]: { photo: editPhoto, inspectionDate: editInspectionDate, insuranceDate: editInsuranceDate } };
    setVehicleExts(newExts);
    store.set('vehicle-exts', newExts);
    toast.success('车辆信息已保存');
    setEditingVehicle(null);
  };

  // 上传照片
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">车辆列表</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">共 {VEHICLES_MOCK.length} 辆车，3个车队</p>
          {lastSync && (
            <p className="text-xs text-muted-foreground mt-1">最近同步: {lastSync}</p>
          )}
        </div>
        <Button onClick={handleSync} disabled={syncing} className="w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? '正在同步...' : '同步行车里程'}
        </Button>
      </div>

      {/* 车队里程汇总 */}
      {mileageList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {fleetSummary.map(f => (
            <Card key={f.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{f.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">今日</span>
                    <span className="font-medium">{f.today.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">本月</span>
                    <span className="font-medium">{f.month.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">本年</span>
                    <span className="font-medium">{f.year.toFixed(1)} km</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base md:text-lg">车辆里程明细</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="搜索车辆名称或车牌..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
              />
              <select
                value={fleetFilter}
                onChange={(e) => setFleetFilter(e.target.value)}
                className="h-10 px-3 rounded-md border bg-background"
              >
                {fleets.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">照片</TableHead>
                  <TableHead className="whitespace-nowrap">设备名称</TableHead>
                  <TableHead className="whitespace-nowrap">车牌号</TableHead>
                  <TableHead className="whitespace-nowrap">所属车队</TableHead>
                  <TableHead className="whitespace-nowrap">年检到期</TableHead>
                  <TableHead className="whitespace-nowrap">保险到期</TableHead>
                  <TableHead className="whitespace-nowrap">今日里程(km)</TableHead>
                  <TableHead className="whitespace-nowrap">本月里程(km)</TableHead>
                  <TableHead className="whitespace-nowrap">本年里程(km)</TableHead>
                  <TableHead className="whitespace-nowrap">超速</TableHead>
                  {currentUser && <TableHead className="whitespace-nowrap">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v, i) => {
                  const mileage = mileageMap.get(v.name);
                  const ext = vehicleExts[v.id] || {};
                  const inspection = getInspectionStatus(ext.inspectionDate);
                  const insurance = getInsuranceStatus(ext.insuranceDate);
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        {ext.photo ? (
                          <img src={ext.photo} alt={v.name} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <Camera className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{v.name}</span>
                      </TableCell>
                      <TableCell>
                        {v.plate || <span className="text-muted-foreground">未登记</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{v.fleet}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${inspection.color}`}>
                          {inspection.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${insurance.color}`}>
                          {insurance.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {mileage ? mileage.todayMil.toFixed(1) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {mileage ? mileage.monthMil.toFixed(1) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {mileage ? mileage.yearMil.toFixed(1) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {mileage ? mileage.chaoSuCounts : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      {currentUser && (
                        <TableCell>
                          <Dialog open={editingVehicle?.id === v.id} onOpenChange={(open) => !open && setEditingVehicle(null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(v)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>编辑车辆信息 - {v.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <label className="text-sm font-medium">车辆照片</label>
                                  <div className="mt-2 flex items-center gap-4">
                                    {editPhoto ? (
                                      <img src={editPhoto} alt="预览" className="w-24 h-24 object-cover rounded" />
                                    ) : (
                                      <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-gray-400" />
                                      </div>
                                    )}
                                    <Input type="file" accept="image/*" onChange={handlePhotoUpload} />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">年检到期日期</label>
                                  <Input
                                    type="date"
                                    value={editInspectionDate}
                                    onChange={(e) => setEditInspectionDate(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">保险到期日期</label>
                                  <Input
                                    type="date"
                                    value={editInsuranceDate}
                                    onChange={(e) => setEditInsuranceDate(e.target.value)}
                                    className="mt-2"
                                  />
                                </div>
                                <Button onClick={saveEdit} className="w-full">保存</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
