import { ALGORITHMS } from '@/lib/config/forecast';
import { RATE_SOURCE } from '@/lib/config/source';

function Column({ title, children }) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

function Term({ name, children }) {
  return (
    <p>
      <span className="font-medium text-foreground">{name}.</span> {children}
    </p>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20">
      <h2 id="how-heading" className="text-xl font-semibold tracking-tight">
        How it works
      </h2>
      <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-3">
        <Column title="Data">
          <p>
            Rates come from{' '}
            <a href={RATE_SOURCE.url} className="text-foreground underline decoration-hairline underline-offset-2 hover:decoration-accent">
              {RATE_SOURCE.name}
            </a>
            , which blends the daily mid-market rates that central banks and other official sources publish. There is one
            rate per calendar day, weekends included, and Frankfurter can revise a day&apos;s rate as more sources report.
          </p>
          <p>
            Nothing here is live. The newest figure is the latest daily rate, and the tracker keeps a copy for up to an
            hour. Only active ISO 4217 currencies are listed.
          </p>
        </Column>

        <Column title="Indicators">
          <Term name="Moving averages">The simple average of the last 5 or 20 daily rates.</Term>
          <Term name="Bollinger bands">Two standard deviations either side of the 20-day average.</Term>
          <Term name="RSI">
            The 14-day relative strength index, from simple averages of daily gains and losses. Readings above 70 or below
            30 are often treated as stretched.
          </Term>
          <Term name="30-day range">The lowest and highest daily rate over the last 30 days.</Term>
          <Term name="Volatility">
            The root mean square of daily log returns, annualised at the series&apos; own frequency of about 365 rates a
            year.
          </Term>
        </Column>

        <Column title="Forecasts">
          <p>
            Each model is fitted to the past year of daily rates for the pair and projected forward over the chosen
            horizon. The shaded band is the model&apos;s own estimate of its uncertainty.
          </p>
          {ALGORITHMS.map((algorithm) => (
            <Term key={algorithm.value} name={algorithm.label}>
              {algorithm.description}
            </Term>
          ))}
          <p>
            The models only see past rates. They know nothing about rate decisions, elections or anything else that
            moves a currency.
          </p>
        </Column>
      </div>
    </section>
  );
}
