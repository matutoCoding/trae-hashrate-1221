import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Stethoscope,
  Calculator,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useSettingsStore } from '../store/useSettingsStore';
import StatusBadge from '../components/StatusBadge';
import { formatPrice } from '../utils/billing';

export default function Settings() {
  const { rooms, addRoom, updateRoom, removeRoom, setRoomStatus } = useRoomStore();
  const { billingConfig, updateBillingConfig, treatmentItems, addTreatmentItem, updateTreatmentItem, removeTreatmentItem } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'rooms' | 'billing' | 'items'>('rooms');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomForm, setEditRoomForm] = useState({
    name: '',
    number: 1,
    vetName: '',
  });

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    basePrice: 0,
    isSimple: true,
    description: '',
  });

  const handleAddRoom = () => {
    const newNumber = rooms.length + 1;
    addRoom({
      name: `${newNumber}号诊室`,
      number: newNumber,
      status: 'idle',
      vetName: '待分配',
    });
  };

  const startEditRoom = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      setEditingRoomId(roomId);
      setEditRoomForm({
        name: room.name,
        number: room.number,
        vetName: room.vetName,
      });
    }
  };

  const saveEditRoom = () => {
    if (editingRoomId) {
      updateRoom(editingRoomId, editRoomForm);
      setEditingRoomId(null);
    }
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category || newItem.basePrice <= 0) return;
    addTreatmentItem(newItem);
    setNewItem({
      name: '',
      category: '',
      basePrice: 0,
      isSimple: true,
      description: '',
    });
    setShowAddItem(false);
  };

  const tabs = [
    { id: 'rooms' as const, label: '诊室管理', icon: Stethoscope },
    { id: 'billing' as const, label: '费率配置', icon: Calculator },
    { id: 'items' as const, label: '项目管理', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-slate-500 mt-1">配置诊室、费率和诊疗项目</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-2 inline-flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rooms' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-500" />
              诊室列表
            </h2>
            <button
              onClick={handleAddRoom}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              添加诊室
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="border border-slate-200 rounded-xl p-4 hover:border-emerald-200 hover:shadow-sm transition-all"
              >
                {editingRoomId === room.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editRoomForm.name}
                      onChange={(e) =>
                        setEditRoomForm({ ...editRoomForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    />
                    <input
                      type="text"
                      value={editRoomForm.vetName}
                      onChange={(e) =>
                        setEditRoomForm({ ...editRoomForm, vetName: e.target.value })
                      }
                      placeholder="医生姓名"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditRoom}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                      <button
                        onClick={() => setEditingRoomId(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-slate-800">{room.name}</h3>
                      <StatusBadge status={room.status} type="room" />
                    </div>
                    <p className="text-sm text-slate-500 mb-3">
                      主治医生：{room.vetName}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <select
                        value={room.status}
                        onChange={(e) =>
                          setRoomStatus(room.id, e.target.value as typeof room.status)
                        }
                        className="text-xs px-2 py-1 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      >
                        <option value="idle">空闲</option>
                        <option value="busy">繁忙</option>
                        <option value="offline">离线</option>
                      </select>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditRoom(room.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确认删除该诊室？')) {
                              removeRoom(room.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-500" />
            计费规则配置
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                起步价（元）
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  ¥
                </span>
                <input
                  type="number"
                  value={billingConfig.basePrice}
                  onChange={(e) =>
                    updateBillingConfig({
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-lg font-medium"
                />
              </div>
              <p className="text-xs text-slate-500">
                简单项目不足此价格时，按起步价收取
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                封顶价（元）
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  ¥
                </span>
                <input
                  type="number"
                  value={billingConfig.ceilingPrice}
                  onChange={(e) =>
                    updateBillingConfig({
                      ceilingPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-lg font-medium"
                />
              </div>
              <p className="text-xs text-slate-500">
                复杂项目超过此价格时，按封顶价收取
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                平均诊疗时长（分钟）
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={billingConfig.avgVisitMinutes}
                  onChange={(e) =>
                    updateBillingConfig({
                      avgVisitMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-lg font-medium"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  分钟
                </span>
              </div>
              <p className="text-xs text-slate-500">
                用于预估等待时间
              </p>
            </div>
          </div>

          <div className="mt-8 p-5 bg-slate-50 rounded-xl">
            <h3 className="font-medium text-slate-800 mb-3">计费规则说明</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>
                  <strong>起步价规则：</strong>仅包含简单项目的账单，总金额低于起步价
                  {formatPrice(billingConfig.basePrice)} 时，按起步价收取。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">•</span>
                <span>
                  <strong>封顶价规则：</strong>包含复杂项目的账单，总金额高于封顶价
                  {formatPrice(billingConfig.ceilingPrice)} 时，按封顶价收取。
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>
                  <strong>项目分类：</strong>简单项目（体检、疫苗、驱虫等）和复杂项目（检查、手术、输液等）。
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-emerald-500" />
              诊疗项目
            </h2>
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              添加项目
            </button>
          </div>

          {showAddItem && (
            <div className="mb-6 p-5 bg-emerald-50 rounded-xl border border-emerald-200">
              <h3 className="font-medium text-slate-800 mb-4">新增诊疗项目</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">项目名称</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="项目名称"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">分类</label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="如：检查、治疗"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">价格（元）</label>
                  <input
                    type="number"
                    value={newItem.basePrice || ''}
                    onChange={(e) =>
                      setNewItem({ ...newItem, basePrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">项目类型</label>
                  <select
                    value={newItem.isSimple ? 'simple' : 'complex'}
                    onChange={(e) =>
                      setNewItem({ ...newItem, isSimple: e.target.value === 'simple' })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  >
                    <option value="simple">简单项目</option>
                    <option value="complex">复杂项目</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowAddItem(false)}
                  className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
                >
                  添加
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    项目名称
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    分类
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    类型
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    价格
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    描述
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {treatmentItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-3 px-4 text-slate-600 text-sm">{item.category}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.isSimple
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {item.isSimple ? '简单' : '复杂'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-600">
                      {formatPrice(item.basePrice)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-sm max-w-xs truncate">
                      {item.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm('确认删除该项目？')) {
                            removeTreatmentItem(item.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
