# ZenScape

Application de productivité (tâches, objectifs, médicaments, calendrier).

Cette version est disponible en **application de bureau Electron** pour Windows 11.

## Lancer en mode développement (Electron + Vite HMR)

```powershell
npm install
npm run dev:electron
```

- Le serveur Vite tourne sur http://localhost:5173
- Electron se lance automatiquement et charge l'app
- Les modifications React/CSS se rafraîchissent à chaud

**Note**: Vous devez avoir les variables d'environnement Supabase :

Créez un fichier `.env` (ou `.env.local`) à la racine :

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## Construire l'application Windows (portable + installateur)

```powershell
# Build complet (recommandé)
npm run build:win

# Uniquement le portable (pas d'installateur)
npm run build:portable
```

Les fichiers générés sont dans `release/` :

- `ZenScape-Setup-1.0.0.exe` — installateur classique (recommandé)
- `ZenScape-Portable-1.0.0.exe` — version portable (pas d'installation)

## Scripts disponibles

| Script                | Description                                      |
|-----------------------|--------------------------------------------------|
| `npm run dev`         | Web seulement (Vite)                             |
| `npm run dev:electron`| Electron + dev server (recommandé pour dev)      |
| `npm run build:win`   | Build + installateur + portable Windows          |
| `npm run build:portable` | Build + portable uniquement                   |
| `npm run preview:electron` | Build + lancer l'app packagée localement   |

## Icône de l'application

Actuellement, l'installateur et l'exe utilisent l'icône par défaut d'Electron.

Pour utiliser un beau logo :

1. Placez un fichier `build/icon.ico` (Windows) ou `build/icon.png` (256x256 minimum).
2. Relancez `npm run build:win`

Vous pouvez générer des icônes avec :
- https://cloudconvert.com/png-to-ico
- Ou `npx electron-icon-builder --input=./public/images/logo.png --output=build`

## Architecture

- `src/` + Vite → interface (inchangé)
- `electron/main.cjs` → processus principal Electron
- `dist/` → build web
- `release/` → builds Electron finaux

L'app utilise toujours Supabase pour l'authentification et les données (cloud).

## Notes Windows 11

- Fenêtre dimensionnée pour usage confortable (1480x920 par défaut)
- Menu simplifié (Alt pour afficher)
- Single instance (une seule fenêtre)
- Liens externes s'ouvrent dans le navigateur
- Compatible avec les thèmes de l'application

Bon usage !
