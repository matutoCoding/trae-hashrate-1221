import { useState } from 'react';
import { FileText, Search, Calendar, Stethoscope, ClipboardList, Plus } from 'lucide-react';
import { usePetStore } from '../store/usePetStore';
import { useMedicalRecordStore } from '../store/useMedicalRecordStore';
import { useBillingStore } from '../store/useBillingStore';

export default function MedicalRecords() {
  const { pets, getPetById, searchPets } = usePetStore();
  const { records, getRecordsByPetId, addRecord } = useMedicalRecordStore();
  const { getBillsByPetId } = useBillingStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: '',
    treatment: '',
    notes: '',
  });

  const displayPets = searchKeyword ? searchPets(searchKeyword) : pets;
  const selectedPet = selectedPetId ? getPetById(selectedPetId) : null;
  const petRecords = selectedPetId ? getRecordsByPetId(selectedPetId) : [];
  const petBills = selectedPetId ? getBillsByPetId(selectedPetId) : [];

  const handleAddRecord = () => {
    if (!selectedPetId || !formData.diagnosis) return;

    addRecord({
      petId: selectedPetId,
      appointmentId: `record-${Date.now()}`,
      diagnosis: formData.diagnosis,
      treatment: formData.treatment,
      notes: formData.notes,
    });

    setFormData({ diagnosis: '', treatment: '', notes: '' });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">病历档案</h1>
          <p className="text-slate-500 mt-1">患宠健康档案与历史诊疗记录</p>
        </div>
        {selectedPetId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增病历
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            患宠列表
          </h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索患宠"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
            {displayPets.map((pet) => {
              const recordCount = getRecordsByPetId(pet.id).length;
              return (
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
                      {pet.species === 'dog'
                        ? '🐕'
                        : pet.species === 'cat'
                        ? '🐱'
                        : '🐾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800">{pet.name}</p>
                      <p className="text-xs text-slate-500">
                        {recordCount} 条病历记录
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedPet ? (
            <>
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">
                    {selectedPet.species === 'dog'
                      ? '🐕'
                      : selectedPet.species === 'cat'
                      ? '🐱'
                      : '🐾'}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedPet.name}</h2>
                    <p className="text-white/80 mt-1">
                      {selectedPet.breed || '未知品种'} · {selectedPet.age}岁
                    </p>
                    <div className="flex gap-6 mt-3">
                      <div>
                        <p className="text-xs text-white/70">主人</p>
                        <p className="font-medium">{selectedPet.ownerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">电话</p>
                        <p className="font-medium">{selectedPet.ownerPhone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">病历数</p>
                        <p className="font-medium">{petRecords.length} 条</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">账单数</p>
                        <p className="font-medium">{petBills.length} 笔</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {showAddForm && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    新增病历
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        诊断结果 *
                      </label>
                      <textarea
                        value={formData.diagnosis}
                        onChange={(e) =>
                          setFormData({ ...formData, diagnosis: e.target.value })
                        }
                        rows={2}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                        placeholder="请输入诊断结果"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        治疗方案
                      </label>
                      <textarea
                        value={formData.treatment}
                        onChange={(e) =>
                          setFormData({ ...formData, treatment: e.target.value })
                        }
                        rows={2}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                        placeholder="请输入治疗方案"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        医嘱备注
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        rows={2}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                        placeholder="请输入医嘱备注"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-5 py-2.5 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddRecord}
                        className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                      >
                        保存病历
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-500" />
                  诊疗记录
                </h2>

                {petRecords.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无病历记录</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-slate-200"></div>
                    <div className="space-y-6">
                      {petRecords.map((record, index) => (
                        <div key={record.id} className="relative pl-14">
                          <div className="absolute left-2 top-2 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow flex items-center justify-center">
                            <Stethoscope className="w-2.5 h-2.5 text-white" />
                          </div>
                          <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-500">
                                  {new Date(record.createdAt).toLocaleDateString(
                                    'zh-CN',
                                    {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    }
                                  )}
                                </span>
                              </div>
                              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                第 {petRecords.length - index} 次就诊
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">诊断</p>
                                <p className="text-slate-800 font-medium">
                                  {record.diagnosis}
                                </p>
                              </div>
                              {record.treatment && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">治疗</p>
                                  <p className="text-slate-700">{record.treatment}</p>
                                </div>
                              )}
                              {record.notes && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">备注</p>
                                  <p className="text-slate-600 text-sm">
                                    {record.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">
                请选择患宠查看病历
              </h3>
              <p className="text-slate-400 text-sm">
                从左侧列表中选择一只患宠，查看其详细病历档案
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
