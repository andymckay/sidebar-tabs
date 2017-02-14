// Tab.
var SideTab = function(){
  this.id = null;
  this.url = null;
  this.title = null;
};

SideTab.prototype = {
  _drags: function(wrapper, element) {
    element.addEventListener('dragstart', handleDragStart, false);
    wrapper.addEventListener('dragover', handleDragOver, false);
    wrapper.addEventListener('drop', handleDrop, false);
  },
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

    let div = document.createElement('div');
    div.className = 'wrapper';
    div.id = this.id;

    let a = document.createElement('a');
    a.className = 'tab';
    a.innerText = this.url;
    a.href = this.url;

    a.addEventListener('click', (event) => {
      browser.tabs.update(this.id, {active: true});
      event.preventDefault();
    });

    let drag = null;
    for (let method of ['close', 'mute', 'drag']) {
      let button = document.createElement('a');
      button.className = `button ${method}`;
      button.href = method;
      button.innerText = method;

      if (method == 'drag') {
        drag = button;
      }

      button.addEventListener('click', buttonEvent);
      div.appendChild(button);
    }

    let icon = document.createElement('img');
    icon.className = 'icon';
    icon.src = '';

    div.appendChild(icon);
    div.appendChild(a);
    tabList.appendChild(div);

    this._drags(div, drag);
  },
  remove: function() {
    this._get().remove();
  },
  updateTitle: function(title) {
    this.title = title;
    this._get('tab').innerText = title;
  },
  setActive: function() {
    this._get().classList.add('active');
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
    this._get('icon').src = url;
  },
  setSpinner: function() {
    this._get('icon').src = 'rolling.svg';
  }
};

// Tab List
var SideTabList = function(){
  this.tabs = {};
  this.active = null;
};

SideTabList.prototype = {
  populate: function() {
    // Really want to do current Window here but possible bug?
    browser.tabs.query({})
    .then((tabs) => {
      for (let tab of tabs) {
        this.create(tab);
      }
    });
  },
  create: function(tab) {
    let sidetab = new SideTab();
    sidetab.create(tab);
    this.tabs[tab.id] = sidetab;
    if (tab.active) {
      this.setActive(tab.id);
    }
    this.setAudible(tab);
    this.setIcon(tab);
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
    }
  },
  setSpinner: function(tab) {
    this.tabs[tab.id].setSpinner();
  }
};

// Tabs Events.
browser.tabs.onActivated.addListener((details) => {
  sidetabs.setActive(details.tabId);
});

browser.tabs.onCreated.addListener((tab) => {
  sidetabs.create(tab);
  sidetabs.setActive(tab.id);
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
  if (changeInfo.title) {
    sidetabs.setTitle(tab);
  }
  if (changeInfo.mutedInfo) {
    sidetabs.setMuted(tab, changeInfo.mutedInfo);
  }
  if (changeInfo.audible) {
    sidetabs.setAudible(tab, changeInfo.audible);
  }
  if (changeInfo.status === 'loading') {
    sidetabs.setSpinner(tab);
  }
  if (changeInfo.status === 'complete') {
    sidetabs.setIcon(tab);
  }
});

// WebNavigation Events.
browser.webNavigation.onCompleted.addListener((details) => {
  browser.tabs.get(details.tabId)
  .then((tab) => {
    sidetabs.setTitle(tab);
  });
});

// Listen to top bar.
document.getElementById('add').addEventListener(
  'click', ((event) => {
    // Opening about:newtab would be nice here, but we can't. Bug?
    browser.tabs.create({url: 'about:blank'});
    event.preventDefault();
  })
);

document.getElementById('reset').addEventListener(
  'click', ((event) => {
    sidetabs.reset();
    sidetabs.populate();
    event.preventDefault();
  })
);

document.getElementById('sort').addEventListener(
  'click', ((event) => {
    browser.tabs.query({})
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

// Button events.
function buttonEvent(event) {
  let tabId = parseInt(event.target.parentNode.id);
  if (event.target.classList.contains('close')) {
    browser.tabs.remove(tabId);
  }
  if (event.target.classList.contains('mute')) {
    if (event.target.classList.contains('muted')) {
      browser.tabs.update(tabId, {'muted': false});
    } else {
      browser.tabs.update(tabId, {'muted': true});
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

  let tabId = dragElement.parentNode.id;
  let element = event.target;

  if (event.target.parentNode.classList.contains('wrapper') ||
      event.target.parentNode.id == 'top') {
    element = event.target.parentNode;
  }

  let pos = 0;
  if (element.id != 'top') {
    pos = sidetabs.getPos(element.id) + 1;
  }

  browser.tabs.move(parseInt(tabId), {index: pos});
  event.preventDefault();
}

// Start it up.
var tabList = document.getElementById('list');
var sidetabs = new SideTabList();
sidetabs.populate();

// Setup Drag and Drop
var dragElement = null;
document.getElementById('top').addEventListener('drop', handleDrop);
document.getElementById('top').addEventListener('dragover', handleDragOver);
