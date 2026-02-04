import React, { useState, useMemo, useEffect } from 'react';
import { TaxiStand, ChangeLog } from '../types';
import { X, Calendar, User, FileText, ArrowLeft, Clock, MapPin, Car, Phone, Info, Building2, ShieldCheck, Hash, Pencil, Save, RotateCcw, Check } from 'lucide-react';

interface HistoryViewerProps {
  stand: TaxiStand;
  initialUkomeNo?: string | null;
  onClose: () => void;
  onSave?: (stand: TaxiStand) => Promise<void>;
}

// Durağın belirli bir zamandaki halini yeniden oluşturmak için yardımcı fonksiyon
const reconstructStand = (currentStand: TaxiStand, targetUkomeNo: string | null): TaxiStand => {
  if (!targetUkomeNo) return currentStand;

  const snapshot = JSON.parse(JSON.stringify(currentStand));
  const sortedHistory = [...(currentStand.history || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const targetLogs = sortedHistory.filter(h => h.relatedUkomeNo === targetUkomeNo);
  if (targetLogs.length === 0) return currentStand;

  const targetTimestamp = new Date(targetLogs[0].timestamp).getTime();
  const logsToRevert = sortedHistory.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime > targetTimestamp; 
  });

  logsToRevert.forEach(log => {
    const field = log.fieldName as keyof TaxiStand;
    if (field === 'capacity') {
      snapshot[field] = Number(log.oldValue);
    } else if (field === 'plates') {
      snapshot[field] = log.oldValue === '(Plaka Yok)' ? [] : log.oldValue.split(', ').filter(Boolean);
    } else {
      snapshot[field] = log.oldValue;
    }
  });

  // Snapshot'ın UKOME verilerini de seçili kayda göre güncelle (Görsel tutarlılık için)
  // Bu veriler normalde loglar üzerinden revert edilir ama header bilgisi olarak da set edelim.
  const targetGroupFirstLog = targetLogs[0];
  if(targetGroupFirstLog) {
      snapshot.ukomeDecisionNo = targetGroupFirstLog.relatedUkomeNo || '';
      snapshot.ukomeDate = targetGroupFirstLog.relatedUkomeDate || '';
      // Özet bilgisi loglarda olmayabilir (eğer sadece field değiştiyse), o yüzden boş geçebiliriz veya logdan buluruz
      const summaryLog = targetLogs.find(l => l.fieldName === 'ukomeSummary');
      if (summaryLog) snapshot.ukomeSummary = summaryLog.newValue;
  }
  
  return snapshot;
};

