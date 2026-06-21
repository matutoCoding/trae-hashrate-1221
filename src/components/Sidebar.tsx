import {
  LayoutDashboard,
  Users,
  Stethoscope,
  BarChart3,
  Calculator,
  FileText,
  Receipt,
  Settings,
  PawPrint,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '首页仪表盘' },
  { path: '/queue', icon: Users, label: '取号排队' },
  { path: '/rooms', icon: Stethoscope, label: '诊室叫号' },
  { path: '/load-balance', icon: BarChart3, label: '负载监控' },
  { path: '/billing', icon: Calculator, label: '诊疗计费' },
  { path: '/medical-records', icon: FileText, label: '病历档案' },
  { path: '/bills', icon: Receipt, label: '账单管理' },
  { path: '/settings', icon: Settings, label: '系统设置' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <PawPrint className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">宠物诊疗系统</h1>
            <p className="text-xs text-slate-400">Pet Clinic Queue</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">当前操作员</p>
          <p className="text-sm font-medium">前台 - 小王</p>
        </div>
      </div>
    </aside>
  );
}
