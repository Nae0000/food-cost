// ===================================================
// boot.js — Register all routes + init app
// ===================================================

Router.register('dashboard', renderDashboard);

Router.register('ingredients', renderIngredients);
Router.register('menus', renderMenus);
Router.register('sets', renderSets);
Router.register('recipes', renderRecipes);
Router.register('webhook', renderWebhook);
Router.register('price-history', renderPriceHistory);
Router.register('receipts', renderReceipts);
Router.register('settings', renderSettings);

// Apply saved language to sidebar nav labels
applyI18n();

// Init data and router only if authenticated
if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Already initialized in auth-state.js, but make sure Router only starts here
            SEED.run();
            Router.init();
            _initGDrive();
        }
    });
} else {
    // Fallback if no auth 
    SEED.run();
    Router.init();
    _initGDrive();
}


// Initialize GDrive after Google Identity Services library is ready
function _initGDrive() {
    if (typeof google !== 'undefined' && google.accounts) {
        GDrive.init();
    } else {
        // Retry until the GIS script loads (it has async defer)
        setTimeout(_initGDrive, 300);
    }
}

// Helper to re-render the current hash page (used by GDrive callbacks)
window.renderCurrentPage = function () {
    Router.render();
};
