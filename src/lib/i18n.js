const translations = {
  en: {
    "catalog": "Software catalog",
    "results": "results",
    "all_categories": "All categories",
    "all_statuses": "All statuses",
    "all_audiences": "All audiences",
    "sort_name": "Name A-Z",
    "sort_release": "Newest release",
    "license": "License",
    "release_date": "Release date",
    "version": "Version",
    "status": "Status",
    "repository": "Repository",
    "website": "Website",
    "categories": "Categories",
    "screenshots": "Screenshots",
    "description": "Description",
    "contacts": "Contacts",
    "features": "Features",
    "platforms": "Platforms",
    "maintenance_type": "Maintenance",
    "languages": "Languages",
    "used_by": "Used by",
    "source_code": "Source code",
    "page_not_found": "Page not found",
  },
  it: {
    "catalog": "Catalogo software",
    "results": "risultati",
    "all_categories": "Tutte le categorie",
    "all_statuses": "Tutti gli stati",
    "all_audiences": "Tutti i destinatari",
    "sort_name": "Nome A-Z",
    "sort_release": "Rilascio più recente",
    "license": "Licenza",
    "release_date": "Data di rilascio",
    "version": "Versione",
    "status": "Stato",
    "repository": "Repository",
    "website": "Sito web",
    "categories": "Categorie",
    "screenshots": "Screenshot",
    "description": "Descrizione",
    "contacts": "Contatti",
    "features": "Funzionalita",
    "platforms": "Piattaforme",
    "maintenance_type": "Manutenzione",
    "languages": "Lingue",
    "used_by": "Utilizzato da",
    "source_code": "Codice sorgente",
    "page_not_found": "Pagina non trovata",
  },
};

export function t(locale, key) {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

export function localizeDescription(description, locale) {
  if (!description) return {};
  return description[locale] ?? description.en ?? description[Object.keys(description)[0]] ?? {};
}
