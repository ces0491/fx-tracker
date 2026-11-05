# Reference values for the forecasting tests, computed with R's stats package.
# Run from the project root:  Rscript tests/reference/generate.R
# Writes tests/reference/expected.json, which tests/models.test.js reads.

library(jsonlite)

fx <- fromJSON("tests/fixtures/NZD-ZAR.json")
y <- tail(fx$series$close, 365)
n <- length(y)
horizon <- 30
steps <- c(1, 7, 30)

# Linear regression on time with a 95% prediction interval
x <- 0:(n - 1)
lr_fit <- lm(y ~ x)
lr <- predict(lr_fit, newdata = data.frame(x = (n - 1) + steps), interval = "prediction", level = 0.95)

# Holt's linear method with fixed smoothing parameters
hw <- HoltWinters(y, alpha = 0.3, beta = 0.1, gamma = FALSE)
hw_pred <- predict(hw, n.ahead = horizon, prediction.interval = TRUE, level = 0.95)[steps, , drop = FALSE]

# ARIMA(3,1,0): AR(3) on differences by least squares without an intercept,
# then forecasts and standard errors from arima() with those coefficients fixed
d <- diff(y)
lags <- embed(d, 4)
ar_fit <- lm(lags[, 1] ~ 0 + lags[, 2:4])
phi <- unname(coef(ar_fit))
ar <- arima(y, order = c(3, 1, 0), include.mean = FALSE, fixed = phi, transform.pars = FALSE, method = "CSS")
ar_pred <- predict(ar, n.ahead = horizon)
ar_se <- as.numeric(ar_pred$se)

out <- list(
  generated_by = paste("tests/reference/generate.R,", R.version.string),
  fixture = "tests/fixtures/NZD-ZAR.json (last 365 rates)",
  observations = n,
  steps = steps,
  linear_regression = list(
    mean = unname(lr[, "fit"]),
    lower = unname(lr[, "lwr"]),
    upper = unname(lr[, "upr"])
  ),
  holt = list(
    level = unname(hw$coefficients["a"]),
    trend = unname(hw$coefficients["b"]),
    mean = unname(hw_pred[, "fit"]),
    lower = unname(hw_pred[, "lwr"]),
    upper = unname(hw_pred[, "upr"])
  ),
  arima = list(
    phi = phi,
    mean = as.numeric(ar_pred$pred)[steps],
    se_ratio = ar_se[steps] / ar_se[1]
  ),
  t975 = list(df = c(30, 100, 363), value = qt(0.975, c(30, 100, 363))),
  qnorm975 = qnorm(0.975)
)

writeLines(toJSON(out, digits = NA, auto_unbox = TRUE, pretty = TRUE), "tests/reference/expected.json")
