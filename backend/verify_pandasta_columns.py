
import pandas as pd
import pandas_ta as ta
import numpy as np

# Create dummy data
df = pd.DataFrame({
    'open': np.random.rand(100) * 100,
    'high': np.random.rand(100) * 100,
    'low': np.random.rand(100) * 100,
    'close': np.random.rand(100) * 100,
    'volume': np.random.rand(100) * 1000
})
df.index = pd.date_range(start='2023-01-01', periods=100, freq='1h')

print("--- BBANDS ---")
df.ta.bbands(length=20, std=2.0, append=True)
print([c for c in df.columns if 'BB' in c])

print("\n--- MACD ---")
df.ta.macd(fast=12, slow=26, signal=9, append=True)
print([c for c in df.columns if 'MACD' in c])

print("\n--- STOCH ---")
df.ta.stoch(k=14, d=3, smooth_k=3, append=True)
print([c for c in df.columns if 'STOCH' in c])

print("\n--- SUPERTREND ---")
df.ta.supertrend(length=7, multiplier=3.0, append=True)
print([c for c in df.columns if 'SUPERT' in c])

print("\n--- KELTNER ---")
df.ta.kc(length=20, scalar=2.0, append=True)
print([c for c in df.columns if 'KC' in c])

print("\n--- PSAR ---")
df.ta.psar(af0=0.02, af=0.02, max_af=0.2, append=True)
print([c for c in df.columns if 'PSAR' in c])

print("\n--- SMA ---")
df.ta.sma(length=20, append=True)
print([c for c in df.columns if 'SMA' in c])

print("\n--- EMA ---")
df.ta.ema(length=20, append=True)
print([c for c in df.columns if 'EMA' in c])

print("\n--- RSI ---")
df.ta.rsi(length=14, append=True)
print([c for c in df.columns if 'RSI' in c])

print("\n--- ADX ---")
df.ta.adx(length=14, append=True)
print([c for c in df.columns if 'ADX' in c])

print("\n--- CCI ---")
df.ta.cci(length=14, append=True)
print([c for c in df.columns if 'CCI' in c])

print("\n--- ATR ---")
df.ta.atr(length=14, append=True)
print([c for c in df.columns if 'ATR' in c])

print("\n--- OBV ---")
df.ta.obv(append=True)
print([c for c in df.columns if 'OBV' in c])
