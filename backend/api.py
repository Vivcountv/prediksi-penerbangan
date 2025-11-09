import pandas as pd
import numpy as np
import joblib
import lightgbm as lgb
import datetime
import json
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# --- 1. Inisialisasi Aplikasi FastAPI ---
app = FastAPI(title="Flight Delay Prediction API", version="1.0")

# Izinkan CORS (Cross-Origin Resource Sharing) agar React (dari domain lain) bisa mengakses API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Izinkan semua
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. Muat Model dan Data Pendukung (Hanya sekali saat startup) ---
try:
    model = joblib.load('flight_delay_model.joblib')
    weather_daily = pd.read_csv('weather_daily_processed.csv')
    model_columns = joblib.load('model_columns.joblib')
    categorical_cols = joblib.load('categorical_features.joblib')
    
    with open('lookup_maps.json', 'r') as f:
        lookup_maps = json.load(f)
    
    holiday_dates = set(lookup_maps['holiday_dates'])
    holiday_window = set(lookup_maps['holiday_window'])
    
    # Konversi kolom tanggal di data cuaca
    weather_daily['merge_key_date'] = pd.to_datetime(weather_daily['merge_key_date']).dt.date
    
    print("LOG: Model dan semua aset berhasil dimuat.")

except FileNotFoundError as e:
    print(f"ERROR: Gagal memuat aset. Pastikan semua file (.joblib, .csv, .json) ada di folder yang sama. {e}")
    model = None # Set model ke None jika gagal

# --- 3. Tentukan Model Input (Pydantic) ---
# Ini adalah "kontrak" data yang akan dikirim oleh React
class FlightInput(BaseModel):
    flight_date_input: datetime.date
    time_input: datetime.time
    airline_input: str
    dep_delay_input: int
    dep_airport_input: str
    arr_airport_input: str
    duration_input: int
    delay_nas_input: int
    delay_last_input: int
    
# --- 4. Fungsi Helper (Sama seperti di Colab/Streamlit) ---
def get_deptime_label(hour):
    if 5 <= hour < 12:
        return "Morning"
    elif 12 <= hour < 17:
        return "Afternoon"
    elif 17 <= hour < 21:
        return "Evening"
    else:
        return "Night"

