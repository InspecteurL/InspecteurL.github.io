/* ============================================================================
   PROJECT RIVAL — CINÉMATIQUES DES ATTAQUES ULTIMES (supers)
   ----------------------------------------------------------------------------
   Ce fichier ne contient QUE de la mise en scène (caméra, effets, couleurs).
   Il ne touche à aucun élément de gameplay : dégâts, hitboxes, frames, coût de
   jauge, invulnérabilités et IA restent exactement ceux du jeu.

   Garde ce fichier à côté de index.html. S'il est absent ou invalide, le jeu
   utilise une copie intégrée de la cinématique par défaut.

   COMMENT ÇA SE DÉROULE
     1. Arrêt sur image (la simulation est en pause, les touches sont bloquées)
     2. Une suite de PLANS de caméra (liste « plans » ci-dessous)
     3. Retour fluide à la caméra 2D, puis le combat reprend là où il s'était
        arrêté (les 0,7 s de gel d'origine servent à ce retour).
   Durée totale ≈ somme des « duree » des plans + 0,7 s.   (visé : 2 à 3 s)

   STRUCTURE
     defaut          → cinématique utilisée par tous les combattants
     defaut.eveil    → variante pour un « éveil » (ex. Instinct Céleste de Tenkai)
     personnages.<id> → réglages propres à un combattant (ids : bronn, drake,
                       joker, kairo, matador, mira, nyx, orin, solen, tenkai,
                       saber, varkos, zeph). Tout ce qui n'est pas précisé est
                       hérité de « defaut ».

   Dans « personnages.<id>.plans » tu peux :
     • donner un TABLEAU [ {...}, {...} ]  → remplace tous les plans ;
     • ou un OBJET { visage:{...}, impact:{...} } → ne modifie que les plans
       nommés (les autres restent ceux de « defaut »). Ajoute  supprimer:true
       dans un plan pour le retirer.

   RÉGLAGES D'UN PLAN
     nom        identifiant du plan (sert à le modifier depuis un personnage)
     duree      durée en secondes
     sujet      'attaquant' | 'adversaire' | 'milieu'  (ce que la caméra suit)
     cible      'tete' | 'buste' | 'corps' | 'mains' | 'pieds'
     zoom       [début, fin]   (1 = vue normale, 4+ = gros plan du visage)
     dx, dy     [début, fin] décalage caméra en pixels. dx > 0 = du côté où
                regarde l'attaquant ; dy > 0 = vers le haut.
     rot        [début, fin] inclinaison de la caméra en degrés (« roulis »)
     courbe     'lineaire' | 'entree' | 'sortie' | 'douce' | 'brusque'
     lignes     lignes de vitesse :
                  type    'radial' | 'explosion' | 'horizontale' | 'diagonale'
                          | 'verticale' | 'aucune'
                  nb, alpha, longueur (0-1), largeur (px), vitesse, angle (°)
     flou       flou radial (0 à 1)
     aura       intensité de l'aura/halo de la couleur de l'élément (0 à 2)
     secousse   secousse de caméra continue pendant le plan
     gel        (s) micro-arrêt sur image à la fin du plan (effet d'impact)
     texte      true = affiche le nom de la super pendant ce plan
     afficher   'attaquant' | 'adversaire' | 'deux' : qui est visible dans le décor
                (par défaut : celui que la caméra suit)
     decor      le « studio » spatial qui remplace le décor du combat :
                  particules  'orbes' | 'montee' | 'chute' | 'aucune'  (3D, fuyantes)
                  nb, vitesse   quantité / vitesse de défilement
                  sphere      { rayon:[début,fin], haut:px } sphère d'énergie géante
                  anneau      rayon en px d'un anneau d'énergie derrière le personnage
     evenements liste d'effets déclenchés à l'instant t (en s) du plan :
                  { t:0.1, fx:'flash', alpha:1, couleur:'blanc' }
                  { t:0.1, fx:'onde', echelle:2 }        anneau de choc
                  { t:0.1, fx:'charge', echelle:1.3 }    explosion d'énergie
                  { t:0.1, fx:'etincelles', n:14 }       particules d'élément
                  { t:0.1, fx:'eclair' }                 éclairs
                  { t:0.1, fx:'balafre', angle:-25 }     trait de lame
                  { t:0.1, fx:'secousse', amp:20, dur:0.4 }
                  { t:0.1, fx:'impact' }   impact sur l'adversaire : flash
                    blanc + particules + onde + secousse (déclenche aussi le
                    son d'impact)

   CAMÉRA 3D  (le vrai plan 3D : décor du combat reconstruit + mannequins 3D)
     cam3d      { sujet, cible,           (par défaut ceux du plan)
                  dist:[début,fin],       distance caméra → cible (1 unité ≈ 1 m, un combattant ≈ 1,8)
                  azimut:[début,fin],     degrés autour du sujet : 0 = vue de profil,
                                          90 = face au visage, 180 = de dos, négatif = côté adversaire
                  elev:[début,fin],       hauteur de la caméra en degrés (négatif = contre-plongée)
                  fov:[début,fin],        champ de vision (petit = téléobjectif, grand = grand angle)
                  roulis:[début,fin],     inclinaison de l'image en degrés
                  decal:[x,y,z] }         décalage de la cible en mètres
     pose       'base' | 'leve' (mains levées) | 'tir' (bras tendus) ou [début, fin]
     poseAdv    'touche' = l'adversaire encaisse le coup
     faisceau   épaisseur d'un rayon d'énergie attaquant → adversaire (0 = aucun)
     flux       nombre de particules de lumière qui filent vers la caméra
     (les anciens réglages zoom/dx/dy/rot servent seulement si la 3D est indisponible)
     mode3d     (général) false = n'utilise que l'ancienne vue 2D

   RÉGLAGES GÉNÉRAUX (dans defaut ou dans un personnage)
     couleur, couleur2   null = couleur de l'élément du combattant ;
                         sinon '#rrggbb'
     fond                opacité du décor de cinématique (1 = remplace tout le décor)
     barres              hauteur des bandes noires cinéma (px), 0 = aucune
     retour              durée du retour à la caméra 2D (s, max ≈ 0,7)
     masquerHud          cache la barre de vie pendant la cinématique
     coupure             'flash' = petit éclair à chaque changement de plan
   ============================================================================ */

