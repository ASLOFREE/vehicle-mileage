import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { store, VEHICLES_MOCK, IFuelRecord, IViolationRecord, IRepairRecord } from '@/lib/store';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const [fuelRecords] = useState<IFuelRecord[]>(() => store.get<IFuelRecord[]>('fuel-records', []));
  const [violations] = useState<IViolationRecord[]>(() => store.get<IViolationRecord[]>('violations', []));
  const [repairs] = useState<IRepairRecord[]>(() => store.get<IRepairRecord[]>('repair-records', []));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 筛选数据
  const filteredFuel = fuelRecords.filter(r => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    return true;
  });

  const filteredViolations = violations.filter(r => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    return true;
  });

  const filteredRepairs = repairs.filter(r => {
    if (startDate && r.date < startDate) return false;
    if (endDate && r.date > endDate) return false;
    return true;
  });

  const repairByVehicle = filteredRepairs.reduce((acc, r) => {
    if (!acc[r.vehicleId]) acc[r.vehicleId] = { totalCost: 0, count: 0 };
    acc[r.vehicleId].totalCost += r.cost;
    acc[r.vehicleId].count += 1;
    return acc;
  }, {} as Record<string, { totalCost: number; count: number }>);

  // 按车辆统计加油
  const fuelByVehicle = filteredFuel.reduce((acc, r) => {
    if (!acc[r.vehicleId]) acc[r.vehicleId] = { totalAmount: 0, totalLiters: 0, count: 0 };
    acc[r.vehicleId].totalAmount += r.amount;
    acc[r.vehicleId].totalLiters += r.liters;
    acc[r.vehicleId].count += 1;
    return acc;
  }, {} as Record<string, { totalAmount: number; totalLiters: number; count: number }>);

  // 按车辆统计违章
  const violationByVehicle = filteredViolations.reduce((acc, r) => {
    if (!acc[r.vehicleId]) acc[r.vehicleId] = { count: 0, totalFine: 0, totalPoints: 0 };
    acc[r.vehicleId].count += 1;
    acc[r.vehicleId].totalFine += r.fine;
    acc[r.vehicleId].totalPoints += r.points;
    return acc;
  }, {} as Record<string, { count: number; totalFine: number; totalPoints: number }>);

  // 导出全部车辆分析报表
  const exportReport = () => {
    const rows: string[][] = [];
    rows.push(['=== 全部车辆分析报表 ===']);
    rows.push(['统计周期', startDate || '全部', '至', endDate || '']);
    rows.push([]);

    rows.push(['--- 加油分析 ---']);
    rows.push(['车辆', '加油次数', '总金额(元)', '总升数', '平均单价']);
    Object.entries(fuelByVehicle).forEach(([vid, data]) => {
      const v = VEHICLES_MOCK.find(veh => veh.id === vid);
      rows.push([
        v?.name || vid,
        String(data.count),
        data.totalAmount.toFixed(2),
        data.totalLiters.toFixed(1),
        data.totalLiters ? (data.totalAmount / data.totalLiters).toFixed(2) : '-',
      ]);
    });
    rows.push([
      '合计',
      String(filteredFuel.length),
      filteredFuel.reduce((s, r) => s + r.amount, 0).toFixed(2),
      filteredFuel.reduce((s, r) => s + r.liters, 0).toFixed(1),
      '',
    ]);
    rows.push([]);

    rows.push(['--- 违章分析 ---']);
    rows.push(['车辆', '违章次数', '总罚款(元)', '总扣分']);
    Object.entries(violationByVehicle).forEach(([vid, data]) => {
      const v = VEHICLES_MOCK.find(veh => veh.id === vid);
      rows.push([v?.name || vid, String(data.count), data.totalFine.toFixed(2), String(data.totalPoints)]);
    });
    rows.push([
      '合计',
      String(filteredViolations.length),
      filteredViolations.reduce((s, r) => s + r.fine, 0).toFixed(2),
      String(filteredViolations.reduce((s, r) => s + r.points, 0)),
    ]);
    rows.push([]);

    rows.push(['--- 维修保养分析 ---']);
    rows.push(['车辆', '维修保养次数', '维修保养费用(元)', '维修保养项目明细']);
    Object.entries(repairByVehicle).forEach(([vid, data]) => {
      const v = VEHICLES_MOCK.find(veh => veh.id === vid);
      const items = filteredRepairs.filter(r => r.vehicleId === vid).map(r => r.item).join('；');
      rows.push([v?.name || vid, String(data.count), data.totalCost.toFixed(2), items]);
    });
    rows.push([
      '合计',
      String(filteredRepairs.length),
      filteredRepairs.reduce((s, r) => s + r.cost, 0).toFixed(2),
      '',
    ]);

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `车辆分析报表_${startDate || 'all'}_${endDate || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('分析报表已导出');
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据分析</h1>
          <p className="text-muted-foreground mt-1">全部车辆加油和违章统计分析</p>
        </div>
        <Button onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          导出分析报表
        </Button>
      </div>

      {/* 时间筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 各车队加油费用汇总 */}
      <Card>
        <CardHeader>
          <CardTitle>各车队加油费用汇总</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['阿荣旗热力', '莫旗热力', '扎兰屯热力'].map(fleet => {
              const fleetVehicles = VEHICLES_MOCK.filter(v => v.fleet === fleet);
              const fleetFuel = filteredFuel.filter(r => fleetVehicles.some(v => v.id === r.vehicleId));
              const totalAmount = fleetFuel.reduce((s, r) => s + r.amount, 0);
              const totalLiters = fleetFuel.reduce((s, r) => s + r.liters, 0);
              const avgPrice = totalLiters ? (totalAmount / totalLiters).toFixed(2) : '-';
              return (
                <div key={fleet} className="border rounded-lg p-4">
                  <Badge variant="secondary" className="mb-3">{fleet}</Badge>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">加油总费用</span>
                      <span className="font-bold text-lg">¥{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">加油总升数</span>
                      <span>{totalLiters.toFixed(1)} 升</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">加油次数</span>
                      <span>{fleetFuel.length} 次</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">平均单价</span>
                      <span>{avgPrice === '-' ? '-' : `¥${avgPrice}/升`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">车辆数</span>
                      <span>{fleetVehicles.length} 辆</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 加油分析 */}
      <Card>
        <CardHeader>
          <CardTitle>加油分析（按车辆）</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(fuelByVehicle).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无加油数据，请先在"加油记录"页录入</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">车辆</th>
                    <th className="text-left py-2 px-4 font-medium">所属车队</th>
                    <th className="text-right py-2 px-4 font-medium">加油次数</th>
                    <th className="text-right py-2 px-4 font-medium">总金额(元)</th>
                    <th className="text-right py-2 px-4 font-medium">总升数</th>
                    <th className="text-right py-2 px-4 font-medium">平均单价</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(fuelByVehicle).map(([vid, data]) => {
                    const v = VEHICLES_MOCK.find(veh => veh.id === vid);
                    const avgPrice = data.totalLiters ? (data.totalAmount / data.totalLiters).toFixed(2) : '-';
                    return (
                      <tr key={vid} className="border-b">
                        <td className="py-2 px-4">{v?.name || vid}</td>
                        <td className="py-2 px-4"><Badge variant="secondary">{v?.fleet || '-'}</Badge></td>
                        <td className="text-right py-2 px-4">{data.count}</td>
                        <td className="text-right py-2 px-4">¥{data.totalAmount.toFixed(2)}</td>
                        <td className="text-right py-2 px-4">{data.totalLiters.toFixed(1)}</td>
                        <td className="text-right py-2 px-4">{avgPrice === '-' ? '-' : `¥${avgPrice}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 违章分析 */}
      <Card>
        <CardHeader>
          <CardTitle>违章分析（按车辆）</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(violationByVehicle).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无违章数据，请先在"违章记录"页录入</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">车辆</th>
                    <th className="text-right py-2 px-4 font-medium">违章次数</th>
                    <th className="text-right py-2 px-4 font-medium">总罚款(元)</th>
                    <th className="text-right py-2 px-4 font-medium">总扣分</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(violationByVehicle).map(([vid, data]) => {
                    const v = VEHICLES_MOCK.find(veh => veh.id === vid);
                    return (
                      <tr key={vid} className="border-b">
                        <td className="py-2 px-4">{v?.name || vid}</td>
                        <td className="text-right py-2 px-4">{data.count}</td>
                        <td className="text-right py-2 px-4">¥{data.totalFine.toFixed(2)}</td>
                        <td className="text-right py-2 px-4">{data.totalPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 维修保养分析 */}
      <Card>
        <CardHeader>
          <CardTitle>维修保养分析（按车辆）</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(repairByVehicle).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无维修保养数据，请先在"维修保养记录"页录入</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">车辆</th>
                    <th className="text-left py-2 px-4 font-medium">所属车队</th>
                    <th className="text-right py-2 px-4 font-medium">维修次数</th>
                    <th className="text-right py-2 px-4 font-medium">维修费用(元)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(repairByVehicle).map(([vid, data]) => {
                    const v = VEHICLES_MOCK.find(veh => veh.id === vid);
                    return (
                      <tr key={vid} className="border-b">
                        <td className="py-2 px-4">{v?.name || vid}</td>
                        <td className="py-2 px-4"><Badge variant="secondary">{v?.fleet || '-'}</Badge></td>
                        <td className="text-right py-2 px-4">{data.count}</td>
                        <td className="text-right py-2 px-4">¥{data.totalCost.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 车队维度分析 */}
      <Card>
        <CardHeader>
          <CardTitle>车队维度分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['阿荣旗热力', '莫旗热力', '扎兰屯热力'].map(fleet => {
              const fleetVehicles = VEHICLES_MOCK.filter(v => v.fleet === fleet);
              const fleetFuel = filteredFuel.filter(r => fleetVehicles.some(v => v.id === r.vehicleId));
              const fleetViolations = filteredViolations.filter(r => fleetVehicles.some(v => v.id === r.vehicleId));
              const totalFuel = fleetFuel.reduce((s, r) => s + r.amount, 0);
              const totalFine = fleetViolations.reduce((s, r) => s + r.fine, 0);
              const fleetRepairs = filteredRepairs.filter(r => fleetVehicles.some(v => v.id === r.vehicleId));
              const totalRepair = fleetRepairs.reduce((s, r) => s + r.cost, 0);

              return (
                <div key={fleet} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Badge variant="secondary" className="mb-1">{fleet}</Badge>
                    <p className="text-sm text-muted-foreground">{fleetVehicles.length} 辆车</p>
                  </div>
                  <div className="flex gap-8 text-right">
                    <div>
                      <div className="text-lg font-bold">¥{totalFuel.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">加油费用</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{fleetFuel.length}</div>
                      <div className="text-xs text-muted-foreground">加油次数</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">¥{totalFine.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">违章罚款</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">¥{totalRepair.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">维修保养费</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{fleetRepairs.length}</div>
                      <div className="text-xs text-muted-foreground">保养次数</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
