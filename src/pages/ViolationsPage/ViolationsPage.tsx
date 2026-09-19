import { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { store, VEHICLES_MOCK, IViolationRecord } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

export default function ViolationsPage() {
  const user = getCurrentUser();
  const canEdit = !!user;
  const allowedFleet = user?.fleet || '';

  const [records, setRecords] = useState<IViolationRecord[]>(() => store.get<IViolationRecord[]>('violations', []));
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');

  const [form, setForm] = useState({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    type: '',
    location: '',
    points: '',
    fine: '',
    status: '未处理' as const,
    note: '',
  });

  const selectableVehicles = user
    ? VEHICLES_MOCK.filter(v => v.fleet === allowedFleet)
    : VEHICLES_MOCK;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('请先登录');
      return;
    }
    if (!form.vehicleId) {
      toast.error('请选择车辆');
      return;
    }
    const newRecord: IViolationRecord = {
      id: `vio_${Date.now()}`,
      vehicleId: form.vehicleId,
      date: form.date,
      type: form.type,
      location: form.location,
      points: parseInt(form.points) || 0,
      fine: parseFloat(form.fine) || 0,
      status: form.status,
      note: form.note,
    };
    const updated = [...records, newRecord];
    setRecords(updated);
    store.set('violations', updated);
    toast.success('违章记录已添加');
    setOpen(false);
    setForm({ ...form, type: '', location: '', points: '', fine: '', note: '', status: '未处理' });
  };

  const deleteRecord = (id: string) => {
    if (!canEdit) {
      toast.error('请先登录');
      return;
    }
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    store.set('violations', updated);
    toast.success('已删除');
  };

  const updateStatus = (id: string, status: IViolationRecord['status']) => {
    if (!canEdit) {
      toast.error('请先登录');
      return;
    }
    const updated = records.map(r => r.id === id ? { ...r, status } : r);
    setRecords(updated);
    store.set('violations', updated);
    toast.success('状态已更新');
  };

  const canEditRecord = (r: IViolationRecord) => {
    if (!canEdit) return false;
    const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
    return v?.fleet === allowedFleet;
  };

  const exportCSV = () => {
    let filtered = records;
    if (startDate) filtered = filtered.filter(r => r.date >= startDate);
    if (endDate) filtered = filtered.filter(r => r.date <= endDate);
    if (statusFilter !== '全部') filtered = filtered.filter(r => r.status === statusFilter);

    if (filtered.length === 0) {
      toast.error('所选条件下无数据');
      return;
    }

    const headers = ['日期', '车辆', '违章类型', '违章地点', '扣分', '罚款(元)', '处理状态', '备注'];
    const rows = filtered.map(r => {
      const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
      return [r.date, v?.name || '', r.type, r.location, r.points, r.fine, r.status, r.note];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `违章记录_${startDate || 'all'}_${endDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${filtered.length} 条记录`);
  };

  const filteredRecords = records.filter(r => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    if (statusFilter !== '全部' && r.status !== statusFilter) return false;
    return true;
  }).reverse();

  const totalFine = filteredRecords.reduce((sum, r) => sum + r.fine, 0);
  const totalPoints = filteredRecords.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">违章记录</h1>
          <p className="text-muted-foreground mt-1">
            {canEdit ? `当前登录：${user?.displayName}（${allowedFleet}）` : '未登录，仅可查看数据'}
          </p>
        </div>
        {canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                添加违章记录
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>添加违章记录（{allowedFleet}）</DialogTitle>
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
                    <Label>违章日期</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>违章类型</Label>
                    <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="如：超速、违章停车" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>违章地点</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="如：XX路与XX街交叉口" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>扣分</Label>
                    <Input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>罚款(元)</Label>
                    <Input type="number" step="0.01" value={form.fine} onChange={(e) => setForm({ ...form, fine: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>处理状态</Label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                      className="w-full h-10 px-3 rounded-md border bg-background"
                    >
                      <option value="未处理">未处理</option>
                      <option value="处理中">处理中</option>
                      <option value="已处理">已处理</option>
                    </select>
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
          <Button disabled variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            登录后可录入
          </Button>
        )}
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredRecords.length}</div>
            <p className="text-sm text-muted-foreground">违章总数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">¥{totalFine.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">罚款总额</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-sm text-muted-foreground">累计扣分</p>
          </CardContent>
        </Card>
      </div>

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
              <Label>处理状态</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-md border bg-background"
              >
                <option value="全部">全部</option>
                <option value="未处理">未处理</option>
                <option value="处理中">处理中</option>
                <option value="已处理">已处理</option>
              </select>
            </div>
            <Button onClick={exportCSV} variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 违章列表 */}
      <Card>
        <CardHeader>
          <CardTitle>违章记录列表 ({filteredRecords.length} 条)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无违章记录</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">日期</TableHead>
                    <TableHead className="whitespace-nowrap">车辆</TableHead>
                    <TableHead className="whitespace-nowrap">所属车队</TableHead>
                    <TableHead className="whitespace-nowrap">违章类型</TableHead>
                    <TableHead className="whitespace-nowrap">地点</TableHead>
                    <TableHead className="whitespace-nowrap">扣分</TableHead>
                    <TableHead className="whitespace-nowrap">罚款</TableHead>
                    <TableHead className="whitespace-nowrap">状态</TableHead>
                    <TableHead className="whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r) => {
                    const v = VEHICLES_MOCK.find(veh => veh.id === r.vehicleId);
                    const editable = canEditRecord(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell className="font-medium">{v?.name || r.vehicleId}</TableCell>
                        <TableCell>{v?.fleet || '-'}</TableCell>
                        <TableCell>{r.type}</TableCell>
                        <TableCell>{r.location || '-'}</TableCell>
                        <TableCell>{r.points}</TableCell>
                        <TableCell>¥{r.fine.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === '已处理' ? 'secondary' : 'destructive'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editable && (
                            <div className="flex gap-1">
                              {r.status !== '已处理' && (
                                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, '已处理')}>
                                  标记已处理
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => deleteRecord(r.id)} className="text-destructive">
                                删除
                              </Button>
                            </div>
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
