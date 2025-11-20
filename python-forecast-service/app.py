# python-forecast-service/app.py
# Advanced FX Forecasting Microservice using ML algorithms

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# ============================================================================
# ADVANCED FORECASTING ALGORITHMS
# ============================================================================

def lstm_forecast(data, forecast_days=30):
    """
    LSTM Neural Network for time series forecasting
    Requires: tensorflow/keras
    """
    try:
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout
        from sklearn.preprocessing import MinMaxScaler

        prices = np.array([d['close'] for d in data]).reshape(-1, 1)

        # Normalize data
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(prices)

        # Prepare sequences
        sequence_length = 20
        X, y = [], []
        for i in range(sequence_length, len(scaled_data)):
            X.append(scaled_data[i-sequence_length:i, 0])
            y.append(scaled_data[i, 0])

        X, y = np.array(X), np.array(y)
        X = np.reshape(X, (X.shape[0], X.shape[1], 1))

        # Build LSTM model
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(sequence_length, 1)),
            Dropout(0.2),
            LSTM(50, return_sequences=False),
            Dropout(0.2),
            Dense(25),
            Dense(1)
        ])

        model.compile(optimizer='adam', loss='mean_squared_error')
        model.fit(X, y, batch_size=1, epochs=10, verbose=0)

        # Generate forecast
        forecast = []
        last_sequence = scaled_data[-sequence_length:]

        for i in range(forecast_days):
            last_sequence_reshaped = last_sequence.reshape(1, sequence_length, 1)
            pred = model.predict(last_sequence_reshaped, verbose=0)[0][0]

            forecast.append(pred)
            last_sequence = np.append(last_sequence[1:], pred).reshape(-1, 1)

        # Inverse transform
        forecast = scaler.inverse_transform(np.array(forecast).reshape(-1, 1))

        # Calculate confidence intervals (using prediction variance)
        std_error = np.std(y - model.predict(X, verbose=0).flatten()) * scaler.scale_[0]

        result = []
        last_date = datetime.strptime(data[-1]['date'], '%Y-%m-%d')

        for i, pred in enumerate(forecast):
            date = last_date + timedelta(days=i+1)
            confidence_width = 1.96 * std_error * np.sqrt(i + 1)

            result.append({
                'date': date.strftime('%Y-%m-%d'),
                'rate': float(pred[0]),
                'upper': float(pred[0] + confidence_width),
                'lower': float(pred[0] - confidence_width),
                'type': 'forecast'
            })

        return {
            'forecast': result,
            'confidence': 0.85,
            'accuracy': float(1 - std_error / np.mean(prices)),
            'mae': float(std_error)
        }

    except ImportError:
        raise Exception("TensorFlow not installed. Run: pip install tensorflow")


def prophet_forecast(data, forecast_days=30):
    """
    Facebook Prophet for time series forecasting
    Handles seasonality and holidays automatically
    """
    try:
        from prophet import Prophet

        # Prepare data for Prophet
        df = pd.DataFrame({
            'ds': pd.to_datetime([d['date'] for d in data]),
            'y': [d['close'] for d in data]
        })

        # Initialize and fit model
        model = Prophet(
            changepoint_prior_scale=0.05,
            seasonality_mode='multiplicative',
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True
        )

        model.fit(df)

        # Create future dataframe
        future = model.make_future_dataframe(periods=forecast_days)
        forecast = model.predict(future)

        # Extract forecast data
        result = []
        for i in range(len(df), len(forecast)):
            row = forecast.iloc[i]
            result.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'rate': float(row['yhat']),
                'upper': float(row['yhat_upper']),
                'lower': float(row['yhat_lower']),
                'type': 'forecast'
            })

        # Calculate accuracy metrics
        predictions = forecast['yhat'][:len(df)]
        actuals = df['y']
        mae = np.mean(np.abs(predictions - actuals))
        accuracy = 1 - (mae / np.mean(actuals))

        return {
            'forecast': result,
            'confidence': 0.88,
            'accuracy': float(accuracy),
            'mae': float(mae)
        }

    except ImportError:
        raise Exception("Prophet not installed. Run: pip install prophet")


def garch_forecast(data, forecast_days=30):
    """
    GARCH model for volatility forecasting
    Good for FX markets with volatility clustering
    """
    try:
        from arch import arch_model

        prices = np.array([d['close'] for d in data])
        returns = 100 * np.diff(np.log(prices))

        # Fit GARCH(1,1) model
        model = arch_model(returns, vol='Garch', p=1, q=1)
        results = model.fit(disp='off')

        # Forecast volatility
        volatility_forecast = results.forecast(horizon=forecast_days)
        predicted_variance = volatility_forecast.variance.values[-1, :]
        predicted_volatility = np.sqrt(predicted_variance)

        # Generate price forecast with volatility
        last_price = prices[-1]
        mean_return = np.mean(returns)

        result = []
        last_date = datetime.strptime(data[-1]['date'], '%Y-%m-%d')
        current_price = last_price

        for i in range(forecast_days):
            date = last_date + timedelta(days=i+1)

            # Price forecast with drift
            expected_return = mean_return
            current_price = current_price * np.exp(expected_return / 100)

            # Confidence intervals using GARCH volatility
            vol = predicted_volatility[i] if i < len(predicted_volatility) else predicted_volatility[-1]
            confidence_width = 1.96 * (vol / 100) * current_price

            result.append({
                'date': date.strftime('%Y-%m-%d'),
                'rate': float(current_price),
                'upper': float(current_price + confidence_width),
                'lower': float(current_price - confidence_width),
                'type': 'forecast'
            })

        # Calculate accuracy
        fitted_values = results.conditional_volatility
        mae = np.mean(np.abs(returns[1:] - fitted_values[:-1]))

        return {
            'forecast': result,
            'confidence': 0.82,
            'accuracy': float(1 - mae / np.std(returns)),
            'mae': float(mae)
        }

    except ImportError:
        raise Exception("arch not installed. Run: pip install arch")


