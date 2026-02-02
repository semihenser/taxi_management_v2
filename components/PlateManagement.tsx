import React, { useState, useMemo } from 'react';
import { TaxiStand } from '../types';
import { Search, Save, History, Car, ArrowRightLeft, MapPin, AlertCircle, CheckCircle2, ArrowLeft, Building2, Calendar, FileDown } from 'lucide-react';
import { saveStand, generateChanges } from '../services/storageService';
import { generatePlateReport } from '../services/reportService';

interface PlateManagementProps {
  stands: TaxiStand[];
  onRefresh: () => Promise<void>;
  onBack: () => void;
}

const PlateManagement: React.FC<PlateManagementProps> = ({ stands, onRefresh, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPlate, setSearchedPlate] = useState<string | null>(null);
  const [targetStandId, setTargetStandId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizedSearch = searchedPlate ? searchedPlate.trim().toUpperCase() : '';

  // Tüm plakaları listele (Autocomplete için)
  const allPlates = useMemo(() => {
    const plates = new Set<string>();
    stands.forEach(stand => {
      if (stand.plates) {
        stand.plates.forEach(p => plates.add(p));
      }
    });
    return Array.from(plates).sort();
  }, [stands]);

  // Mevcut Durağı Bul
  const currentStand = useMemo(() => {
    if (!normalizedSearch) return null;
    return stands.find(s => s.plates.includes(normalizedSearch));
  }, [stands, normalizedSearch]);

  // Plaka Geçmişini Analiz Et
  const plateHistory = useMemo(() => {
    if (!normalizedSearch) return [];
    
    const historyItems: {
        id: string;
        date: string;
        standName: string;
        action: 'GİRİŞ' | 'ÇIKIŞ';
        details: string;
        user: string;
    }[] = [];

    stands.forEach(stand => {
        stand.history.forEach(log => {
            if (log.fieldName === 'plates') {
                const oldPlates = log.oldValue === '(Plaka Yok)' ? [] : log.oldValue.split(', ').map(p => p.trim());
                const newPlates = log.newValue === '(Plaka Yok)' ? [] : log.newValue.split(', ').map(p => p.trim());
                
                const wasIn = oldPlates.includes(normalizedSearch);
                const isIn = newPlates.includes(normalizedSearch);

                if (!wasIn && isIn) {
                    historyItems.push({
                        id: log.id,
                        date: log.timestamp,
                        standName: stand.name,
                        action: 'GİRİŞ',
                        details: `Durağa eklendi. Ref: ${log.relatedUkomeNo || 'Manuel İşlem'}`,
                        user: log.changedBy
                    });
                } else if (wasIn && !isIn) {
                    historyItems.push({
                        id: log.id,
                        date: log.timestamp,
                        standName: stand.name,
                        action: 'ÇIKIŞ',
                        details: `Duraktan ayrıldı. Ref: ${log.relatedUkomeNo || 'Manuel İşlem'}`,
                        user: log.changedBy
                    });
                }
            }
        });
    });

    return historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stands, normalizedSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
        const plate = searchTerm.trim().toUpperCase();
        setSearchedPlate(plate);
        setSuccessMessage(null);
        setTargetStandId('');
    }
  };

  const handleDownloadReport = () => {
    if (searchedPlate) {
        generatePlateReport(searchedPlate, plateHistory, currentStand || null);
    }
  };

  const handleTransfer = async () => {
    if (!searchedPlate || !targetStandId) return;
    if (currentStand && currentStand.id === targetStandId) {
        alert("Plaka zaten bu durakta.");
        return;
    }

    if (!confirm(`${searchedPlate} plakasını ${currentStand ? currentStand.name + ' durağından alıp ' : ''} seçilen durağa transfer etmek istiyor musunuz?`)) {
        return;
    }

    setIsSubmitting(true);
    try {
        const targetStand = stands.find(s => s.id === targetStandId);
        if (!targetStand) throw new Error("Hedef durak bulunamadı.");

        const timestamp = new Date().toISOString();
        const transferRef = `TRANSFER-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '')}`;

        // 1. Mevcut duraktan çıkar (Varsa)
        if (currentStand) {
            const updatedCurrentStand = {
                ...currentStand,
                plates: currentStand.plates.filter(p => p !== searchedPlate),
                updatedAt: timestamp
            };
            
            const changes = generateChanges(currentStand, updatedCurrentStand);
            // Log detaylarını özelleştir
            changes.forEach(c => {
                c.relatedUkomeNo = transferRef;
                c.changedBy = 'PlakaYönetim';
            });
            
            updatedCurrentStand.history = [...currentStand.history, ...changes];
            await saveStand(updatedCurrentStand);
        }

        // 2. Yeni durağa ekle
        const updatedTargetStand = {
            ...targetStand,
            plates: [...targetStand.plates, searchedPlate].sort(),
            updatedAt: timestamp
        };

        const changes = generateChanges(targetStand, updatedTargetStand);
        changes.forEach(c => {
            c.relatedUkomeNo = transferRef;
            c.changedBy = 'PlakaYönetim';
        });
        updatedTargetStand.history = [...targetStand.history, ...changes];
        
        await saveStand(updatedTargetStand);

        await onRefresh();
        setSuccessMessage(`${searchedPlate} başarıyla ${targetStand.name} durağına taşındı.`);
        setTargetStandId('');
    } catch (error) {
        console.error(error);
        alert("Transfer sırasında hata oluştu.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
             </button>
             <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Car className="text-purple-600" />
                Plaka Yönetim Paneli
             </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
         {/* Search Bar */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
             <form onSubmit={handleSearch} className="flex gap-4 items-end">
                <div className="flex-1 max-w-md">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plaka Sorgula</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text"
                            list="plate-search-suggestions"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Örn: 35 T 1234"
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-lg font-mono uppercase"
                            autoFocus
                        />
                        <datalist id="plate-search-suggestions">
                            {allPlates.map((plate) => (
                                <option key={plate} value={plate} />
                            ))}
                        </datalist>
                    </div>
                </div>
                <button 
                    type="submit"
                    className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                    Sorgula
                </button>
             </form>
         </div>

         {searchedPlate && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {/* Left Column: Current Status & Actions */}
                 <div className="space-y-6">
                     {/* Status Card */}
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                             <div className="flex items-center gap-4">
                                <h3 className="font-semibold text-slate-800">Mevcut Durum</h3>
                                <span className="font-mono font-bold text-lg bg-slate-200 px-3 py-1 rounded text-slate-800">
                                    {searchedPlate}
                                </span>
                             </div>
                             
                             <button 
                                onClick={handleDownloadReport}
                                className="flex items-center gap-2 text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors"
                             >
                                <FileDown size={16} /> PDF Rapor
                             </button>
                         </div>
                         <div className="p-8 text-center">
                             {currentStand ? (
                                 <div className="flex flex-col items-center">
                                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                                         <MapPin size={32} />
                                     </div>
                                     <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentStand.name}</h2>
                                     <p className="text-slate-500">{currentStand.district} / {currentStand.neighborhood}</p>
                                     <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                                         <CheckCircle2 size={14} /> Aktif Olarak Çalışıyor
                                     </div>
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center">
                                     <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                         <AlertCircle size={32} />
                                     </div>
                                     <h2 className="text-xl font-bold text-slate-700 mb-2">Boşta / Kayıtsız</h2>
                                     <p className="text-slate-500">Bu plaka şu anda hiçbir durağa kayıtlı görünmüyor.</p>
                                 </div>
                             )}
                         </div>
                     </div>

                     {/* Action Card */}
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
                             <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                                 <ArrowRightLeft size={18} /> Durak Değiştir / Transfer Et
                             </h3>
                         </div>
                         <div className="p-6">
                             {successMessage && (
                                 <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                                     <CheckCircle2 size={18} />
                                     {successMessage}
                                 </div>
                             )}
                             
                             <div className="space-y-4">
                                 <div>
                                     <label className="block text-sm font-medium text-slate-700 mb-1">Yeni Durak Seçin</label>
                                     <select
                                         value={targetStandId}
                                         onChange={(e) => setTargetStandId(e.target.value)}
                                         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                                     >
                                         <option value="">Durak Seçiniz...</option>
                                         {stands
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(s => (
                                             <option key={s.id} value={s.id} disabled={currentStand?.id === s.id}>
                                                 {s.name} ({s.district}) {currentStand?.id === s.id ? '(Mevcut)' : ''}
                                             </option>
                                         ))}
                                     </select>
                                 </div>
                                 
                                 <button
                                     onClick={handleTransfer}
                                     disabled={!targetStandId || isSubmitting}
                                     className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                 >
                                     {isSubmitting ? 'İşleniyor...' : 'Transferi Tamamla'}
                                 </button>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Right Column: History */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                     <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                         <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                             <History size={18} className="text-blue-500" /> Çalışma Geçmişi
                         </h3>
                         <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">
                             {plateHistory.length} Kayıt
                         </span>
                     </div>
                     <div className="overflow-y-auto flex-1 p-0">
                         {plateHistory.length > 0 ? (
                             <div className="divide-y divide-slate-100">
                                 {plateHistory.map((item) => (
                                     <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                                         <div className="flex justify-between items-start mb-1">
                                             <div className="font-bold text-slate-800">{item.standName}</div>
                                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                 item.action === 'GİRİŞ' 
                                                 ? 'bg-green-50 text-green-700 border-green-200' 
                                                 : 'bg-red-50 text-red-700 border-red-200'
                                             }`}>
                                                 {item.action}
                                             </span>
                                         </div>
                                         <div className="text-sm text-slate-500 mb-2">{item.details}</div>
                                         <div className="flex items-center gap-4 text-xs text-slate-400">
                                             <div className="flex items-center gap-1">
                                                 <Calendar size={12} />
                                                 {new Date(item.date).toLocaleDateString('tr-TR')} {new Date(item.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                                             </div>
                                             <div>İşlem: {item.user}</div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                                 <History size={48} className="mb-4 opacity-20" />
                                 <p>Bu plaka için geçmiş kaydı bulunamadı.</p>
                             </div>
                         )}
                     </div>
                 </div>
             </div>
         )}
      </main>
    </div>
  );
};

export default PlateManagement;