
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper to read data
const readData = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    return [];
  }
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data || '[]');
};

// Helper to write data
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// GET all stands
app.get('/api/stands', (req, res) => {
  try {
    const stands = readData();
    res.json(stands);
  } catch (error) {
    res.status(500).json({ error: 'Veri okunamadı' });
  }
});

// SAVE (Create or Update) a stand
app.post('/api/stands', (req, res) => {
  try {
    const newStand = req.body;
    const stands = readData();
    const index = stands.findIndex(s => s.id === newStand.id);

    if (index >= 0) {
      stands[index] = newStand;
    } else {
      stands.push(newStand);
    }

    writeData(stands);
    res.json({ success: true, stand: newStand });
  } catch (error) {
    res.status(500).json({ error: 'Veri kaydedilemedi' });
  }
});

// DELETE a stand
app.delete('/api/stands/:id', (req, res) => {
  try {
    const { id } = req.params;
    let stands = readData();
    stands = stands.filter(s => s.id !== id);
    writeData(stands);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Veri silinemedi' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Veritabanı sunucusu çalışıyor: http://localhost:${PORT}`);
});
