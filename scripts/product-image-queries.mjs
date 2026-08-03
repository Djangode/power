/**
 * Correspondance nom de produit (FR, tel que saisi en base) -> requêtes de recherche.
 *
 * Deux jeux de requêtes, parce que les banques ne parlent pas la même langue :
 *  - `en` : anglais courant, pour les banques commerciales (Pexels, Unsplash). Un nom
 *    scientifique y donne n'importe quoi — « Cucurbita pepo » renvoie des potirons pour
 *    des courgettes, « Zingiber officinale » une fleur de pissenlit pour du gingembre.
 *  - `latin` : nom d'espèce, pour Wikimedia Commons, dont les fichiers sont catégorisés
 *    par taxon et où le terme courant ramène surtout des documents numérisés.
 *
 * La clé est normalisée (minuscules, sans accent, espaces réduits) avant comparaison,
 * ce qui rend le mapping insensible aux espaces parasites et à la casse de la saisie admin.
 */
export const IMAGE_QUERIES = {
  // Aromates
  "menthe fraiche": { en: ["fresh mint leaves", "mint herb"], latin: "Mentha spicata" },
  "persil plat": { en: ["parsley","parsley leaves"], latin: "Petroselinum crispum" },
  "basilic frais": { en: ["fresh basil leaves", "basil plant"], latin: "Ocimum basilicum" },

  // Fruits
  "ananas sweet": { en: ["whole pineapple fruit isolated","raw pineapple"], latin: "Ananas comosus" },
  "bananes": { en: ["bananas bunch", "yellow bananas"], latin: "Musa banana fruit" },
  "fraises gariguette": { en: ["fresh strawberries", "strawberries bowl"], latin: "Fragaria ananassa" },
  "kiwi jaune": { en: ["whole kiwi fruit raw","kiwifruit whole"], latin: "Actinidia chinensis fruit" },
  "kiwi vert": { en: ["whole kiwi fruits raw","kiwifruit brown whole"], latin: "Actinidia deliciosa fruit" },
  "mangue avion": { en: ["whole mango fruit raw","ripe mangoes whole"], latin: "Mangifera indica fruit" },
  "mangue bateau": { en: ["whole mangoes fruit raw","mango fruit whole"], latin: "Mangifera indica fruit" },
  "mangue kent": { en: ["mango fruit", "ripe mango"], latin: "Mangifera indica fruit" },
  "oranges navel": { en: ["fresh oranges", "orange fruits"], latin: "Citrus sinensis fruit" },
  "oranges a jus": { en: ["oranges", "juicing oranges"], latin: "Citrus sinensis fruit" },
  "pasteque": { en: ["watermelon", "whole watermelon fruit"], latin: "Citrullus lanatus" },
  "poires conference": { en: ["fresh pears", "green pears fruit"], latin: "Pyrus communis" },
  "pomme gala": { en: ["gala apples", "red apples"], latin: "Malus domestica" },
  "pommes gala": { en: ["gala apples", "red apples fruit"], latin: "Malus domestica" },
  "pomme golden": { en: ["golden delicious apples", "yellow apples"], latin: "Malus domestica" },
  "pomolos": { en: ["whole pomelo fruit raw","pomelo citrus whole"], latin: "Citrus maxima" },
  "raisins barquette": { en: ["grapes","grape bunch"], latin: "Vitis vinifera grapes" },
  "raisins vrac sans pepins": { en: ["green grapes","grapes"], latin: "Vitis vinifera grapes" },
  "citrons bio": { en: ["organic lemons", "lemons"], latin: "Citrus limon fruit" },

  // Légumes
  "ail blanc": { en: ["garlic bulbs", "white garlic"], latin: "Allium sativum bulb" },
  "ail blanc sachet": { en: ["garlic bulbs", "garlic cloves"], latin: "Allium sativum bulb" },
  "ail rose": { en: ["pink garlic", "garlic bulb"], latin: "Allium sativum bulb" },
  "asperges": { en: ["raw green asparagus bunch","asparagus spears raw"], latin: "Asparagus officinalis" },
  "aubergines": { en: ["eggplant","aubergine"], latin: "Solanum melongena fruit" },
  "avocat hass": { en: ["whole avocado fruit raw","avocados green raw"], latin: "Persea americana fruit" },
  "betterave cru": { en: ["raw beetroot vegetable","whole beets raw"], latin: "Beta vulgaris root" },
  "butternut": { en: ["butternut squash","squash"], latin: "Cucurbita moschata" },
  "carotte sable": { en: ["carrots","carrot"], latin: "Daucus carota root" },
  "carottes nouvelles": { en: ["carrots bunch","carrots"], latin: "Daucus carota root" },
  "carottes vrac": { en: ["carrots","carrot vegetable"], latin: "Daucus carota root" },
  "citron vert": { en: ["whole green limes fruit","raw limes"], latin: "Citrus aurantiifolia" },
  "citrons jaune": { en: ["whole lemons fruit yellow","raw lemons"], latin: "Citrus limon fruit" },
  "courgettes": { en: ["zucchini", "green zucchini vegetable"], latin: "Cucurbita pepo zucchini" },
  "echalotte sachet": { en: ["raw shallots vegetable","shallot bulbs raw"], latin: "Allium ascalonicum" },
  "gingembre": { en: ["ginger","ginger root"], latin: "Zingiber officinale rhizome" },
  "gombo": { en: ["okra", "okra pods"], latin: "Abelmoschus esculentus" },
  "mini concombre": { en: ["cucumbers", "mini cucumbers"], latin: "Cucumis sativus fruit" },
  "navet": { en: ["turnips", "turnip vegetable"], latin: "Brassica rapa turnip" },
  "oignons jaunes vrac": { en: ["onions","onion"], latin: "Allium cepa bulb" },
  "oignons rouges vrac": { en: ["raw red onions vegetable","whole red onions"], latin: "Allium cepa red" },
  "patate douce": { en: ["raw sweet potatoes vegetable","whole sweet potato raw"], latin: "Ipomoea batatas root" },
  "piment vert": { en: ["raw green chili peppers","green chillies raw"], latin: "Capsicum annuum chili" },
  "poivron long": { en: ["raw green bell peppers","whole bell pepper raw"], latin: "Capsicum annuum pepper" },
  "poivrons tricolores": { en: ["bell peppers", "colorful bell peppers"], latin: "Capsicum annuum pepper" },
  "pommes de terre agria vrac": { en: ["raw potatoes vegetable","whole potatoes raw"], latin: "Solanum tuberosum tuber" },
  "potimarron": { en: ["orange squash whole raw","red kuri squash raw"], latin: "Cucurbita maxima" },
  "potiron": { en: ["pumpkin", "orange pumpkin"], latin: "Cucurbita maxima pumpkin" },
  "salade batavia": { en: ["whole lettuce head green","raw lettuce salad head"], latin: "Lactuca sativa" },
  "tomate coeur de boeuf": { en: ["raw beefsteak tomatoes","large red tomatoes raw"], latin: "Solanum lycopersicum" },
  "tomate grappe": { en: ["raw tomatoes on vine","vine ripened tomatoes"], latin: "Solanum lycopersicum" },
  "tomates grappe": { en: ["tomatoes on the vine", "vine tomatoes"], latin: "Solanum lycopersicum" },
  "tomate ronde": { en: ["tomatoes", "red tomatoes"], latin: "Solanum lycopersicum" },
  "salade": { en: ["lettuce", "fresh lettuce head"], latin: "Lactuca sativa" },
}

/** Normalise un nom de produit pour la recherche dans IMAGE_QUERIES. */
export function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Entrée du mapping pour un produit, avec repli sur le préfixe le plus long. */
function entryForProduct(name) {
  const key = normalizeName(name)
  if (IMAGE_QUERIES[key]) return IMAGE_QUERIES[key]

  const words = key.split(" ")
  for (let len = words.length - 1; len > 0; len--) {
    const candidate = words.slice(0, len).join(" ")
    if (IMAGE_QUERIES[candidate]) return IMAGE_QUERIES[candidate]
  }

  return { en: [`${key} fresh`, key], latin: key }
}

/** Requêtes en anglais courant, pour les banques commerciales. */
export function commercialQueries(name) {
  return entryForProduct(name).en
}

/** Requête par nom d'espèce, pour Wikimedia Commons. */
export function scientificQuery(name) {
  return entryForProduct(name).latin
}

/** Nom de fichier stable et sûr pour un produit. */
export function slugForProduct(name) {
  return normalizeName(name).replace(/\s+/g, "-")
}
