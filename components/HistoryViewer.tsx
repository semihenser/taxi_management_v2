
import React, { useState, useMemo } from 'react';
import { TaxiStand, ChangeLog } from '../types';
import { X, Calendar, User, FileText, ArrowLeft, Clock, MapPin, Car, Phone, Info } from 'lucide-react';

interface HistoryViewerProps {
  stand: TaxiStand;
  initialUkomeNo?: string | null;
  onClose: () => void;
}

// Durağın belirli bir zamandaki halini yeniden oluşturmak için yardımcı fonksiyon
const reconstructStand = (currentStand: TaxiStand, targetUkomeNo: string | null): TaxiStand => {
  // Eğer hedef seçim yoksa veya en güncel hal isteniyorsa direkt döndür
  if (!targetUkomeNo) return currentStand;

  // Derin kopya oluştur
  const snapshot = JSON.parse(JSON.stringify(currentStand));
  
  // Tüm geçmişi tersten (en yeni -> en eski) sırala
  const sortedHistory = [...(currentStand.history || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Hedeflenen UKOME kararını bul
  const targetLogs = sortedHistory.filter(h => h.relatedUkomeNo === targetUkomeNo);
  
  if (targetLogs.length === 0) return currentStand;

  // Hedef grubun en son işlenen kaydının zamanı (Bu kararın sisteme girildiği an)
  const targetTimestamp = new Date(targetLogs[0].timestamp).getTime();

  // Hedef zamandan DAHA YENİ olan tüm değişiklikleri bul ve geri al
  const logsToRevert = sortedHistory.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime > targetTimestamp; 
  });

  // Değişiklikleri geri al (Rollback)
  logsToRevert.forEach(log => {
    const field = log.fieldName as keyof TaxiStand;
    
    // Özel alan dönüşümleri
    if (field === 'capacity') {
      snapshot[field] = Number(log.oldValue);
    } else if (field === 'plates') {
      // Plakalar string olarak saklanıyor "35 T 1, 35 T 2" -> Array'e çevir
      snapshot[field] = log.oldValue === '(Plaka Yok)' ? [] : log.oldValue.split(', ').filter(Boolean);
    } else {
      // Diğer string alanlar
      snapshot[field] = log.oldValue;
    }
  });
  
  return snapshot;
};