# --- 5. Definisikan Endpoint Prediksi ---
@app.post("/predict")
async def predict_delay(data: FlightInput):
    """
    Menerima input penerbangan dalam format JSON, melakukan feature engineering,
    dan mengembalikan prediksi delay.
    """
    if model is None:
        return {"error": "Model tidak berhasil dimuat. Periksa log server."}

    # --- 6. Kalkulasi ETA (Sama seperti di Streamlit) ---
    try:
        scheduled_departure_dt = datetime.datetime.combine(data.flight_date_input, data.time_input)
        total_known_delay_min = data.dep_delay_input + data.delay_nas_input + data.delay_last_input
        actual_departure_dt = scheduled_departure_dt + datetime.timedelta(minutes=total_known_delay_min)
        estimated_arrival_dt = actual_departure_dt + datetime.timedelta(minutes=data.duration_input)
        
        eta_time_str = estimated_arrival_dt.strftime("%H:%M")
        eta_date_str = estimated_arrival_dt.strftime("%Y-%m-%d")
        is_next_day = (estimated_arrival_dt.date() > scheduled_departure_dt.date())
        
        eta_display = f"{eta_time_str} pada {eta_date_str}" + (" (hari berikutnya)" if is_next_day else "")

    except Exception as e:
        eta_display = "Gagal menghitung ETA."
        print(f"Error ETA: {e}")

    # --- 7. Feature Engineering (Sama seperti di Streamlit) ---
    merge_key_date_obj = data.flight_date_input
    merge_key_date_str = merge_key_date_obj.isoformat()

    # Cuaca Origin
    origin_weather = weather_daily[
        (weather_daily['airport_id'] == data.dep_airport_input) & 
        (weather_daily['merge_key_date'] == merge_key_date_obj)
    ].copy()
    origin_rename = {col: f"origin_{col}" for col in weather_daily.columns if col not in ['airport_id', 'merge_key_date']}
    origin_weather = origin_weather.rename(columns=origin_rename)

    # Cuaca Destination
    dest_weather = weather_daily[
        (weather_daily['airport_id'] == data.arr_airport_input) & 
        (weather_daily['merge_key_date'] == merge_key_date_obj)
    ].copy()
    dest_rename = {col: f"dest_{col}" for col in dest_weather.columns if col not in ['airport_id', 'merge_key_date']}
    dest_weather = dest_weather.rename(columns=dest_rename)

    # Ambil data dari lookup maps
    airport_to_city_map = lookup_maps['airport_to_city_map']
    airline_map = lookup_maps['airline_map']
    default_values = lookup_maps['default_values']
    airline_info = airline_map.get(data.airline_input, {})

    is_holiday_flag = 1 if merge_key_date_str in holiday_dates else 0
    is_near_holiday_flag = 1 if merge_key_date_str in holiday_window else 0

    # Buat DataFrame Input
    input_data = {
        'Airline': data.airline_input,
        'Dep_Airport': data.dep_airport_input,
        'Arr_Airport': data.arr_airport_input,
        'Dep_Delay': data.dep_delay_input,
        'Flight_Duration': data.duration_input,
        'Day_Of_Week': merge_key_date_obj.weekday() + 1,
        'Delay_NAS': data.delay_nas_input,
        'Delay_LastAircraft': data.delay_last_input,
        'Dep_CityName': airport_to_city_map.get(data.dep_airport_input, 'Unknown'),
        'Arr_CityName': airport_to_city_map.get(data.arr_airport_input, 'Unknown'),
        'DepTime_label': get_deptime_label(data.time_input.hour), 
        'Is_Holiday': is_holiday_flag,
        'Is_Near_Holiday': is_near_holiday_flag,
        'Distance_type': default_values.get('Distance_type', 'Unknown'),
        'Manufacturer': airline_info.get('Manufacturer', default_values.get('Manufacturer', 'Unknown')),
        'Model': airline_info.get('Model', default_values.get('Model', 'Unknown')),
        'Aicraft_age': airline_info.get('Aicraft_age', default_values.get('Aicraft_age', 0))
    }
    
    input_df = pd.DataFrame([input_data])
    
    # Gabungkan cuaca
    input_df = pd.concat([
        input_df.reset_index(drop=True),
        origin_weather.reset_index(drop=True).drop(columns=['airport_id', 'merge_key_date'], errors='ignore'),
        dest_weather.reset_index(drop=True).drop(columns=['airport_id', 'merge_key_date'], errors='ignore')
    ], axis=1)
    
    # --- 8. Preprocessing Akhir ---
    input_df = input_df.fillna(0)
    input_df = input_df.reindex(columns=model_columns, fill_value=0)

    for col in categorical_cols:
        if col in input_df.columns:
            input_df[col] = input_df[col].astype('category')

    # --- 9. Lakukan Prediksi ---
    prediction = model.predict(input_df)[0]
    probability = model.predict_proba(input_df)[0][1]

    # --- 10. Kirim Hasil (JSON) ---
    input_data_json = input_df.iloc[0].to_dict()
    
    # Konversi tipe data khusus (seperti kategori) ke string agar aman untuk JSON
    for col in categorical_cols:
        if col in input_data_json:
            input_data_json[col] = str(input_data_json[col])

    return {
        "prediction": int(prediction),
        "probability_delay": float(probability),
        "eta_display": eta_display,
        "is_near_holiday": bool(is_near_holiday_flag),
        "feature_data": input_data_json  # <-- TAMBAHKAN BARIS INI
    }

# --- 11. Jalankan API (jika file ini dijalankan langsung) ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)