
from typing import List, Union, Optional

# Mock schemas
class IndicatorValue:
    def __init__(self, indicator_key, values, outputs):
        self.indicator_key = indicator_key
        self.values = values
        self.outputs = outputs

INDICATOR_KIND_MAP = {
    "STOCHASTIC": "stoch",
    "MACD": "macd",
}

OUTPUT_PREFIX_MAP = {
    "MACD": ["MACD", "MACDH", "MACDS"],
    "STOCHASTIC": ["STOCHK", "STOCHD"],
}

def _get_indicator_column_name(indicator_value):
    key_raw = indicator_value.indicator_key
    kind = INDICATOR_KIND_MAP.get(key_raw.upper(), key_raw.lower())
    values = indicator_value.values
    output_key = indicator_value.outputs[0].lower() if indicator_value.outputs else ""
    params_str, target_prefix = "", ""

    if kind == 'macd':
        fast = values.get('fast', 12)
        slow = values.get('slow', 26)
        signal = values.get('signal', 9)
        params_str = f"{fast}_{slow}_{signal}"
        
        # Current Logic
        prefix_map = {'macd': 'macd', 'histogram': 'macdh', 'signal': 'macds'}
        target_prefix = prefix_map.get(output_key, 'macd')

    elif kind == 'stoch':
        k = values.get('k', 14)
        d = values.get('d', 3)
        smooth_k = values.get('smooth_k', 3)
        params_str = f"{k}_{d}_{smooth_k}"
        # Current Logic
        target_prefix = f"stoch{output_key}" if output_key in ['k', 'd'] else "stochk"

    return f"{target_prefix}_{params_str}".lower()

# Test Cases
print("--- Stochastic Test ---")
stoch_k = IndicatorValue("STOCHASTIC", {"k": 14, "d": 3, "smooth_k": 3}, ["stochk"])
stoch_d = IndicatorValue("STOCHASTIC", {"k": 14, "d": 3, "smooth_k": 3}, ["stochd"])

print(f"Input: stochk -> Output: {_get_indicator_column_name(stoch_k)}")
print(f"Input: stochd -> Output: {_get_indicator_column_name(stoch_d)}")

print("\n--- MACD Test ---")
macd_h = IndicatorValue("MACD", {"fast": 12, "slow": 26, "signal": 9}, ["macdh"])
macd_s = IndicatorValue("MACD", {"fast": 12, "slow": 26, "signal": 9}, ["macds"])

print(f"Input: macdh -> Output: {_get_indicator_column_name(macd_h)}")
print(f"Input: macds -> Output: {_get_indicator_column_name(macd_s)}")
