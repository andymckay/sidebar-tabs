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
  close: 'x'
};

if (browser.contextualIdentities === undefined) {
  console.log('browser.contextualIdentities not available. Check that the privacy.userContext.enabled pref is set to true, and reload the add-on.');
}

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
      (elem) => { return parseInt(elem.id) }
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

    for (let method of ['close', 'reload', 'mute', 'pin']) {
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
    let span = this._get('context');
    span.style.visibility = 'unset';
    span.style.backgroundColor = context.color;
    span.title = context.name;
  }
};

// Tab List
var SideTabList = function(){
  this.tabs = {};
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
  create: function(tab) {
    // Skip over tabs that do not belong to this window.
    if (tab.windowId != this.windowId) {
      return;
    }
    let sidetab = new SideTab();
    sidetab.create(tab);
    this.tabs[tab.id] = sidetab;
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
          this.setContext(tab, context)
        }
      );
    }
  },
  setActive: function(tabId) {
    if (this.active) {
      this.tabs[this.active].setInactive();
    }
    if (!this.tabs[tabId]) {
      return;
    }
    this.tabs[tabId].setActive();
    this.active = tabId;
  },
  setTitle: function(tab) {
    this.tabs[tab.id].updateTitle(tab.title);
  },
  remove: function(tabId) {
    this.tabs[tabId].remove();
    delete this.tabs[tabId];
  },
  reset: function() {
    for (let tabId of Object.keys(this.tabs)) {
      this.tabs[tabId].remove();
    }
    this.tabs = {};
    this.active = null;
  },
  getPos: function(tabId) {
    return this.tabs[tabId].getPos();
  },
  setPos: function(tabId, pos) {
    this.tabs[tabId].setPos(pos);
  },
  setAudible: function(tab) {
    if (tab.audible) {
      this.tabs[tab.id].setAudible();
    } else {
      this.tabs[tab.id].setNotAudible();
    }
  },
  setMuted: function(tab, mutedInfo) {
    if (mutedInfo.muted) {
      this.tabs[tab.id].setMuted();
    } else {
      this.tabs[tab.id].setNotMuted();
    }
  },
  setNotMuted: function(tab, muted) {
    this.tabs[tab.id].setNotMuted();
  },
  setIcon: function(tab) {
    if (tab.favIconUrl) {
      this.tabs[tab.id].setIcon(tab.favIconUrl);
    } else {
      this.tabs[tab.id].resetIcon();
    }
  },
  setError: function(tab) {
    this.tabs[tab.id].setError();
  },
  setSpinner: function(tab) {
    if (this.tabs[tab.id]) {
      this.tabs[tab.id].setSpinner();
    }
  },
  setPinned: function(tab) {
    if (tab.pinned) {
      this.tabs[tab.id].pinTab();
    } else {
      this.tabs[tab.id].unpinTab();
    }
  },
  setContext: function(tab, context) {
    this.tabs[tab.id].setContext(context);
  },
};

// Tabs Events.
browser.tabs.onActivated.addListener((details) => {
  sidetabs.setActive(details.tabId);
});

browser.tabs.onCreated.addListener((tab) => {
  console.log('onCreated');
  console.log(tab.windowId);
  console.log(browser.windows.WINDOW_ID_CURRENT);
  console.log(browser.windows.getCurrent());
  sidetabs.create(tab);
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
  if (changeInfo.pinned === true || changeInfo.pinned === false) {
    sidetabs.setPinned(tab);
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

// Listen to top bar.
document.getElementById('add').addEventListener(
  'click', ((event) => {
    browser.tabs.create({});
    event.preventDefault();
  })
);

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

  let pos = 0;
  if (element.id != 'top') {
    try {
      pos = sidetabs.getPos(element.id) + 1;
    } catch (e if e instanceof TypeError) {
      console.log(`No tab of id ${element.id} for drop, invalid target?`);
    }
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
document.getElementById('top').addEventListener('drop', handleDrop);
document.getElementById('top').addEventListener('dragover', handleDragOver);
