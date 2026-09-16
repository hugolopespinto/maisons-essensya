-- ════════════════════════════════════════════════════════════════
-- MIGRATION — l'identifiant d'une agence devient du texte
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase.
--
-- POURQUOI. Cet identifiant EST l'adresse publique de la fiche :
-- /agences/<id>. Le back-office le dérive du nom, comme un slug
-- d'article, pour que l'URL reste lisible — « constructeur maison
-- Tartas » se joue aussi là. La colonne étant en `uuid`, le code
-- coerçait silencieusement ce slug en un uuid tiré au hasard : le
-- client aurait saisi « Agence de Tartas » et obtenu la page
-- /agences/6f3a1b2c-… sans que rien ne le signale.
--
-- SANS RISQUE AUJOURD'HUI. La table est vide et aucune clé étrangère ne
-- pointe vers elle. Repassée sur une table peuplée, cette migration
-- conserverait les uuid existants sous forme de texte : les anciennes
-- URL continueraient de répondre.
-- ════════════════════════════════════════════════════════════════

alter table public.agences alter column id drop default;
alter table public.agences alter column id type text using id::text;

-- Le défaut disparaît volontairement : un identifiant d'agence se
-- calcule à partir du nom, il ne se tire pas au sort.
