#!/usr/bin/env python3
import json
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'data/site-content.json'
instruction = (
    'After you place your order, you will receive a confirmation code. '
    'A Kush World admin will reach out by email and/or phone with payment instructions.'
)
keys = ['paymentZelle', 'paymentPaypal', 'paymentChime', 'paymentVenmo', 'paymentCashapp']

with open(path, encoding='utf-8') as f:
    data = json.load(f)

features = data.setdefault('features', {})
for key in keys:
    if key not in features:
        continue
    entry = features[key]
    entry.pop('payToValue', None)
    entry.pop('payToLabel', None)
    entry['instructions'] = instruction

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
    f.write('\n')

print(f'Cleared manual pay-to fields in {path}')