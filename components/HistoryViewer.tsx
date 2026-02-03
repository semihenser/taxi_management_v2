import React, { useState, useMemo, useEffect } from 'react';
import { TaxiStand, ChangeLog } from '../types';
import { X, Calendar, User, FileText, ArrowLeft, Clock, MapPin, Car, Phone, Info, Building2, ShieldCheck, Hash } from 'lucide-react';

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
  
  // Eğer hedef karar loglarda yoksa (örn: manuel giriş öncesi), en güncel hali döndürmek yerine
  // mantıken o tarihe gitmeye çalışırız ama burada basitlik adına current dönüyoruz.
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
  
  // Snapshot'ın UKOME bilgilerini de o anki duruma eşitle (Geri alınan loglar arasında ukomeDecisionNo varsa zaten düzelmiştir ama garanti olsun)
  // Not: Loglarda ukomeDecisionNo değişikliği varsa yukarıdaki loop bunu halleder.
  
  return snapshot;
};

const HistoryViewer: React.FC<HistoryViewerProps> = ({ stand, initialUkomeNo, onClose }) => {
  // Başlangıçta mutlaka bir UKOME no seçili gelmeli, yoksa listenin ilk elemanını seçeriz.
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
          summary: '', 
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

  // Eğer initialUkomeNo yoksa ve liste doluysa, en üsttekini (en günceli) seç
  useEffect(() => {
    if (!selectedUkomeNo && groupedHistory.length > 0) {
        setSelectedUkomeNo(groupedHistory[0].no);
    }
  }, [groupedHistory, selectedUkomeNo]);

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
                 
                 {/* Değişen alan sayısı badge */}
                 <div className="absolute bottom-2 right-2 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                    {group.logs.length} İşlem
                 </div>
               </div>
             ))}
             
             {groupedHistory.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-sm">
                    Kayıtlı geçmiş bulunamadı.
                </div>
             )}
          </div>
        </div>

        {/* SAĞ PANEL: Detay / Snapshot Görüntüleme */}
        <div className="w-full md:w-2/3 bg-white flex flex-col h-full">
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
                       Bu işlem sonrasında durağın sistemdeki görünümü aşağıdaki gibidir.
                    </p>
                 </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={24} />
              </button>
           </div>

           {/* Content - Snapshot Visualization */}
           <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              
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
           </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryViewer;