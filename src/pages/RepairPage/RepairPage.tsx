import { useState } from 'react';
import { Plus, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { store, VEHICLES_MOCK, IRepairRecord } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

export default function RepairPage() {
  const user = getCurrentUser();
  const canEdit = !!user;
  const allowedFleet = user?.fleet || '';

  const [records, setRecords] = useState<IRepairRecord[]>(() => store.get<IRepairRecord[]>('repair-records', []));
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterFleet, setFilterFleet] = useState('全部');

  const [form, setForm] = useState({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    item: '',
    cost: '',
    mileage: '',
    shop: '',
    note: '',
  });

  const selectableVehicles = user
    ? VEHICLES_MOCK.filter(v => v.fleet === allowedFleet)
    : VEHICLES_MOCK;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error('请先登录'); return; }
    if (!form.vehicleId) { toast.error('请选择车辆'); return; }
    const newRecord: IRepairRecord = {
      id: `repair_${Date.now()}`,
      vehicleId: form.vehicleId,
      date: form.date,
      item: form.item,
      cost: parseFloat(form.cost) || 0,
      mileage: parseFloat(form.mileage) || 0,
      shop: form.shop,
      note: form.note,
    };
    const updated = [...records, newRecord];
    setRecords(updated);
    store.set('repair-records', updated);
    toast.success('维修保养记录已添加');
    setOpen(false);
    setForm({ ...form, item: '', cost: '', mileage: '', shop: '', note: '' });
  };

  const deleteRecord = (id: string) => {
    if (!canEdit) { toast.error('请先登录'); return; }
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    store.set('repair-records', updated);
    toast.success('已删除');
  };

  const canEditRecord = (r: IRepairRecord) => {
    if (!canEdit) return false;
    const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
    return v?.fleet === allowedFleet;
  };

  const exportCSV = () => {
    let filtered = records.filter(r => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      return true;
    });
    if (filterFleet !== '全部') {
      filtered = filtered.filter(r => {
        const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
        return v?.fleet === filterFleet;
      });
    }
    if (filtered.length === 0) { toast.error('所选条件下无数据'); return; }

    const headers = ['日期', '车辆', '所属车队', '维修保养项目', '费用(元)', '维修里程', '维修厂', '备注'];
    const rows = filtered.map(r => {
      const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
      return [r.date, v?.name || '', v?.fleet || '', r.item, r.cost, r.mileage, r.shop, r.note];
    });
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `维修保养记录_${startDate || 'all'}_${endDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${filtered.length} 条记录`);
  };

  // 筛选
  const filteredRecords = records.filter(r => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    if (filterFleet !== '全部') {
      const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
      if (v?.fleet !== filterFleet) return false;
    }
    return true;
  }).reverse();

  const monthNow = new Date().toISOString().slice(0, 7);
  const yearNow = new Date().toISOString().slice(0, 4);

  // 按筛选条件计算总费用
  const totalCost = filteredRecords.reduce((s, r) => s + r.cost, 0);
  const monthCost = records.filter(r => {
    const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
    return r.date.startsWith(monthNow) && (filterFleet === '全部' || v?.fleet === filterFleet);
  }).reduce((s, r) => s + r.cost, 0);
  const yearCost = records.filter(r => {
    const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
    return r.date.startsWith(yearNow) && (filterFleet === '全部' || v?.fleet === filterFleet);
  }).reduce((s, r) => s + r.cost, 0);

  // 各车队汇总
  const fleetStats = ['阿荣旗热力', '莫旗热力', '扎兰屯热力'].map(fleet => {
    const fleetRecords = records.filter(r => {
      const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
      return v?.fleet === fleet;
    });
    return {
      fleet,
      count: fleetRecords.length,
      total: fleetRecords.reduce((s, r) => s + r.cost, 0),
      month: fleetRecords.filter(r => r.date.startsWith(monthNow)).reduce((s, r) => s + r.cost, 0),
      year: fleetRecords.filter(r => r.date.startsWith(yearNow)).reduce((s, r) => s + r.cost, 0),
    };
  });

  // 按车辆汇总维修保养费用（受车队筛选影响）
  const vehicleStats = VEHICLES_MOCK
    .filter(v => filterFleet === '全部' || v.fleet === filterFleet)
    .map(v => {
      const vRecords = records.filter(r => r.vehicleId === v.id);
      return {
        vehicleId: v.id,
        name: v.name,
        fleet: v.fleet,
        total: vRecords.reduce((s, r) => s + r.cost, 0),
        month: vRecords.filter(r => r.date.startsWith(monthNow)).reduce((s, r) => s + r.cost, 0),
        year: vRecords.filter(r => r.date.startsWith(yearNow)).reduce((s, r) => s + r.cost, 0),
        count: vRecords.length,
        items: vRecords.map(r => r.item),
      };
    })
    .filter(v => v.count > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">维修保养记录</h1>
          <p className="text-muted-foreground mt-1">
            {canEdit ? `当前登录：${user?.displayName}（${allowedFleet}）` : '未登录，仅可查看数据'}
          </p>
        </div>
        {canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />添加维修保养记录</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>添加维修保养记录（{allowedFleet}）</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>车辆（仅{allowedFleet}）</Label>
                  <select
                    value={form.vehicleId}
                    onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    required
                  >
                    <option value="">请选择车辆</option>
                    {selectableVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>维修保养日期</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>维修厂</Label>
                    <Input value={form.shop} onChange={(e) => setForm({ ...form, shop: e.target.value })} placeholder="如：XX汽修厂" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>维修保养项目</Label>
                  <Input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="如：更换轮胎、定期保养、维修发动机" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>费用(元)</Label>
                    <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>维修时里程(km)</Label>
                    <Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit">保存</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button disabled variant="outline"><Plus className="w-4 h-4 mr-2" />登录后可录入</Button>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">¥{monthCost.toFixed(2)}</div>
          <p className="text-sm text-muted-foreground">本月费用</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">¥{yearCost.toFixed(2)}</div>
          <p className="text-sm text-muted-foreground">本年费用</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">¥{totalCost.toFixed(2)}</div>
          <p className="text-sm text-muted-foreground">累计费用</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-2xl font-bold">{filteredRecords.length}</div>
          <p className="text-sm text-muted-foreground">保养次数</p>
        </CardContent></Card>
      </div>

      {/* 各车队汇总 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" />各车队维修保养费用汇总</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>车队</TableHead>
                <TableHead>本月费用</TableHead>
                <TableHead>本年费用</TableHead>
                <TableHead>累计费用</TableHead>
                <TableHead>保养次数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleetStats.map(fs => (
                <TableRow key={fs.fleet}>
                  <TableCell className="font-medium">{fs.fleet}</TableCell>
                  <TableCell>¥{fs.month.toFixed(2)}</TableCell>
                  <TableCell>¥{fs.year.toFixed(2)}</TableCell>
                  <TableCell>¥{fs.total.toFixed(2)}</TableCell>
                  <TableCell>{fs.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 按车辆明细统计 */}
      <Card>
        <CardHeader>
          <CardTitle>各车辆维修保养费用明细（按累计费用降序）</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicleStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无维修保养数据</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>车辆</TableHead>
                    <TableHead>所属车队</TableHead>
                    <TableHead>本月费用</TableHead>
                    <TableHead>本年费用</TableHead>
                    <TableHead>累计费用</TableHead>
                    <TableHead>保养次数</TableHead>
                    <TableHead>主要项目</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleStats.map(v => (
                    <TableRow key={v.vehicleId}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.fleet}</TableCell>
                      <TableCell>¥{v.month.toFixed(2)}</TableCell>
                      <TableCell>¥{v.year.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold text-orange-600">¥{v.total.toFixed(2)}</TableCell>
                      <TableCell>{v.count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {v.items.join('；')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 筛选和导出 */}
      <Card>
        <CardHeader>
          <CardTitle>查询和导出</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>车队</Label>
              <select value={filterFleet} onChange={(e) => setFilterFleet(e.target.value)} className="h-10 px-3 rounded-md border bg-background">
                <option value="全部">全部</option>
                <option value="阿荣旗热力">阿荣旗热力</option>
                <option value="莫旗热力">莫旗热力</option>
                <option value="扎兰屯热力">扎兰屯热力</option>
              </select>
            </div>
            <Button onClick={exportCSV} variant="secondary">
              <Download className="w-4 h-4 mr-2" />导出CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle>维修保养记录列表 ({filteredRecords.length} 条)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无维修保养记录</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">日期</TableHead>
                    <TableHead className="whitespace-nowrap">车辆</TableHead>
                    <TableHead className="whitespace-nowrap">所属车队</TableHead>
                    <TableHead className="whitespace-nowrap">项目</TableHead>
                    <TableHead className="whitespace-nowrap">费用(元)</TableHead>
                    <TableHead className="whitespace-nowrap">里程</TableHead>
                    <TableHead className="whitespace-nowrap">维修厂</TableHead>
                    <TableHead className="whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map(r => {
                    const v = VEHICLES_MOCK.find(veh => veh.id === r.vehicleId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell className="font-medium">{v?.name || r.vehicleId}</TableCell>
                        <TableCell>{v?.fleet || '-'}</TableCell>
                        <TableCell>{r.item}</TableCell>
                        <TableCell>¥{r.cost.toFixed(2)}</TableCell>
                        <TableCell>{r.mileage ? `${r.mileage} km` : '-'}</TableCell>
                        <TableCell>{r.shop || '-'}</TableCell>
                        <TableCell>
                          {canEditRecord(r) && (
                            <Button size="sm" variant="ghost" onClick={() => deleteRecord(r.id)} className="text-destructive">删除</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
