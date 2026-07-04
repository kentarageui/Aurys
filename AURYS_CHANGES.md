# Aurys — Documentation technique des modifications

Fork de [Joel-Mercier/wavio](https://github.com/Joel-Mercier/wavio)  
Repo : [kentarageui/Aurys](https://github.com/kentarageui/Aurys)

---

## 1. Modifications fonctionnelles

### 1.1 Écran de connexion (`apps/mobile/app/(auth)/login.tsx`)

**Objectif :** Simplifier l'écran de login pour un usage mono-serveur, sans exposer les détails techniques.

**Supprimé :**
- Dropdown de sélection de serveur existant (multi-compte)
- Les 4 boutons de type serveur (Navidrome / OpenSubsonic / Jellyfin / Local)
- Lien "Demo mode"
- Lien "Setup your Navidrome server"
- Champ URL (visible par l'utilisateur)
- Validateur `loginSchema` (dépendait des champs supprimés)

**Ajouté / modifié :**
- `SERVER_TYPE = "navidrome"` hardcodé comme constante
- `SERVER_URL = "https://aurys.online"` hardcodé comme constante
- Le formulaire ne contient plus que `username` et `password`
- Le bouton "Connexion" soumet directement sans garde `isDirty`

**Fichiers nettoyés (imports inutilisés supprimés) :**
- `ServerTypeIcon`, `LocalLibraryInfoDialog`, `LocalPathsField`
- `Select/*`, `HStack`, `VStack`, `Linking`, `ChevronDownIcon`
- Composant interne `ServerSelectRow`

---

### 1.2 Menu contextuel piste (`apps/mobile/components/tracks/TrackActionsProvider.tsx`)

**Supprimé :**
- Bouton **"Télécharger"** (export vers le gestionnaire de fichiers système)

**Conservé intentionnellement :**
- "Enregistrer pour écoute hors ligne" (`handleOfflineDownloadPress`) — téléchargement interne à l'app uniquement

---

### 1.3 Menu contextuel player (`apps/mobile/components/player/PlayerSheets.tsx`)

**Supprimé :**
- Bouton **"Télécharger"** dans le sheet d'actions du player (même logique que 1.2)

---

### 1.4 Bannière offline (`apps/mobile/components/OfflineBanner.tsx`)

**Supprimé :**
- Message "Serveur injoignable" avec icône `ServerOff`

**Conservé :**
- Message "Pas de connexion" avec icône `WifiOff` uniquement

---

### 1.5 Player (`apps/mobile/app/(app)/player.tsx`)

**Supprimé :**
- Ligne de contexte "LECTURE DEPUIS L'ALBUM / L'ARTISTE / LA PLAYLIST" au-dessus du titre dans le player plein écran

---

### 1.6 Menu drawer (`apps/mobile/components/DrawerMenu.tsx`)

**Supprimé :**
- Entrée **"Serveurs"** dans le menu latéral

---

## 2. Configuration EAS & build

### 2.1 `apps/mobile/app.json`

| Champ | Valeur |
|---|---|
| `name` | `Aurys` |
| `slug` | `aurys` |
| `scheme` | `aurys` |
| `android.package` | `com.kentarage.aurys` |
| `owner` | `kentarages-team-aurys` |
| `extra.eas.projectId` | `23218046-7b95-488f-bce3-ca4c2f3063c8` |

### 2.2 Désactivation Sentry (`apps/mobile/android/app/build.gradle`)

Sentry tentait d'uploader les source maps vers le compte de Joel Mercier à chaque build, provoquant une erreur d'authentification fatale.

**Supprimé :**
```groovy
apply from: new File([...].execute().text.trim(), "sentry.gradle.kts")
```
Cette ligne enregistrait la tâche d'upload Sentry dans le pipeline Gradle. Sa suppression empêche complètement l'upload.

**Modifié :**
Toutes les options `shouldSentryAutoUpload()` remplacées par `false` dans le bloc `sentry { }`.

### 2.3 `apps/mobile/android/sentry.properties`

Org et projet Sentry mis à jour vers `aurys` (non fonctionnel sans auth token, mais cohérent).

---

## 3. Pipeline CI/CD (GitHub Actions)

Fichier : `.github/workflows/build-apk.yml`

Workflow de build automatique déclenché à chaque push sur `main`. Utilisé uniquement en phase de debug — la méthode de build retenue est **EAS Build via CLI**.

---

## 4. Méthode de build retenue

**EAS Build (Expo Application Services)**  
Compte : `kentarages-team-aurys` sur [expo.dev](https://expo.dev)  
Profil utilisé : `preview` (génère un APK signé téléchargeable)

**Commandes depuis le PC :**
```bash
cd Aurys/apps/mobile
eas login          # Se connecter une fois
eas build --platform android --profile preview
```

Le build tourne dans le cloud Expo (~10 min). Un QR code est généré à la fin pour installer l'APK directement sur Android.

**Prérequis sur le PC :**
- Node.js (LTS)
- `npm install -g bun`
- `npm install -g eas-cli`

---

## 5. Ce qui reste à faire

- [ ] Icône de l'app (remplacer le logo Wavio par Aurys)
- [ ] Splash screen
- [ ] Retravailler l'UI / branding général
- [ ] Supprimer les références visuelles restantes à "Wavio" dans l'app
