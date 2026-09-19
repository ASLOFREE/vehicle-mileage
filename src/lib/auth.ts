// EXPORTS: IUser, USERS, getCurrentUser, login, logout
// 前端简单账号认证（localStorage存储登录状态）

export interface IUser {
  username: string;
  password: string;
  fleet: string;  // 关联的车队名称
  displayName: string;
}

// 3个账号，分别对应3个车队
export const USERS: IUser[] = [
  { username: 'arongqi', password: '123456', fleet: '阿荣旗热力', displayName: '阿荣旗管理员' },
  { username: 'moqi', password: '123456', fleet: '莫旗热力', displayName: '莫旗管理员' },
  { username: 'zhalantun', password: '123456', fleet: '扎兰屯热力', displayName: '扎兰屯管理员' },
];

const KEY = 'vehicle-management:current-user';

export function getCurrentUser(): IUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function login(username: string, password: string): IUser | null {
  const user = USERS.find(u => u.username === username && u.password === password);
  if (user) {
    localStorage.setItem(KEY, JSON.stringify(user));
    return user;
  }
  return null;
}

export function logout() {
  localStorage.removeItem(KEY);
}
