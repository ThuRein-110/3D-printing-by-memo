alter table public.pricing_rules add column material_id uuid references public.materials;
alter table public.pricing_rules add column service text check(service in ('ready','custom','photo','reprint'));
create index pricing_scope on public.pricing_rules(material_id,service,effective_at desc) where active;
