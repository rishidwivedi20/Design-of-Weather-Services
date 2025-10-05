# 🐍 Python NLP Backend Service

AI-powered weather analysis and natural language processing for aviation weather data.

## 🚀 Quick Start

```bash
# Just run this - everything is handled automatically!
py run.py
```

That's it! The launcher will:
- ✅ Auto-detect and use the virtual environment
- ✅ Install dependencies if needed  
- ✅ Start the FastAPI server on port 8000
- ✅ Enable hot-reload for development
- ✅ Handle Ctrl+C cleanly

## 📡 Service Endpoints

Once running, visit:
- **API Documentation**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health  
- **Weather Summary**: http://localhost:8001/weather/summary
- **NOTAM Analysis**: http://localhost:8001/notam/parse

## 🛠️ Development

### Manual Setup (if needed)
```bash
# Create virtual environment (in project root)
cd ..
py -m venv .venv

# Install dependencies
.venv\Scripts\python.exe -m pip install -r backend-python-nlp\requirements.txt

# Run manually
cd backend-python-nlp
..\\.venv\Scripts\python.exe app.py
```

### Project Structure
```
backend-python-nlp/
├── app.py              # FastAPI application
├── run.py              # Smart launcher (recommended)
├── requirements.txt    # Python dependencies
├── nlp/               # NLP modules
│   ├── aviation_weather_api.py
│   ├── notam_parser.py
│   └── summary_model.py
└── tests/             # Unit tests
```

## 🤖 AI Features

- **Weather Summarization** - Intelligent TAF/METAR analysis
- **NOTAM Processing** - Natural language understanding of NOTAMs
- **Severity Classification** - Automated weather risk assessment
- **Flight Recommendations** - AI-powered flight planning suggestions

## 🔧 Configuration

The service automatically configures itself. For advanced usage:

- **Port**: Default 8001, or specify: `py run.py 8000`
- **Environment**: Virtual environment handled automatically
- **Hot Reload**: Enabled by default for development

---
*Part of the Aviation Weather Services full-stack application*