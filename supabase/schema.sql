-- ════════════════════════════════════════════════════════════════
-- MAISONS ESSENSYA — schéma du back-office
--
-- À exécuter dans l'éditeur SQL de Supabase (ou via `supabase db push`).
-- Idempotent : relançable sans casse.
--
-- PRINCIPE DE SÉCURITÉ, à lire avant de toucher aux politiques :
-- aucune de ces tables n'est accessible depuis le navigateur. Le RLS est
-- actif PARTOUT et aucune politique n'ouvre l'accès aux rôles `anon` et
-- `authenticated`. Tous les accès passent par le serveur Next, avec la
-- clé `service_role` — qui ne doit JAMAIS être exposée côté client
-- (variable SUPABASE_SERVICE_ROLE_KEY, sans préfixe NEXT_PUBLIC_).
-- C'est le même principe que le token Vitahome : le secret ne quitte
-- pas le serveur.
-- ════════════════════════════════════════════════════════════════

-- ── Contenu par domaine ───────────────────────────────────────────
-- Un enregistrement par domaine éditable ('seo', 'tracking', 'textes').
-- En JSONB parce que ces formes évoluent au rythme du design, pas du
-- métier : leur donner des colonnes imposerait une migration à chaque
-- ajout de champ dans le back-office. Les articles et les surcharges
-- d'annonces, eux, ont de vraies tables — on les filtre et on les trie.
create table if not exists public.content (
  key         text primary key,
  value       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid        references auth.users (id) on delete set null
);

comment on table public.content is
  'Contenu éditable par domaine. Lu par getContent(), écrit par le back-office.';

-- ── Articles de blog ──────────────────────────────────────────────
create table if not exists public.articles (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  titre       text        not null,
  chapo       text        not null default '',
  corps       text        not null default '',
  image       text,
  image_alt   text,
  -- Un article sans date de publication n'est jamais servi.
  publie_le   timestamptz,
  auteur      text,
  brouillon   boolean     not null default true,
  seo         jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid        references auth.users (id) on delete set null
);

-- Le site public ne liste que les articles publiés, triés par date.
create index if not exists articles_publies_idx
  on public.articles (publie_le desc)
  where brouillon = false and publie_le is not null;

-- ── Enrichissement des annonces ───────────────────────────────────
-- ⚠ Ce ne sont PAS les annonces. Les annonces vivent dans Vitahome et
-- ne sont jamais recopiées ici : on stocke uniquement les écarts voulus
-- par le client, indexés sur la référence du flux. Si une annonce
-- disparaît du flux, sa surcharge devient inerte — c'est voulu, elle
-- reprendra effet si l'annonce revient.
create table if not exists public.annonce_overrides (
  ref            text        primary key,
  titre          text,
  accroche       text,
  coup_de_coeur  boolean     not null default false,
  masquee        boolean     not null default false,
  seo            jsonb       not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  updated_by     uuid        references auth.users (id) on delete set null
);

create index if not exists annonce_overrides_coup_de_coeur_idx
  on public.annonce_overrides (coup_de_coeur)
  where coup_de_coeur = true;

-- ── Médiathèque ───────────────────────────────────────────────────
-- La FICHE d'un fichier, pas le fichier : l'objet vit dans le bucket
-- privé « medias » de Supabase Storage (voir la fin de ce fichier).
-- Les deux se créent et se suppriment ensemble, par src/lib/medias.ts.
-- `chemin` est unique : c'est la clé de rapprochement avec le bucket, et
-- deux fiches pour un même objet rendraient la suppression ambiguë.
create table if not exists public.medias (
  id          uuid        primary key default gen_random_uuid(),
  chemin      text        not null unique,
  nom         text        not null,
  -- Techniquement facultatif, exigé par l'interface : une image sans
  -- texte alternatif est invisible pour Google et pour un lecteur d'écran.
  alt         text        not null default '',
  type        text        not null default 'application/octet-stream',
  taille      bigint      not null default 0,
  -- Lues dans l'en-tête du fichier quand le format le permet. Nulles
  -- pour un PDF, un SVG, ou un format non reconnu.
  largeur     integer,
  hauteur     integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid        references auth.users (id) on delete set null
);

comment on table public.medias is
  'Fiches de la médiathèque. Le fichier lui-même est dans le bucket « medias ».';

-- La médiathèque s'affiche du plus récent au plus ancien, comme WordPress.
create index if not exists medias_recents_idx
  on public.medias (created_at desc);

-- ── Agences ───────────────────────────────────────────────────────
-- Elles étaient figées dans src/data/essensya.ts. Les rendre éditables,
-- c'est permettre d'ouvrir une agence sans attendre un déploiement.
-- ⚠ On ne supprime pas une agence qui ferme : `actif = false` la retire
-- du site en gardant sa fiche, ses villes et son historique.
create table if not exists public.agences (
  -- ⚠ TEXTE, PAS UUID, ET C'EST UN CHOIX DE RÉFÉRENCEMENT.
  -- Cet identifiant EST l'adresse publique : /agences/<id>. Le
  -- back-office le dérive du nom, comme un slug d'article, pour que
  -- l'URL reste lisible — « constructeur maison Tartas » se joue aussi
  -- là. Un uuid donnerait /agences/6f3a1b2c-… : illisible pour un
  -- visiteur, muet pour un moteur.
  --
  -- La colonne était en uuid, et le code coercait donc silencieusement
  -- le slug calculé en un uuid tiré au hasard : l'identifiant lisible
  -- était jeté sans que rien ne le signale, et le commentaire de
  -- l'écran d'administration promettait exactement l'inverse.
  id           text        primary key,
  nom          text        not null,
  zone         text        not null default '',
  adresse      text        not null default '',
  telephone    text        not null default '',
  email        text        not null default '',
  horaires     text        not null default '',
  -- Absentes = l'agence n'apparaît pas sur la carte, mais reste listée.
  lat          double precision,
  lng          double precision,
  -- Identifiant de public.medias, ou URL. Pas de clé étrangère : une URL
  -- externe est un cas légitime, et supprimer une image ne doit pas
  -- faire disparaître l'agence.
  image        text,
  -- Communes desservies : la longue traîne géographique du référencement.
  villes       text[]      not null default '{}',
  description  text        not null default '',
  actif        boolean     not null default true,
  ordre        integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid        references auth.users (id) on delete set null
);

