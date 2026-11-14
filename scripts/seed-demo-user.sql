DELETE FROM users WHERE email='choudharydeepanshu162@gmail.com';

INSERT INTO users (id,email,password_salt,password_hash,name,gamer_id,invite_code,invited_by,joined_at,settings_json,coins,diamonds,cash,level,tier)
VALUES (
  '003ed01c-434d-4574-94ea-7cd5ef3fecf9',
  'choudharydeepanshu162@gmail.com',
  'e6c56b36a5fb85c0f1e30a99174bb402',
  '319dc1225ca1168d5b0b67ce1e113f8d575b0c408563f018979dd9b623db5d3a',
  'Deepanshu',
  'PL-22E4F8DD91',
  '3B14144DF5',
  NULL,
  datetime('now'),
  '{"online":true,"stealth":false,"graphics":"auto","fps":60,"privateProfile":0,"rewardAlerts":1,"twoStep":0}',
  24500,
  350,
  12850,
  18,
  'PLATINUM'
);
