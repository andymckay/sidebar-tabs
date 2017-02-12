// Tab.
var SideTab = function(){
  this.id = null;
  this.url = null;
  this.title = null;
};

SideTab.prototype = {
  _get: function(type) {
    let wrapper = document.getElementById(`tab-${this.id}`);
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
      (elem) => { return elem.id }
    );
  },
  create: function(tab) {
    this.id = tab.id;
    this.url = tab.url;
    this.title = tab.title || 'Connecting...';

    let div = document.createElement('div');
    div.className = 'wrapper';
    div.id = `tab-${tab.id}`;

    let a = document.createElement('a');
    a.className = 'tab';
    a.innerText = this.url;
    a.href = this.url;

    a.addEventListener('click', (event) => {
      browser.tabs.update(this.id, {active: true});
      event.preventDefault();
    });

    let x = document.createElement('a');
    x.className = 'close';
    x.innerText = 'x';

    x.addEventListener('click', (event) => {
      browser.tabs.remove(this.id);
      event.preventDefault();
    });

    div.appendChild(x);
    div.appendChild(a);
    tabList.appendChild(div);
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
    return this._getIds().indexOf(`tab-${this.id}`);
  },
  setPos: function(pos) {
    let element = this._get();
    let elements = this._getList();
    if (!elements[pos]) {
      tabList.insertBefore(element, elements[pos-1].nextSibling);
    } else {
      tabList.insertBefore(element, elements[pos]);
    }
  }
};

// Tab List
var SideTabList = function(){
  this.tabs = {};
  this.active = null;
};

SideTabList.prototype = {
  populate: function() {
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
  },
  setActive: function(tabId) {
    if (this.active) {
      this.tabs[this.active].setInactive();
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
  getPos: function(tabId) {
    return this.tabs[tabId].getPos();
  },
  setPos: function(tabId, pos) {
    this.tabs[tabId].setPos(pos);
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
    browser.tabs.create({url: 'about:blank'});
    event.preventDefault();
  })
);

// Start it up.
var tabList = document.getElementById('list');
var sidetabs = new SideTabList();
sidetabs.populate();
