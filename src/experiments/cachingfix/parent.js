var ex_cachingfix = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {
    // we're not actually interested in startup, we need the event only
    // to ensure this experiment gets loaded.
  }
  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
      return; // the application gets unloaded anyway
    }
    // Unload JSMs of this add-on
    const Cu = Components.utils;
    const rootURI = this.extension.rootURI.spec;
    for (let module of Cu.loadedModules) {
      if (module.startsWith(rootURI)) {
        Cu.unload(module);
      }
    }
    // Clear caches that could prevent upgrades from working properly
    const { Services } = ChromeUtils.import(
        "resource://gre/modules/Services.jsm");
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  }
  getAPI(context) {
    return {ex_cachingfix: {}};
  }
};
