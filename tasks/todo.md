# Réduire la quantité de texte dans les infographies

## Objectif
Modifier les prompts pour réduire la quantité de texte généré dans les images afin d'éviter de dépasser les limites du modèle et d'améliorer la lisibilité.

## Problème observé
L'image générée contient trop de texte, ce qui cause:
- Dépassement des limites du modèle pour la génération de texte
- Texte parfois mal formé ou illisible
- Surcharge visuelle

## Todo Items

### 1. Analyser les prompts actuels
- [x] Examiner `INFOGRAPHIC_PLAN_PROMPT` dans constants.ts
- [x] Examiner `PROCESS_STEP_PLAN_PROMPT` dans constants.ts
- [x] Identifier les instructions qui demandent trop de texte

### 2. Réduire les exigences de texte pour les faits (Explore Domain/Concept)
- [x] Réduire le nombre de labels demandés (actuellement trop)
- [x] Réduire le nombre de phrases explicatives
- [x] Simplifier les exigences de texte dans `INFOGRAPHIC_PLAN_PROMPT`

### 3. Réduire les exigences de texte pour les processus (Process/Sequence)
- [x] Réduire les labels de 2-4 à 1-3
- [x] Réduire les phrases explicatives de 3-4 à 2-3
- [x] Réduire les callout boxes de 1-2 à 0-1
- [x] Modifier `PROCESS_STEP_PLAN_PROMPT` et les instructions dans geminiService.ts

### 4. Tester les changements
- [ ] Générer une infographie de fait
- [ ] Générer une infographie de processus
- [ ] Vérifier que le texte est bien formé et lisible

---

## Review Section

### Résumé des changements

J'ai réduit les exigences de texte dans les prompts pour éviter de dépasser les limites du modèle de génération de texte et améliorer la lisibilité des infographies.

#### 1. **Modifications dans constants.ts** ✅

**PROCESS_STEP_PLAN_PROMPT** (ligne 275-281):
- **Labels**: Réduit de `2-4` à `1-3` labels
- **Phrases explicatives**: Réduit de `3-4` à `2-3` phrases
- **Callout boxes**: Réduit de `1-2` à `0-1` callout box

#### 2. **Modifications dans geminiService.ts** ✅

**educationalTextGuidance** (ligne 417-422):
- **Labels**: Réduit de `3-5` à `1-3` labels
- **Phrases explicatives**: Réduit de `4-5` à `2-3` phrases
- Changé "extensive readable text" à "readable text" pour réduire l'emphase sur la quantité

### Impact attendu

Ces changements devraient:
1. **Réduire la charge sur le modèle**: Moins de texte à générer = moins de risque de dépasser les limites
2. **Améliorer la qualité du texte**: Le modèle peut se concentrer sur moins d'éléments et les rendre mieux
3. **Améliorer la lisibilité**: Moins de texte = moins de surcharge visuelle, plus facile à lire
4. **Maintenir l'aspect éducatif**: On garde toujours le titre, le badge, des labels, et des explications

### Réduction totale

**Avant**:
- Labels: 2-5 (moyenne 3.5)
- Phrases: 3-5 (moyenne 4)
- Callouts: 1-2 (moyenne 1.5)
- **Total éléments textuels**: ~9 éléments

**Après**:
- Labels: 1-3 (moyenne 2)
- Phrases: 2-3 (moyenne 2.5)
- Callouts: 0-1 (moyenne 0.5)
- **Total éléments textuels**: ~5 éléments

**Réduction**: ~44% de réduction du nombre d'éléments textuels demandés

### Prochaines étapes

Testez maintenant la génération d'infographies pour vérifier que:
1. Le texte est bien formé et lisible
2. Il n'y a plus de dépassement des limites du modèle
3. Les infographies restent éducatives et informatives
