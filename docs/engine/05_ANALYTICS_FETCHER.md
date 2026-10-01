# 📊 Analytics & Public Fetcher Subsystems (`engine/internal/proxy/`)

The Analytics and Fetcher modules provide long-term proxy profiling and automated public proxy list discovery.

---

## 1. Reliability Score Algorithm (0-100)

The engine calculates a continuous reliability score ($S$) based on four weighted factors:
- **Stability ($40\%$)**: Overall check success rate.
- **Speed ($30\%$)**: Response latency normalized against average pool speeds.
- **Consistency ($20\%$)**: Variance and consecutive failure penalties.
- **Recency ($10\%$)**: Time elapsed since the last verified alive check.

## 2. Auto-Tagging Engine
Proxies meeting specific thresholds receive automatic classification tags:
- `fast`: Average latency $< 300ms$.
- `stable`: Lifetime uptime $> 80\%$.
- `failing`: Success rate $< 30\%$.