create index if not exists agences_ordre_idx
  on public.agences (ordre, nom);

-- ── Comptes d'administration ──────────────────────────────────────
-- Supabase Auth gère les identifiants, la réinitialisation de mot de
-- passe et le second facteur. Cette table ne porte que le rôle
-- applicatif : être authentifié ne suffit pas à être administrateur.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       text not null default 'editeur'
             check (role in ('editeur', 'admin')),
  created_at timestamptz not null default now()
);

comment on column public.admins.role is
  'editeur : contenu, blog, SEO, annonces. admin : + tracking et comptes.';

-- ── Journal des modifications ─────────────────────────────────────
-- « Qui a changé quoi, et quand » — la question que le client posera au
-- premier contenu disparu. Un instantané complet avant chaque écriture :
-- c'est volumineux mais trivial à restaurer, et le volume est dérisoire
-- à l'échelle d'un site vitrine.
create table if not exists public.content_versions (
  id          bigserial   primary key,
  -- 'content:seo' · 'article:<uuid>' · 'annonce:<ref>'
  scope       text        not null,
  snapshot    jsonb       not null,
  created_at  timestamptz not null default now(),
  created_by  uuid        references auth.users (id) on delete set null
);

create index if not exists content_versions_scope_idx
  on public.content_versions (scope, created_at desc);

-- ── Verrouillage ──────────────────────────────────────────────────
-- RLS actif et AUCUNE politique : par défaut, tout est refusé à `anon`
-- et à `authenticated`. Seule la clé `service_role`, utilisée côté
-- serveur uniquement, contourne le RLS. Si un jour on ouvre un accès
-- direct depuis le navigateur, il faudra ajouter des politiques ici —
-- et ce sera une décision consciente, pas un oubli.
alter table public.content            enable row level security;
alter table public.articles           enable row level security;
alter table public.annonce_overrides  enable row level security;
alter table public.medias             enable row level security;
alter table public.agences            enable row level security;
alter table public.admins             enable row level security;
alter table public.content_versions   enable row level security;

-- ── Horodatage automatique ────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists content_touch on public.content;
create trigger content_touch
  before update on public.content
  for each row execute function public.touch_updated_at();

drop trigger if exists articles_touch on public.articles;
create trigger articles_touch
  before update on public.articles
  for each row execute function public.touch_updated_at();

drop trigger if exists annonce_overrides_touch on public.annonce_overrides;
create trigger annonce_overrides_touch
  before update on public.annonce_overrides
  for each row execute function public.touch_updated_at();

drop trigger if exists medias_touch on public.medias;
create trigger medias_touch
  before update on public.medias
  for each row execute function public.touch_updated_at();

drop trigger if exists agences_touch on public.agences;
create trigger agences_touch
  before update on public.agences
  for each row execute function public.touch_updated_at();

-- ── Amorçage ──────────────────────────────────────────────────────
-- Les domaines JSONB existent dès le départ : le back-office lit des
-- enregistrements présents plutôt que de gérer un cas « pas encore créé »
-- à chaque écran.
--
-- ⚠ 'pages' est amorcé VIDE et non avec les textes du site. La structure
-- des blocs (quelles pages, quels champs, quels libellés) vit dans le
-- code — PAGES_DEFAUT, src/lib/store/index.ts — parce qu'un bloc n'a de
-- sens que si un gabarit sait l'afficher. La base ne garde que les
-- valeurs saisies par le client. La recopier ici imposerait de rejouer
-- ce fichier à chaque section ajoutée au site.
insert into public.content (key, value) values
  ('seo',      '[]'::jsonb),
  ('tracking', '{"conversions":[]}'::jsonb),
  ('textes',   '{}'::jsonb),
  ('menus',    '{"header":[],"footer":[]}'::jsonb),
  ('reglages', '{}'::jsonb),
  ('pages',    '[]'::jsonb)
on conflict (key) do nothing;

-- ════════════════════════════════════════════════════════════════
-- MÉDIAS — LE BUCKET
--
-- La table public.medias (plus haut) ne porte que les fiches. Les
-- FICHIERS vont dans un bucket de Supabase Storage, à créer une fois :
--
--   insert into storage.buckets (id, name, public)
--   values ('medias', 'medias', false)
--   on conflict (id) do nothing;
--
-- ⚠ PRIVÉ (public = false), et pas par excès de prudence : un bucket
-- public expose toute la photothèque du client — y compris les plans,
-- les visuels non diffusés et les brouillons — à qui devine un nom de
-- fichier, sans trace dans aucun journal. Les URL sont donc signées à la
-- demande côté serveur, et elles expirent (src/lib/medias.ts).
--
-- Aucune politique sur storage.objects : comme pour les tables, seule la
-- clé service_role passe, et elle ne quitte pas le serveur. Le navigateur
-- ne parle jamais au bucket, il ne voit que des URL signées.
-- ════════════════════════════════════════════════════════════════