const HistoryViewer: React.FC<HistoryViewerProps> = ({ stand, initialUkomeNo, onClose }) => {
  const [selectedUkomeNo, setSelectedUkomeNo] = useState<string | null>(initialUkomeNo || null);

  // Geçmişi UKOME kararlarına göre grupla
  const groupedHistory = useMemo(() => {
    const groups: Record<string, {
      no: string;
      date: string; // Kararın tarihi (ukomeDate)
      timestamp: string; // İşlem zamanı
      summary: string; // İlk logdan al
      logs: ChangeLog[];
      user: string;
    }> = {};

    // Manuel düzenlemeleri ve UKOME kararlarını ayır
    stand.history.forEach(log => {
      const key = log.relatedUkomeNo || 'Manuel Düzenleme';
      
      if (!groups[key]) {
        groups[key] = {
          no: key,
          date: log.relatedUkomeDate || '-',
          timestamp: log.timestamp,
          summary: '', // Birazdan dolduracağız
          logs: [],
          user: log.changedBy
        };
      }
      
      groups[key].logs.push(log);
      // En güncel timestamp grubun zamanı olsun
      if (new Date(log.timestamp) > new Date(groups[key].timestamp)) {
        groups[key].timestamp = log.timestamp;
      }
    });

    // Grupları diziye çevir ve sırala (En yeni en üstte)
    return Object.values(groups).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [stand.history]);

  // Seçili anın görüntüsü
  const snapshotStand = useMemo(() => {
    return reconstructStand(stand, selectedUkomeNo);
  }, [stand, selectedUkomeNo]);

  // Seçili grubun detayları
  const selectedGroup = groupedHistory.find(g => g.no === selectedUkomeNo);

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'ukomeDecisionNo': return 'Karar No';
      case 'ukomeDate': return 'Karar Tarihi';
      case 'address': return 'Açık Adres';
      case 'district': return 'İlçe';
      case 'capacity': return 'Kapasite';
      case 'plates': return 'Plakalar';
      case 'status': return 'Durum';
      case 'name': return 'Durak Adı';
      case 'notes': return 'Notlar';
      default: return field;
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col md:flex-row animate-in slide-in-from-right duration-300">
        
        {/* SOL PANEL: Karar Listesi */}
        <div className={`w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col h-full ${selectedUkomeNo ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-5 border-b border-slate-200 bg-white">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-blue-600" size={20} />
              Karar Geçmişi
            </h2>
            <p className="text-xs text-slate-500 mt-1">Görüntülemek için bir işlem seçin.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
             {/* En Güncel Hal Kartı */}
             <div 
                onClick={() => setSelectedUkomeNo(null)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedUkomeNo === null 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100' 
                    : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                }`}
             >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm">Mevcut Durum</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedUkomeNo === null ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    ŞİMDİ
                  </span>
                </div>
                <div className={`text-xs ${selectedUkomeNo === null ? 'text-blue-100' : 'text-slate-500'}`}>
                  Durağın şu anki güncel hali.
                </div>
             </div>

             {groupedHistory.map((group) => (
               <div 
                 key={group.no}
                 onClick={() => setSelectedUkomeNo(group.no)}
                 className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${
                   selectedUkomeNo === group.no 
                     ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-md' 
                     : 'bg-white border-slate-200 hover:border-blue-300'
                 }`}
               >
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       <FileText size={16} className={selectedUkomeNo === group.no ? 'text-blue-600' : 'text-slate-400'} />
                       <span className="font-bold text-slate-800 text-sm">
                         {group.no === 'Manuel Düzenleme' ? 'Düzenleme' : group.no}
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
                 
                 {/* Değişen alan sayısı badge */}
                 <div className="absolute bottom-2 right-2 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    {group.logs.length} Değişiklik
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* SAĞ PANEL: Detay / Snapshot Görüntüleme */}
        <div className={`w-full md:w-2/3 bg-white flex flex-col h-full ${!selectedUkomeNo ? 'hidden md:flex' : 'flex'}`}>
           {/* Header */}
           <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setSelectedUkomeNo(null)}
                   className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
                 >
                   <ArrowLeft size={20} />
                 </button>
                 <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                       {selectedUkomeNo ? `${selectedUkomeNo} Kararı Sonrası` : 'Güncel Durum'}
                    </h3>
                    <p className="text-xs text-slate-500">
                       {selectedUkomeNo 
                          ? 'Durağın bu karar uygulandıktan sonraki görünümü.' 
                          : 'Durağın sistemdeki en son hali.'}
                    </p>
                 </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={24} />
              </button>
           </div>

           {/* Content - Snapshot Visualization */}
           <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              
              {/* Snapshot Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                 <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div className="font-semibold text-slate-700 flex items-center gap-2">
                       <Info size={18} className="text-blue-500" />
                       Durak Bilgileri ({selectedUkomeNo ? 'Arşiv' : 'Güncel'})
                    </div>
                    {selectedUkomeNo && (
                       <span className="text-[10px] uppercase font-bold text-white bg-orange-400 px-2 py-1 rounded">
                          Geçmiş Kayıt
                       </span>
                    )}
                 </div>
                 
                 <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase">Durak Adı</label>
                       <div className="text-lg font-bold text-slate-800 mt-1">{snapshotStand.name}</div>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase">Durum</label>
                       <div className="mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-bold rounded border ${
                              snapshotStand.status === 'Aktif' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                              {snapshotStand.status}
                          </span>
                       </div>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase">İlçe / Mahalle</label>
                       <div className="text-slate-700 mt-1 font-medium">{snapshotStand.district} / {snapshotStand.neighborhood}</div>
                    </div>
                     <div>
                       <label className="text-xs font-bold text-slate-400 uppercase">Kapasite</label>
                       <div className="text-slate-700 mt-1 font-medium">{snapshotStand.capacity} Araç</div>
                    </div>
                    <div className="md:col-span-2">
                       <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                          <MapPin size={12} /> Adres
                       </label>
                       <div className="text-slate-600 mt-1 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                          {snapshotStand.address}
                       </div>
                    </div>
                    <div className="md:col-span-2">
                       <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-2">
                          <Car size={12} /> Kayıtlı Plakalar ({snapshotStand.plates?.length || 0})
                       </label>
                       <div className="flex flex-wrap gap-2">
                          {snapshotStand.plates && snapshotStand.plates.length > 0 ? (
                             snapshotStand.plates.map((p, i) => (
                                <span key={i} className="text-xs font-mono font-bold bg-yellow-50 text-slate-800 border border-yellow-200 px-2 py-1 rounded">
                                   {p}
                                </span>
                             ))
                          ) : (
                             <span className="text-xs text-slate-400 italic">Plaka kaydı yok</span>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Changes Log for Selected Decision */}
              {selectedGroup && (
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                       <h4 className="font-semibold text-slate-700 text-sm">Bu Kararda Yapılan Değişiklikler</h4>
                    </div>
                    <table className="w-full text-left text-sm">
                       <thead>
                          <tr className="border-b border-slate-100 text-xs text-slate-500">
                             <th className="px-6 py-2 font-medium">Alan</th>
                             <th className="px-6 py-2 font-medium">Eski Değer</th>
                             <th className="px-6 py-2 font-medium">Yeni Değer</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {selectedGroup.logs.map((log) => (
                             <tr key={log.id}>
                                <td className="px-6 py-3 font-medium text-slate-700">
                                   {getFieldLabel(log.fieldName)}
                                </td>
                                <td className="px-6 py-3 text-red-500 text-xs line-through opacity-70">
                                   {log.oldValue}
                                </td>
                                <td className="px-6 py-3 text-green-600 font-bold text-xs">
                                   {log.newValue}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}

              {selectedUkomeNo === null && (
                 <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <Clock size={48} className="mb-4 text-slate-200" />
                    <p>Geçmişte durağın nasıl göründüğünü incelemek için<br/>sol menüden bir UKOME kararı seçin.</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryViewer;
