// Tab.
var SideTab = function(){
  this.id = null;
  this.url = null;
  this.title = null;
};

const debug = true;

var textMap = {
  reload: '↺',
  pin: '⇧',
  mute: '♫',
  close: 'x',
  newWindow: '⇗'
};
var buttons = ['close', 'pin', 'reload', 'mute', 'newWindow'];
var topMenu = document.getElementById('topMenu');
var topOptionsMenu = document.getElementById('topOptionsMenu');

SideTab.prototype = {
  _get: function(type) {
    return new Promise((resolve, reject) => {
      let wrapper = document.getElementById(this.id);
      if (wrapper && type) {
        wrapper = wrapper.getElementsByClassName(type)[0];
      }
      if (!wrapper) {
        reject(`sidebar-tabs: no wrapper for ${type} for ${this.id}`);
      }
      resolve(wrapper);
    });
  },
  _getIds: function() {
    return Array.prototype.map.call(
      getList(),
      (elem) => { return parseInt(elem.id); }
    );
  },
  create: function(tab) {
    this.id = tab.id;
    this.url = tab.url;
    this.title = tab.title || 'Connecting...';
    this.pinned = false;

    let div = document.createElement('div');
    div.className = 'wrapper';
    div.setAttribute('contextmenu', 'tabmenu');
    div.id = this.id;

    let a = document.createElement('a');
    a.className = 'tab';
    a.innerText = this.url;
    a.href = this.url;
    a.title = this.url;

    a.addEventListener('click', tabOnClick);

    for (let method of buttons) {
      let button = document.createElement('a');
      button.className = `button right ${method}`;
      button.href = '#';
      button.innerText = textMap[method];
      button.title = method;
      button.addEventListener('click', buttonEvent);
      div.appendChild(button);
    }

    let icon = document.createElement('img');
    icon.className = 'icon';
    icon.style.visibility = 'hidden';

    icon.addEventListener('error', handleImageError);

    let context = document.createElement('span');
    context.className = 'context';
    context.style.visibility = 'hidden';

    div.appendChild(icon);
    div.appendChild(context);
    div.appendChild(a);
    tabList.appendChild(div);

    div.addEventListener('dragstart', handleDragStart, false);
    div.addEventListener('dragover', handleDragOver, false);
    div.addEventListener('drop', handleDrop, false);
  },
  remove: function() {
    this._get().then((node) => { node.remove(); });
  },
  updateTitle: function(title) {
    this.title = title;
    this._get('tab').then((node) => { node.innerText = title; });
  },
  setActive: function() {
    this._get().then((node) => {
      node.classList.add('active');
      node.scrollIntoView();
    });
  },
  setInactive: function() {
    this._get().then((node) => { node.classList.remove('active'); });
  },
  getPos: function() {
    return this._getIds().indexOf(this.id);
  },
  setPos: function(pos) {
    this._get().then((element) => {
      let elements = getList();
      if (!elements[pos]) {
        tabList.insertBefore(element, elements[pos-1].nextSibling);
      } else {
        tabList.insertBefore(element, elements[pos]);
      }
    });
  },
  setAudible: function() {
    this._get('mute').then((node) => { node.classList.add('sound'); });
  },
  setNotAudible: function() {
    this._get('mute').then((node) => { node.classList.remove('sound'); });
  },
  setMuted: function() {
    this._get('mute').then((node) => { node.classList.add('muted'); });
  },
  setNotMuted: function() {
    this._get('mute').then((node) => { node.classList.remove('muted'); });
  },
  setIcon: function(url) {
    this._get('icon').then((icon) => {
      if (!url) {
        icon.src = '';
        icon.style.visibility = 'hidden';
      } else {
        icon.src = url;
        icon.style.visibility = 'unset';
      }
    });
  },
  setSpinner: function() {
    let icon = this._get('icon').then((icon) => {
      icon.src = 'rolling.svg';
      icon.style.visibility = 'unset';
    });
  },
  setError: function() {
    let icon = this._get('icon').then((icon) => {
      icon.src = 'error.svg';
      icon.style.visibility = 'unset';
    });
  },
  resetIcon: function() {
    let icon = this._get('icon').then((icon) => {
      icon.src = '';
      icon.style.visibility = 'unset';
    });
  },
  pinTab: function() {
    this._get('pin').then((node) => {
      node.classList.add('pinned');
      this._get().then((node) => {
        node.classList.add('pinned');
        node.classList.remove('unpinned');
      });
    });
  },
  unpinTab: function() {
    this._get('pin').then((node) => {
      node.classList.remove('pinned');
      this._get().then((node) => {
        node.classList.remove('pinned');
        node.classList.add('unpinned');
      });
    });
  },
  setContext: function(context) {
    if (!context) {
      return;
    }
    let span = this._get('context').then((node) => {
      node.style.visibility = 'unset';
      node.style.backgroundColor = context.color;
      node.title = context.name;
    });
  }
};