window.RIVAL_CINEMATIQUES = {
  version: 1,

  /* ----------------------------------------------------------------------
     CINÉMATIQUE PAR DÉFAUT (utilisée tant qu'un personnage n'a pas la sienne)
     ---------------------------------------------------------------------- */
  defaut: {
    couleur: null,
    couleur2: null,
    fond: 1,
    barres: 70,
    retour: 0.5,

    // SUIVI 3D : après les plans, la 3D CONTINUE pendant la vraie attaque (les mannequins rejouent
    // exactement les mouvements du jeu, projectiles et coups compris), puis fondu vers la 2D.
    // Ainsi la super n'est jamais rejouée une 2e fois en 2D.
    suivi: {
      duree: 2.2,          // durée maximale de la partie « live » (s) ; coupée plus tôt si l'attaque est finie
      queue: 0.35,         // temps de grâce après la fin de l'attaque (s)
      texte: true,         // affiche le nom de la super pendant l'arrêt sur image
      aura: 0.6,
      cam3d: { dist: [6, 6.6], azimut: [-28, 22], elev: [3, 7], fov: [44, 44], roulis: [0, 0] },
    },
    masquerHud: true,
    coupure: 'flash',

    plans: [
      { // 1) Gros plan sur le visage, aura + lignes de vitesse qui convergent
        nom: 'visage', duree: 0.55, sujet: 'attaquant', cible: 'tete',
        cam3d: { dist: [1.7, 1.15], azimut: [58, 24], elev: [-3, 5], fov: [34, 30], roulis: [-3, 3] },
        zoom: [4.2, 5.2], dx: [-30, 12], dy: [4, -2], rot: [-3, 2], courbe: 'sortie',
        lignes: { type: 'radial', nb: 60, alpha: 0.9, longueur: 0.62, largeur: 7 },
        flou: 0.55, aura: 1.4, secousse: 1.5,
        decor: { anneau: 300, particules: 'orbes', nb: 80, vitesse: 0.45 },
        evenements: [
          { t: 0.00, fx: 'flash', alpha: 0.9 },
          { t: 0.02, fx: 'onde', echelle: 1.2 },
          { t: 0.30, fx: 'etincelles', n: 16 },
        ],
      },
      { // 2) La caméra tourne autour du personnage (travelling + roulis + parallaxe)
        nom: 'orbite', duree: 0.5, sujet: 'attaquant', cible: 'buste',
        cam3d: { dist: [2.8, 3.6], azimut: [35, -130], elev: [2, 12], fov: [40, 46], roulis: [4, -4] },
        zoom: [3.0, 2.0], dx: [-150, 130], dy: [12, -6], rot: [5, -5], courbe: 'douce',
        lignes: { type: 'diagonale', nb: 36, alpha: 0.7, longueur: 0.45, largeur: 5, angle: -18 },
        flou: 0.35, aura: 1.7, secousse: 1,
        decor: { particules: 'orbes', nb: 80, vitesse: 0.9 },
      },
      { // 3) Exécution de l'attaque : plan large, l'énergie explose
        nom: 'execution', duree: 0.45, seulement2d: true, sujet: 'attaquant', cible: 'corps',
        pose: ['leve', 'tir'], faisceau: 0.07, flux: 40,
        cam3d: { dist: [5.5, 7.5], azimut: [-25, 20], elev: [-3, -9], fov: [52, 60], roulis: [-2, 3] },
        zoom: [1.5, 1.95], dx: [-70, 40], dy: [-30, -8], rot: [-2, 3], courbe: 'entree',
        lignes: { type: 'horizontale', nb: 30, alpha: 0.8, longueur: 0.5, largeur: 6, vitesse: 2.8 },
        flou: 0.4, aura: 2, secousse: 3, texte: true,
        decor: { sphere: { rayon: [90, 340], haut: 380 }, particules: 'orbes', nb: 90, vitesse: 0.9 },
        evenements: [
          { t: 0.00, fx: 'charge', echelle: 1.3 },
          { t: 0.20, fx: 'onde', echelle: 2.2 },
          { t: 0.30, fx: 'eclair' },
        ],
      },
      { // 4) Impact sur l'adversaire : flash blanc, secousse, particules
        nom: 'impact', duree: 0.4, seulement2d: true, sujet: 'adversaire', cible: 'buste',
        pose: 'tir', poseAdv: 'touche', faisceau: 0.16,
        cam3d: { dist: [3.2, 5.2], azimut: [-62, -20], elev: [2, 8], fov: [44, 54], roulis: [3, -1] },
        zoom: [2.6, 1.8], dx: [45, 0], dy: [0, 0], rot: [3, -1], courbe: 'sortie',
        lignes: { type: 'explosion', nb: 44, alpha: 0.9, longueur: 0.7, largeur: 9 },
        flou: 0.3, aura: 0, secousse: 0, gel: 0.05,
        decor: { particules: 'orbes', nb: 70, vitesse: 1.3 },
        evenements: [
          { t: 0.03, fx: 'impact' },
        ],
      },
    ],

    /* Variante « éveil » (transformation sans coup porté : pas de plan d'impact) */
    eveil: {
      barres: 60,
      plans: [
        { nom: 'visage', duree: 0.6, sujet: 'attaquant', cible: 'tete',
          cam3d: { dist: [1.8, 1.2], azimut: [50, 10], elev: [-4, 6], fov: [34, 30], roulis: [-2, 2] },
          zoom: [4.4, 5.4], dx: [-20, 10], dy: [4, -2], rot: [-2, 2], courbe: 'sortie',
          lignes: { type: 'radial', nb: 64, alpha: 0.95, longueur: 0.65, largeur: 8 },
          flou: 0.6, aura: 1.8, secousse: 2,
          decor: { anneau: 320, particules: 'orbes', nb: 90, vitesse: 0.5 },
          evenements: [{ t: 0, fx: 'flash', alpha: 1 }, { t: 0.05, fx: 'onde', echelle: 1.6 }] },
        { nom: 'orbite', duree: 0.6, sujet: 'attaquant', cible: 'buste', pose: ['base', 'leve'],
          cam3d: { dist: [3, 4.5], azimut: [20, -200], elev: [0, 18], fov: [40, 48], roulis: [6, -6] },
          zoom: [3.0, 1.9], dx: [-200, 180], dy: [10, -10], rot: [6, -6], courbe: 'douce',
          lignes: { type: 'verticale', nb: 40, alpha: 0.8, longueur: 0.55, largeur: 6, vitesse: 3 },
          flou: 0.4, aura: 2, secousse: 1.5 },
        { nom: 'explosion', duree: 0.55, sujet: 'attaquant', cible: 'corps', pose: 'leve',
          cam3d: { dist: [4, 8], azimut: [0, 0], elev: [-8, 4], fov: [55, 65], roulis: [0, 0] },
          zoom: [1.3, 1.8], dx: [0, 0], dy: [-20, -5], rot: [0, 0], courbe: 'sortie',
          lignes: { type: 'explosion', nb: 50, alpha: 0.95, longueur: 0.8, largeur: 10 },
          flou: 0.45, aura: 2, secousse: 4, texte: true,
          decor: { sphere: { rayon: [100, 620], haut: 80 }, particules: 'orbes', nb: 100, vitesse: 1 },
          evenements: [{ t: 0.05, fx: 'charge', echelle: 2 }, { t: 0.05, fx: 'flash', alpha: 1 },
                       { t: 0.1, fx: 'onde', echelle: 3 }, { t: 0.15, fx: 'secousse', amp: 14, dur: 0.4 }] },
      ],
    },
  },

  /* ----------------------------------------------------------------------
     UNE CINÉMATIQUE PAR PERSONNAGE
     (ne précise que ce qui change par rapport à « defaut »)
     ---------------------------------------------------------------------- */
  personnages: {

    // BRONN — lutteur colosse (terre) : plans lents, très lourds, caméra basse
    bronn: {
      barres: 80,
      plans: {
        visage:    { duree: 0.6,  zoom: [4.6, 5.6], rot: [0, 0], secousse: 3, cam3d: { elev: [-10, -4], dist: [1.9, 1.4] } },
        orbite:    { duree: 0.55, zoom: [2.6, 1.8], dx: [-150, 120], rot: [3, -3], cible: 'corps', dy: [-30, -30] },
        execution: { duree: 0.5,  zoom: [1.6, 2.2], dy: [-50, -30], secousse: 6, cible: 'pieds',
                     lignes: { type: 'verticale', nb: 26, alpha: 0.8, longueur: 0.5, largeur: 10, vitesse: 2 },
                     evenements: [{ t: 0.00, fx: 'charge', echelle: 1.6 }, { t: 0.18, fx: 'onde', echelle: 3.2 },
                                  { t: 0.30, fx: 'secousse', amp: 18, dur: 0.3 }] },
        impact:    { zoom: [2.2, 1.6], gel: 0.08,
                     evenements: [{ t: 0.03, fx: 'impact' }, { t: 0.05, fx: 'onde', echelle: 3.6 },
                                  { t: 0.05, fx: 'secousse', amp: 34, dur: 0.5 }] },
      },
    },

    // DRAKE — acier, froid et méthodique : travelling net, lignes obliques
    drake: {
      plans: {
        orbite:    { rot: [-4, 4], dx: [200, -170],
                     lignes: { type: 'diagonale', nb: 30, alpha: 0.7, longueur: 0.5, largeur: 4, angle: 22 } },
        execution: { evenements: [{ t: 0.00, fx: 'charge', echelle: 1.2 }, { t: 0.14, fx: 'balafre', angle: -20 },
                                  { t: 0.28, fx: 'onde', echelle: 2 }] },
      },
    },

    // JOKER — foudre : tout est très rapide, éclairs, caméra qui « fouette »
    joker: {
      retour: 0.4,
      plans: {
        visage:    { duree: 0.45, rot: [6, -4], evenements: [{ t: 0, fx: 'flash', alpha: 1 }, { t: 0.1, fx: 'eclair' }, { t: 0.3, fx: 'eclair' }] },
        orbite:    { duree: 0.4,  rot: [10, -10], dx: [-260, 240], cam3d: { roulis: [12, -12], azimut: [60, -170] } },
        execution: { duree: 0.4,  evenements: [{ t: 0, fx: 'eclair' }, { t: 0.1, fx: 'charge', echelle: 1.2 },
                                               { t: 0.2, fx: 'eclair' }, { t: 0.28, fx: 'onde', echelle: 2.2 }] },
        impact:    { duree: 0.4,  evenements: [{ t: 0.03, fx: 'impact' }, { t: 0.06, fx: 'eclair' }, { t: 0.12, fx: 'eclair' }] },
      },
    },

    // KAIRO — énergie : lignes de vitesse très nettes, beaucoup de flou radial
    kairo: {
      plans: {
        visage:    { flou: 0.7, aura: 1.7 },
        orbite:    { flou: 0.5 },
        execution: { lignes: { type: 'radial', nb: 54, alpha: 0.9, longueur: 0.7, largeur: 8 }, flou: 0.6 },
      },
    },

    // EL MATADOR — acier / western : plan large « duel », lignes horizontales
    matador: {
      barres: 90,
      plans: {
        visage:    { zoom: [3.8, 4.8], dy: [-4, -4], rot: [0, 0], lignes: { type: 'horizontale', nb: 22, alpha: 0.6, longueur: 0.7, largeur: 4, vitesse: 1.2 } },
        orbite:    { dx: [-230, 200], rot: [2, -2], zoom: [2.4, 1.7] },
        execution: { evenements: [{ t: 0, fx: 'charge', echelle: 1 }, { t: 0.15, fx: 'balafre', angle: 0 },
                                  { t: 0.22, fx: 'onde', echelle: 1.6 }] },
        impact:    { dx: [80, 0], evenements: [{ t: 0.03, fx: 'impact' }, { t: 0.06, fx: 'balafre', angle: 12 }] },
      },
    },

    // MIRA — pétales : mouvements doux et amples, retour lent
    mira: {
      retour: 0.6,
      plans: {
        visage:    { decor: { particules: 'chute', nb: 90, vitesse: 0.3 } },
        visage:    { duree: 0.6, rot: [-2, 1], flou: 0.4 },
        orbite:    { duree: 0.6, dx: [-170, 170], rot: [4, -4], zoom: [2.8, 1.9],
                     lignes: { type: 'verticale', nb: 26, alpha: 0.55, longueur: 0.35, largeur: 4, vitesse: 1.4 },
                     evenements: [{ t: 0.0, fx: 'etincelles', n: 24 }, { t: 0.25, fx: 'etincelles', n: 24 }] },
        execution: { evenements: [{ t: 0, fx: 'charge', echelle: 1.1 }, { t: 0.15, fx: 'etincelles', n: 30 }, { t: 0.25, fx: 'onde', echelle: 2 }] },
      },
    },

    // NYX — ombre : fond très sombre, lignes qui tombent, visage sous la capuche
    nyx: {
      fond: 0.96,
      plans: {
        visage:    { zoom: [4.0, 5.0], rot: [4, 0], flou: 0.65,
                     lignes: { type: 'verticale', nb: 44, alpha: 0.75, longueur: 0.5, largeur: 5, vitesse: 2.4 } },
        orbite:    { rot: [-7, 7], dx: [210, -200], flou: 0.45, cam3d: { azimut: [-40, 150], elev: [8, -6] } },
        execution: { lignes: { type: 'diagonale', nb: 34, alpha: 0.8, longueur: 0.5, largeur: 5, angle: 35 }, flou: 0.5 },
      },
    },

    // ORIN — esprit : cinématique calme et solennelle, symétrique
    orin: {
      plans: {
        visage:    { zoom: [4.0, 4.8], rot: [0, 0], lignes: { type: 'radial', nb: 48, alpha: 0.75, longueur: 0.55, largeur: 6 } },
        orbite:    { rot: [2, -2], flou: 0.25, aura: 2 },
        execution: { lignes: { type: 'explosion', nb: 40, alpha: 0.8, longueur: 0.6, largeur: 7 },
                     evenements: [{ t: 0, fx: 'charge', echelle: 1.4 }, { t: 0.1, fx: 'onde', echelle: 1.6 }, { t: 0.22, fx: 'onde', echelle: 2.6 }] },
      },
    },

    // SOLEN — feu : explosions, gros plan appuyé, secousses fortes
    solen: {
      plans: {
        orbite:    { decor: { particules: 'montee', nb: 100, vitesse: 0.6 } },
        visage:    { zoom: [4.4, 5.4], aura: 1.8, secousse: 3,
                     lignes: { type: 'verticale', nb: 46, alpha: 0.85, longueur: 0.55, largeur: 7, vitesse: -2.2 } },
        execution: { secousse: 5, evenements: [{ t: 0, fx: 'charge', echelle: 1.6 }, { t: 0.16, fx: 'onde', echelle: 2.6 }, { t: 0.28, fx: 'charge', echelle: 2 }] },
        impact:    { evenements: [{ t: 0.03, fx: 'impact' }, { t: 0.05, fx: 'onde', echelle: 3.4 }, { t: 0.05, fx: 'secousse', amp: 30, dur: 0.5 }] },
      },
    },

    // TENKAI — énergie « céleste » ; l'éveil a sa propre variante
    tenkai: {
      plans: {
        visage:    { aura: 1.8, flou: 0.65 },
        orbite:    { aura: 2, dx: [-210, 190], rot: [6, -6] },
      },
      eveil: {
        plans: [
          { nom: 'visage', duree: 0.65, sujet: 'attaquant', cible: 'tete',
            cam3d: { dist: [1.8, 1.1], azimut: [50, 10], elev: [-4, 6], fov: [34, 30], roulis: [-2, 2] },
            zoom: [4.6, 5.8], dx: [-20, 10], dy: [4, -2], rot: [-2, 2], courbe: 'sortie',
            lignes: { type: 'radial', nb: 70, alpha: 1, longueur: 0.7, largeur: 8 },
            flou: 0.7, aura: 2, secousse: 2.5,
            evenements: [{ t: 0, fx: 'flash', alpha: 1 }, { t: 0.05, fx: 'onde', echelle: 1.8 }, { t: 0.35, fx: 'etincelles', n: 24 }] },
          { nom: 'orbite', duree: 0.6, sujet: 'attaquant', cible: 'buste', pose: ['base', 'leve'],
            cam3d: { dist: [3, 4.5], azimut: [20, -200], elev: [0, 18], fov: [40, 48], roulis: [7, -7] },
            zoom: [3.2, 1.9], dx: [-210, 190], dy: [10, -10], rot: [7, -7], courbe: 'douce',
            lignes: { type: 'verticale', nb: 44, alpha: 0.85, longueur: 0.6, largeur: 6, vitesse: 3.2 },
            flou: 0.45, aura: 2, secousse: 2 },
          { nom: 'explosion', duree: 0.55, sujet: 'attaquant', cible: 'corps', pose: 'leve',
            cam3d: { dist: [4, 9], azimut: [0, 0], elev: [-8, 4], fov: [55, 68], roulis: [0, 0] },
            zoom: [1.3, 1.9], dx: [0, 0], dy: [-20, -5], rot: [0, 0], courbe: 'sortie',
            lignes: { type: 'explosion', nb: 56, alpha: 1, longueur: 0.85, largeur: 11 },
            flou: 0.5, aura: 2, secousse: 5, texte: true,
            evenements: [{ t: 0.05, fx: 'charge', echelle: 2.4 }, { t: 0.05, fx: 'flash', alpha: 1 },
                         { t: 0.1, fx: 'onde', echelle: 3.4 }, { t: 0.18, fx: 'onde', echelle: 4.2 },
                         { t: 0.15, fx: 'secousse', amp: 16, dur: 0.4 }] },
        ],
      },
    },

    // SABER — esprit / sabre : coups de lame en travers de l'écran
    saber: {
      plans: {
        visage:    { rot: [0, 0], evenements: [{ t: 0, fx: 'flash', alpha: 0.9 }, { t: 0.3, fx: 'balafre', angle: -30 }] },
        orbite:    { rot: [-6, 6], dx: [220, -200],
                     lignes: { type: 'diagonale', nb: 32, alpha: 0.7, longueur: 0.5, largeur: 4, angle: -30 } },
        execution: { evenements: [{ t: 0.00, fx: 'charge', echelle: 1.2 }, { t: 0.10, fx: 'balafre', angle: -28 },
                                  { t: 0.20, fx: 'balafre', angle: 22 }, { t: 0.30, fx: 'balafre', angle: -8 }] },
        impact:    { evenements: [{ t: 0.03, fx: 'impact' }, { t: 0.05, fx: 'balafre', angle: -18 }] },
      },
    },

    // VARKOS — faille : angles penchés, rouge profond, aura envahissante
    varkos: {
      fond: 0.95,
      plans: {
        visage:    { rot: [-8, 6], aura: 1.9, zoom: [4.4, 5.6] },
        orbite:    { rot: [-12, 10], dx: [-220, 200], aura: 2, flou: 0.5 },
        execution: { rot: [6, -6], aura: 2, flou: 0.55, secousse: 5,
                     lignes: { type: 'explosion', nb: 46, alpha: 0.9, longueur: 0.75, largeur: 9 } },
        impact:    { rot: [8, -3], evenements: [{ t: 0.03, fx: 'impact' }, { t: 0.05, fx: 'onde', echelle: 3.2 }, { t: 0.05, fx: 'secousse', amp: 30, dur: 0.5 }] },
      },
    },

    // ZEPH — vent : très horizontal, travelling rapide, flou de vitesse
    zeph: {
      retour: 0.4,
      plans: {
        visage:    { duree: 0.5, lignes: { type: 'horizontale', nb: 40, alpha: 0.85, longueur: 0.8, largeur: 4, vitesse: 4 }, rot: [-4, 2] },
        orbite:    { duree: 0.45, dx: [-260, 240], rot: [6, -6], lignes: { type: 'horizontale', nb: 44, alpha: 0.8, longueur: 0.9, largeur: 4, vitesse: 5 } },
        execution: { lignes: { type: 'horizontale', nb: 46, alpha: 0.85, longueur: 0.9, largeur: 5, vitesse: 5.5 },
                     evenements: [{ t: 0, fx: 'charge', echelle: 1.1 }, { t: 0.16, fx: 'onde', echelle: 2.8 }, { t: 0.26, fx: 'etincelles', n: 28 }] },
      },
    },
  },
};
