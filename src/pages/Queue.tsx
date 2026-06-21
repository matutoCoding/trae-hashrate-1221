import { useState } from 'react';
import { Plus, Search, Clock, Phone, User, PawPrint } from 'lucide-react';
import { usePetStore } from '../store/usePetStore';
import { useQueueStore } from '../store/useQueueStore';
import { useRoomStore } from '../store/useRoomStore';
import StatusBadge from '../components/StatusBadge';
import { PetSpecies } from '../types';

export default function Queue() {
  const { pets, addPet, searchPets, getPetById } = usePetStore();
  const { createAppointment, getWaitingQueue, appointments } = useQueueStore();
  const { getRoomById, rooms } = useRoomStore();

  const [showForm, setShowForm] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    species: 'dog' as PetSpecies,
    breed: '',
    age: 1,
    ownerName: '',
    ownerPhone: '',
  });

  const waitingQueue = getWaitingQueue();
  const displayPets = searchKeyword ? searchPets(searchKeyword) : pets;

  const handleCreatePet = () => {
    if (!formData.name || !formData.ownerName || !formData.ownerPhone) return;

    const newPet = addPet(formData);
    setSelectedPetId(newPet.id);
    setShowForm(false);
    setFormData({
      name: '',
      species: 'dog',
      breed: '',
      age: 1,
      ownerName: '',
      ownerPhone: '',
    });
  };

  const handleTakeNumber = (petId: string) => {
    const pet = getPetById(petId);
    if (!pet) return;

    try {
      const appt = createAppointment(pet);
      const room = getRoomById(appt.roomId);
      alert(
        `取号成功！\n排号：${appt.queueNumber}\n诊室：${room?.name || '未分配'}`
      );
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">取号排队</h1>
          <p className="text-slate-500 mt-1">为患宠登记取号，智能分配诊室</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
        >
          <Plus className="w-5 h-5" />
          快速取号
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-emerald-500" />
            患宠信息登记
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                宠物名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入宠物名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                物种
              </label>
              <select
                value={formData.species}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    species: e.target.value as PetSpecies,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              >
                <option value="dog">🐕 犬</option>
                <option value="cat">🐱 猫</option>
                <option value="other">🐾 其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                品种
              </label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e) =>
                  setFormData({ ...formData, breed: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入品种"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                年龄（岁）
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.age}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    age: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                主人姓名 *
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) =>
                  setFormData({ ...formData, ownerName: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入主人姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                联系电话 *
              </label>
              <input
                type="tel"
                value={formData.ownerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, ownerPhone: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="请输入联系电话"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreatePet}
              className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
            >
              确认登记
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            患宠档案
          </h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索宠物名/主人名/电话"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displayPets.map((pet) => (
              <div
                key={pet.id}
                onClick={() => setSelectedPetId(pet.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  selectedPetId === pet.id
                    ? 'bg-emerald-50 border-2 border-emerald-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">{pet.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {pet.breed || '未知品种'} · {pet.age}岁
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedPetId && (
            <button
              onClick={() => handleTakeNumber(selectedPetId)}
              className="w-full mt-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
            >
              为选中患宠取号
            </button>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            排队队列
            <span className="ml-2 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-sm rounded-full">
              {waitingQueue.length} 位等待
            </span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    序号
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    排号
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    患宠
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    诊室
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    状态
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                    取号时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {waitingQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>暂无排队患宠</p>
                    </td>
                  </tr>
                ) : (
                  waitingQueue.map((appt, index) => {
                    const pet = getPetById(appt.petId);
                    const room = getRoomById(appt.roomId);

                    return (
                      <tr
                        key={appt.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                              index === 0
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {appt.queueNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {pet?.species === 'dog'
                                ? '🐕'
                                : pet?.species === 'cat'
                                ? '🐱'
                                : '🐾'}
                            </span>
                            <div>
                              <p className="font-medium text-slate-800">
                                {pet?.name || '未知'}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {pet?.ownerName || '未知'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {room?.name || '未分配'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">
                          {new Date(appt.createdAt).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