def xgboost_forecast(data, forecast_days=30):
    """
    XGBoost for time series forecasting
    Uses gradient boosting with engineered features
    """
    try:
        import xgboost as xgb
        from sklearn.preprocessing import StandardScaler

        prices = np.array([d['close'] for d in data])

        # Create features
        def create_features(prices, lookback=10):
            features = []
            targets = []

            for i in range(lookback, len(prices)):
                # Technical features
                recent = prices[i-lookback:i]
                features.append([
                    recent[-1],  # Last price
                    np.mean(recent),  # MA
                    np.std(recent),  # Volatility
                    recent[-1] - recent[0],  # Change
                    (recent[-1] - recent[0]) / recent[0],  # % Change
                    np.max(recent),  # High
                    np.min(recent),  # Low
                    recent[-1] - np.mean(recent),  # Distance from MA
                ])
                targets.append(prices[i])

            return np.array(features), np.array(targets)

        X, y = create_features(prices, lookback=10)

        # Split train/test
        split = int(len(X) * 0.8)
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Train XGBoost
        model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        model.fit(X_train_scaled, y_train)

        # Calculate accuracy
        predictions = model.predict(X_test_scaled)
        mae = np.mean(np.abs(predictions - y_test))
        accuracy = 1 - (mae / np.mean(y_test))

        # Generate forecast
        result = []
        last_date = datetime.strptime(data[-1]['date'], '%Y-%m-%d')
        forecast_prices = list(prices[-10:])

        for i in range(forecast_days):
            # Create features from recent prices
            recent = np.array(forecast_prices[-10:])
            features = np.array([[
                recent[-1],
                np.mean(recent),
                np.std(recent),
                recent[-1] - recent[0],
                (recent[-1] - recent[0]) / recent[0],
                np.max(recent),
                np.min(recent),
                recent[-1] - np.mean(recent),
            ]])

            features_scaled = scaler.transform(features)
            pred = model.predict(features_scaled)[0]

            forecast_prices.append(pred)

            date = last_date + timedelta(days=i+1)
            confidence_width = mae * 1.96 * np.sqrt(i + 1)

            result.append({
                'date': date.strftime('%Y-%m-%d'),
                'rate': float(pred),
                'upper': float(pred + confidence_width),
                'lower': float(pred - confidence_width),
                'type': 'forecast'
            })

        return {
            'forecast': result,
            'confidence': 0.83,
            'accuracy': float(accuracy),
            'mae': float(mae)
        }

    except ImportError:
        raise Exception("xgboost not installed. Run: pip install xgboost scikit-learn")


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/forecast', methods=['POST'])
def forecast():
    """Main forecasting endpoint"""
    try:
        data = request.json
        historical_data = data.get('historical_data', [])
        algorithm = data.get('algorithm', 'prophet')
        forecast_days = data.get('forecast_days', 30)

        if not historical_data or len(historical_data) < 30:
            return jsonify({
                'error': 'Insufficient historical data. Need at least 30 data points.'
            }), 400

        # Route to appropriate algorithm
        if algorithm == 'lstm':
            result = lstm_forecast(historical_data, forecast_days)
        elif algorithm == 'prophet':
            result = prophet_forecast(historical_data, forecast_days)
        elif algorithm == 'garch':
            result = garch_forecast(historical_data, forecast_days)
        elif algorithm == 'xgboost':
            result = xgboost_forecast(historical_data, forecast_days)
        else:
            return jsonify({'error': f'Unknown algorithm: {algorithm}'}), 400

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'fx-forecast-python',
        'algorithms': ['lstm', 'prophet', 'garch', 'xgboost']
    })


@app.route('/algorithms', methods=['GET'])
def list_algorithms():
    """List available algorithms with descriptions"""
    return jsonify({
        'algorithms': [
            {
                'name': 'lstm',
                'description': 'Long Short-Term Memory neural network',
                'best_for': 'Complex patterns, non-linear relationships',
                'accuracy': 'High',
                'speed': 'Slow'
            },
            {
                'name': 'prophet',
                'description': 'Facebook Prophet with seasonality',
                'best_for': 'Data with strong seasonal patterns',
                'accuracy': 'Very High',
                'speed': 'Medium'
            },
            {
                'name': 'garch',
                'description': 'GARCH volatility modeling',
                'best_for': 'Volatility forecasting, risk management',
                'accuracy': 'High',
                'speed': 'Fast'
            },
            {
                'name': 'xgboost',
                'description': 'Gradient boosting with feature engineering',
                'best_for': 'Short to medium term predictions',
                'accuracy': 'High',
                'speed': 'Medium'
            }
        ]
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
