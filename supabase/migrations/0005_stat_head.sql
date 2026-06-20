-- Add head circumference as a body-stat measure.
alter type stat_type add value if not exists 'head';