const HistoryViewer: React.FC<HistoryViewerProps> = ({ stand, initialUkomeNo, onClose, onSave }) => {
  const [selectedUkomeNo, setSelectedUkomeNo] = useState<string | null>(initialUkomeNo || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit State
  const [editData, setEditData] = useState<{
    ukomeNo: string;
    ukomeDate: string;
    summary: string;
    logs: { id: string; oldValue: string; newValue: string }[];
  } | null>(null);

  // Geçmişi UKOME kararlarına göre grupla
  const groupedHistory = useMemo(() => {
    const groups: Record<string, {
      no: string;
      date: string;
      timestamp: string;
      summary: string;
      logs: ChangeLog[];
      user: string;
    }> = {};

    stand.history.forEach(log => {
      const key = log.relatedUkomeNo || 'Manuel Düzenleme';
      
      if (!groups[key]) {
        groups[key] = {
          no: key,
          date: log.relatedUkomeDate || '-',
          timestamp: log.timestamp,
          summary: '', 
          logs: [],
          user: log.changedBy
        };
      }
      
      groups[key].logs.push(log);
      if (new Date(log.timestamp) > new Date(groups[key].timestamp)) {
        groups[key].timestamp = log.timestamp;
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [stand.history]);

  useEffect(() => {
    if (!selectedUkomeNo && groupedHistory.length > 0) {
        setSelectedUkomeNo(groupedHistory[0].no);
    }
  }, [groupedHistory, selectedUkomeNo]);

  // Edit modu açıldığında verileri hazırla
  const handleStartEdit = () => {
    if (!selectedUkomeNo) return;
    const group = groupedHistory.find(g => g.no === selectedUkomeNo);
    if (!group) return;

    // Özet bilgisini loglardan bul
    const summaryLog = group.logs.find(l => l.fieldName === 'ukomeSummary');
    const summary = summaryLog ? summaryLog.newValue : '';

    setEditData({
        ukomeNo: group.no === 'Manuel Düzenleme' ? '' : group.no,
        ukomeDate: group.date === '-' ? '' : group.date,
        summary: summary,
        logs: group.logs.map(l => ({ id: l.id, oldValue: l.oldValue, newValue: l.newValue }))
    });
    setIsEditing(true);
  };

  const handleSaveChanges = async () => {
    if (!editData || !selectedUkomeNo || !onSave) return;

    if (!confirm("Yapılan değişiklikler geçmiş kayıtlarını güncelleyecektir. Emin misiniz?")) return;

    setIsSaving(true);
    try {
        const updatedStand = JSON.parse(JSON.stringify(stand)) as TaxiStand;
        
        // 1. Logları Güncelle
        updatedStand.history = updatedStand.history.map(log => {
            const editedLog = editData.logs.find(el => el.id === log.id);
            if (editedLog) {
                return {
                    ...log,
                    relatedUkomeNo: editData.ukomeNo || log.relatedUkomeNo, // Eğer manuel ise eskiyi koru ya da boş bırak
                    relatedUkomeDate: editData.ukomeDate,
                    oldValue: editedLog.oldValue,
                    newValue: editedLog.newValue
                };
            }
            return log;
        });

        // 2. Eğer özet değiştiyse ve loglarda varsa güncelle, yoksa ekle (Basitlik için sadece varsa güncelliyoruz)
        const summaryLogIndex = updatedStand.history.findIndex(l => 
            (l.relatedUkomeNo === selectedUkomeNo || (selectedUkomeNo === 'Manuel Düzenleme' && !l.relatedUkomeNo)) && 
            l.fieldName === 'ukomeSummary'
        );

        if (summaryLogIndex >= 0) {
            updatedStand.history[summaryLogIndex].newValue = editData.summary;
            updatedStand.history[summaryLogIndex].relatedUkomeNo = editData.ukomeNo;
            updatedStand.history[summaryLogIndex].relatedUkomeDate = editData.ukomeDate;
        }

        // 3. EĞER düzenlenen grup EN GÜNCEL grup ise, Stand'ın ana verilerini de güncelle (Senkronizasyon)
        // Grubun zaman damgası en büyük mü kontrol et
        const isLatestGroup = groupedHistory[0].no === selectedUkomeNo;
        
        if (isLatestGroup) {
            // Metadata güncelle
            updatedStand.ukomeDecisionNo = editData.ukomeNo;
            updatedStand.ukomeDate = editData.ukomeDate;
            updatedStand.ukomeSummary = editData.summary;

            // Değerleri güncelle
            editData.logs.forEach(editedLog => {
               const originalLog = stand.history.find(l => l.id === editedLog.id);
               if (originalLog) {
                   const field = originalLog.fieldName as keyof TaxiStand;
                   // Sadece basit alanları güncelle, complex objectleri (location vb) şimdilik pas geç
                   if (field !== 'history' && field !== 'location') {
                        if (field === 'capacity') {
                             (updatedStand as any)[field] = Number(editedLog.newValue);
                        } else if (field === 'plates') {
                             // Plaka array dönüşümü
                             (updatedStand as any)[field] = editedLog.newValue === '(Plaka Yok)' ? [] : editedLog.newValue.split(', ').filter(Boolean);
                        } else {
                             (updatedStand as any)[field] = editedLog.newValue;
                        }
                   }
               }
            });
        }

        await onSave(updatedStand);
        setIsEditing(false);
        // Refresh için gerek yok, parent refresh yapacak
    } catch (error) {
        console.error("Update error:", error);
        alert("Güncelleme sırasında hata oluştu.");
    } finally {
        setIsSaving(false);
    }
  };

  const snapshotStand = useMemo(() => {
    return reconstructStand(stand, selectedUkomeNo);
  }, [stand, selectedUkomeNo]);

  const selectedGroup = groupedHistory.find(g => g.no === selectedUkomeNo);

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'ukomeDecisionNo': return 'Karar No';
      case 'ukomeDate': return 'Karar Tarihi';
      case 'address': return 'Açık Adres';
      case 'district': return 'İlçe';
      case 'neighborhood': return 'Mahalle';
      case 'street': return 'Sokak';
      case 'capacity': return 'Kapasite';
      case 'plates': return 'Plakalar';
      case 'status': return 'Durum';
      case 'name': return 'Durak Adı';
      case 'phone': return 'Telefon';
      case 'officeType': return 'Yazıhane Tipi';
      case 'responsibility': return 'Sorumluluk';
      case 'notes': return 'Notlar';
      case 'ukomeSummary': return 'Karar Özeti';
      default: return field;
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col md:flex-row animate-in slide-in-from-right duration-300">
        
        {/* SOL PANEL: Karar Listesi */}
        <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
          <div className="p-5 border-b border-slate-200 bg-white">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-blue-600" size={20} />
              İşlem Geçmişi
            </h2>
            <p className="text-xs text-slate-500 mt-1">İncelemek istediğiniz revizyonu seçin.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
             {groupedHistory.map((group) => (
               <div 
                 key={group.no}
                 onClick={() => !isEditing && setSelectedUkomeNo(group.no)}
                 className={`p-4 rounded-xl border transition-all relative overflow-hidden group ${
                   selectedUkomeNo === group.no 
                     ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-md' 
                     : isEditing ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer'
                 }`}
               >
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       <FileText size={16} className={selectedUkomeNo === group.no ? 'text-blue-600' : 'text-slate-400'} />
                       <span className="font-bold text-slate-800 text-sm">
                         {group.no === 'Manuel Düzenleme' ? 'Manuel Düzeltme' : group.no}
                       </span>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar size={12} />
                    {new Date(group.date !== '-' ? group.date : group.timestamp).toLocaleDateString('tr-TR')}
                 </div>

                 <div className="text-xs text-slate-400 flex items-center gap-1">
                    <User size={12} /> {group.user} tarafından
                 </div>
                 
                 <div className="absolute bottom-2 right-2 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    {group.logs.length} İşlem
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* SAĞ PANEL: Detay / Snapshot Görüntüleme */}
        <div className="w-full md:w-2/3 bg-white flex flex-col h-full relative">
           {/* Header */}
           <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <div className="flex items-center gap-3">
                 <button 
                   onClick={onClose}
                   className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
                 >
                   <ArrowLeft size={20} />
                 </button>
                 <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                       {selectedUkomeNo === 'Manuel Düzenleme' ? 'Manuel Düzeltme Kaydı' : `UKOME Karar No: ${selectedUkomeNo}`}
                    </h3>
                    <p className="text-xs text-slate-500">
                       {isEditing ? 'Hatalı girişleri düzeltmektesiniz.' : 'Bu işlem sonrasında durağın sistemdeki görünümü.'}
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-2">
                  {!isEditing ? (
                      onSave && (
                        <button 
                            onClick={handleStartEdit}
                            className="px-3 py-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2 text-xs font-bold"
                            title="Bu kayıttaki yazım hatalarını düzelt"
                        >
                            <Pencil size={14} /> Düzelt
                        </button>
                      )
                  ) : (
                      <>
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 text-xs font-bold"
                            disabled={isSaving}
                        >
                            <RotateCcw size={14} /> İptal
                        </button>
                        <button 
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
                        >
                            {isSaving ? 'Kaydediliyor...' : <><Check size={14} /> Kaydet</>}
                        </button>
                      </>
                  )}
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 ml-2">
                    <X size={24} />
                  </button>
              </div>
           </div>

           {/* Content - Snapshot Visualization */}
           <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              
              {isEditing && editData ? (
                 /* EDIT MODE FORM */
                 <div className="space-y-6 animate-in fade-in zoom-in duration-200">
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                        <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2 text-sm">
                            <Info size={16} /> UKOME Karar Bilgilerini Düzenle
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-orange-800/70 mb-1 block">Karar No</label>
                                <input 
                                    value={editData.ukomeNo}
                                    onChange={(e) => setEditData({...editData, ukomeNo: e.target.value})}
                                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold text-slate-800"
                                />
                            </div>
                             <div>
                                <label className="text-xs font-bold text-orange-800/70 mb-1 block">Karar Tarihi</label>
                                <input 
                                    type="date"
                                    value={editData.ukomeDate}
                                    onChange={(e) => setEditData({...editData, ukomeDate: e.target.value})}
                                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-orange-800/70 mb-1 block">Karar Özeti</label>
                                <textarea 
                                    rows={2}
                                    value={editData.summary}
                                    onChange={(e) => setEditData({...editData, summary: e.target.value})}
                                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                           <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Değişiklik Loglarını Düzenle</h4>
                        </div>
                        <table className="w-full text-left text-sm">
                           <thead>
                              <tr className="border-b border-slate-100 text-xs text-slate-500 bg-slate-50/50">
                                 <th className="px-6 py-2 font-medium">Değişen Alan</th>
                                 <th className="px-6 py-2 font-medium">Eski Değer</th>
                                 <th className="px-6 py-2 font-medium">Yeni Değer</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {selectedGroup?.logs.map((log) => {
                                 // Summary'yi yukarıda editledik, buradan gizleyelim
                                 if (log.fieldName === 'ukomeSummary') return null;
                                 
                                 const editLog = editData.logs.find(l => l.id === log.id);

                                 return (
                                     <tr key={log.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-3 font-medium text-slate-700">
                                           {getFieldLabel(log.fieldName)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <input 
                                                value={editLog?.oldValue || ''}
                                                onChange={(e) => {
                                                    const newLogs = editData.logs.map(l => l.id === log.id ? {...l, oldValue: e.target.value} : l);
                                                    setEditData({...editData, logs: newLogs});
                                                }}
                                                className="w-full bg-red-50 border border-red-100 px-2 py-1 rounded text-red-800 text-xs focus:ring-1 focus:ring-red-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <input 
                                                value={editLog?.newValue || ''}
                                                onChange={(e) => {
                                                    const newLogs = editData.logs.map(l => l.id === log.id ? {...l, newValue: e.target.value} : l);
                                                    setEditData({...editData, logs: newLogs});
                                                }}
                                                className="w-full bg-green-50 border border-green-100 px-2 py-1 rounded text-green-800 font-bold text-xs focus:ring-1 focus:ring-green-500 outline-none"
                                            />
                                        </td>
                                     </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                 </div>
              ) : (
                 /* VIEW MODE */
                 <>
                    {/* Snapshot Card - Full Details */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                            <div className="font-semibold text-slate-700 flex items-center gap-2 text-sm uppercase">
                            <Info size={16} className="text-blue-600" />
                            Durağın O Tarihteki Özellikleri
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                                ARŞİV KAYDI
                            </span>
                        </div>
                        
                        <div className="p-6">
                            {/* Temel Bilgiler Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8 mb-6">
                                <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Durak Adı</label>
                                <div className="text-sm font-bold text-slate-800">{snapshotStand.name}</div>
                                </div>
                                <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Durum</label>
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded border ${
                                        snapshotStand.status === 'Aktif' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                        {snapshotStand.status}
                                    </span>
                                </div>
                                <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Yazıhane Tipi</label>
                                <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                        <Building2 size={14} className="text-slate-400" />
                                        {snapshotStand.officeType}
                                </div>
                                </div>
                                <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Telefon</label>
                                <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                        <Phone size={14} className="text-slate-400" />
                                        {snapshotStand.phone || '-'}
                                </div>
                                </div>
                                <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sorumluluk</label>
                                <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                        <ShieldCheck size={14} className="text-slate-400" />
                                        {snapshotStand.responsibility}
                                </div>
                                </div>
                                <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kapasite</label>
                                <div className="text-sm font-bold text-blue-600">{snapshotStand.capacity} Araç</div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 my-4"></div>

                            {/* Konum Bilgileri */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 mb-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">İlçe / Mahalle</label>
                                    <div className="text-sm font-medium text-slate-800">{snapshotStand.district} / {snapshotStand.neighborhood}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sokak</label>
                                    <div className="text-sm font-medium text-slate-800">{snapshotStand.street || '-'}</div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                        <MapPin size={12} /> Tam Açık Adres
                                    </label>
                                    <div className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                                        {snapshotStand.address}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 my-4"></div>

                            {/* Plakalar */}
                            <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                                <Car size={12} /> O Tarihte Kayıtlı Plakalar ({snapshotStand.plates?.length || 0})
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {snapshotStand.plates && snapshotStand.plates.length > 0 ? (
                                    snapshotStand.plates.map((p, i) => (
                                        <span key={i} className="text-xs font-mono font-bold bg-yellow-50 text-slate-800 border border-yellow-200 px-2 py-1 rounded shadow-sm">
                                        {p}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Kayıtlı plaka yok</span>
                                )}
                            </div>
                            </div>

                            <div className="border-t border-slate-100 my-4"></div>

                            {/* UKOME Detayı */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                    <Hash size={12} /> UKOME Karar Bilgisi (Snapshot)
                                </label>
                                <div className="bg-blue-50/50 p-3 rounded border border-blue-100 grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-blue-400 block">Karar No</span>
                                        <span className="text-sm font-semibold text-blue-900">{snapshotStand.ukomeDecisionNo || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-blue-400 block">Karar Tarihi</span>
                                        <span className="text-sm font-semibold text-blue-900">{snapshotStand.ukomeDate || '-'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-[10px] text-blue-400 block">Özet</span>
                                        <span className="text-sm text-blue-800">{snapshotStand.ukomeSummary || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Changes Log Table */}
                    {selectedGroup && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Bu Karar İle Yapılan Değişiklikler</h4>
                            </div>
                            <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs text-slate-500 bg-slate-50/50">
                                    <th className="px-6 py-2 font-medium">Değişen Alan</th>
                                    <th className="px-6 py-2 font-medium">Eski Değer</th>
                                    <th className="px-6 py-2 font-medium">Yeni Değer</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {selectedGroup.logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-3 font-medium text-slate-700">
                                        {getFieldLabel(log.fieldName)}
                                        </td>
                                        <td className="px-6 py-3 text-red-500 text-xs opacity-70 break-all max-w-xs">
                                        {log.oldValue}
                                        </td>
                                        <td className="px-6 py-3 text-green-600 font-bold text-xs break-all max-w-xs">
                                        {log.newValue}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                 </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryViewer;