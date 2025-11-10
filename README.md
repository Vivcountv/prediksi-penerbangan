# Prediksi Keterlambatan Penerbangan (US Flight Delay Prediction)

Ini adalah proyek Ujian Tengah Semester (UTS) Mata Kuliah Pembelajaran Mesin yang bertujuan untuk memprediksi keterlambatan penerbangan sipil di Amerika Serikat.

Model ini menggunakan **LightGBM (Gradient Boosting)** yang dilatih pada 1 juta baris data penerbangan dari tahun 2023. Keakuratan model ditingkatkan secara signifikan melalui **Feature Engineering** cerdas yang menggabungkan data cuaca harian (di bandara asal dan tujuan), fitur kalender (hari libur), dan penanganan *data leakage* (dengan mempertahankan fitur status seperti `Delay_NAS` dan `Delay_LastAircraft`).

Proyek ini di-deploy sebagai arsitektur *Full-Stack*, terdiri dari **Backend API (FastAPI)** dan **Frontend (React + Tailwind CSS)**.

##  Demo Aplikasi Web

**Link Deployment Live:** `[MASUKKAN LINK INFINITYFREE ANDA DI SINI]`

Aplikasi ini memungkinkan pengguna memasukkan detail penerbangan dan menerima prediksi instan serta estimasi waktu kedatangan (ETA).

| Prediksi Tepat Waktu | Prediksi Terlambat (dengan Rincian Data) |
| :---: | :---: |
|  |  |

## 📊 Hasil Model (Performa Final)

Model dievaluasi pada 202.163 data uji yang belum pernah dilihat dan mencapai hasil yang sangat kuat, membuktikan bahwa model ini **stabil dan tidak overfitting**.

* **Skor AUC:** **0.9988** (vs 0.9988 pada data validasi)
* **Akurasi:** **98.48%**
* **Recall (Kelas Terlambat):** **97%** (Model berhasil mengidentifikasi 97% dari semua penerbangan yang *sebenarnya* terlambat).
* **Precision (Kelas Terlambat):** **95%** (Saat model memprediksi "Terlambat", 95% prediksinya benar).

### Fitur Paling Penting

Analisis *Feature Importance* (**Langkah 18**) menunjukkan bahwa strategi *feature engineering* kami berhasil. Fitur status (`Delay_LastAircraft`, `Dep_Delay`, `Delay_NAS`) adalah prediktor terkuat, diikuti oleh fitur buatan seperti kecepatan angin (`origin_wspd`) dan kedekatan hari libur (`Is_Near_Holiday`).



---

## 🛠️ Tumpukan Teknologi (Tech Stack)

| Kategori | Teknologi |
| :--- | :--- |
| **Backend** | Python 3.11, FastAPI, Uvicorn, LightGBM, Scikit-learn, Pandas, Joblib |
| **Frontend** | React.js, Vite, Tailwind CSS, Axios, Lucide-React |
| **Data Science** | Google Colab, Jupyter Notebook, Matplotlib, Seaborn |
| **Deployment** | GitHub, InfinityFree (Frontend), Vercel/Render (Backend API) |

---

## 🚦 Menjalankan Proyek Secara Lokal

Proyek ini terdiri dari dua bagian: `backend` (API) dan `frontend` (React). Keduanya harus dijalankan secara bersamaan di terminal terpisah.

### Prasyarat Aset

Sebelum menjalankan, Anda harus memiliki 5 file aset yang dihasilkan dari notebook Colab (`UTS_Fix_Machine_Learning.ipynb`):
1.  `flight_delay_model.joblib`
2.  `weather_daily_processed.csv`
3.  `model_columns.joblib`
4.  `categorical_features.joblib`
5.  `lookup_maps.json`

### 1. Menjalankan Backend (API)

1.  **Pindahkan Aset:** Tempatkan ke-5 file aset di atas ke dalam folder `backend/`.
2.  **Buat Virtual Environment:**
    ```bash
    # Dari folder root proyek (mis. /Proyek_Flight_Delay/)
    python -m venv venv
    ```
3.  **Aktifkan vEnv:**
    ```bash
    # Windows
    .\venv\Scripts\Activate.ps1
    ```
4.  **Instal Dependencies:**
    ```bash
    # Masuk ke folder backend
    cd backend
    pip install -r requirements.txt
    ```
5.  **Jalankan Server API:**
    ```bash
    uvicorn api:app --reload
    ```
    Server akan berjalan di `http://localhost:8000`.

### 2. Menjalankan Frontend (React)

1.  **Pindahkan Aset:** Salin `lookup_maps.json` dari `backend/` ke `frontend/public/`.
2.  **Buka Terminal Baru** (biarkan terminal backend tetap berjalan).
3.  **Instal Dependencies:**
    ```bash
    # Masuk ke folder frontend
    cd frontend
    npm install
    ```
4.  **Jalankan Server Frontend:**
    ```bash
    npm run dev
    ```
    Aplikasi web akan otomatis terbuka di `http://localhost:5173`.

## 👤 Author

* **Vivaldi Gabriel Manurung** (221112090)