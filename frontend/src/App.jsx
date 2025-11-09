import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plane, Clock, AlertTriangle, Cloud, Wind, Snowflake, Thermometer, Table, TrendingUp } from 'lucide-react';
import './App.css'
import backgroundImage from './assets/gambar1.jpg';
// URL Gambar Latar
const BACKGROUND_IMAGE_URL = backgroundImage;

// --- Fungsi untuk memuat aset ---
function useLookupMaps() {
  const [maps, setMaps] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/lookup_maps.json') // Mengambil dari folder /public
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        const processedMaps = {
          ...data,
          airline_options: Object.keys(data.airline_map || {}).sort(),
          airport_options: Object.keys(data.airport_to_city_map || {}).sort()
        };
        setMaps(processedMaps);
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal memuat atau mem-parse lookup_maps.json:", err);
        setError("Gagal memuat data dropdown. Pastikan 'lookup_maps.json' ada di folder 'frontend/public/'.");
        setLoading(false);
      });
  }, []);

  return { maps, loading, error };
}

// --- Komponen untuk menampilkan data fitur sebagai tabel ---
function FeatureTable({ data }) {
  
  // Peta terjemahan untuk nama fitur
  const featureNameMap = {
    'Day_Of_Week': 'Hari dalam Minggu (1=Senin, 7=Minggu)',
    'Airline': 'Maskapai',
    'Dep_Airport': 'Bandara Keberangkatan (Kode)',
    'Dep_CityName': 'Kota Keberangkatan',
    'DepTime_label': 'Waktu Keberangkatan',
    'Dep_Delay': 'Keterlambatan Berangkat (Menit)',
    'Arr_Airport': 'Bandara Tujuan (Kode)',
    'Arr_CityName': 'Kota Tujuan',
    'Flight_Duration': 'Durasi Penerbangan (Menit)',
    'Distance_type': 'Tipe Jarak',
    'Manufacturer': 'Pabrikan Pesawat',
    'Model': 'Model Pesawat',
    'Aicraft_age': 'Usia Pesawat (Tahun)',
    'Is_Holiday': 'Status Hari Libur (1=Ya)',
    'Is_Near_Holiday': 'Status Dekat Libur (1=Ya)',
    'Delay_NAS': 'Input Delay NAS (Menit)',
    'Delay_LastAircraft': 'Input Delay Pesawat Sblmnya (Menit)',
    'origin_tavg': 'Suhu Rata-Rata (Asal °C)',
    'origin_tmin': 'Suhu Min (Asal °C)',
    'origin_tmax': 'Suhu Maks (Asal °C)',
    'origin_prcp': 'Curah Hujan (Asal mm)',
    'origin_snow': 'Salju (Asal mm)',
    'origin_wdir': 'Arah Angin (Asal °)',
    'origin_wspd': 'Kecepatan Angin (Asal km/jam)',
    'origin_pres': 'Tekanan Udara (Asal hPa)',
    'dest_tavg': 'Suhu Rata-Rata (Tujuan °C)',
    'dest_tmin': 'Suhu Min (Tujuan °C)',
    'dest_tmax': 'Suhu Maks (Tujuan °C)',
    'dest_prcp': 'Curah Hujan (Tujuan mm)',
    'dest_snow': 'Salju (Tujuan mm)',
    'dest_wdir': 'Arah Angin (Tujuan °)',
    'dest_wspd': 'Kecepatan Angin (Tujuan km/jam)',
    'dest_pres': 'Tekanan Udara (Tujuan hPa)'
  };

  const relevantKeys = Object.keys(data).filter(key => 
    data[key] !== 0 && data[key] !== 'Unknown' && data[key] !== null && data[key] !== ""
  );

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter Prediksi</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai yang Digunakan</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {relevantKeys.map(key => (
            <tr key={key}>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                {featureNameMap[key] || key}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                {String(data[key])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function App() {
  // --- State untuk menyimpan semua input ---
  const [flightDateInput, setFlightDateInput] = useState('2023-01-15');
  const [timeInput, setTimeInput] = useState('09:30');
  const [airlineInput, setAirlineInput] = useState('');
  const [depDelayInput, setDepDelayInput] = useState(0);
  const [depAirportInput, setDepAirportInput] = useState('');
  const [arrAirportInput, setArrAirportInput] = useState('');
  const [durationInput, setDurationInput] = useState(120);
  const [delayNasInput, setDelayNasInput] = useState(0);
  const [delayLastInput, setDelayLastInput] = useState(0);

  // --- State untuk menyimpan hasil prediksi ---
  const [predictionResult, setPredictionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const { maps: lookupMaps, loading: mapsLoading, error: mapsError } = useLookupMaps();

  // Atur nilai default untuk dropdown
  useEffect(() => {
    if (lookupMaps) {
      if (lookupMaps.airline_options?.length > 0) {
        setAirlineInput(lookupMaps.airline_options.includes('Endeavor Air') ? 'Endeavor Air' : lookupMaps.airline_options[0]);
      }
      if (lookupMaps.airport_options?.length > 0) {
        setDepAirportInput(lookupMaps.airport_options.includes('ATL') ? 'ATL' : lookupMaps.airport_options[0]);
        setArrAirportInput(lookupMaps.airport_options.includes('CVG') ? 'CVG' : lookupMaps.airport_options[0]);
      }
    }
  }, [lookupMaps]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setApiError(null);
    setPredictionResult(null);

    const inputData = {
      flight_date_input: flightDateInput,
      time_input: `${timeInput}:00`,
      airline_input: airlineInput,
      dep_delay_input: parseInt(depDelayInput),
      dep_airport_input: depAirportInput,
      arr_airport_input: arrAirportInput,
      duration_input: parseInt(durationInput),
      delay_nas_input: parseInt(delayNasInput),
      delay_last_input: parseInt(delayLastInput),
    };

    try {
      const response = await axios.post('http://localhost:8000/predict', inputData);
      setPredictionResult(response.data);
    } catch (err) {
      setApiError("Gagal menghubungi server API. Pastikan server 'backend' (api.py) sudah berjalan di http://localhost:8000.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (mapsLoading) {
    return <div className="p-8 text-center text-gray-700">Memuat data maskapai dan bandara...</div>
  }
  
  if (mapsError) {
     return <div className="p-8 text-center text-red-700">{mapsError}</div>
  }

  // --- Render UI ---
  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center bg-fixed" 
      style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
    >
      {/* Lapisan Overlay Gelap */}
      <div className="min-h-screen w-full p-4 md:p-8 backdrop-blur-sm">
        
        {/* Kotak Konten Putih di Tengah */}
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-xl p-6">
          
          <div className="flex items-center space-x-3 mb-6 border-b pb-4">
            <Plane size={40} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Prediktor Keterlambatan Penerbangan</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Baris 1: Info Penerbangan Utama */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="flight_date" className="block text-sm font-medium text-gray-700">Tanggal Penerbangan</label>
                <input type="date" id="flight_date" value={flightDateInput} onChange={(e) => setFlightDateInput(e.target.value)} 
                       className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="time_input" className="block text-sm font-medium text-gray-700">Jam Keberangkatan (Terjadwal)</label>
                <input type="time" id="time_input" value={timeInput} onChange={(e) => setTimeInput(e.target.value)}
                       className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
               <div>
                <label htmlFor="airline" className="block text-sm font-medium text-gray-700">Maskapai (Airline)</label>
                <select id="airline" value={airlineInput} onChange={(e) => setAirlineInput(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  {lookupMaps.airline_options.map(airline => <option key={airline} value={airline}>{airline}</option>)}
                </select>
              </div>
            </div>
            
            {/* Baris 2: Bandara */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dep_airport" className="block text-sm font-medium text-gray-700">Bandara Keberangkatan (Origin)</label>
                <select id="dep_airport" value={depAirportInput} onChange={(e) => setDepAirportInput(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  {lookupMaps.airport_options.map(airport => <option key={airport} value={airport}>{airport}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="arr_airport" className="block text-sm font-medium text-gray-700">Bandara Kedatangan (Destination)</label>
                <select id="arr_airport" value={arrAirportInput} onChange={(e) => setArrAirportInput(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                  {lookupMaps.airport_options.map(airport => <option key={airport} value={airport}>{airport}</option>)}
                </select>
              </div>
            </div>
            
            {/* Baris 3: Info Delay & Durasi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="dep_delay" className="block text-sm font-medium text-gray-700">Keterlambatan Berangkat (Menit)</label>
                {/* --- (DIPERBARUI) --- */}
                <input type="number" id="dep_delay" value={depDelayInput} onChange={(e) => setDepDelayInput(e.target.value)}
                       className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
               <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Durasi Penerbangan (Menit)</label>
                {/* --- (DIPERBARUI) --- */}
                <input type="number" id="duration" value={durationInput} onChange={(e) => setDurationInput(e.target.value)}
                       className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="delay_nas" className="block text-sm font-medium text-gray-700">Delay NAS (Menit)</label>
                {/* --- (DIPERBARUI) --- */}
                <input type="number" id="delay_nas" value={delayNasInput} onChange={(e) => setDelayNasInput(e.target.value)}
                       className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="delay_last" className="block text-sm font-medium text-gray-700">Delay Pesawat Sblmnya (Menit)</label>
                {/* --- (DIPERBARUI) --- */}
                <input type="number" id="delay_last" value={delayLastInput} onChange={(e) => setDelayLastInput(e.target.value)}
                       className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
              </div>
            </div>
            
            <div className="pt-4">
              <button type="submit" disabled={isLoading} 
                      className="w-full flex justify-center items-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400">
                {isLoading ? (
                  <>
                    <Clock size={20} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "🚀 Prediksi Keterlambatan"
                )}
              </button>
            </div>
          </form>

          {/* --- Tampilkan Hasil Prediksi --- */}
          {apiError && <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded">{apiError}</div>}

          {predictionResult && (
            <div className="mt-6 border-t pt-6 space-y-4">
              <h2 className="text-2xl font-semibold text-gray-800">Hasil Prediksi:</h2>
              
              {predictionResult.is_near_holiday && (
                <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md flex items-center gap-2">
                  <AlertTriangle size={20} />
                  <span><b>Catatan:</b> Prediksi ini memperhitungkan kepadatan hari libur.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {predictionResult.prediction === 1 ? (
                  <div className="p-5 bg-red-600 text-white rounded-lg shadow-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={36} />
                      <div>
                        <p className="text-sm font-medium uppercase tracking-wide opacity-80">Status Prediksi</p>
                        <p className="text-3xl font-bold">TERLAMBAT</p>
                      </div>
                    </div>
                    <p className="mt-3 text-base opacity-90">
                      Model memprediksi ada kemungkinan besar (<b>{(predictionResult.probability_delay * 100).toFixed(0)}%</b>) penerbangan ini akan delay lebih dari 15 menit.
                    </p>
                  </div>
                ) : (
                  <div className="p-5 bg-green-600 text-white rounded-lg shadow-lg">
                    <div className="flex items-center gap-3">
                      <Plane size={36} />
                      <div>
                        <p className="text-sm font-medium uppercase tracking-wide opacity-80">Status Prediksi</p>
                        <p className="text-3xl font-bold">TEPAT WAKTU</p>
                      </div>
                    </div>
                    <p className="mt-3 text-base opacity-90">
                      Model memprediksi kemungkinan besar (<b>{(100 - (predictionResult.probability_delay * 100)).toFixed(0)}%</b>) penerbangan ini akan tiba tepat waktu.
                    </p>
                  </div>
                )}

                <div className="p-5 bg-blue-600 text-white rounded-lg shadow-lg">
                  <div className="flex items-center gap-3">
                    <Clock size={36} />
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wide opacity-80">Estimasi Waktu Kedatangan (ETA)</p>
                      <p className="text-2xl font-bold">{predictionResult.eta_display}</p>
                    </div>
                  </div>
                  {predictionResult.prediction === 1 && (
                     <p className="mt-3 text-sm text-yellow-200">
                       <b>Peringatan:</b> ETA ini mungkin meleset karena model memprediksi *tambahan* delay akibat cuaca atau lalu lintas udara.
                     </p>
                  )}
                </div>
              </div>
              
              <details className="mt-4 bg-gray-50 p-3 rounded-md border" open>
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 flex items-center gap-2">
                    <Table size={16} />
                    Tampilkan Rincian Data Prediksi
                  </summary>
                  <FeatureTable data={predictionResult.feature_data} />
              </details>
              
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}

export default App;