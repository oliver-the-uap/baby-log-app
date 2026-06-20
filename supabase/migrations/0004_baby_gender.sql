-- Baby sex, used to plot the correct WHO/NHS growth centiles.
alter table baby add column if not exists gender text check (gender in ('boy', 'girl'));
