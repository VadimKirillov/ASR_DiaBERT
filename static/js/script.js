let recognition;
const startButton = document.getElementById('startButton');
const output = document.getElementById('output');
const audioFile = document.getElementById('audioFile');
const uploadForm = document.getElementById('uploadForm');
const downloadDocxButton = document.getElementById('downloadDocxButton');
const makeTimeTableButton = document.getElementById('makeTimeTableButton');
const clearTextButton = document.getElementById('clearTextButton');
const timeTrackerToggle = document.getElementById('timeTrackerToggle');
let isTimeTrackerEnabled = false;
let commandRecognition, recordingRecognition;
let isRecording = false;
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

function cleanText(text) {
    return text
        .replace(/[nrt]/g, ' ') // заменяем переносы строк и табуляции на пробелы
        .replace(/s+/g, ' ')      // убираем множественные пробелы
        .trim();                   // убираем пробелы в начале и конце
}

 // Speech recognition setup
if ('webkitSpeechRecognition' in window) {
    commandRecognition = new webkitSpeechRecognition();
    recordingRecognition = new webkitSpeechRecognition();

    // Настройка распознавания команд
    commandRecognition.continuous = false;
    commandRecognition.interimResults = false;
    commandRecognition.lang = 'ru-RU';

    // Настройка распознавания речи для записи
    recordingRecognition.continuous = true;
    recordingRecognition.interimResults = true;
    recordingRecognition.lang = 'ru-RU';

    // Обработчик результатов распознавания речи
    recordingRecognition.onresult = function(event) {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();

        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }

        // Проверяем на команды остановки
        if (transcript.includes('стоп') || transcript.includes('завершить')) {
             stopRecording();
        }

    }

    // Добавление распознанного текста в элемент output
    if (finalTranscript !== '') {
        const outputElement = document.getElementById('output');
        // Если хотите добавить новый текст к существующему
        outputElement.textContent += (outputElement.textContent ? ' ' : '') + finalTranscript;

        // Или если хотите заменить текст полностью:
        // outputElement.textContent = finalTranscript;
    }
    };

    // Обработчик переключателя
    timeTrackerToggle.addEventListener('change', function() {
        isTimeTrackerEnabled = this.checked;
        console.log('Time tracker mode:', isTimeTrackerEnabled ? 'enabled' : 'disabled');

        if (isTimeTrackerEnabled) {
            try {
                commandRecognition.start();
                console.log('Command recognition started');
            } catch (e) {
                console.error('Error starting command recognition:', e);
            }
        } else {
            try {
                commandRecognition.stop();
                if (isRecording) {
                    stopRecording();
                }
            } catch (e) {
                console.error('Error stopping recognition:', e);
            }
        }
    });

    // Обработчик окончания сессии распознавания
    commandRecognition.onend = function() {
        console.log('Command recognition ended');
        if (isTimeTrackerEnabled && !isRecording) {
            try {
                commandRecognition.start();
            } catch (e) {
                console.error('Error restarting command recognition:', e);
            }
        }
    };

    commandRecognition.onresult = function(event) {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Команда:', command);

        if (!isRecording && (command.includes('начать') || command.includes('старт'))) {
            startRecording();
        } else if (isRecording && command.includes('стоп')) {
            stopRecording();
        }
    };

    function startRecording() {
        isRecording = true;
        try {
            if (isTimeTrackerEnabled) {
                commandRecognition.stop();
            }
            recordingRecognition.start();
            startButton.textContent = 'Остановить распознавание';
            startButton.classList.add('recording');
            startButton.style.backgroundColor = 'red';
        } catch (e) {
            console.error('Error starting recording:', e);
        }
    }

    function stopRecording() {
        isRecording = false;
        try {
            recordingRecognition.stop();
            if (isTimeTrackerEnabled) {
                commandRecognition.start();
            }
            startButton.textContent = 'Начать распознавание';
            startButton.classList.remove('recording');
            startButton.style.backgroundColor = '';
        } catch (e) {
            console.error('Error stopping recording:', e);
        }
    }

    // Обработчики ошибок
    commandRecognition.onerror = function(event) {
        console.error('Command recognition error:', event.error);
    };

    recordingRecognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
    };

    // Обработчик кнопки
    startButton.onclick = function() {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    };
} else {
    startButton.disabled = true;
}

    // Устанавливаем начальное состояние переключателя
    isTimeTrackerEnabled = timeTrackerToggle.checked;
    if (isTimeTrackerEnabled) {
        commandRecognition.start();
    }

document.getElementById('clearTextButton').addEventListener('click', function() {
    document.getElementById('output').textContent = ''; // очищаем текстовое содержимое
    // или
    // document.getElementById('output').value = ''; // если это текстовое поле ввода
});

