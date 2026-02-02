import React, { useState, useEffect } from 'react';
import { TaxiStand, ViewState } from './types';
import { getStands, saveStand, deleteStand, generateChanges } from './services/storageService';
import StandForm from './components/StandForm';
import StandDetails from './components/StandDetails';
import HistoryViewer from './components/HistoryViewer';
import StandMap from './components/StandMap';
import { 
  Plus, 
  Search, 
  Trash2, 
  CarTaxiFront, 
  Eye,
  FileText,
  Pencil,
  Loader2,
  Map,
  List,
  AlertTriangle
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState | 'MAP'>('LIST');
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT' | 'REVISION'>('CREATE');
  const [stands, setStands] = useState<TaxiStand[]>([]);
  const [selectedStand, setSelectedStand] = useState<TaxiStand | undefined>(undefined);
  const [historyStand, setHistoryStand] = useState<TaxiStand | undefined>(undefined);
  const [initialHistoryUkome, setInitialHistoryUkome] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for Revision Modal
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionData, setRevisionData] = useState({
    decisionNo: '',
    date: new Date().toISOString().split('T')[0],
    summary: ''
  });

  // Load data on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStands();
      setStands(data);
    } catch (err: any) {
      console.error("Firebase Error:", err);
      let errorMessage = "Veritabanına bağlanılamadı.";
      
      if (err.message && err.message.includes("services/firebaseConfig.ts")) {
        errorMessage = err.message;
      } else if (err.code === "permission-denied") {
        errorMessage = "Yetki Hatası: Firestore veritabanı kuralları okuma/yazmayı engelliyor. (Test modunu açın: allow read, write: if true;)";
      } else if (err.code === "unavailable") {
        errorMessage = "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.";
      } else if (err.message && err.message.includes("project")) {
        errorMessage = "Proje Bulunamadı: Firebase Console'da 'Firestore Database' oluşturduğunuzdan emin olun. Sadece proje açmak yetmez, veritabanını da 'Create Database' diyerek oluşturmalısınız.";
      } else {
        // Show raw error for easier debugging
        errorMessage = `Veritabanı Hatası (${err.code || 'Bilinmeyen'}): ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode('CREATE');
    setSelectedStand(undefined);
    setView('FORM');
  };

  const handleView = (stand: TaxiStand) => {
    setSelectedStand(stand);
    setView('VIEW');
  };

  const handleEdit = (stand: TaxiStand) => {
    setFormMode('EDIT');
    setSelectedStand(stand);
    setView('FORM');
  };

  const handleReviseStart = (stand: TaxiStand) => {
    setSelectedStand(stand);
    setRevisionData({
      decisionNo: '',
      date: new Date().toISOString().split('T')[0],
      summary: ''
    });
    setIsRevisionModalOpen(true);
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRevisionModalOpen(false);
    
    if (selectedStand) {
      const standWithNewDecision = {
        ...selectedStand,
        ukomeDecisionNo: revisionData.decisionNo,
        ukomeDate: revisionData.date,
        ukomeSummary: revisionData.summary
      };
      
      setFormMode('REVISION');
      setSelectedStand(standWithNewDecision); 
      setView('FORM');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu durağı silmek istediğinize emin misiniz?')) {
      try {
        await deleteStand(id);
        await refreshData();
        if (view === 'VIEW') setView('LIST');
      } catch (err) {
        alert("Silme işlemi başarısız oldu.");
      }
    }
  };

  const handleSave = async (stand: TaxiStand) => {
    try {
      const originalStand = stands.find(s => s.id === stand.id);

      if (originalStand) {
        let updatedHistory = originalStand.history;

        // Sadece REVISION modundaysa değişiklik günlüğü oluştur
        if (formMode === 'REVISION') {
          const changes = generateChanges(originalStand, stand);
          updatedHistory = [...originalStand.history, ...changes];
        }
        
        const updatedStand: TaxiStand = {
          ...stand,
          history: updatedHistory
        };
        
        await saveStand(updatedStand);
      } else {
        // New Stand
        await saveStand(stand);
      }
      
      await refreshData();
      setView('LIST');
    } catch (err) {
      console.error(err);
      alert("Kayıt işlemi başarısız oldu. Hata detayları konsolda.");
    }
  };

  const handleViewHistory = (stand: TaxiStand, ukomeNo: string | null = null) => {
    setHistoryStand(stand);
    setInitialHistoryUkome(ukomeNo);
  };

  // Filter stands
  const filteredStands = stands.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.ukomeDecisionNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('LIST')}>
            <div className="bg-yellow-400 p-2 rounded-lg text-slate-900">
              <CarTaxiFront size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">TaksiYönetim</h1>
          </div>
          
          <div className="text-sm text-slate-500 hidden sm:block">
             Durak Kayıt Sistemi v1.1
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
             <AlertTriangle className="shrink-0 mt-0.5" size={20} />
             <div className="flex-1">
               <h3 className="font-bold">Bağlantı Hatası</h3>
               <p className="text-sm mt-1">{error}</p>
             </div>
          </div>
        )}
        
        {(view === 'LIST' || view === 'MAP') && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  placeholder="Durak ara (İsim, İlçe, UKOME No)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
              
              <div className="flex w-full sm:w-auto gap-2">
                 <div className="bg-white border border-slate-300 rounded-lg p-1 flex">
                     <button 
                       onClick={() => setView('LIST')}
                       className={`p-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${view === 'LIST' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        <List size={18} />
                        Liste
                     </button>
                     <button 
                       onClick={() => setView('MAP')}
                       className={`p-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${view === 'MAP' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        <Map size={18} />
                        Harita
                     </button>
                 </div>
                 
                 <button 
                    onClick={handleCreate}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm font-medium"
                 >
                    <Plus size={20} />
                    Yeni Durak Ekle
                 </button>
              </div>
            </div>

            {/* View Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Loader2 size={32} className="animate-spin mb-2 text-blue-600" />
                  <p>Veriler Yükleniyor...</p>
                </div>
              ) : (
                <>
                  {view === 'LIST' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                            <th className="p-4">Durak Adı</th>
                            <th className="p-4">İlçe / Mahalle</th>
                            <th className="p-4">DURAKTA ÇALIŞAN ARAÇ SAYISI</th>
                            <th className="p-4">Son UKOME Kararı</th>
                            <th className="p-4">Durum</th>
                            <th className="p-4 text-right">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredStands.length > 0 ? (
                            filteredStands.map((stand) => (
                              <tr key={stand.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4 font-medium text-slate-900">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                                      <CarTaxiFront size={16} />
                                    </div>
                                    {stand.name}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="font-medium text-slate-700">{stand.district}</div>
                                  {stand.neighborhood && (
                                      <div className="text-xs text-slate-500 mt-0.5">{stand.neighborhood} Mah.</div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-col gap-1">
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-bold text-slate-700">{stand.plates?.length || 0}</span>
                                        <span className="text-xs text-slate-500">Araç</span>
                                      </div>
                                      <span className="text-xs text-slate-400">
                                        (Kapasite: {stand.capacity})
                                      </span>
                                  </div>
                                </td>
                                <td className="p-4 text-slate-600">
                                  {stand.ukomeDecisionNo ? (
                                    <div className="flex flex-col">
                                      <span className="font-medium text-slate-700">{stand.ukomeDecisionNo}</span>
                                      <span className="text-xs text-slate-400">{new Date(stand.ukomeDate).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                    stand.status === 'Aktif' 
                                      ? 'bg-green-50 text-green-700 border-green-200' 
                                      : stand.status === 'Pasif' 
                                      ? 'bg-red-50 text-red-700 border-red-200' 
                                      : 'bg-orange-50 text-orange-700 border-orange-200'
                                  }`}>
                                    {stand.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handleView(stand)}
                                      className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm"
                                      title="Detaylı Görüntüle"
                                    >
                                      <Eye size={18} />
                                    </button>

                                    <button 
                                      onClick={() => handleEdit(stand)}
                                      className="p-2 bg-orange-50 border border-orange-100 text-orange-600 hover:bg-orange-100 hover:border-orange-200 rounded-lg transition-all shadow-sm"
                                      title="Düzenle (Hatalı Giriş Düzeltme)"
                                    >
                                      <Pencil size={18} />
                                    </button>

                                    <button 
                                      onClick={() => handleReviseStart(stand)}
                                      className="px-3 py-2 bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                                      title="UKOME Kararı ile Revize Et"
                                    >
                                      <FileText size={16} />
                                      Revize
                                    </button>

                                    <button 
                                      onClick={() => handleDelete(stand.id)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg ml-1"
                                      title="Sil"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-500">
                                {error ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="font-semibold text-red-500">Bağlantı Sorunu</span>
                                        <span className="text-xs">Yukarıdaki hata mesajını kontrol edin.</span>
                                    </div>
                                ) : 'Kayıt bulunamadı.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-[600px] w-full">
                       <StandMap stands={filteredStands} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {view === 'VIEW' && selectedStand && (
           <StandDetails 
             stand={selectedStand}
             onBack={() => setView('LIST')}
             onRevise={handleReviseStart}
             onViewHistory={(ukomeNo) => handleViewHistory(selectedStand, ukomeNo)}
           />
        )}

        {view === 'FORM' && (
          <StandForm 
            initialData={selectedStand}
            onSave={handleSave}
            onCancel={() => setView('LIST')}
          />
        )}
      </main>

      {historyStand && (
        <HistoryViewer 
          stand={historyStand}
          initialUkomeNo={initialHistoryUkome}
          onClose={() => {
            setHistoryStand(undefined);
            setInitialHistoryUkome(null);
          }} 
        />
      )}

      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsRevisionModalOpen(false)}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 p-6 animate-in fade-in zoom-in duration-200">
                <div className="mb-5">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        UKOME Revizyon Kararı
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Durağı revize etmeden önce ilgili UKOME karar numarasını giriniz.
                    </p>
                </div>
                
                <form onSubmit={handleRevisionSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Karar Numarası</label>
                        <input 
                            required
                            type="text"
                            placeholder="Örn: 2025/12-05"
                            value={revisionData.decisionNo}
                            onChange={(e) => setRevisionData({...revisionData, decisionNo: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Karar Tarihi</label>
                        <input 
                            required
                            type="date"
                            value={revisionData.date}
                            onChange={(e) => setRevisionData({...revisionData, date: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Karar Özeti (Opsiyonel)</label>
                        <textarea 
                            rows={2}
                            placeholder="Değişiklik sebebi..."
                            value={revisionData.summary}
                            onChange={(e) => setRevisionData({...revisionData, summary: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsRevisionModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                        >
                            İptal
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                        >
                            Devam Et & Revize Et
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;