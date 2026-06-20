-- Add 'potty' as an elimination event type (shares the wee/poo/both contents
-- field with nappies via the existing nappy_contents column). Additive only —
-- safe to apply against the live app with no code race.
alter type event_type add value if not exists 'potty';

-- Allow fractional bottle/syringe amounts (e.g. 1.5ml, 4.5ml).
alter table events alter column bottle_amount_ml type numeric;
