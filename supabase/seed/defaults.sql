-- Deliberately no users, passwords, customer files, claimed stock or active promotions.
insert into public.printer_profiles(name,volume_mm,settings)
values('Creality K2','{260,260,260}','{"material":"PETG","slicerConfigured":false}');
insert into public.materials(name,color,hex,visible,available_grams)
values('PETG','Black','#242724',false,0),('PETG','White','#eeeee8',false,0),('PETG','Grey','#8b9390',false,0);
insert into public.settings(name,value) values
('bank_transfer','{"enabled":false}'),('production_window','{"enabled":false}'),
('contact','{}'),('retention_days','{"unclaimed_uploads":30,"closed_orders":365,"enabled":false}');
