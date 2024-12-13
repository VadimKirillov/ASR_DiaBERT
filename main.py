from fastapi import FastAPI, File, UploadFile, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import HTTPException
from fastapi.responses import FileResponse
from fpdf import FPDF
import logging
from datetime import datetime
from docx import Document
from pydantic import BaseModel
from typing import List
from fastapi import Query
from fastapi import Request
import shutil
import os
from tempfile import NamedTemporaryFile
from fastapi.background import BackgroundTasks
import requests
from docx.shared import Inches
import io

SERVER_URL = "https://d776-193-41-143-66.ngrok-free.app"

app = FastAPI()

class TableRow(BaseModel):
    operation: str
    startTime: str
    endTime: str

class DocumentData(BaseModel):
    text: str
    tableData: List[TableRow]

# Настройка папок для хранения файлов
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(BASE_DIR, "static")
os.makedirs(static_path, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_path), name="static")

# Абсолютный путь к директории templates
templates_path = os.path.join(os.path.dirname(__file__), "templates")
templates = Jinja2Templates(directory=templates_path)


@app.get("/", response_class=HTMLResponse)
async def get():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(data)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await websocket.close()


# Эндпоинт для загрузки файла
@app.post("/uploadfile/")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Проверка типа файла
        if not file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="Файл должен быть аудио формата.")

        # Сохраняем файл на сервере
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Логируем путь файла
        print(f"Файл сохранен: {file_location}")

        # Путь к сохраненному файлу
        file_path = file_location

        # Использование внешнего API для отправки файла
        external_api_url = f"{SERVER_URL}/transcribe/"
        with open(file_path, 'rb') as f:
            # Отправляем файл на внешний API
            files = {'file': f}
            response = requests.post(external_api_url, files=files, verify=False)

        # Возвращаем результат обработки
        if response.status_code == 200:
            return {"status": "Файл обработан успешно", "data": response.json()}
        else:
            return {"status": "Ошибка обработки файла", "error": response.text}
    except HTTPException as e:
        raise e
    except Exception as e:
        return {"status": "Ошибка загрузки", "error": str(e)}


@app.post("/generate-docx")
async def generate_docx(data: DocumentData):
    try:
        # Создаем новый документ
        doc = Document()

        # Добавляем текст из редактируемого div
        doc.add_paragraph(data.text)

        # Добавляем таблицу
        table = doc.add_table(rows=1, cols=3)
        table.style = 'Table Grid'

        # Заголовки таблицы
        header_cells = table.rows[0].cells
        header_cells[0].text = 'Операция'
        header_cells[1].text = 'Время начала'
        header_cells[2].text = 'Время завершения'

        # Добавляем данные в таблицу
        for row_data in data.tableData:
            row_cells = table.add_row().cells
            row_cells[0].text = row_data.operation
            row_cells[1].text = row_data.startTime
            row_cells[2].text = row_data.endTime

        # Создаем временный файл
        with NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            doc.save(tmp.name)
            tmp_path = tmp.name

        # Возвращаем файл и удаляем его после отправки
        return FileResponse(
            tmp_path,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            filename='time_tracking.docx'
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))