document.addEventListener('DOMContentLoaded', function() {
    // Делаем текстовое поле редактируемым
    document.getElementById('output').setAttribute('contenteditable', 'true');

    // Добавляем обработчик для проверки времени
    document.querySelectorAll('.time-cell').forEach(cell => {
        cell.addEventListener('input', function(e) {
            validateTimeCell(this);
        });

        cell.addEventListener('blur', function(e) {
            formatTimeCell(this);
        });
    });
});

function validateTimeCell(cell) {
    const value = cell.textContent;
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timePattern.test(value) && value.length >= 5) {
        cell.classList.add('invalid');
    } else {
        cell.classList.remove('invalid');
    }
}

function formatTimeCell(cell) {
    let value = cell.textContent.trim();
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (timePattern.test(value)) {
        // Добавляем ведущие нули если необходимо
        let [hours, minutes] = value.split(':');
        hours = hours.padStart(2, '0');
        cell.textContent = `${hours}:${minutes}`;
        cell.classList.remove('invalid');
    } else {
        cell.textContent = '00:00';
        cell.classList.remove('invalid');
    }
}

document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Предотвращаем стандартную отправку формы

    const fileInput = document.getElementById('audioFile');
    const outputDiv = document.getElementById('output');

    if (!fileInput.files.length) {
        alert('Пожалуйста, выберите файл');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        // Показываем индикатор загрузки или сообщение
        outputDiv.innerHTML = 'Обработка файла...';

        const response = await fetch(`${window.location.protocol}//${window.location.host}/uploadfile/`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', data);
        // Отображаем полученный текст
        outputDiv.innerHTML = data.transcribed_text || 'Текст не распознан';

    } catch (error) {
        console.error('Error:', error);
        outputDiv.innerHTML = 'Произошла ошибка при обработке файла';
    }
});


document.getElementById('downloadDocxButton').addEventListener('click', async function() {
    // Получаем данные из редактируемого div
    const textContent = document.getElementById('output').innerHTML;

    // Получаем данные из таблицы
    const tableRows = [];
    const tbody = document.querySelector('.operations-table tbody');
    for (let row of tbody.rows) {
        tableRows.push({
            operation: row.cells[0].textContent,
            startTime: row.cells[1].textContent,
            endTime: row.cells[2].textContent
        });
    }

    try {
        const response = await fetch('/generate-docx', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: textContent,
                tableData: tableRows
            })
        });

        if (response.ok) {
            // Получаем blob из ответа
            const blob = await response.blob();
            // Создаем ссылку для скачивания
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'document.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } else {
            console.error('Error generating DOCX');
        }
    } catch (error) {
        console.error('Error:', error);
    }
});


async function sendTextForAnalysis() {
    const outputText = document.getElementById('output').innerText;
    cleanedText = cleanText(outputText)
    console.log(cleanedText);
    try {
        const response = await fetch(`${window.location.protocol}//${window.location.host}/analyze_audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: cleanedText
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        // Получаем массив событий из ответа
        const operations = data.events || [];
        addNewOperations(operations);
    } catch (error) {
        console.error('Error:', error);
    }
}

function addNewOperations(operations) {
    const tbody = document.querySelector('.operations-table tbody');

    operations.forEach(operation => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td contenteditable="true">${operation.action || ''}</td>
            <td contenteditable="true" class="time-cell">${operation.start || ''}</td>
            <td contenteditable="true" class="time-cell">${operation.end || ''}</td>
            <td><button class="delete-row">-</button></td>
        `;
        tbody.appendChild(row);
    });

    // Добавляем обработчики для новых кнопок удаления
    attachDeleteHandlers();
}

function attachDeleteHandlers() {
    document.querySelectorAll('.delete-row').forEach(button => {
        if (!button.hasEventListener) {
            button.hasEventListener = true;
            button.addEventListener('click', function() {
                this.closest('tr').remove();
            });
        }
    });
}

function addNewRow() {
    const tbody = document.querySelector('.operations-table tbody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td contenteditable="true">Новая операция</td>
        <td contenteditable="true" class="time-cell">00:00</td>
        <td contenteditable="true" class="time-cell">00:00</td>
        <td><button class="delete-row">-</button></td>
    `;
    tbody.appendChild(newRow);
    attachDeleteHandlers();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Кнопка добавления новой строки
    const addRowButton = document.querySelector('.add-row');
    if (addRowButton) {
        addRowButton.addEventListener('click', addNewRow);
    }

    // Привязываем функцию к кнопке "Создать расписание"
    const makeTimeTableButton = document.getElementById('makeTimeTableButton');
    if (makeTimeTableButton) {
        makeTimeTableButton.addEventListener('click', sendTextForAnalysis);
    }

    // Инициализируем обработчики удаления для существующих строк
    attachDeleteHandlers();
});