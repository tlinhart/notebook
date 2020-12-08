// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  Router
} from '@jupyterlab/application';

import {
  sessionContextDialogs,
  ISessionContextDialogs,
  DOMUtils,
  ICommandPalette
} from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { ITranslator, TranslationManager } from '@jupyterlab/translation';

import {
  App,
  ClassicShell,
  IClassicShell
} from '@jupyterlab-classic/application';

import { jupyterIcon } from '@jupyterlab-classic/ui-components';

import { Widget } from '@lumino/widgets';

/**
 * The default notebook factory.
 */
const NOTEBOOK_FACTORY = 'Notebook';

/**
 * The command IDs used by the application plugin.
 */
namespace CommandIDs {
  /**
   * Toggle Top Bar visibility
   */
  export const toggleTop = 'application:toggle-top';

  /**
   * Toggle the Zen mode
   */
  export const toggleZen = 'application:toggle-zen';
}

/**
 * A plugin to dispose the Tabs menu
 */
const noTabsMenu: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab-classic/application-extension:no-tabs-menu',
  requires: [IMainMenu],
  autoStart: true,
  activate: (app: JupyterFrontEnd, menu: IMainMenu) => {
    menu.tabsMenu.dispose();
  }
};

/**
 * The logo plugin.
 */
const logo: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab-classic/application-extension:logo',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    const logo = new Widget();
    jupyterIcon.element({
      container: logo.node,
      elementPosition: 'center',
      padding: '2px 2px 2px 8px',
      height: '28px',
      width: 'auto'
    });
    logo.id = 'jp-ClassicLogo';
    app.shell.add(logo, 'top', { rank: 0 });
  }
};

/**
 * The default paths for a JupyterLab Classic app.
 */
const paths: JupyterFrontEndPlugin<JupyterFrontEnd.IPaths> = {
  id: '@jupyterlab-classic/application-extension:paths',
  activate: (app: JupyterFrontEnd): JupyterFrontEnd.IPaths => {
    if (!(app instanceof App)) {
      throw new Error(`${paths.id} must be activated in JupyterLab Classic.`);
    }
    return app.paths;
  },
  autoStart: true,
  provides: JupyterFrontEnd.IPaths
};

/**
 * The default URL router provider.
 */
const router: JupyterFrontEndPlugin<IRouter> = {
  id: '@jupyterlab-classic/application-extension:router',
  requires: [JupyterFrontEnd.IPaths],
  activate: (app: JupyterFrontEnd, paths: JupyterFrontEnd.IPaths) => {
    const { commands } = app;
    const base = paths.urls.base;
    const router = new Router({ base, commands });
    void app.started.then(() => {
      // Route the very first request on load.
      void router.route();

      // Route all pop state events.
      window.addEventListener('popstate', () => {
        void router.route();
      });
    });
    return router;
  },
  autoStart: true,
  provides: IRouter
};

/**
 * The default session dialogs plugin
 */
const sessionDialogs: JupyterFrontEndPlugin<ISessionContextDialogs> = {
  id: '@jupyterlab-classic/application-extension:sessionDialogs',
  provides: ISessionContextDialogs,
  autoStart: true,
  activate: () => sessionContextDialogs
};

/**
 * The default JupyterLab Classic application shell.
 */
const shell: JupyterFrontEndPlugin<IClassicShell> = {
  id: '@jupyterlab-classic/application-extension:shell',
  activate: (app: JupyterFrontEnd) => {
    if (!(app.shell instanceof ClassicShell)) {
      throw new Error(`${shell.id} did not find a ClassicShell instance.`);
    }
    return app.shell;
  },
  autoStart: true,
  provides: IClassicShell
};

/**
 * A plugin to provide a spacer at rank 10000 for flex panels
 */
const spacer: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab-classic/application-extension:spacer',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    const top = new Widget();
    top.id = DOMUtils.createDomID();
    top.addClass('jp-ClassicSpacer');
    app.shell.add(top, 'top', { rank: 10000 });

    const menu = new Widget();
    menu.id = DOMUtils.createDomID();
    menu.addClass('jp-ClassicSpacer');
    app.shell.add(menu, 'menu', { rank: 10000 });
  }
};

/**
 * Plugin to toggle the top header visibility.
 */
const topVisibility: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab-classic/application-extension:top',
  requires: [IClassicShell],
  optional: [IMainMenu],
  activate: (
    app: JupyterFrontEnd<JupyterFrontEnd.IShell>,
    classicShell: IClassicShell,
    menu: IMainMenu | null
  ) => {
    const top = classicShell.top;

    app.commands.addCommand(CommandIDs.toggleTop, {
      label: 'Show Header',
      execute: (args: any) => {
        top.setHidden(top.isVisible);
      },
      isToggled: () => top.isVisible
    });

    if (menu) {
      menu.viewMenu.addGroup([{ command: CommandIDs.toggleTop }], 2);
    }
  },
  autoStart: true
};

/**
 * A simplified Translator
 */
const translator: JupyterFrontEndPlugin<ITranslator> = {
  id: '@jupyterlab-classic/application-extension:translator',
  activate: (app: JupyterFrontEnd<JupyterFrontEnd.IShell>): ITranslator => {
    const translationManager = new TranslationManager();
    return translationManager;
  },
  autoStart: true,
  provides: ITranslator
};

/**
 * The default tree route resolver plugin.
 */
const tree: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab-classic/application-extension:tree-resolver',
  autoStart: true,
  requires: [IRouter],
  activate: (app: JupyterFrontEnd, router: IRouter): void => {
    const { commands } = app;
    const treePattern = new RegExp('/notebooks/(.*)');

    const command = 'router:tree';
    commands.addCommand(command, {
      execute: (args: any) => {
        const parsed = args as IRouter.ILocation;
        const matches = parsed.path.match(treePattern);
        if (!matches) {
          return;
        }
        const [, path] = matches;

        app.restored.then(() => {
          commands.execute('docmanager:open', {
            path,
            factory: NOTEBOOK_FACTORY
          });
        });
      }
    });

    router.register({ command, pattern: treePattern });
  }
};

/**
 * Zen mode plugin
 */
const zen: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab-classic/application-extension:zen',
  autoStart: true,
  optional: [ICommandPalette, IClassicShell, IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette | null,
    classicShell: IClassicShell | null,
    menu: IMainMenu | null
  ): void => {
    const { commands } = app;
    const elem = document.documentElement;
    const topArea = classicShell?.top;
    const menuArea = classicShell?.menu;

    const toggleOn = () => {
      topArea?.setHidden(true);
      menuArea?.setHidden(true);
      zenModeEnabled = true;
    };

    const toggleOff = () => {
      topArea?.setHidden(false);
      menuArea?.setHidden(false);
      zenModeEnabled = false;
    };

    let zenModeEnabled = false;
    commands.addCommand(CommandIDs.toggleZen, {
      label: 'Toggle Zen Mode',
      execute: (args: any) => {
        if (!zenModeEnabled) {
          elem.requestFullscreen();
          toggleOn();
        } else {
          document.exitFullscreen();
          toggleOff();
        }
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        toggleOff();
      }
    });

    if (palette) {
      palette.addItem({ command: CommandIDs.toggleZen, category: 'Mode' });
    }

    if (menu) {
      menu.viewMenu.addGroup([{ command: CommandIDs.toggleZen }], 3);
    }
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  logo,
  noTabsMenu,
  paths,
  router,
  sessionDialogs,
  shell,
  spacer,
  topVisibility,
  translator,
  tree,
  zen
];

export default plugins;
