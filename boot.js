// ===================================================
// boot.js — Register all routes + init app
// ===================================================

Router.register('dashboard', renderDashboard);
Router.register('categories', renderCategories);
Router.register('ingredients', renderIngredients);
Router.register('menus', renderMenus);
Router.register('sets', renderSets);
Router.register('recipes', renderRecipes);
Router.register('webhook', renderWebhook);
Router.register('settings', renderSettings);

// Apply saved language to sidebar nav labels
applyI18n();

// Init data and router
SEED.run();
Router.init();
