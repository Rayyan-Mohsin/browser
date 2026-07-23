'use strict';

const path = require('path');
const { BrowserWindow, WebContentsView } = require('electron');

/** Creates the main window plus its always-attached "chrome" view (tab bar/address bar/toolbar). */
function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 860,
    minHeight: 600,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 14, y: 14 },
    vibrancy: 'header',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    show: false,
  });

  const chromeView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../../preload/chrome-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.contentView.addChildView(chromeView);

  const syncChromeBounds = () => {
    const [width, height] = win.getContentSize();
    chromeView.setBounds({ x: 0, y: 0, width, height });
  };
  syncChromeBounds();
  win.on('resize', syncChromeBounds);

  chromeView.webContents.loadFile(path.join(__dirname, '../../renderer/chrome/index.html'));

  win.once('ready-to-show', () => win.show());

  return { win, chromeView };
}

module.exports = { createMainWindow };
