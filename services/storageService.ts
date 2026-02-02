import { TaxiStand, ChangeLog } from '../types';
import { db, isConfigured } from './firebaseConfig';
import { 
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  doc,
  Firestore
} from 'firebase/firestore';

// Collection Reference
const COLLECTION_NAME = 'taxi_stands';

// Yardımcı fonksiyon: Veritabanı hazır mı kontrol et
const getDb = (): Firestore => {
  if (!isConfigured) {
    throw new Error("Lütfen 'services/firebaseConfig.ts' dosyasını açıp Firebase ayarlarınızı giriniz. (apiKey, projectId vb.)");
  }
  if (!db) {
    throw new Error("Firebase veritabanı bağlantısı başlatılamadı. API anahtarlarınızı ve internet bağlantınızı kontrol edin.");
  }
  return db;
};

export const getStands = async (): Promise<TaxiStand[]> => {
  const database = getDb();
  try {
    const querySnapshot = await getDocs(collection(database, COLLECTION_NAME));
    const stands: TaxiStand[] = [];
    querySnapshot.forEach((doc) => {
      stands.push(doc.data() as TaxiStand);
    });
    return stands;
  } catch (error: any) {
    console.error("getStands Error:", error);
    throw error;
  }
};

export const saveStand = async (stand: TaxiStand): Promise<void> => {
  const database = getDb();
  // Firestore'da 'doc' fonksiyonu ID ile belirli bir dokümanı referans alır.
  // Eğer ID varsa üzerine yazar (update), yoksa oluşturur.
  const standRef = doc(database, COLLECTION_NAME, stand.id);
  await setDoc(standRef, stand);
};

export const deleteStand = async (id: string): Promise<void> => {
  const database = getDb();
  await deleteDoc(doc(database, COLLECTION_NAME, id));
};

// Change Log Helper
export const generateChanges = (oldStand: TaxiStand, newStand: TaxiStand): ChangeLog[] => {
  const changes: ChangeLog[] = [];
  
  const fieldsToCheck: (keyof TaxiStand)[] = [
    'name', 
    'phone',
    'city',
    'district', 
    'neighborhood', 
    'street', 
    'address',
    'capacity', 
    'ukomeDecisionNo',
    'ukomeDate', 
    'ukomeSummary',
    'status',
    'officeType', 
    'responsibility',
    'notes'
  ];

  fieldsToCheck.forEach(field => {
    const oldVal = String(oldStand[field] || '').trim();
    const newVal = String(newStand[field] || '').trim();

    if (oldVal !== newVal) {
      if ((!oldStand[field] && !newStand[field])) return;

      changes.push({
        id: Date.now().toString() + Math.random().toString(),
        timestamp: new Date().toISOString(),
        fieldName: field,
        oldValue: oldVal || '(Boş)',
        newValue: newVal || '(Boş)',
        changedBy: 'Admin',
        relatedUkomeNo: newStand.ukomeDecisionNo,
        relatedUkomeDate: newStand.ukomeDate
      });
    }
  });

  // Check Location Changes
  if (oldStand.location?.lat !== newStand.location?.lat || oldStand.location?.lng !== newStand.location?.lng) {
     const oldLoc = oldStand.location ? `${oldStand.location.lat}, ${oldStand.location.lng}` : '(Konum Yok)';
     const newLoc = newStand.location ? `${newStand.location.lat}, ${newStand.location.lng}` : '(Konum Yok)';
     
     if (oldLoc !== newLoc) {
        changes.push({
            id: Date.now().toString() + Math.random().toString(),
            timestamp: new Date().toISOString(),
            fieldName: 'location',
            oldValue: oldLoc,
            newValue: newLoc,
            changedBy: 'Admin',
            relatedUkomeNo: newStand.ukomeDecisionNo,
            relatedUkomeDate: newStand.ukomeDate
        });
     }
  }

  const oldPlates = (oldStand.plates || []).sort().join(', ');
  const newPlates = (newStand.plates || []).sort().join(', ');

  if (oldPlates !== newPlates) {
    changes.push({
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date().toISOString(),
      fieldName: 'plates',
      oldValue: oldPlates || '(Plaka Yok)',
      newValue: newPlates || '(Plaka Yok)',
      changedBy: 'Admin',
      relatedUkomeNo: newStand.ukomeDecisionNo,
      relatedUkomeDate: newStand.ukomeDate
    });
  }

  return changes;
};
