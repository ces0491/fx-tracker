# Python Forecast Service

Advanced ML-based forecasting microservice for FX Tracker.

## Quick Start

### Using Docker (Recommended)

```bash
docker-compose up -d
```

Service will be available at `http://localhost:5000`

### Manual Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run service
python app.py
```

## API Endpoints

### POST /forecast

Generate forecast using specified algorithm.

**Request**:

```json
{
  "historical_data": [
    { "date": "2025-01-01", "close": 9.6573 },
    ...
  ],
  "algorithm": "prophet",
  "forecast_days": 30
}
```

**Response**:

```json
{
  "forecast": [...],
  "confidence": 0.88,
  "accuracy": 0.85,
  "mae": 0.032
}
```

### GET /health

Check service health.

### GET /algorithms

List available algorithms with descriptions.

## Available Algorithms

- `lstm` - LSTM Neural Network
- `prophet` - Facebook Prophet
- `garch` - GARCH Volatility Model
- `xgboost` - XGBoost Gradient Boosting

## Dependencies

- Python 3.11+
- Flask 3.0.0
- Prophet 1.1.5
- TensorFlow 2.15.0
- XGBoost 2.0.3
- arch 6.3.0

## Performance

- Prophet: 1-3 seconds
- LSTM: 2-5 seconds (first run)
- GARCH: < 1 second
- XGBoost: < 500ms

## Troubleshooting

### Port Already in Use

```bash
# Change port in app.py or use different port
python app.py --port 5001
```

### TensorFlow Installation Issues

TensorFlow may require specific versions:

```bash
pip install tensorflow==2.15.0
```

### Prophet Installation Issues

Prophet requires additional dependencies:

```bash
# On Linux
sudo apt-get install python3-dev

# On Mac
brew install python

# Then
pip install prophet
```

## Docker

Build custom image:

```bash
docker build -t fx-forecast .
docker run -p 5000:5000 fx-forecast
```

## Environment Variables

- `FLASK_ENV`: Set to `production` for production use
- `PORT`: Service port (default: 5000)

## Monitoring

Health check endpoint:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "fx-forecast-python",
  "algorithms": ["lstm", "prophet", "garch", "xgboost"]
}
```

## Production Deployment

### Using Docker Compose

Already configured for production with:

- Health checks
- Auto-restart
- Resource limits

### Using systemd (Linux)

Create `/etc/systemd/system/fx-forecast.service`:

```ini
[Unit]
Description=FX Forecast Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/fx-forecast
Environment="PATH=/opt/fx-forecast/venv/bin"
ExecStart=/opt/fx-forecast/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable fx-forecast
sudo systemctl start fx-forecast
```

## License

Part of FX Tracker project
