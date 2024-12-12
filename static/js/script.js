let recognition;
    const startButton = document.getElementById('startButton');
    const output = document.getElementById('output');
    const statusText = document.getElementById('statusText');
    const audioFile = document.getElementById('audioFile');
    const uploadForm = document.getElementById('uploadForm');
    const downloadPdfButton = document.getElementById('downloadPdfButton'); // Кнопка загрузки PDF
    let ws = new WebSocket(`ws://${window.location.host}/ws`);

    // Speech recognition setup
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ru-RU';

        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                    ws.send(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }

            output.innerHTML = finalTranscript + '<i>' + interimTranscript + '</i>';
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
        };

        let isRecording = false;

        startButton.onclick = function() {
            if (!isRecording) {
                recognition.start();
                startButton.textContent = 'Stop recording';
                startButton.classList.add('recording');
                isRecording = true;
                statusText.textContent = 'Recording in progress...';
            } else {
                recognition.stop();
                startButton.textContent = 'Start recording';
                startButton.classList.remove('recording');
                isRecording = false;
                statusText.textContent = 'Recording stopped.';

                // Показываем кнопку загрузки PDF после остановки записи
                showDownloadButton();
            }
        };
    } else {
        output.innerHTML = 'Your browser does not support speech recognition.';
        startButton.disabled = true;
    }

    // WebSocket handlers
    ws.onopen = function() {
        console.log('WebSocket connected');
    };

    ws.onmessage = function(event) {
        console.log('Received from server:', event.data);
    };

    ws.onerror = function(event) {
        console.error('WebSocket error:', event);
    };

    ws.onclose = function() {
        console.log('WebSocket disconnected');
    };

    // Upload audio file
    uploadForm.onsubmit = async (e) => {
        e.preventDefault();
        const file = audioFile.files[0];
        if (!file) {
            alert('Please select an audio file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/uploadfile/', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.status === 'Файл обработан успешно') {
                output.innerHTML = `<strong>Result:</strong> ${JSON.stringify(result.data)}`;
            } else {
                output.innerHTML = `<strong>Error:</strong> ${result.error}`;
            }

            // Показываем кнопку загрузки PDF после обработки
            showDownloadButton();
        } catch (error) {
            console.error('Upload error:', error);
            output.innerHTML = '<strong>Error:</strong> Unable to upload file.';
        }
    };

    // Показать кнопку загрузки DOCX
function showDownloadButton() {
    downloadDocxButton.style.display = 'inline-block';
}

// Генерация и скачивание DOCX
downloadDocxButton.onclick = async () => {
    const text = output.textContent.trim(); // Берем содержимое из output
    if (!text) {
        alert('Нет текста для генерации документа.');
        return;
    }

    try {
        const response = await fetch(`/generate-docx?text=${encodeURIComponent(text)}`, {
            method: 'GET'
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Создаем временную ссылку для скачивания
            const link = document.createElement('a');
            link.href = url;
            link.download = 'result.docx';
            link.click();

            // Очищаем URL после использования
            window.URL.revokeObjectURL(url);
        } else {
            alert('Ошибка при генерации документа.');
        }
    } catch (error) {
        console.error('Ошибка при скачивании документа:', error);
        alert('Произошла ошибка при скачивании документа.');
    }
};