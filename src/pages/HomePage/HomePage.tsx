import { useEffect, useState } from 'react';
import { Car, Fuel, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { store, VEHICLES_MOCK, IFuelRecord, IViolationRecord } from '@/lib/store';

export default function HomePage() {
  const [vehicles] = useState(VEHICLES_MOCK);
  const [fuelRecords] = useState<IFuelRecord[]>(() => store.get<IFuelRecord[]>('fuel-records', []));
  const [violations] = useState<IViolationRecord[]>(() => store.get<IViolationRecord[]>('violations', []));

  // 按车队分组统计
  const fleetStats = vehicles.reduce((acc, v) => {
    acc[v.fleet] = (acc[v.fleet] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 加油统计
  const totalFuelCost = fuelRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalFuelLiters = fuelRecords.reduce((sum, r) => sum + r.liters, 0);

  // 违章统计
  const totalViolations = violations.length;
  const pendingViolations = violations.filter(v => v.status === '未处理').length;
  const totalFine = violations.reduce((sum, v) => sum + v.fine, 0);

  // 按车队统计加油和违章
  const fleetFuelStats = ['阿荣旗热力', '莫旗热力', '扎兰屯热力'].map(fleet => {
    const fleetVehicleIds = vehicles.filter(v => v.fleet === fleet).map(v => v.id);
    const fleetFuel = fuelRecords.filter(r => fleetVehicleIds.includes(r.vehicleId));
    const fleetViolations = violations.filter(v => fleetVehicleIds.includes(v.vehicleId));
    return {
      name: fleet,
      vehicleCount: fleetVehicleIds.length,
      fuelCost: fleetFuel.reduce((s, r) => s + r.amount, 0),
      fuelLiters: fleetFuel.reduce((s, r) => s + r.liters, 0),
      fuelCount: fleetFuel.length,
      violationCount: fleetViolations.length,
      fineTotal: fleetViolations.reduce((s, v) => s + v.fine, 0),
    };
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold">总览看板</h1>
        <p className="text-muted-foreground mt-1">车辆运行、加油、违章数据总览</p>
      </div>

      {/* KPI卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">车辆总数</CardTitle>
            <Car className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{vehicles.length}</div>
            <p className="text-xs text-muted-foreground mt-1">3个车队</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">加油总费用</CardTitle>
            <Fuel className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥{totalFuelCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalFuelLiters.toFixed(1)} 升</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">违章总数</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalViolations}</div>
            <p className="text-xs text-muted-foreground mt-1">未处理 {pendingViolations} 条</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">罚款总额</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥{totalFine.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">累计违章罚款</p>
          </CardContent>
        </Card>
      </div>

      {/* 车队分布 */}
      <Card>
        <CardHeader>
          <CardTitle>车队车辆分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(fleetStats).map(([fleet, count]) => (
              <div key={fleet} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{fleet}</Badge>
                  <span className="text-sm text-muted-foreground">{count} 辆车</span>
                </div>
                <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(count / vehicles.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 各车队加油费用统计 */}
      <Card>
        <CardHeader>
          <CardTitle>各车队加油费用统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fleetFuelStats.map(f => (
              <div key={f.name} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">{f.name}</Badge>
                  <span className="text-xs text-muted-foreground">{f.vehicleCount} 辆车</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">加油费用</span>
                    <span className="font-bold">¥{f.fuelCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">加油升数</span>
                    <span>{f.fuelLiters.toFixed(1)} 升</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">加油次数</span>
                    <span>{f.fuelCount} 次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">违章次数</span>
                    <span>{f.violationCount} 次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">违章罚款</span>
                    <span>¥{f.fineTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 最近加油记录 */}
      <Card>
        <CardHeader>
          <CardTitle>最近加油记录</CardTitle>
        </CardHeader>
        <CardContent>
          {fuelRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无加油记录，请前往「加油记录」页录入</p>
          ) : (
            <div className="space-y-2">
              {fuelRecords.slice(-5).reverse().map((r) => {
                const vehicle = vehicles.find(v => v.id === r.vehicleId);
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{vehicle?.name || r.vehicleId}</span>
                      <span className="text-sm text-muted-foreground ml-2">{r.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">¥{r.amount.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground ml-2">{r.liters}升</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 最近违章记录 */}
      <Card>
        <CardHeader>
          <CardTitle>最近违章记录</CardTitle>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无违章记录，请前往「违章记录」页录入</p>
          ) : (
            <div className="space-y-2">
              {violations.slice(-5).reverse().map((v) => {
                const vehicle = vehicles.find(veh => veh.id === v.vehicleId);
                return (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{vehicle?.name || v.vehicleId}</span>
                      <span className="text-sm text-muted-foreground ml-2">{v.type}</span>
                      <span className="text-xs text-muted-foreground ml-2">{v.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={v.status === '已处理' ? 'secondary' : 'destructive'}>
                        {v.status}
                      </Badge>
                      <span className="font-medium">¥{v.fine.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