// Tab List
var SideTabList = function(){
  this.tabs = new Map();
  this.active = null;
  this.windowId = null;
};

SideTabList.prototype = {
  populate: function(windowId) {
    if (windowId && this.windowId === null) {
      this.windowId = windowId;
    }
    browser.tabs.query({currentWindow: true})
    .then((tabs) => {
      for (let tab of tabs) {
        this.create(tab);
      }
    });
  },
  checkWindow(tab) {
    return (tab.windowId == this.windowId);
  },
  getTab: function(tab) {
    if (this.checkWindow(tab)) {
      return this.getTabById(tab.id);
    }
    return null;
  },
  getTabById: function(tabId) {
    return this.tabs.get(tabId, null);
  },
  attach: function(tabId) {
    browser.tabs.get(tabId)
    .then((tab) => {
      this.create(tab);
      this.setPos(tab.id, tab.index);
      return tab;
    });
  },
  create: function(tab) {
    if (!this.checkWindow(tab)) {
      return null;
    }
    let sidetab = new SideTab();
    sidetab.create(tab);
    this.tabs.set(tab.id, sidetab);
    if (tab.active) {
      this.setActive(tab.id);
    }
    this.setMuted(tab, tab.mutedInfo);
    this.setAudible(tab);
    this.setIcon(tab);
    this.setPinned(tab);
    this.setTitle(tab);
    if (tab.cookieStoreId) {
      browser.contextualIdentities.get(tab.cookieStoreId)
        .then((context) => {
          this.setContext(tab, context);
        }
      );
    }
  },
  setActive: function(tabId) {
    let tabEntry = this.getTabById(tabId);
    if (tabEntry) {
      if (this.active) {
        this.getTabById(this.active).setInactive();
      }
      tabEntry.setActive();
      this.active = tabId;
    }
  },
  setTitle: function(tab) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      tabEntry.updateTitle(tab.title);
    }
  },
  remove: function(tabId) {
    let tabEntry = this.getTabById(tabId);
    if (tabEntry) {
      tabEntry.remove();
      delete this.tabs[tabId];
    }
  },
  getPos: function(tabId) {
    let tabEntry = this.getTabById(tabId);
    if (tabEntry) {
      return tabEntry.getPos();
    }
  },
  setPos: function(tabId, pos) {
    let tabEntry = this.getTabById(tabId);
    if (tabEntry) {
      tabEntry.setPos(pos);
    }
  },
  setAudible: function(tab) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      if (tab.audible) {
        tabEntry.setAudible();
      } else {
        tabEntry.setNotAudible();
      }
    }
  },
  setMuted: function(tab, mutedInfo) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      if (mutedInfo.muted) {
        tabEntry.setMuted();
      } else {
        tabEntry.setNotMuted();
      }
    }
  },
  setNotMuted: function(tab, muted) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      tabEntry.setNotMuted();
    }
  },
  setIcon: function(tab) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      if (tab.favIconUrl) {
        tabEntry.setIcon(tab.favIconUrl);
      } else {
        tabEntry.resetIcon();
      }
    }
  },
  setError: function(tab) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      tabEntry.setError();
    }
  },
  setSpinner: function(tab) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      tabEntry.setSpinner();
    }
  },
  setPinned: function(tab) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      if (tab.pinned) {
        tabEntry.pinTab();
      } else {
        tabEntry.unpinTab();
      }
    }
  },
  setContext: function(tab, context) {
    let tabEntry = this.getTab(tab);
    if (tabEntry) {
      tabEntry.setContext(context);
    }
  },
  rebuild: function() {
    for (let entries of this.tabs) {
      entries[1].remove();
    }
    this.tabs = new Map();
  }
};

// Tabs Events.
browser.tabs.onActivated.addListener((details) => {
  if (debug) {
    console.log('browser.tabs.onActivated: %o', [details]);
  }
  sidetabs.setActive(details.tabId);
});

