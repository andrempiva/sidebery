import * as Utils from 'src/utils'
import { ASKID, COLOR_OPTS, CONTAINER_ID, Err, NEWID } from 'src/defaults'
import { DEFAULT_CONTAINER_ID, PRIVATE_CONTAINER_ID } from 'src/defaults'
import { MenuOption, Window, Tab } from 'src/types'
import { translate } from 'src/dict'
import { Tabs } from 'src/services/tabs.fg'
import { Windows } from 'src/services/windows'
import { Selection } from 'src/services/selection'
import { Settings } from 'src/services/settings'
import { Sidebar } from 'src/services/sidebar'
import { Menu } from 'src/services/menu'
import { Containers } from 'src/services/containers'
import { ItemInfo } from 'src/types/tabs'
import * as Logs from './logs'
import * as Popups from 'src/services/popups'
import * as TabsSorting from 'src/services/tabs.fg.sorting'

export const tabsMenuOptions: Record<string, () => MenuOption | MenuOption[] | undefined> = {
  undoRmTab: () => ({
    label: translate('menu.tab.undo'),
    icon: 'icon_undo',
    onClick: () => Tabs.undoRmTab(),
  }),

  moveToNewWin: () => {
    return {
      label: translate(`menu.tab.move_to_new_${Windows.incognito ? 'priv_window' : 'window'}`),
      icon: Windows.incognito ? 'icon_move_to_new_priv_win' : 'icon_move_to_new_norm_win',
      onClick: () => {
        const items = Selection.getTabsInfo(true)
        Tabs.move(items, {}, { windowId: NEWID, incognito: Windows.incognito })
      },
    }
  },

  moveToWin: () => {
    const option: MenuOption = {}
    const wins = Windows.otherWindows.filter(w => w.incognito === Windows.incognito)
    const winLen = wins.length
    if (winLen === 0) option.inactive = true
    if (winLen <= 1) {
      option.label = translate('menu.tab.move_to_another_window')
      if (Windows.incognito) option.icon = 'icon_move_to_priv_win'
      else option.icon = 'icon_move_to_norm_win'
      option.onClick = () => {
        const items = Selection.getTabsInfo(true)
        const dst = { windowId: wins[0].id, pinned: items[0]?.pinned }
        Tabs.move(items, {}, dst)
      }
    } else {
      option.label = translate('menu.tab.move_to_window_')
      if (Windows.incognito) option.icon = 'icon_move_to_priv_wins'
      else option.icon = 'icon_move_to_norm_wins'
      option.onClick = () => {
        const filter = (w: Window) => w.incognito === Windows.incognito
        const windowChooseConf = { title: option.label, otherWindows: true, filter }
        const items = Selection.getTabsInfo(true)
        const dst = { windowChooseConf, pinned: items[0]?.pinned }
        Tabs.move(items, {}, dst)
      }
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  moveToPanel: () => {
    const opts: MenuOption[] = []
    const probeTab = Tabs.byId[Selection.getFirst()]
    if (!probeTab || (probeTab.pinned && Settings.state.pinnedTabsPosition !== 'panel')) return

    for (const panel of Sidebar.panels) {
      if (!Utils.isTabsPanel(panel)) continue
      if (probeTab.panelId === panel.id) continue

      opts.push({
        label: translate('menu.tab.move_to_panel_') + panel.name,
        icon: panel.iconSVG,
        img: panel.iconIMG,
        badge: 'icon_move_badge',
        color: panel.color,
        onClick: () => {
          const items = Selection.getTabsInfo(true)
          const src = { windowId: Windows.id, panelId: probeTab.panelId, pinned: probeTab.pinned }
          Tabs.move(items, src, { panelId: panel.id, index: panel.nextTabIndex })
        },
      })
    }

    if (opts.length) return opts
  },

  moveToNewPanel: () => {
    const probeTab = Tabs.byId[Selection.getFirst()]
    if (!probeTab || (probeTab.pinned && Settings.state.pinnedTabsPosition !== 'panel')) return

    const option: MenuOption = {
      label: translate('menu.tab.move_to_new_panel'),
      icon: 'icon_add_tabs_panel',
      badge: 'icon_move_badge',
      onClick: () => Tabs.moveToNewPanel(Selection.get()),
    }

    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  reopenInNewWin: () => {
    const label = Windows.incognito ? 'reopen_in_new_norm_window' : 'reopen_in_new_priv_window'
    return {
      label: translate('menu.tab.' + label),
      icon: Windows.incognito ? 'icon_reopen_in_new_norm_window' : 'icon_reopen_in_new_priv_win',
      onClick: () => {
        const items = Selection.getTabsInfo(true)
        const pinned = items[0]?.pinned
        Tabs.reopen(items, { windowId: NEWID, incognito: !Windows.incognito, pinned })
      },
    }
  },

  reopenInWin: () => {
    const option: MenuOption = {}
    const wins = Windows.otherWindows.filter(w => w.incognito !== Windows.incognito)
    const winLen = wins.length
    const containerId = Windows.incognito ? DEFAULT_CONTAINER_ID : PRIVATE_CONTAINER_ID

    if (winLen === 0) option.inactive = true

    if (winLen <= 1) {
      if (Windows.incognito) {
        option.label = translate('menu.tab.reopen_in_norm_window')
        option.icon = 'icon_reopen_in_norm_win'
      } else {
        option.label = translate('menu.tab.reopen_in_priv_window')
        option.icon = 'icon_reopen_in_priv_win'
      }
      option.onClick = () => {
        const items = Selection.getTabsInfo(true)
        const pinned = items[0]?.pinned
        Tabs.reopen(items, { windowId: wins[0].id, containerId, pinned })
      }
    } else {
      option.label = translate('menu.tab.reopen_in_window_')
      if (Windows.incognito) option.icon = 'icon_reopen_in_norm_wins'
      else option.icon = 'icon_reopen_in_priv_wins'
      option.onClick = () => {
        const filter = (w: Window) => w.incognito !== Windows.incognito
        const items = Selection.getTabsInfo(true)
        const pinned = items[0]?.pinned
        Tabs.reopen(items, {
          windowId: ASKID,
          windowChooseConf: { title: option.label, otherWindows: true, filter },
          containerId,
          pinned,
        })
      }
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  reopenInCtr: () => {
    if (Windows.incognito) return
    const opts = []
    const firstTab = Tabs.byId[Selection.getFirst()]
    const ignoreRules = Menu.ctxMenuIgnoreContainersRules

    if (!firstTab) return

    if (firstTab.cookieStoreId !== CONTAINER_ID) {
      opts.push({
        label: translate('menu.tab.reopen_in_default_container'),
        icon: 'icon_ff',
        badge: 'icon_reopen',
        onClick: () => Tabs.reopenInContainer(Selection.get(), CONTAINER_ID),
      })
    }

    for (const c of Containers.sortContainers(Object.values(Containers.reactive.byId))) {
      if (firstTab.cookieStoreId === c.id) continue
      if (ignoreRules?.[c.id]) continue
      opts.push({
        label: translate('menu.tab.reopen_in_') + c.name,
        icon: c.icon,
        badge: 'icon_reopen',
        color: c.color,
        onClick: () => Tabs.reopenInContainer(Selection.get(), c.id),
      })
    }

    return opts
  },

  reopenInNewCtr: () => {
    if (Windows.incognito) return

    const option: MenuOption = {
      label: translate('menu.tab.reopen_in_new_container'),
      icon: 'icon_new_container',
      badge: 'icon_reopen',
      onClick: () => Tabs.reopenTabsInNewContainer(Selection.get()),
    }

    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  urlConf: () => {
    const selected = Selection.get()
    const firstTab = Tabs.byId[selected[0]]
    if (!firstTab) return

    const option: MenuOption = {
      label: translate('menu.tab.url_conf'),
      icon: 'icon_url_conf',
      onClick: () => Popups.openSiteConfigPopup(firstTab),
    }

    return option
  },

  openTabsInCtr: () => {
    if (Windows.incognito) return

    const opts = []
    const firstTab = Tabs.byId[Selection.getFirst()]
    const ignoreRules = Menu.ctxMenuIgnoreContainersRules

    if (!firstTab) return

    if (firstTab.cookieStoreId !== CONTAINER_ID) {
      opts.push({
        label: translate('menu.tab.open_in_default_container'),
        icon: 'icon_ff',
        onClick: () => Tabs.openInContainer(Selection.get(), CONTAINER_ID),
      })
    }

    for (const c of Containers.sortContainers(Object.values(Containers.reactive.byId))) {
      if (firstTab.cookieStoreId === c.id) continue
      if (ignoreRules?.[c.id]) continue
      opts.push({
        label: translate('menu.tab.open_in_') + c.name,
        icon: c.icon,
        color: c.color,
        onClick: () => Tabs.openInContainer(Selection.get(), c.id),
      })
    }

    return opts
  },

  pin: () => {
    const selected = Selection.get()
    const firstTab = Tabs.byId[selected[0]]
    if (!firstTab) return
    return {
      label: translate('menu.tab.' + (firstTab.pinned ? 'unpin' : 'pin')),
      icon: 'icon_pin',
      onClick: firstTab.pinned ? () => Tabs.unpinTabs(selected) : () => Tabs.pinTabs(selected),
    }
  },

  reload: () => {
    return {
      label: translate('menu.tab.reload'),
      icon: 'icon_reload',
      onClick: () => Tabs.reloadTabs(Selection.get()),
    }
  },

  duplicate: () => {
    return {
      label: translate('menu.tab.duplicate'),
      icon: 'icon_duplicate',
      onClick: () => Tabs.duplicateTabs(Selection.get()),
    }
  },

  bookmark: () => {
    return {
      label: translate('menu.tab.bookmark'),
      icon: 'icon_star',
      onClick: () => Tabs.bookmarkTabs(Selection.get()),
    }
  },

  mute: () => {
    const selected = Selection.get()
    const firstTab = Tabs.byId[selected[0]]
    const isMuted = firstTab?.mutedInfo?.muted
    return {
      label: translate('menu.tab.' + (isMuted ? 'unmute' : 'mute')),
      icon: isMuted ? 'icon_loud' : 'icon_mute',
      onClick: isMuted ? () => Tabs.unmuteTabs(selected) : () => Tabs.muteTabs(selected),
    }
  },

  discard: () => {
    const option: MenuOption = {
      label: translate('menu.tab.discard'),
      icon: 'icon_discard',
      onClick: () => Tabs.discardTabs(Selection.get()),
    }
    const firstTab = Tabs.byId[Selection.getFirst()]
    if (Selection.getLength() === 1 && firstTab?.discarded) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  group: () => {
    const option: MenuOption = {
      label: translate('menu.tab.group'),
      icon: 'icon_group_tabs',
      onClick: () => Tabs.groupTabs(Selection.get()),
    }
    const firstTab = Tabs.byId[Selection.getFirst()]
    if (!Settings.state.tabsTree || firstTab?.pinned) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  flatten: () => {
    const option: MenuOption = {
      label: translate('menu.tab.flatten'),
      icon: 'icon_flatten',
      onClick: () => Tabs.flattenTabs(Selection.get()),
    }
    const selLen = Selection.getLength()
    if (selLen <= 0) option.inactive = true

    const firstTab = Tabs.byId[Selection.getFirst()]
    if (!firstTab) return

    if (Selection.get().every(t => firstTab.lvl === Tabs.byId[t]?.lvl)) {
      option.inactive = true
    }
    if (selLen === 1 && firstTab.isParent) option.inactive = false
    if (selLen === 1 && firstTab.lvl > 0) option.inactive = false
    if (!Settings.state.tabsTree || firstTab.pinned) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  clearCookies: () => {
    return {
      label: translate('menu.tab.clear_cookies'),
      icon: 'icon_cookie',
      onClick: () => Tabs.clearTabsCookies(Selection.get()),
    }
  },

  close: () => {
    const option: MenuOption = {
      label: translate('menu.tab.close'),
      icon: 'icon_close',
      onClick: () => Tabs.removeTabs(Selection.get()),
    }
    const firstTab = Tabs.byId[Selection.getFirst()]
    if (!firstTab) return
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  closeBranch: () => {
    const option: MenuOption = {
      label: translate('menu.tab.close_branch'),
      icon: 'icon_rm_branch',
      onClick: () => Tabs.removeBranches(Selection.get()),
    }
    const firstTab = Tabs.byId[Selection.getFirst()]
    if (!firstTab) return
    if (firstTab.pinned) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  closeDescendants: () => {
    const option: MenuOption = {
      label: translate('menu.tab.close_descendants'),
      icon: 'icon_rm_descendants',
      onClick: () => Tabs.removeTabsDescendants(Selection.get()),
    }
    const hasDescendants = Selection.get().some(tabId => {
      const tab = Tabs.byId[tabId]
      if (!tab) return false
      const nextTab = Tabs.list[tab.index + 1]
      return nextTab && nextTab.parentId === tab.id
    })
    if (!hasDescendants) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  closeTabsAbove: () => {
    const option: MenuOption = {
      label: translate('menu.tab.close_above'),
      icon: 'icon_close_tabs_above',
      onClick: () => Tabs.removeTabsAbove(Selection.get()),
    }

    const tabId = Selection.getFirst()
    const tab = Tabs.byId[tabId]
    if (!tab) return
    const prevTab = Tabs.list[tab.index - 1]
    if (!tab || tab.pinned) option.inactive = true
    if (!prevTab || prevTab.panelId !== tab.panelId || prevTab.pinned) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  closeTabsBelow: () => {
    const option: MenuOption = {
      label: translate('menu.tab.close_below'),
      icon: 'icon_close_tabs_below',
      onClick: () => Tabs.removeTabsBelow(Selection.get()),
    }

    const tabId = Selection.getFirst()
    const tab = Tabs.byId[tabId]
    if (!tab) return
    const nextTab = Tabs.list[tab.index + 1]
    if (!tab || tab.pinned) option.inactive = true
    if (!nextTab || nextTab.panelId !== tab.panelId) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  closeOtherTabs: () => {
    const option: MenuOption = {
      label: translate('menu.tab.close_other'),
      icon: 'icon_close_other_tabs',
      onClick: () => Tabs.removeOtherTabs(Selection.get()),
    }

    const tabId = Selection.getFirst()
    const tab = Tabs.byId[tabId]
    if (!tab || tab.pinned) option.inactive = true
    if (tab) {
      const panel = Sidebar.panelsById[tab.panelId]
      if (!panel || panel.reactive.len === 1) option.inactive = true
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  copyTabsUrls: () => {
    const selected = Selection.get()
    return {
      label: translate('menu.copy_urls', selected.length),
      icon: 'icon_link',
      badge: 'icon_copy_badge',
      onClick: () => Tabs.copyUrls(selected),
    }
  },

  copyTabsTitles: () => {
    const selected = Selection.get()
    return {
      label: translate('menu.copy_titles', selected.length),
      icon: 'icon_title',
      badge: 'icon_copy_badge',
      onClick: () => Tabs.copyTitles(selected),
    }
  },

  colorizeTab: () => {
    const opts: MenuOption[] = []
    const selected = Selection.get()
    let usedColor
    if (selected.length === 1) usedColor = Tabs.byId[selected[0]]?.customColor ?? 'toolbar'
    for (const color of COLOR_OPTS) {
      if (usedColor && usedColor === color.color) continue
      const title = translate('colors.' + color.color)
      opts.push({
        label: title,
        color: color.color as browser.ColorName,
        icon: color.value === 'toolbar' ? 'icon_none' : 'circle',
        onClick: () => Tabs.setCustomColor(selected, color.value),
      })
    }

    if (opts.length) return opts
  },

  editTabTitle: () => {
    const selected = Selection.get()
    const firstTab = Tabs.byId[selected[0]]
    if (!firstTab) return

    const option: MenuOption = {
      label: translate('menu.tab.edit_title'),
      icon: 'icon_edit',
      onClick: () => Tabs.editTabTitle(Selection.get()),
    }

    if (firstTab.pinned) {
      option.inactive =
        !Settings.state.pinnedTabsList ||
        Settings.state.pinnedTabsPosition === 'left' ||
        Settings.state.pinnedTabsPosition === 'right'
    }

    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsByTitleAscending: () => {
    const option: MenuOption = {
      label: translate('menu.tab.sort_by_title_asc'),
      icon: 'icon_sort_name_asc',
      onClick: () => TabsSorting.sort(TabsSorting.By.Title, Selection.get(), 1),
      onAltClick: () => TabsSorting.sort(TabsSorting.By.Title, Selection.get(), 1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsByTitleDescending: () => {
    const option: MenuOption = {
      label: translate('menu.tab.sort_by_title_des'),
      icon: 'icon_sort_name_des',
      onClick: () => TabsSorting.sort(TabsSorting.By.Title, Selection.get(), -1),
      onAltClick: () => TabsSorting.sort(TabsSorting.By.Title, Selection.get(), -1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsByUrlAscending: () => {
    const option: MenuOption = {
      label: translate('menu.tab.sort_by_url_asc'),
      icon: 'icon_sort_url_asc',
      onClick: () => TabsSorting.sort(TabsSorting.By.Url, Selection.get(), 1),
      onAltClick: () => TabsSorting.sort(TabsSorting.By.Url, Selection.get(), 1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsByUrlDescending: () => {
    const option: MenuOption = {
      label: translate('menu.tab.sort_by_url_des'),
      icon: 'icon_sort_url_des',
      onClick: () => TabsSorting.sort(TabsSorting.By.Url, Selection.get(), -1),
      onAltClick: () => TabsSorting.sort(TabsSorting.By.Url, Selection.get(), -1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsByAccessTimeAscending: () => {
    const option: MenuOption = {
      label: translate('menu.tab.sort_by_time_asc'),
      icon: 'icon_sort_time_asc',
      onClick: () => TabsSorting.sort(TabsSorting.By.ATime, Selection.get(), 1),
      onAltClick: () => TabsSorting.sort(TabsSorting.By.ATime, Selection.get(), 1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsByAccessTimeDescending: () => {
    const option: MenuOption = {
      label: translate('menu.tab.sort_by_time_des'),
      icon: 'icon_sort_time_des',
      onClick: () => TabsSorting.sort(TabsSorting.By.ATime, Selection.get(), -1),
      onAltClick: () => TabsSorting.sort(TabsSorting.By.ATime, Selection.get(), -1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsTreeByTitleAscending: () => {
    const ids = Selection.get()
    const option: MenuOption = {
      label: translate('menu.tab.sort_tree_by_title_asc'),
      icon: 'icon_sort_name_asc',
      onClick: () => TabsSorting.sort(TabsSorting.By.Title, ids, 1, true),
    }
    if (ids.length === 1 && !Tabs.byId[ids[0]]?.isParent) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsTreeByTitleDescending: () => {
    const ids = Selection.get()
    const option: MenuOption = {
      label: translate('menu.tab.sort_tree_by_title_des'),
      icon: 'icon_sort_name_des',
      onClick: () => TabsSorting.sort(TabsSorting.By.Title, ids, -1, true),
    }
    if (ids.length === 1 && !Tabs.byId[ids[0]]?.isParent) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsTreeByUrlAscending: () => {
    const ids = Selection.get()
    const option: MenuOption = {
      label: translate('menu.tab.sort_tree_by_url_asc'),
      icon: 'icon_sort_url_asc',
      onClick: () => TabsSorting.sort(TabsSorting.By.Url, ids, 1, true),
    }
    if (ids.length === 1 && !Tabs.byId[ids[0]]?.isParent) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsTreeByUrlDescending: () => {
    const ids = Selection.get()
    const option: MenuOption = {
      label: translate('menu.tab.sort_tree_by_url_des'),
      icon: 'icon_sort_url_des',
      onClick: () => TabsSorting.sort(TabsSorting.By.Url, ids, -1, true),
    }
    if (ids.length === 1 && !Tabs.byId[ids[0]]?.isParent) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsTreeByAccessTimeAscending: () => {
    const ids = Selection.get()
    const option: MenuOption = {
      label: translate('menu.tab.sort_tree_by_time_asc'),
      icon: 'icon_sort_time_asc',
      onClick: () => TabsSorting.sort(TabsSorting.By.ATime, ids, 1, true),
    }
    if (ids.length === 1 && !Tabs.byId[ids[0]]?.isParent) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortTabsTreeByAccessTimeDescending: () => {
    const ids = Selection.get()
    const option: MenuOption = {
      label: translate('menu.tab.sort_tree_by_time_des'),
      icon: 'icon_sort_time_des',
      onClick: () => TabsSorting.sort(TabsSorting.By.ATime, ids, -1, true),
    }
    if (ids.length === 1 && !Tabs.byId[ids[0]]?.isParent) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  goToRandomTabFromGroup: () => {
    const tabIds = Selection.get()

    const option: MenuOption = {
      label: 'Go to Random Tab',
      icon: 'icon_reload',
      onClick: () => {
        const pick = tabIds[Math.floor(Math.random() * tabIds.length)];
	      browser.tabs.update(pick, { active: true });
      }
    }

    const firstTab = Tabs.byId[Selection.getFirst()]
    if (!firstTab || tabIds.length <= 1) return

    return option
  },

  // ---
  // -- Panel options
  // -

  selectAllTabs: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const ids = panel.tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.sel_all'),
      icon: 'icon_sel_all',
      onClick: async () => {
        await Utils.sleep(32)
        document.body.focus()
        Selection.selectTabs(ids)
      },
    }
    if (!ids.length) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  muteAllAudibleTabs: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const tabIds: ID[] = []
    panel.pinnedTabs.forEach(t => t.audible && tabIds.push(t.id))
    panel.tabs.forEach(t => t.audible && tabIds.push(t.id))
    const option: MenuOption = {
      label: translate('menu.tabs_panel.mute_all_audible'),
      icon: 'icon_mute',
      onClick: () => Tabs.muteTabs(tabIds),
    }
    if (!tabIds.length) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  closeTabsDuplicates: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const tabs = panel.tabs ?? []
    const tabIds = tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.dedup'),
      icon: 'icon_dedup_tabs',
      onClick: () => Tabs.dedupTabs(tabIds),
    }
    if (!tabIds.length) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  reloadTabs: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const tabs = panel.tabs ?? []
    const tabIds = tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.reload'),
      icon: 'icon_reload',
      onClick: () => Tabs.reloadTabs(tabIds),
    }
    if (!tabIds.length) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  discardTabs: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const tabIds: ID[] = []
    panel.pinnedTabs.forEach(t => tabIds.push(t.id))
    panel.tabs.forEach(t => tabIds.push(t.id))
    const option: MenuOption = {
      label: translate('menu.tabs_panel.discard'),
      icon: 'icon_discard',
      onClick: () => Tabs.discardTabs(tabIds),
    }
    if (!tabIds.length) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  closeTabs: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const tabs = panel.tabs ?? []
    const tabIds = tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.close'),
      icon: 'icon_close',
      onClick: () => Tabs.removeTabs(tabIds),
    }
    if (!tabIds.length) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  collapseInactiveBranches: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return
    if (!Settings.state.tabsTree) return

    const panelTabs = panel.tabs ?? []
    const option: MenuOption = {
      label: translate('menu.tabs_panel.collapse_inact_branches'),
      icon: 'icon_collapse_all',
      onClick: () => {
        const tabs: Tab[] = []
        for (const rTab of panelTabs) {
          const tab = Tabs.byId[rTab.id]
          if (tab && tab.lvl === 0) tabs.push(tab)
        }
        Tabs.foldAllInactiveBranches(tabs)
      },
    }
    if (panelTabs.length < 3) option.inactive = true
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  bookmarkTabsPanel: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const option: MenuOption = {
      label: translate('menu.tabs_panel.bookmark'),
      icon: 'icon_star',
      badge: 'icon_move_badge',
      onClick: () => {
        Sidebar.bookmarkTabsPanel(panel.id, true).catch(err => {
          if (err !== Err.Canceled) Logs.err('Menu.bookmarkTabsPanel', err)
        })
      },
      onAltClick: () => {
        Sidebar.bookmarkTabsPanel(panel.id).catch(err => {
          if (err !== Err.Canceled) Logs.err('Menu.bookmarkTabsPanel', err)
        })
      },
    }

    return option
  },

  restoreFromBookmarks: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const option: MenuOption = {
      label: translate('menu.tabs_panel.restore_from_bookmarks'),
      icon: 'icon_star',
      badge: 'icon_move_out_badge',
      onClick: () => {
        Sidebar.restoreFromBookmarks(panel).catch(err => {
          if (err !== Err.Canceled) Logs.err('Menu.restoreFromBookmarks', err)
        })
      },
    }

    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  convertToBookmarksPanel: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return

    const option: MenuOption = {
      label: translate('menu.tabs_panel.convert_to_bookmarks_panel'),
      icon: 'icon_star',
      badge: 'icon_reopen',
      onClick: () => Sidebar.convertToBookmarksPanel(panel),
    }

    return option
  },

  sortAllTabsByTitleAscending: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return
    const ids = panel.tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.sort_all_by_title_asc'),
      icon: 'icon_sort_name_asc',
      inactive: ids.length < 2,
      onClick: () => TabsSorting.sort(TabsSorting.By.Title, ids, 1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortAllTabsByTitleDescending: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return
    const ids = panel.tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.sort_all_by_title_des'),
      icon: 'icon_sort_name_des',
      inactive: ids.length < 2,
      onClick: () => TabsSorting.sort(TabsSorting.By.Title, ids, -1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortAllTabsByUrlAscending: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return
    const ids = panel.tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.sort_all_by_url_asc'),
      icon: 'icon_sort_url_asc',
      inactive: ids.length < 2,
      onClick: () => TabsSorting.sort(TabsSorting.By.Url, ids, 1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortAllTabsByUrlDescending: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return
    const ids = panel.tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.sort_all_by_url_des'),
      icon: 'icon_sort_url_des',
      inactive: ids.length < 2,
      onClick: () => TabsSorting.sort(TabsSorting.By.Url, ids, -1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortAllTabsByAccessTimeAscending: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return
    const ids = panel.tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.sort_all_by_time_asc'),
      icon: 'icon_sort_time_asc',
      inactive: ids.length < 2,
      onClick: () => TabsSorting.sort(TabsSorting.By.ATime, ids, 1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  sortAllTabsByAccessTimeDescending: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]
    if (!Utils.isTabsPanel(panel)) return
    const ids = panel.tabs.map(t => t.id)
    const option: MenuOption = {
      label: translate('menu.tabs_panel.sort_all_by_time_des'),
      icon: 'icon_sort_time_des',
      inactive: ids.length < 2,
      onClick: () => TabsSorting.sort(TabsSorting.By.ATime, ids, -1, true),
    }
    if (!Settings.state.ctxMenuRenderInact && option.inactive) return
    return option
  },

  goToRandomTabFromPanel: () => {
    const panel = Sidebar.panelsById[Selection.getFirst()]

    if (!Utils.isTabsPanel(panel)) return

    const tabIds = panel.tabs.map(t => t.id) ?? []

    const option: MenuOption = {
      label: translate('menu.tabs_panel.random_tab'),
      icon: 'icon_reload',
      onClick: () => {
        const pick = tabIds[Math.floor(Math.random() * tabIds.length)];
	      browser.tabs.update(pick, { active: true });
      }
    }

    return option
  },
}
