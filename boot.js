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
Router.register('price-history', renderPriceHistory);
Router.register('settings', renderSettings);

// Apply saved language to sidebar nav labels
applyI18n();

// Init data and router
SEED.run();
Router.init();

// Initialize GDrive after Google Identity Services library is ready
function _initGDrive() {
    if (typeof google !== 'undefined' && google.accounts) {
        GDrive.init();
    } else {
        // Retry until the GIS script loads (it has async defer)
        setTimeout(_initGDrive, 300);
    }
}
_initGDrive();

// Helper to re-render the current hash page (used by GDrive callbacks)
window.renderCurrentPage = function () {
    Router.render();
};