browser.tabs.onCreated.addListener((tab) => {
  if (debug) {
    console.log('browser.tabs.onCreated: %o', [tab]);
  }
  sidetabs.create(tab);
  sidetabs.setPos(tab.id, tab.index);
});

browser.tabs.onAttached.addListener((tabId, attachInfo) => {
  if (debug) {
    console.log('browser.tabs.onAttached: %o', [tabId, attachInfo]);
  }
  sidetabs.attach(tabId);
});

browser.tabs.onMoved.addListener((tabId, moveInfo) => {
  if (debug) {
    console.log('browser.tabs.onMoved: %o', [tabId, moveInfo]);
  }
  sidetabs.getPos(tabId);
  sidetabs.setPos(tabId,
    moveInfo.fromIndex < moveInfo.toIndex ?
    moveInfo.toIndex + 1: moveInfo.toIndex
  );
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (debug) {
    console.log('browser.tabs.onCreated: %o', [tabId, removeInfo]);
  }
  sidetabs.remove(tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (debug) {
    console.log('browser.tabs.onUpdated: %o', [tabId, changeInfo, tab]);
  }
  if (changeInfo.hasOwnProperty('title')) {
    sidetabs.setTitle(tab);
  }
  if (changeInfo.hasOwnProperty('mutedInfo')) {
    sidetabs.setMuted(tab, changeInfo.mutedInfo);
  }
  if (changeInfo.hasOwnProperty('audible')) {
    sidetabs.setAudible(tab, changeInfo.audible);
  }
  if (changeInfo.status === 'loading') {
    sidetabs.setSpinner(tab);
  }
  if (changeInfo.status === 'complete') {
    sidetabs.setIcon(tab);
  }
  if (changeInfo.hasOwnProperty('pinned')) {
    if (changeInfo.pinned === true || changeInfo.pinned === false) {
      sidetabs.setPinned(tab);
    }
  }
});

browser.tabs.onDetached.addListener((tabId, details) => {
  if (debug) {
    console.log('browser.tabs.onDetached: %o', [tabId, details]);
  }
  sidetabs.remove(tabId);
});

// WebNavigation Events.
browser.webNavigation.onCompleted.addListener((details) => {
  if (debug) {
    console.log('browser.webNavigation.onCompleted: %o', [details]);
  }
  browser.tabs.get(details.tabId)
  .then((tab) => {
    sidetabs.setTitle(tab);
    sidetabs.setIcon(tab);
  });
});

browser.webNavigation.onErrorOccurred.addListener((details) => {
  if (debug) {
    console.log('browser.webNavigation.onErrorOccurred: %o', [details]);
  }
  browser.tabs.get(details.tabId)
  .then((tab) => {
    sidetabs.setError(tab);
  });
});

function tabOnClick(event) {
  browser.tabs.update(this.id, {active: true});
  event.preventDefault();
}

function getList() {
  return tabList.getElementsByClassName('wrapper');
}

function addClick(event) {
  if (event.target.dataset.identity) {
    browser.tabs.create({cookieStoreId: event.target.dataset.identity});
  } else {
    browser.tabs.create({});
  }
  event.preventDefault();
}

if (browser.contextualIdentities === undefined) {
  console.log('browser.contextualIdentities not available. Check that the privacy.userContext.enabled pref is set to true, and reload the add-on.');
} else {
  browser.contextualIdentities.query({})
    .then((identities) => {
      for (let identity of identities) {
        var link = document.createElement('a');
        link.innerText = `New ${identity.name} tab`;
        link.href = '#';
        link.className = 'add';
        link.dataset.identity = identity.cookieStoreId;
        link.addEventListener('click', addClick);
        topOptionsMenu.insertBefore(link, topOptionsMenu.getElementsByTagName('a')[0]);
      }
    }
  );
}

document.getElementsByClassName('add')[0].addEventListener('click', addClick);

document.getElementById('sort').addEventListener(
  'click', ((event) => {
    function sortTabs(a, b) {
      return (a.url.split('//')[1] || a.url) > (b.url.split('//')[1] || b.url);
    }

    let pinned_length = 0;
    browser.tabs.query(
      {pinned: true, currentWindow: true}
    ).then((pinned) => {
      pinned_length = pinned.length;
      return browser.tabs.query(
        {pinned: false, currentWindow: true}
      );
    }).then((tabs) => {
      tabs.sort(sortTabs);
      return browser.tabs.move(
        tabs.map(function(i) { return i.id;}),
        {index: pinned_length}
      );
    });
    event.preventDefault();
  })
);

document.getElementById('duplicates').addEventListener(
  'click', ((event) => {
    let found = [];

    browser.tabs.query({currentWindow: true})
    .then((tabs) => {
      for (let tab of tabs) {
        if (found.includes(tab.url)) {
          browser.tabs.remove(tab.id);
        } else {
          found.push(tab.url);
        }
      }
    });

    event.preventDefault();
  })
);

document.getElementById('full').addEventListener(
  'click', ((event) => {
    browser.tabs.create({url: 'sidebar.html'});
    event.preventDefault();
  })
);

document.getElementById('reload').addEventListener(
  'click', ((event) => {
    browser.tabs.query({currentWindow: true})
    .then((tabs) => {
      for (let tab of tabs) {
        browser.tabs.reload(tab.id);
      }
    });
    event.preventDefault();
  })
);

document.getElementById('rebuild').addEventListener(
  'click', ((event) => {
    sidetabs.rebuild();
    sidetabs.populate(null);
    event.preventDefault();
  })
);

document.getElementById('options').addEventListener(
  'click', ((event) => {
    if (topMenu.classList.contains('options')) {
      topMenu.classList.remove('options');
      topOptionsMenu.style.display = 'none';
    } else {
      topMenu.classList.add('options');
      topOptionsMenu.style.display = 'block';
    }
    event.preventDefault();
  })
);

// Button events.
function buttonEvent(event) {
  let tabId = parseInt(event.target.parentNode.id);
  if (event.target.classList.contains('close')) {
    browser.tabs.remove(tabId);
  }
  if (event.target.classList.contains('reload')) {
    browser.tabs.reload(tabId);
  }
  if (event.target.classList.contains('mute')) {
    if (event.target.classList.contains('muted')) {
      browser.tabs.update(tabId, {'muted': false});
    } else {
      browser.tabs.update(tabId, {'muted': true});
    }
  }
  if (event.target.classList.contains('pin')) {
    if (event.target.classList.contains('pinned')) {
      browser.tabs.update(tabId, {'pinned': false});
    } else {
      browser.tabs.update(tabId, {'pinned': true});
    }
  }
  if (event.target.classList.contains('newWindow')) {
    browser.tabs.get(tabId)
      .then((tab) => {
        let pinned = tab.pinned;
        let muted = tab.muted;
        browser.windows.create({tabId: tabId})
          .then((tabs) => {
            browser.tabs.update(tabId, {
              'muted': muted,
              'pinned': pinned
            });
          });
      });
  }
  event.preventDefault();
}

function handleImageError(event) {
  event.target.src = 'error.svg';
  event.target.style.visibility = 'hidden';
  event.preventDefault();
}

// Drag and drop events.
function handleDragOver(event) {
  event.dataTransfer.dropEffect = 'move';
  event.preventDefault();
}

function handleDragStart(event) {
  dragElement = this;
  event.dataTransfer.effectAllowed = 'move';
}

function handleDrop(event) {
  if (event.stopPropagation) {
    event.stopPropagation();
  }
  let tabId = dragElement.id;
  let element = event.target;

  if (element.className.indexOf('wrapper') == -1) {
    element = element.parentNode;
  }

  let current = sidetabs.getPos(parseInt(tabId));
  let pos = sidetabs.getPos(parseInt(element.id));
  if (typeof pos === 'undefined') {
    pos = 0;
  } else {
    pos = parseInt(pos);
    pos = current > pos ? pos + 1 : pos;
  }

  browser.tabs.move(parseInt(tabId), {index: pos});
  event.preventDefault();
}

// Start it up.
var tabList = document.getElementById('list');
var sidetabs = null;
browser.windows.getCurrent().then(
  (data) => {
    sidetabs = new SideTabList();
    sidetabs.populate(data.id);
  }
);

// Setup Drag and Drop
var dragElement = null;

topMenu.addEventListener('drop', handleDrop);
topMenu.addEventListener('dragover', handleDragOver);

topOptionsMenu.addEventListener('drop', handleDrop);
topOptionsMenu.addEventListener('dragover', handleDragOver);
