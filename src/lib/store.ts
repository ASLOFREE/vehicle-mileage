// EXPORTS: IVehicle, IFuelRecord, IViolationRecord, store, VEHICLES_MOCK
// 数据类型定义和localStorage存储

export interface IVehicle {
  id: string;
  name: string;
  plate: string;
  simCard: string;
  fleet: string;
  macid: string;
  inspectionDate?: string;    // 年检到期日期
  photo?: string;             // 车辆照片(base64)
}

export interface IFuelRecord {
  id: string;
  vehicleId: string;
  date: string;
  amount: number;
  liters: number;
  price: number;
  odometer: number;
  station: string;
  note: string;
}

export interface IViolationRecord {
  id: string;
  vehicleId: string;
  date: string;
  type: string;
  location: string;
  points: number;
  fine: number;
  status: '未处理' | '处理中' | '已处理';
  note: string;
}

export interface IRepairRecord {
  id: string;
  vehicleId: string;
  date: string;
  item: string;        // 维修项目
  cost: number;        // 维修费用
  mileage: number;     // 维修时里程
  shop: string;       // 维修厂
  note: string;
}

export interface IMileageData {
  vehicleName: string;
  todayMil: number;
  monthMil: number;
  yearMil: number;
  chaoSuCounts: number;
  stopCount: number;
  fetchedAt: string;
  fleetName: string;
}

const NS = 'vehicle-management';

export const store = {
  get<T>(k: string, fb: T): T {
    try {
      const v = localStorage.getItem(`${NS}:${k}`);
      return v ? (JSON.parse(v) as T) : fb;
    } catch {
      return fb;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(`${NS}:${k}`, JSON.stringify(v));
    } catch { /* 隐私模式静默降级 */ }
  },
};

// 从18GPS抓取的30辆车初始数据
export const VEHICLES_MOCK: IVehicle[] = [
  { id: 'v001', name: '二号铲车临工', plate: '', simCard: '', fleet: '阿荣旗热力', macid: '14165797825' },
  { id: 'v002', name: '蒙E961K0', plate: '蒙E961K0', simCard: '', fleet: '阿荣旗热力', macid: '14165797767' },
  { id: 'v003', name: '蒙ED8756', plate: '蒙ED8756', simCard: '', fleet: '阿荣旗热力', macid: '' },
  { id: 'v004', name: '蒙EH3963', plate: '蒙EH3963', simCard: '', fleet: '阿荣旗热力', macid: '' },
  { id: 'v005', name: '三号铲车柳工', plate: '', simCard: '', fleet: '阿荣旗热力', macid: '' },
  { id: 'v006', name: '稽查班蒙EB6630', plate: '蒙EB6630', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v007', name: '蒙EAF511', plate: '蒙EAF511', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v008', name: '莫旗二厂铲车', plate: '', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v009', name: '莫旗三厂铲车', plate: '', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v010', name: '热网二组蒙EBA534', plate: '蒙EBA534', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v011', name: '热网三组蒙ED7465', plate: '蒙ED7465', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v012', name: '热网一组蒙E3339C', plate: '蒙E3339C', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v013', name: '营业部蒙E566J3', plate: '蒙E566J3', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v014', name: '运维部蒙E0668C', plate: '蒙E0668C', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v015', name: '运维部蒙EMP628', plate: '蒙EMP628', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v016', name: '运维电检班蒙E7577V', plate: '蒙E7577V', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v017', name: '综合部蒙E8122T', plate: '蒙E8122T', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v018', name: '综合部蒙EU1128', plate: '蒙EU1128', simCard: '', fleet: '莫旗热力', macid: '' },
  { id: 'v019', name: '蒙E063H7', plate: '蒙E063H7', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v020', name: '蒙E16599', plate: '蒙E16599', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v021', name: '蒙E65745', plate: '蒙E65745', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v022', name: '蒙EF07977', plate: '蒙EF07977', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v023', name: '蒙EJ8609', plate: '蒙EJ8609', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v024', name: '蒙EMX361', plate: '蒙EMX361', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v025', name: '蒙EZR979', plate: '蒙EZR979', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v026', name: '扎热检修部叉车', plate: '', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v027', name: '扎热燃料运行1号装载机', plate: '', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v028', name: '扎热燃料运行2号装载机', plate: '', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v029', name: '扎热燃料运行灰罐车', plate: '', simCard: '', fleet: '扎兰屯热力', macid: '' },
  { id: 'v030', name: '扎热燃料运行推土机', plate: '', simCard: '', fleet: '扎兰屯热力', macid: '' },
];
