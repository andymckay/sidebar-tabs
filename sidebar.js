// Tab.
var SideTab = function(){
  this.id = null;
  this.url = null;
  this.title = null;
};

var textMap = {
  reload: '↺',
  pin: '⇧',
  mute: '♫',
  close: 'x',
  newWindow: '⇗'
};

var topMenu = document.getElementById('topMenu');
var topOptionsMenu = document.getElementById('topOptionsMenu');

SideTab.prototype = {
  _get: function(type) {
    let wrapper = document.getElementById(this.id);
    if (type) {
      return wrapper.getElementsByClassName(type)[0];
    }
    return wrapper;
  },
  _getList: function() {
    return tabList.getElementsByClassName('wrapper');
  },
  _getIds: function() {
    return Array.prototype.map.call(
      this._getList(),
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

    a.addEventListener('click', (event) => {
      browser.tabs.update(this.id, {active: true});
      event.preventDefault();
    });

    for (let method of ['close', 'reload', 'mute', 'pin', 'newWindow']) {
      let button = document.createElement('a');
      button.className = `button right ${method}`;
      button.href = '#';
      button.innerText = textMap[method];
      button.addEventListener('click', buttonEvent);
      div.appendChild(button);
    }

    let icon = document.createElement('img');
    icon.className = 'icon';
    icon.style.visibility = 'hidden';

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
    this._get().remove();
  },
  updateTitle: function(title) {
    this.title = title;
    this._get('tab').innerText = title;
  },
  setActive: function() {
    let elm = this._get();
    elm.classList.add('active');
    elm.scrollIntoView();
  },
  setInactive: function() {
    this._get().classList.remove('active');
  },
  getPos: function() {
    return this._getIds().indexOf(this.id);
  },
  setPos: function(pos) {
    let element = this._get();
    let elements = this._getList();
    if (!elements[pos]) {
      tabList.insertBefore(element, elements[pos-1].nextSibling);
    } else {
      tabList.insertBefore(element, elements[pos]);
    }
  },
  setAudible: function() {
    this._get('mute').classList.add('sound');
  },
  setNotAudible: function() {
    this._get('mute').classList.remove('sound');
  },
  setMuted: function() {
    this._get('mute').classList.add('muted');
  },
  setNotMuted: function() {
    this._get('mute').classList.remove('muted');
  },
  setIcon: function(url) {
    let icon = this._get('icon');
    if (!url) {
      icon.src = '';
      icon.style.visibility = 'hidden';
    } else {
      icon.src = url;
      icon.style.visibility = 'unset';
    }
  },
  setSpinner: function() {
    let icon = this._get('icon');
    icon.src = 'rolling.svg';
    icon.style.visibility = 'unset';
  },
  setError: function() {
    let icon = this._get('icon');
    icon.src = 'error.svg';
    icon.style.visibility = 'unset';
  },
  resetIcon: function() {
    let icon = this._get('icon');
    icon.src = '';
    icon.style.visibility = 'hidden';
  },
  pinTab: function() {
    this._get('pin').classList.add('pinned');
    this._get().classList.add('pinned');
    this._get().classList.remove('unpinned');
  },
  unpinTab: function() {
    this._get('pin').classList.remove('pinned');
    this._get().classList.remove('pinned');
    this._get().classList.add('unpinned');
  },
  setContext: function(context) {
    if (!context) {
      return;
    }
    let span = this._get('context');
    span.style.visibility = 'unset';
    span.style.backgroundColor = context.color;
    span.title = context.name;
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
    this.windowId = windowId;
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
  create: function(tab) {
    if (!this.checkWindow(tab)) {
      return;
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
      tabEntry.setActive();
      this.active = tabId;
      if (this.active) {
        tabEntry.setInactive();
      }
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
};

// Tabs Events.
browser.tabs.onActivated.addListener((details) => {
  sidetabs.setActive(details.tabId);
});

browser.tabs.onCreated.addListener((tab) => {
  sidetabs.create(tab);
  sidetabs.setPos(tab.id, tab.index);
});

browser.tabs.onMoved.addListener((tabId, moveInfo) => {
  sidetabs.getPos(tabId);
  sidetabs.setPos(tabId,
    moveInfo.fromIndex < moveInfo.toIndex ?
    moveInfo.toIndex + 1: moveInfo.toIndex
  );
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  sidetabs.remove(tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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
  sidetabs.remove(tabId);
});

// WebNavigation Events.
browser.webNavigation.onCompleted.addListener((details) => {
  browser.tabs.get(details.tabId)
  .then((tab) => {
    sidetabs.setTitle(tab);
    sidetabs.setIcon(tab);
  });
});

browser.webNavigation.onErrorOccurred.addListener((details) => {
  browser.tabs.get(details.tabId)
  .then((tab) => {
    sidetabs.setError(tab);
  });
});

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
    browser.tabs.query({currentWindow: true})
    .then((tabs) => {
      tabs.sort((a, b) => {
        function normalise(url) {
          return url.split('//')[1] || url;
        }
        return normalise(a.url) > normalise(b.url);
      });
      return browser.tabs.move(
        tabs.map((tab) => { return tab.id; }),
        {index: 0}
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
    browser.windows.create({tabId: tabId});
  }
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
