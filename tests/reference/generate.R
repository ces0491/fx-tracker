# Reference values for the forecasting tests, computed with R's stats package.
# Run from the project root:  Rscript tests/reference/generate.R
# Writes tests/reference/expected.json, which tests/models.test.js reads.

library(jsonlite)

fx <- fromJSON("tests/fixtures/NZD-ZAR.json")
y <- tail(fx$series$close, 365)
n <- length(y)
horizon <- 30
steps <- c(1, 7, 30)

# Linear regression on time with 95%, 80% and 50% prediction intervals
x <- 0:(n - 1)
lr_fit <- lm(y ~ x)
lr_at <- function(level) predict(lr_fit, newdata = data.frame(x = (n - 1) + steps), interval = "prediction", level = level)
lr <- lr_at(0.95)
lr80 <- lr_at(0.8)
lr50 <- lr_at(0.5)

# Holt's linear method with fixed smoothing parameters
hw <- HoltWinters(y, alpha = 0.3, beta = 0.1, gamma = FALSE)
hw_at <- function(level) predict(hw, n.ahead = horizon, prediction.interval = TRUE, level = level)[steps, , drop = FALSE]
hw_pred <- hw_at(0.95)
hw80 <- hw_at(0.8)
hw50 <- hw_at(0.5)

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
    upper = unname(lr[, "upr"]),
    lower80 = unname(lr80[, "lwr"]),
    upper80 = unname(lr80[, "upr"]),
    lower50 = unname(lr50[, "lwr"]),
    upper50 = unname(lr50[, "upr"])
  ),
  holt = list(
    level = unname(hw$coefficients["a"]),
    trend = unname(hw$coefficients["b"]),
    mean = unname(hw_pred[, "fit"]),
    lower = unname(hw_pred[, "lwr"]),
    upper = unname(hw_pred[, "upr"]),
    lower80 = unname(hw80[, "lwr"]),
    upper80 = unname(hw80[, "upr"]),
    lower50 = unname(hw50[, "lwr"]),
    upper50 = unname(hw50[, "upr"])
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
