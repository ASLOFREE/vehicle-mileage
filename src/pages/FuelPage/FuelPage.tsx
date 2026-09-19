import { useState } from 'react';
import { Plus, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { store, VEHICLES_MOCK, IFuelRecord } from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

export default function FuelPage() {
  const user = getCurrentUser();
  const canEdit = !!user;
  const allowedFleet = user?.fleet || '';

  const [records, setRecords] = useState<IFuelRecord[]>(() => store.get<IFuelRecord[]>('fuel-records', []));
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [printVehicleId, setPrintVehicleId] = useState('');
  const [printMonth, setPrintMonth] = useState(new Date().toISOString().slice(0, 7));

  const [form, setForm] = useState({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    liters: '',
    price: '',
    odometer: '',
    station: '',
    note: '',
  });

  // 登录后只能选自己车队的车辆
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
    const newRecord: IFuelRecord = {
      id: `fuel_${Date.now()}`,
      vehicleId: form.vehicleId,
      date: form.date,
      amount: parseFloat(form.amount) || 0,
      liters: parseFloat(form.liters) || 0,
      price: parseFloat(form.price) || 0,
      odometer: parseFloat(form.odometer) || 0,
      station: form.station,
      note: form.note,
    };
    const updated = [...records, newRecord];
    setRecords(updated);
    store.set('fuel-records', updated);
    toast.success('加油记录已添加');
    setOpen(false);
    setForm({ ...form, amount: '', liters: '', price: '', odometer: '', station: '', note: '' });
  };

  const exportCSV = () => {
    let filtered = records;
    if (startDate) filtered = filtered.filter(r => r.date >= startDate);
    if (endDate) filtered = filtered.filter(r => r.date <= endDate);

    if (filtered.length === 0) {
      toast.error('所选时间范围内无数据');
      return;
    }

    const headers = ['日期', '车辆', '加油站', '金额(元)', '升数', '单价(元/升)', '里程表读数', '备注'];
    const rows = filtered.map(r => {
      const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
      return [r.date, v?.name || '', r.station, r.amount, r.liters, r.price, r.odometer, r.note];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `加油记录_${startDate || 'all'}_${endDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${filtered.length} 条记录`);
  };

  const deleteRecord = (id: string) => {
    if (!canEdit) {
      toast.error('请先登录');
      return;
    }
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    store.set('fuel-records', updated);
    toast.success('已删除');
  };

  // 生成加油粘贴单打印
  const printReceipt = () => {
    if (!printVehicleId) {
      toast.error('请选择车辆');
      return;
    }
    const v = VEHICLES_MOCK.find(v => v.id === printVehicleId);
    if (!v) {
      toast.error('车辆不存在');
      return;
    }

    const monthRecords = records
      .filter(r => r.vehicleId === printVehicleId && r.date.startsWith(printMonth))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (monthRecords.length === 0) {
      toast.error('该车辆本月无加油记录');
      return;
    }

    const totalAmount = monthRecords.reduce((s, r) => s + r.amount, 0);
    const totalLiters = monthRecords.reduce((s, r) => s + r.liters, 0);

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('请允许弹窗后重试');
      return;
    }

    const rowsHtml = monthRecords.map((r, i) => `
      <tr>
        <td style="border:1px solid #000;padding:6px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #000;padding:6px;text-align:center">${r.date}</td>
        <td style="border:1px solid #000;padding:6px;text-align:center">${r.station || '-'}</td>
        <td style="border:1px solid #000;padding:6px;text-align:right">${r.liters.toFixed(2)}</td>
        <td style="border:1px solid #000;padding:6px;text-align:right">${r.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>加油费用粘贴单 - ${v.name} - ${printMonth}</title>
          <style>
            body { font-family: "SimSun", serif; padding: 30px; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 20px; }
            .info { margin-bottom: 15px; font-size: 14px; }
            .info span { display: inline-block; margin-right: 40px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #000; padding: 8px; font-size: 13px; }
            th { background: #f0f0f0; text-align: center; }
            .summary { font-size: 14px; margin-bottom: 20px; }
            .summary span { margin-right: 30px; }
            .sticky-area {
              border: 2px dashed #999;
              min-height: 300px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
              margin-bottom: 30px;
            }
            .footer { display: flex; justify-content: space-between; font-size: 14px; margin-top: 40px; }
            .footer span { display: inline-block; width: 180px; }
            @media print {
              body { padding: 0; }
              .sticky-area { border: 2px dashed #999; }
            }
          </style>
        </head>
        <body>
          <h1>扎兰屯热电厂车辆加油费用粘贴单</h1>
          <div class="info">
            <span>车辆名称：${v.name}</span>
            <span>所属车队：${v.fleet}</span>
            <span>月份：${printMonth}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>序号</th>
                <th>加油日期</th>
                <th>加油站</th>
                <th>加油升数(L)</th>
                <th>金额(元)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="summary">
            <span>共 <b>${monthRecords.length}</b> 笔</span>
            <span>合计 <b>${totalLiters.toFixed(2)}</b> 升</span>
            <span>合计金额 <b>¥${totalAmount.toFixed(2)}</b></span>
          </div>
          <div class="sticky-area">
            （此处粘贴加油小票）
          </div>
          <div class="footer">
            <span>驾驶员签字：____________</span>
            <span>部门负责人签字：____________</span>
            <span>日期：____________</span>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 判断某条记录是否属于当前用户车队
  const canDeleteRecord = (r: IFuelRecord) => {
    if (!canEdit) return false;
    const v = VEHICLES_MOCK.find(v => v.id === r.vehicleId);
    return v?.fleet === allowedFleet;
  };

  const filteredRecords = records.filter(r => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    return true;
  }).reverse();

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">加油记录</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {canEdit ? `当前登录：${user?.displayName}（${allowedFleet}）` : '未登录，仅可查看数据'}
          </p>
        </div>
        {canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                添加加油记录
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>添加加油记录（{allowedFleet}）</DialogTitle>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>加油日期</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>加油站</Label>
                    <Input value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} placeholder="如：中石油XX加油站" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>金额(元)</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>升数</Label>
                    <Input type="number" step="0.01" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>单价(元/升)</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>里程表读数(km)</Label>
                  <Input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="备注信息" />
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

      {/* 时间范围筛选和导出 */}
      <Card>
        <CardHeader>
          <CardTitle>导出加油分析表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={exportCSV} variant="secondary" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 加油粘贴单打印 */}
      <Card>
        <CardHeader>
          <CardTitle>加油费用粘贴单（打印）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>选择车辆</Label>
              <select
                value={printVehicleId}
                onChange={(e) => setPrintVehicleId(e.target.value)}
                className="w-full sm:w-[200px] h-10 px-3 rounded-md border bg-background"
              >
                <option value="">请选择车辆</option>
                {selectableVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>选择月份</Label>
              <Input type="month" value={printMonth} onChange={(e) => setPrintMonth(e.target.value)} />
            </div>
            <Button onClick={printReceipt} variant="default" className="w-full sm:w-auto">
              <Printer className="w-4 h-4 mr-2" />
              生成粘贴单并打印
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            每台车每月一张，包含当月加油明细和合计金额，下方留空粘贴加油小票。
          </p>
        </CardContent>
      </Card>

      {/* 记录列表 */}
      <Card>
        <CardHeader>
          <CardTitle>加油记录列表 ({filteredRecords.length} 条)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {canEdit ? '暂无加油记录，点击右上角"添加加油记录"开始录入' : '暂无加油记录'}
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">日期</TableHead>
                    <TableHead className="whitespace-nowrap">车辆</TableHead>
                    <TableHead className="whitespace-nowrap">所属车队</TableHead>
                    <TableHead className="whitespace-nowrap">加油站</TableHead>
                    <TableHead className="whitespace-nowrap">金额(元)</TableHead>
                    <TableHead className="whitespace-nowrap">升数</TableHead>
                    <TableHead className="whitespace-nowrap">单价</TableHead>
                    <TableHead className="whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((r) => {
                    const v = VEHICLES_MOCK.find(veh => veh.id === r.vehicleId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell className="font-medium">{v?.name || r.vehicleId}</TableCell>
                        <TableCell>{v?.fleet || '-'}</TableCell>
                        <TableCell>{r.station || '-'}</TableCell>
                        <TableCell>¥{r.amount.toFixed(2)}</TableCell>
                        <TableCell>{r.liters}</TableCell>
                        <TableCell>{r.price ? `¥${r.price.toFixed(2)}` : '-'}</TableCell>
                        <TableCell>
                          {canDeleteRecord(r) && (
                            <Button variant="ghost" size="sm" onClick={() => deleteRecord(r.id)} className="text-destructive">
                              删除
                            </Button>
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
