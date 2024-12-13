class TableRow(BaseModel):
    operation: str
    startTime: str
    endTime: str

class DocumentData(BaseModel):
    text: str
    tableData: List[TableRow]

# Модель для валидации входных данных
class AudioText(BaseModel):
    text: str

class TimeAction(BaseModel):
    start: str
    end: str
    action: str

class AudioAnalysisResponse(BaseModel):
    events: List[TimeAction]