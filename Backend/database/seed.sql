INSERT INTO brands (
  name,
  base_config
)
VALUES (
  'Pinflag Demo',
  '{
    "courier": "CHILEXPRESS",
    "shippingPrice": 3990,
    "availableDeliveryTypes": [
      "HOME_DELIVERY",
      "STORE_PICKUP",
      "PICKUP_POINT"
    ]
  }'::jsonb
);

INSERT INTO rules (
  brand_id,
  name,
  conditions,
  action,
  priority,
  enabled
)
VALUES (
  (SELECT id FROM brands WHERE name = 'Pinflag Demo'),

  'Pedidos sobre $50.000 usan Blue Express',

  '[
    {
      "field": "amount",
      "operator": ">",
      "value": 50000
    }
  ]'::jsonb,

  '{
    "type": "SET_COURIER",
    "value": "BLUE_EXPRESS"
  }'::jsonb,

  100,

  true
);

INSERT INTO rules (
  brand_id,
  name,
  conditions,
  action,
  priority,
  enabled
)
VALUES (
  (SELECT id FROM brands WHERE name = 'Pinflag Demo'),

  'Pedidos bajo 20kg usan FedEx',

  '[
    {
      "field": "weight",
      "operator": "<",
      "value": 20
    }
  ]'::jsonb,

  '{
    "type": "SET_COURIER",
    "value": "FEDEX"
  }'::jsonb,

  50,

  true
);

INSERT INTO rules (
  brand_id,
  name,
  conditions,
  action,
  priority,
  enabled
)
VALUES (
  (SELECT id FROM brands WHERE name = 'Pinflag Demo'),

  'Envío gratis sobre $80.000',

  '[
    {
      "field": "amount",
      "operator": ">",
      "value": 80000
    }
  ]'::jsonb,

  '{
    "type": "SET_SHIPPING_PRICE",
    "value": 0
  }'::jsonb,

  80,

  true
);