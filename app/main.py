from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import Request
import shutil
import os
import requests

app = FastAPI()

# Настройка папок для хранения файлов
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Подключаем статические файлы (CSS и JS)
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

# Подключаем шаблон (HTML)
templates = Jinja2Templates(directory="templates")


# Главная страница с формой загрузки
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# Эндпоинт для загрузки файла
@app.post("/uploadfile/")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Сохраняем файл на сервере
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Путь к сохраненному файлу
        file_path = file_location

        # Использование внешнего API для отправки файла
        external_api_url = "https://0954-193-41-143-66.ngrok-free.app/transcribe/"
        with open(file_path, 'rb') as f:
            # Отправляем файл на внешний API
            files = {'file': f}
            response = requests.post(external_api_url, files=files, verify=False)

        # Возвращаем результат обработки
        if response.status_code == 200:
            return {"status": "Файл обработан успешно", "data": response.json()}
        else:
            return {"status": "Ошибка обработки файла", "error": response.text}
    except Exception as e:
        return {"status": "Ошибка загрузки", "error": str(e)}