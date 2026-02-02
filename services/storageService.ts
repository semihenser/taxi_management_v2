import { TaxiStand, ChangeLog } from '../types';
import { db } from './firebaseConfig';
import { 
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

// Collection Reference
const COLLECTION_NAME = 'taxi_stands';

export const getStands = async (): Promise<TaxiStand[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const stands: TaxiStand[] = [];
    querySnapshot.forEach((doc) => {
      stands.push(doc.data() as TaxiStand);
    });
    return stands;
  } catch (error) {
    console.error("Firebase verisi çekilemedi:", error);
    // Hata durumunda boş dizi dön veya kullanıcıyı uyar
    return [];
  }
};

export const saveStand = async (stand: TaxiStand): Promise<void> => {
  try {
    // Firestore'da 'doc' fonksiyonu ID ile belirli bir dokümanı referans alır.
    // Eğer ID varsa üzerine yazar (update), yoksa oluşturur.
    // TaxiStand nesnesinde ID zaten string olarak var.
    const standRef = doc(db, COLLECTION_NAME, stand.id);
    await setDoc(standRef, stand);
  } catch (error) {
    console.error("Firebase'e kayıt yapılamadı:", error);
    throw error;
  }
};

export const deleteStand = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Firebase'den silinemedi:", error);
    throw error;
  }
};

// Change Log Helper (Logic remains the same, pure utility)
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
