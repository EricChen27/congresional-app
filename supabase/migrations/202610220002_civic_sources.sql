-- Expand sourced vocabulary beyond congressional procedure. Bill-context URLs stay restricted.
alter table public.dictionary_entries drop constraint if exists dictionary_entries_definition_source_url_check;
alter table public.dictionary_entries add constraint dictionary_entries_definition_source_url_check
check (char_length(definition_source_url) <= 2000 and definition_source_url ~ '^https://([a-z0-9-]+\.)*(congress\.gov|govinfo\.gov|senate\.gov|house\.gov|ssa\.gov|medicare\.gov|usa\.gov|hhs\.gov|fda\.gov|energy\.gov)/');
