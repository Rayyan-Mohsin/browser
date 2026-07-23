'use strict';

const { ipcMain } = require('electron');
const { SEARCH_ENGINES } = require('../../shared/layout');

function registerSettingsHandlers(settingsStore) {
  ipcMain.handle('settings:get', () => settingsStore.get());
  ipcMain.handle('settings:set', (_e, patch) => settingsStore.set(patch));

  // Resolving a preset id to its %s template is kept server-side (using the
  // canonical SEARCH_ENGINES map) so the renderer never needs its own copy
  // of the actual URL templates.
  ipcMain.handle('settings:setSearchEngine', (_e, { id, customTemplate } = {}) => {
    if (id === 'custom') {
      const template = (customTemplate || '').trim();
      if (!template.includes('%s')) {
        return { error: 'Custom search engine must include %s as a placeholder for the query.' };
      }
      return settingsStore.set({ searchEngineId: 'custom', customSearchEngine: template, searchEngine: template });
    }
    const preset = SEARCH_ENGINES[id];
    if (!preset) return { error: `Unknown search engine: ${id}` };
    return settingsStore.set({ searchEngineId: id, searchEngine: preset.template });
  });
}

module.exports = { registerSettingsHandlers };
