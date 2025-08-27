#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
script.py — Bot de génération de pages HTML pour films/séries/animes + mise à jour du catalogue.

Fonctionnalités :
- Recherche TMDB (movie/tv) pour récupérer les métadonnées (titre, résumé, affiche, genres, année, etc.).
- Construction du lien de streaming (domain + chemin /movies|/series|/animes + slug.mp4) personnalisable.
- Génération d'une page HTML en reprenant la structure d'un template existant :
    - films -> templates/interstellar.html (modèle films)
    - séries -> templates/arcane.html (modèle séries)
  Si le template n'existe pas, un template de secours est utilisé.
- Ajout d'une carte dans catalogue.html (bloc <div class="movieimg">) avec les infos.

Prérequis :
- Variable d'environnement TMDB_API_KEY (ou --tmdb-key).
- pip install requests beautifulsoup4 unidecode

Exemples :
- Film :
  python script.py "Sherlock Holmes" --type film --base-url https://cinetacos.xyz

- Série :
  python script.py "Arcane" --type serie --base-url https://cinetacos.xyz

- Anime (utilise l'endpoint TV de TMDB) :
  python script.py "Demon Slayer" --type anime --base-url https://cinetacos.xyz

Astuce : mettez vos modèles dans ./templates/interstellar.html et ./templates/arcane.html
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

import requests
from bs4 import BeautifulSoup
from unidecode import unidecode

# --------------------------- Utilitaires ---------------------------

def slugify(text: str) -> str:
    text = unidecode(text).strip().lower()
    # Remplace tout sauf lettres/chiffres par -
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    # Évite les slugs vides
    return text or "item"


def ensure_dirs(root: Path, kind: str) -> Path:
    mapping = {
        "film": "films",
        "serie": "series",
        "anime": "animes",
    }
    folder = mapping.get(kind, "films")
    outdir = root / folder
    outdir.mkdir(parents=True, exist_ok=True)
    return outdir


def build_stream_url(base_url: str, kind: str, title: str) -> str:
    # Construit une URL style https://domain.tld/movies/Sherlock-Holmes.mp4
    # (films -> movies ; series -> series ; animes -> animes)
    mapping = {"film": "movies", "serie": "series", "anime": "animes"}
    path = mapping.get(kind, "movies")
    # L'exemple de l'utilisateur montre un slug avec des tirets et majuscules initiales.
    # On garde un format sobre : Mots-Concatenes.mp4
    name = "-".join([w.capitalize() for w in re.split(r"\s+", title.strip())])
    return f"{base_url.rstrip('/')}/{path}/{name}.mp4"


# --------------------------- TMDB ---------------------------

TMDB_API = "https://api.themoviedb.org/3"


def tmdb_headers(api_key: str) -> Dict[str, str]:
    return {"accept": "application/json", "Authorization": f"Bearer {api_key}"} if len(api_key) > 40 else {}


def tmdb_get(url: str, params: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    if len(api_key) > 40:
        # Token v4
        r = requests.get(url, params=params, headers=tmdb_headers(api_key))
    else:
        # Clé v3
        params = {**params, "api_key": api_key}
        r = requests.get(url, params=params)
    r.raise_for_status()
    return r.json()


def search_tmdb(query: str, kind: str, lang: str, api_key: str) -> Dict[str, Any]:
    if kind == "film":
        url = f"{TMDB_API}/search/movie"
    else:
        url = f"{TMDB_API}/search/tv"
    data = tmdb_get(url, {"query": query, "language": lang, "include_adult": False}, api_key)
    results = data.get("results", [])
    if not results:
        raise SystemExit(f"Aucun résultat TMDB pour '{query}' ({kind}).")
    return results[0]


def get_details_tmdb(item_id: int, kind: str, lang: str, api_key: str) -> Dict[str, Any]:
    if kind == "film":
        url = f"{TMDB_API}/movie/{item_id}"
    else:
        url = f"{TMDB_API}/tv/{item_id}"
    params = {"language": lang, "append_to_response": "credits,images,videos"}
    return tmdb_get(url, params, api_key)


def image_url(path: Optional[str], size: str = "w500") -> str:
    if not path:
        return ""
    base = "https://image.tmdb.org/t/p/"
    return f"{base}{size}{path}"


# --------------------------- Templates ---------------------------

FALLBACK_TEMPLATE_MOVIE = """<!doctype html>
<html lang=\"fr\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>{{TITLE}}</title>\n  <meta name=\"description\" content=\"{{OVERVIEW}}\">\n  <link rel=\"preload\" as=\"image\" href=\"{{POSTER}}\">\n</head>\n<body>\n  <main>\n    <h1>{{TITLE}} ({{YEAR}})</h1>\n    <p id=\"synopsis\">{{OVERVIEW}}</p>\n    <img id=\"poster\" src=\"{{POSTER}}\" alt=\"{{TITLE}}\">\n    <p class=\"meta\"><strong>Genres :</strong> {{GENRES}}</p>\n    <video id=\"player\" controls preload=\"metadata\" src=\"{{STREAM}}\"></video>\n  </main>\n</body>\n</html>\n"""

FALLBACK_TEMPLATE_TV = FALLBACK_TEMPLATE_MOVIE.replace("<video", "<video data-type=\"tv\"")


def load_template(root: Path, kind: str) -> str:
    # Préférence pour vos modèles existants
    if kind == "film":
        path = root / "templates" / "interstellar.html"
    else:
        path = root / "templates" / "arcane.html"
    if path.exists():
        return path.read_text(encoding="utf-8")
    # Secours
    return FALLBACK_TEMPLATE_MOVIE if kind == "film" else FALLBACK_TEMPLATE_TV


def apply_template(template: str, ctx: Dict[str, str]) -> str:
    # 1) Si le template contient des placeholders {{VAR}}, on fait un remplacement direct
    def has_placeholders(t: str) -> bool:
        return "{{TITLE}}" in t or "{{OVERVIEW}}" in t or "{{POSTER}}" in t

    if has_placeholders(template):
        html = template
        for k, v in ctx.items():
            html = html.replace(f"{{{{{k}}}}}", v)
        return html

    # 2) Sinon, tentative heuristique :
    soup = BeautifulSoup(template, "html.parser")

    # <title>
    if soup.title:
        soup.title.string = ctx["TITLE"]

    # synopsis -> id=synopsis si présent, sinon premier <p>
    syn = soup.find(id="synopsis") or soup.find("p")
    if syn:
        syn.string = ctx["OVERVIEW"]

    # affiche -> premier <img> (évite de casser les logos)
    img = soup.find("img")
    if img and ctx["POSTER"]:
        img["src"] = ctx["POSTER"]
        img["alt"] = ctx["TITLE"]

    # titre h1 si présent
    h1 = soup.find("h1")
    if h1:
        h1.string = f"{ctx['TITLE']} ({ctx['YEAR']})"

    # genres -> cherche un conteneur avec 'Genres' texte
    genre_target = soup.find(string=re.compile(r"Genres", re.I))
    if genre_target and genre_target.parent and genre_target.parent.name in {"p", "div", "span"}:
        # Remplace uniquement le texte après le mot Genres
        try:
            genre_target.parent.string.replace_with(f"Genres : {ctx['GENRES']}")
        except Exception:
            pass

    # lecteur vidéo -> <video> src
    vid = soup.find("video") or soup.find("source")
    if vid:
        # <video src> ou <source src>
        vid["src"] = ctx["STREAM"]

    return str(soup)


# --------------------------- Catalogue ---------------------------

def update_catalogue(catalogue_path: Path, card: Dict[str, str]) -> None:
    html = catalogue_path.read_text(encoding="utf-8") if catalogue_path.exists() else "<!doctype html><html><body><div id=\"catalogue\"></div></body></html>"
    soup = BeautifulSoup(html, "html.parser")

    container = soup.find(id="catalogue")
    if not container:
        # fallback : append to body
        container = soup.body or soup

    new_div = soup.new_tag("div", **{"class": "movieimg"})
    new_div["data-title"] = card["data_title"]
    new_div["data-genre"] = card["data_genre"]

    a = soup.new_tag("a", href=card["href"])  # lien vers la page du projet
    img = soup.new_tag("img", src=card["img_src"], alt=card["alt"])
    a.append(img)
    new_div.append(a)

    h2 = soup.new_tag("h2"); h2.string = card["title"]; new_div.append(h2)
    span = soup.new_tag("span"); span.string = card["year"]; new_div.append(span)

    container.append(new_div)

    catalogue_path.write_text(str(soup), encoding="utf-8")


# --------------------------- Pipeline principal ---------------------------

def main():
    parser = argparse.ArgumentParser(description="Génère une page HTML et met à jour le catalogue depuis TMDB")
    parser.add_argument("query", help="Titre du film/série/anime à ajouter")
    parser.add_argument("--type", choices=["film", "serie", "anime"], default="film", dest="kind")
    parser.add_argument("--lang", default="fr-FR", help="Langue TMDB (ex: fr-FR)")
    parser.add_argument("--tmdb-key", default=os.getenv("TMDB_API_KEY", ""), help="Clé TMDB (ou token v4)")
    parser.add_argument("--project-root", default=str(Path.cwd()), help="Racine du projet (contenant catalogue.html, dossiers films/series/animes, etc.)")
    parser.add_argument("--base-url", default="https://cinetacos.xyz", help="Base URL pour le streaming (ex: https://cinetacos.xyz)")
    parser.add_argument("--dry-run", action="store_true", help="N'écrit pas les fichiers, affiche seulement")

    args = parser.parse_args()

    if not args.tmdb_key:
        raise SystemExit("TMDB_API_KEY manquant. Utilisez --tmdb-key ou définissez TMDB_API_KEY.")

    project_root = Path(args.project_root)

    # 1) Recherche + détails TMDB
    item = search_tmdb(args.query, args.kind, args.lang, args.tmdb_key)
    item_id = item.get("id")
    details = get_details_tmdb(item_id, args.kind, args.lang, args.tmdb_key)

    # Normalisation champs
    if args.kind == "film":
        title = details.get("title") or item.get("title") or args.query
        overview = details.get("overview") or item.get("overview") or ""
        poster = image_url(details.get("poster_path") or item.get("poster_path"))
        year = (details.get("release_date") or item.get("release_date") or "0000").split("-")[0]
        genres = ", ".join([g.get("name", "") for g in details.get("genres", []) if g.get("name")])
    else:
        title = details.get("name") or item.get("name") or args.query
        overview = details.get("overview") or item.get("overview") or ""
        poster = image_url(details.get("poster_path") or item.get("poster_path"))
        year = (details.get("first_air_date") or item.get("first_air_date") or "0000").split("-")[0]
        genres = ", ".join([g.get("name", "") for g in details.get("genres", []) if g.get("name")])

    stream_url = build_stream_url(args.base_url, args.kind, title)

    # 2) Génération HTML à partir du template
    template_src = load_template(project_root, args.kind)
    ctx = {
        "TITLE": title,
        "OVERVIEW": overview,
        "POSTER": poster,
        "YEAR": year,
        "GENRES": genres,
        "STREAM": stream_url,
    }
    page_html = apply_template(template_src, ctx)

    # 3) Écriture du fichier dans le bon dossier
    outdir = ensure_dirs(project_root, args.kind)
    out_filename = f"{slugify(title)}.html"
    out_path = outdir / out_filename

    # 4) Mise à jour du catalogue
    rel_href = str(out_path.relative_to(project_root)).replace("\\", "/")
    catalogue_card = {
        "data_title": title,
        "data_genre": genres,
        "href": rel_href,
        "img_src": poster,
        "alt": title,
        "title": title,
        "year": year,
    }
    catalogue_path = project_root / "catalogue.html"

    # 5) Exécution (ou dry-run)
    if args.dry_run:
        print("=== CONTEXTE ===")
        print(json.dumps({**ctx, "OUTPUT": rel_href}, ensure_ascii=False, indent=2))
        print("\n=== EXTRAIT PAGE (500 premiers caractères) ===")
        print(page_html[:500])
        print("\n=== CATALOGUE CARD ===")
        print(json.dumps(catalogue_card, ensure_ascii=False, indent=2))
        return

    # Écrit la page
    out_path.write_text(page_html, encoding="utf-8")

    # Met à jour catalogue.html
    update_catalogue(catalogue_path, catalogue_card)

    print(f"✅ Page générée : {out_path}")
    print(f"✅ Catalogue mis à jour : {catalogue_path}")
    print(f"ℹ️  Lien streaming utilisé : {stream_url}")


if __name__ == "__main__":
    try:
        main()
    except requests.HTTPError as e:
        print(f"Erreur API TMDB: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Erreur: {e}")
        sys.exit(1)
